import os
import asyncio
import base64
import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from bson import ObjectId
from dotenv import load_dotenv

from database import (
    get_chat_collection,
    get_documents_collection,
    ensure_indexes,
)
from models.schemas import (
    CreateChatRequest,
    MessageRequest,
    ChatRequest,
    RenameChatRequest,
    ImageAnalysisRequest,
    EmailDraftRequest,
    SummarizeUrlRequest,
    CalendarEventRequest,
)
from agents.router import route_query
from agents.email_agent import generate_email_draft
from agents.automation_agent import summarize_url, generate_calendar_event
from memory.chat_memory import conversation_memory
from rag.pdf_processor import process_pdf
from rag.vector_store import create_vector_store
from rag.rag_chain import ask_pdf

from services.entitlement import get_user_entitlement
from services.usage import (
    check_user_quota,
    record_user_usage,
    get_usage_summary,
)
from security.rate_limiter import rate_limit_check
from security.auth import get_current_user

from routes.payments import router as payments_router
from routes.admin import router as admin_router

load_dotenv()

# Limits & Cost Controls
MAX_DOC_SIZE_BYTES = int(os.getenv("MAX_DOCUMENT_SIZE_MB", "10")) * 1024 * 1024
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_MB", "5")) * 1024 * 1024

# Concurrency semaphore for LLM calls
groq_semaphore = asyncio.Semaphore(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database indexes
    await ensure_indexes()
    yield


app = FastAPI(
    title="GPT 6 Astra API",
    description="Astra AI Independent SaaS Backend",
    version="3.0.0",
    lifespan=lifespan,
)

# -----------------------------------
# CORS
# -----------------------------------
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# -----------------------------------
# ROUTERS
# -----------------------------------
app.include_router(payments_router)
app.include_router(admin_router)

# -----------------------------------
# HEALTH & KEEP-ALIVE
# -----------------------------------
@app.get("/")
async def root():
    return {
        "service": "Astra AI (GPT 6 Astra)",
        "status": "operational",
        "version": "3.0.0",
        "disclaimer": "Astra AI is an independent AI application and is not affiliated with or endorsed by OpenAI.",
    }


@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Astra AI core is warm ⚡"}


@app.get("/health")
async def health():
    db_ok = get_chat_collection() is not None
    return {
        "status": "healthy",
        "database": "connected" if db_ok else "unavailable",
        "version": "3.0.0",
    }


# -----------------------------------
# USER ENTITLEMENT & USAGE
# -----------------------------------
@app.get("/user-credits/{email}")
@app.get("/user-usage/{email}")
async def fetch_user_usage(email: str):
    """Returns combined entitlement and daily usage stats for the user."""
    summary = await get_usage_summary(email)
    # Return backward-compatible fields along with new SaaS metrics
    summary["credits"] = 999.0 if summary.get("is_premium") else max(0.0, float(summary["messages_limit"] - summary["messages_used"]))
    summary["is_pro"] = summary.get("is_premium", False)
    return summary


@app.get("/user-entitlement/{email}")
async def fetch_user_entitlement(email: str):
    """Returns active pass and expiration details for the user."""
    return await get_user_entitlement(email)


# -----------------------------------
# ASTRA CHAT (STREAMING)
# -----------------------------------
@app.post("/stream-chat")
@app.post("/streamchat")
@app.post("/api/streamchat")
async def stream_chat(request: ChatRequest, req: Request):
    rate_limit_check(req)

    user_id = request.user_id or "guest"
    chat_id = request.chat_id

    # Resolve message from query or direct message
    message = None
    if request.query:
        agent = (request.agent or "study").lower()
        if agent.startswith("coding") or agent.startswith("code"):
            message = f"coding: {request.query}"
        elif agent.startswith("productivity"):
            message = f"productivity: {request.query}"
        elif agent.startswith("wisdom") or agent.startswith("divine"):
            message = f"wisdom: {request.query}"
        else:
            message = f"study: {request.query}"
    elif request.message:
        message = request.message

    if not message:
        raise HTTPException(status_code=400, detail="Missing query or message.")

    # 1. Quota Check
    await check_user_quota(user_id, request_type="message")

    # 2. Build conversation history
    history = []
    if chat_id:
        collection = get_chat_collection()
        if collection is not None:
            try:
                doc = await collection.find_one({"_id": ObjectId(chat_id)})
                if doc and doc.get("messages"):
                    raw_msgs = doc["messages"][-40:]
                    for i in range(0, len(raw_msgs) - 1, 2):
                        u = raw_msgs[i]
                        a = raw_msgs[i + 1] if i + 1 < len(raw_msgs) else None
                        if u.get("role") == "user" and a and a.get("role") == "assistant":
                            history.append({"user": u["content"], "assistant": a["content"]})
            except Exception:
                pass

    if not history and user_id in conversation_memory:
        history = conversation_memory[user_id][-20:]

    # 3. Stream generator with Groq semaphore and usage recording
    async def generate():
        full_response = ""
        try:
            async with groq_semaphore:
                loop = asyncio.get_event_loop()
                response_text = await loop.run_in_executor(
                    None, lambda: route_query(message, history, stream=False)
                )
                if not response_text:
                    response_text = "No response from Astra AI. Please retry."

            chunk_size = 12
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i : i + chunk_size]
                full_response += chunk
                yield chunk
                await asyncio.sleep(0.01)
        except Exception as exc:
            err_msg = "Astra AI is momentarily processing high volume. Please try again."
            full_response = err_msg
            yield err_msg
            print(f"[Astra Stream] Error: {exc}")
        finally:
            if full_response:
                # Record usage upon completion
                await record_user_usage(user_id, request_type="message", tokens_estimated=len(full_response) // 4)

                # Update in-memory history
                if user_id not in conversation_memory:
                    conversation_memory[user_id] = []
                conversation_memory[user_id].append({"user": message, "assistant": full_response})
                if len(conversation_memory[user_id]) > 30:
                    conversation_memory[user_id] = conversation_memory[user_id][-30:]

                # Persist to MongoDB
                if chat_id:
                    collection = get_chat_collection()
                    if collection is not None:
                        try:
                            await collection.update_one(
                                {"_id": ObjectId(chat_id)},
                                {
                                    "$push": {
                                        "messages": {
                                            "$each": [
                                                {"role": "user", "content": request.query or message, "file": request.file_name},
                                                {"role": "assistant", "content": full_response},
                                            ]
                                        }
                                    },
                                    "$set": {"updated_at": datetime.datetime.now(datetime.timezone.utc)},
                                },
                            )
                        except Exception as db_err:
                            print("[Astra Stream] DB save error:", db_err)

    return StreamingResponse(generate(), media_type="text/plain")


@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, req: Request):
    rate_limit_check(req)
    user_id = request.user_id or "guest"

    message = request.query or request.message
    if not message:
        raise HTTPException(status_code=400, detail="Missing query or message.")

    await check_user_quota(user_id, request_type="message")

    if user_id not in conversation_memory:
        conversation_memory[user_id] = []

    history = conversation_memory[user_id]
    response = route_query(message, history, stream=False)

    conversation_memory[user_id].append({"user": message, "assistant": response})
    await record_user_usage(user_id, request_type="message")

    return {"response": response}


# -----------------------------------
# ASTRA VISION (IMAGE ANALYSIS)
# -----------------------------------
@app.post("/analyze-image")
async def analyze_image(request: ImageAnalysisRequest, req: Request):
    rate_limit_check(req)
    user_email = request.user_email or "guest"

    if not request.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required.")

    # Size check (base64 is ~1.37x the raw binary size)
    if len(request.image_base64) > MAX_IMAGE_SIZE_BYTES * 1.37:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds maximum allowed size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    await check_user_quota(user_email, request_type="image")

    # ── Primary: Groq llama-3.2-11b-vision-preview ──────────────────────────
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        try:
            from groq import Groq
            groq_client = Groq(api_key=groq_api_key)
            completion = groq_client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {"url": request.image_base64},
                            },
                            {"type": "text", "text": request.prompt or "Describe this image in detail."},
                        ],
                    }
                ],
                temperature=0.3,
                max_tokens=2048,
            )
            response_text = completion.choices[0].message.content or ""
            await record_user_usage(user_email, request_type="image")
            return {"response": response_text, "model": "llama-3.2-11b-vision-preview"}
        except Exception as groq_exc:
            print(f"[Astra Vision] Groq vision error, falling back to Gemini: {groq_exc}")

    # ── Fallback: Google Gemini 1.5 Flash (vision-capable) ──────────────────
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_api_key:
        try:
            import google.generativeai as genai
            import base64, re

            genai.configure(api_key=gemini_api_key)
            gemini_model = genai.GenerativeModel("gemini-1.5-flash")

            # Handle both data-URL and raw base64
            image_data = request.image_base64
            mime_type = "image/jpeg"
            if image_data.startswith("data:"):
                match = re.match(r"data:([^;]+);base64,(.+)", image_data)
                if match:
                    mime_type = match.group(1)
                    image_data = match.group(2)

            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_data,
                }
            }
            gemini_response = gemini_model.generate_content(
                [image_part, request.prompt or "Describe this image in detail."]
            )
            response_text = gemini_response.text or ""
            await record_user_usage(user_email, request_type="image")
            return {"response": response_text, "model": "gemini-1.5-flash"}
        except Exception as gemini_exc:
            print(f"[Astra Vision] Gemini fallback error: {gemini_exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Vision analysis failed on both providers: {str(gemini_exc)}",
            )

    raise HTTPException(
        status_code=503,
        detail="No vision-capable API key configured. Set GROQ_API_KEY or GEMINI_API_KEY.",
    )




# -----------------------------------
# ASTRA PRODUCTIVITY: EMAIL
# -----------------------------------
@app.post("/generate-email")
async def generate_email(request: EmailDraftRequest, req: Request):
    rate_limit_check(req)
    user_email = request.user_email or "guest"

    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required.")

    await check_user_quota(user_email, request_type="message")

    try:
        draft = generate_email_draft(prompt=request.prompt.strip(), sender_name=request.sender_name or "")
        await record_user_usage(user_email, request_type="message")
        return draft
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Email draft failed: {str(exc)}")


# -----------------------------------
# ASTRA RESEARCH: URL SUMMARIZER
# -----------------------------------
@app.post("/summarize-url")
async def summarize_url_endpoint(request: SummarizeUrlRequest, req: Request):
    rate_limit_check(req)
    user_email = request.user_email or "guest"

    if not request.url or not request.url.startswith("http"):
        raise HTTPException(status_code=400, detail="A valid HTTP/HTTPS URL is required.")

    await check_user_quota(user_email, request_type="message")

    try:
        result = await summarize_url(request.url)
        await record_user_usage(user_email, request_type="message")
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"URL summarization failed: {str(exc)}")


# -----------------------------------
# ASTRA PRODUCTIVITY: CALENDAR
# -----------------------------------
@app.post("/generate-calendar-event")
async def generate_calendar_endpoint(request: CalendarEventRequest, req: Request):
    rate_limit_check(req)
    user_email = request.user_email or "guest"

    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required.")

    await check_user_quota(user_email, request_type="message")

    try:
        event = generate_calendar_event(prompt=request.prompt.strip(), sender_name=request.sender_name or "")
        await record_user_usage(user_email, request_type="message")
        return event
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Calendar event generation failed: {str(exc)}")


# -----------------------------------
# ASTRA DOCS: UPLOAD & RAG
# -----------------------------------
@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_email: str = Form(""),
    chat_id: str = Form(""),
):
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".rst"}
    import uuid
    from pathlib import Path as _Path

    # Check quota for document processing
    await check_user_quota(user_email or "guest", request_type="document")

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_DOC_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_DOC_SIZE_BYTES // (1024*1024)}MB.",
        )

    ext = _Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Collision-safe filename: uuid4 prefix keeps concurrent uploads isolated
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", safe_name)
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Process and vectorize (supports PDF, DOCX, TXT, CSV)
    try:
        chunks = process_pdf(file_path)
        create_vector_store(chunks)
    except Exception as proc_err:
        # Cleanup orphan file on failure
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise HTTPException(status_code=422, detail=f"Document processing failed: {str(proc_err)}")

    doc_id = None
    docs_collection = get_documents_collection()
    if docs_collection is not None and user_email:
        doc_record = {
            "user_email": user_email,
            "file_name": file.filename,
            "file_size": file_size,
            "file_type": file.content_type or f"application/{ext.lstrip('.')}",
            "chat_id": chat_id or None,
            "pages": len(chunks),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc),
        }
        res = await docs_collection.insert_one(doc_record)
        doc_id = str(res.inserted_id)

    await record_user_usage(user_email or "guest", request_type="document")

    return {
        "message": "Document indexed successfully in Astra Docs",
        "doc_id": doc_id,
        "file_name": file.filename,
        "pages": len(chunks),
    }



@app.get("/get-documents/{user_email}")
async def get_documents(user_email: str):
    docs_collection = get_documents_collection()
    if docs_collection is None:
        return []

    cursor = docs_collection.find({"user_email": user_email}, sort=[("uploaded_at", -1)])
    docs = []
    async for doc in cursor:
        uploaded = doc.get("uploaded_at")
        docs.append({
            "id": str(doc["_id"]),
            "file_name": doc.get("file_name", ""),
            "file_size": doc.get("file_size", 0),
            "file_type": doc.get("file_type", ""),
            "chat_id": doc.get("chat_id"),
            "pages": doc.get("pages", 0),
            "uploaded_at": uploaded.isoformat() if isinstance(uploaded, datetime.datetime) else "",
        })
    return docs


@app.delete("/delete-document/{doc_id}")
async def delete_document(doc_id: str):
    docs_collection = get_documents_collection()
    if docs_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        await docs_collection.delete_one({"_id": ObjectId(doc_id)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": "Document removed from Astra Docs"}


@app.post("/ask-pdf")
async def ask_pdf_question(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Question is required.")
    response = ask_pdf(request.message)
    return {"response": response}


# -----------------------------------
# CHAT SESSION MANAGEMENT
# -----------------------------------
@app.post("/create-chat")
async def create_chat(request: CreateChatRequest):
    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")

    new_chat = {
        "user_email": request.user_email,
        "title": request.title,
        "messages": [],
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "updated_at": datetime.datetime.now(datetime.timezone.utc),
    }
    result = await collection.insert_one(new_chat)
    return {"chat_id": str(result.inserted_id)}


@app.get("/get-chats/{user_email}")
async def get_chats(user_email: str):
    collection = get_chat_collection()
    if collection is None:
        return []

    try:
        cursor = collection.find({"user_email": user_email}, sort=[("_id", -1)])
        docs = await cursor.to_list(length=50)
    except Exception as exc:
        print(f"[Astra DB] get_chats error: {exc}")
        return []

    result = []
    for doc in docs:
        messages = doc.get("messages", [])
        if len(messages) > 100:
            messages = messages[-100:]
        result.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", "New Chat"),
            "messages": messages,
        })
    return result


@app.post("/save-message")
async def save_message(request: MessageRequest):
    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")

    await collection.update_one(
        {"_id": ObjectId(request.chat_id)},
        {
            "$push": {"messages": {"role": request.role, "content": request.content}},
            "$set": {"updated_at": datetime.datetime.now(datetime.timezone.utc)},
        },
    )
    return {"message": "Message saved"}


@app.patch("/rename-chat/{chat_id}")
async def rename_chat(chat_id: str, request: RenameChatRequest):
    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")
    await collection.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$set": {
                "title": request.title,
                "updated_at": datetime.datetime.now(datetime.timezone.utc),
            }
        },
    )
    return {"message": "Chat renamed"}


@app.delete("/delete-chat/{chat_id}")
async def delete_chat(chat_id: str):
    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")
    await collection.delete_one({"_id": ObjectId(chat_id)})
    return {"message": "Chat deleted"}
