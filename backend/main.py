from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel

from bson import ObjectId

from database import get_chat_collection, get_documents_collection

from agents.router import route_query
from agents.email_agent import generate_email_draft
from agents.automation_agent import summarize_url, generate_calendar_event
from memory.chat_memory import conversation_memory

import asyncio
from fastapi import UploadFile, File
import shutil

from rag.pdf_processor import process_pdf
from rag.vector_store import create_vector_store
from rag.rag_chain import ask_pdf

app = FastAPI()

# Limit concurrent Groq API calls — prevents rate limit errors under load
# Groq free tier: 30 req/min. Semaphore ensures max 5 calls run at once.
groq_semaphore = asyncio.Semaphore(5)

# -----------------------------------
# CORS
# -----------------------------------

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)

# -----------------------------------
# MODELS
# -----------------------------------

class CreateChatRequest(BaseModel):

    user_email: str
    title: str


class MessageRequest(BaseModel):

    chat_id: str
    role: str
    content: str


class ChatRequest(BaseModel):

    # Existing backend payload (simple chat)
    user_id: str | None = None
    message: str | None = None

    # Frontend payload (agent-based chat)
    chat_id: str | None = None
    role: str | None = None
    agent: str | None = None
    query: str | None = None
    file_name: str | None = None
    file_data: dict | None = None

# -----------------------------------
# ROOT
# -----------------------------------

@app.get("/")
async def home():
    return {"message": "Simha AI Backend Running"}

# Keep-alive endpoint — pinged by frontend every 8 minutes to prevent Railway cold start
@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Server is warm 🔥"}

@app.get("/health")
async def health():
    db_ok = get_chat_collection() is not None
    return {
        "status": "healthy",
        "database": "connected" if db_ok else "unavailable",
        "version": "2.0"
    }

# -----------------------------------
# GENERATE EMAIL DRAFT
# -----------------------------------

class EmailDraftRequest(BaseModel):
    prompt: str
    sender_name: str | None = ""

@app.post("/generate-email")
async def generate_email(request: EmailDraftRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required.")
    try:
        draft = generate_email_draft(
            prompt=request.prompt.strip(),
            sender_name=request.sender_name or ""
        )
        return draft
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "Email generation failed", "details": str(exc)}))

# -----------------------------------
# SUMMARIZE URL
# -----------------------------------

class SummarizeUrlRequest(BaseModel):
    url: str

@app.post("/summarize-url")
async def summarize_url_endpoint(request: SummarizeUrlRequest):
    if not request.url or not request.url.startswith("http"):
        raise HTTPException(status_code=400, detail="A valid URL starting with http/https is required.")
    try:
        result = await summarize_url(request.url)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "URL summarization failed", "details": str(exc)}))

# -----------------------------------
# GENERATE CALENDAR EVENT
# -----------------------------------

class CalendarEventRequest(BaseModel):
    prompt: str
    sender_name: str | None = ""

@app.post("/generate-calendar-event")
async def generate_calendar_event_endpoint(request: CalendarEventRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required.")
    try:
        event = generate_calendar_event(
            prompt=request.prompt.strip(),
            sender_name=request.sender_name or ""
        )
        return event
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "Calendar event generation failed", "details": str(exc)}))

# -----------------------------------
# NORMAL CHAT
# -----------------------------------

@app.post("/chat")
async def chat(request: ChatRequest):

    # Prefer frontend payload fields
    user_id = request.user_id

    message = None
    if request.query:
        # Map agent -> router prefix
        agent = (request.agent or "study").lower()

        if agent.startswith("coding"):
            message = f"coding: {request.query}"
        elif agent.startswith("productivity"):
            message = f"productivity: {request.query}"
        else:
            message = f"study: {request.query}"
    elif request.message:
        message = request.message

    if not user_id:
        user_id = "guest"

    if not message:
        raise HTTPException(status_code=400, detail=str({"error": "Missing message/query in request."}))

    # MEMORY INIT

    if user_id not in conversation_memory:

        conversation_memory[user_id] = []

    history = conversation_memory[user_id]

    # AI RESPONSE

    response = route_query(

        message,
        history

    )

    # SAVE MEMORY

    conversation_memory[user_id].append({

        "user": message,

        "assistant": response

    })

    return {

        "response": response

    }

# Frontend/Render compatibility aliases
@app.post("/api/chat")
async def api_chat(request: ChatRequest):

    return await chat(request)


# -----------------------------------
# STREAM CHAT
# -----------------------------------

@app.post("/stream-chat")
async def stream_chat(request: ChatRequest):
    user_id = request.user_id or "guest"
    chat_id = request.chat_id

    message = None
    if request.query:
        agent = (request.agent or "study").lower()
        if agent.startswith("coding"):
            message = f"coding: {request.query}"
        elif agent.startswith("productivity"):
            message = f"productivity: {request.query}"
        else:
            message = f"study: {request.query}"
    elif request.message:
        message = request.message

    if not message:
        raise HTTPException(status_code=400, detail=str({"error": "Missing message/query in request."}))

    # ── Build conversation history ──
    # Try loading last 10 messages from MongoDB for persistent context across cold starts
    history = []
    if chat_id:
        collection = get_chat_collection()
        if collection is not None:
            try:
                doc = await collection.find_one({"_id": ObjectId(chat_id)})
                if doc and doc.get("messages"):
                    raw_msgs = doc["messages"][-20:]  # last 20 messages
                    for i in range(0, len(raw_msgs) - 1, 2):
                        u = raw_msgs[i]
                        a = raw_msgs[i + 1] if i + 1 < len(raw_msgs) else None
                        if u.get("role") == "user" and a and a.get("role") == "assistant":
                            history.append({"user": u["content"], "assistant": a["content"]})
            except Exception:
                pass  # Fall back to in-memory history

    # Fall back to in-memory history if MongoDB gave nothing
    if not history and user_id in conversation_memory:
        history = conversation_memory[user_id][-10:]

    # ── Stream response (semaphore caps concurrent Groq calls at 5) ──
    async def generate():
        full_response = ""
        async with groq_semaphore:
            try:
                loop = asyncio.get_event_loop()
                # route_query is sync — run in thread pool to avoid blocking event loop
                generator = await loop.run_in_executor(
                    None, lambda: route_query(message, history, stream=False)
                )
                # Stream the response in chunks for real-time feel
                chunk_size = 8
                for i in range(0, len(generator), chunk_size):
                    chunk = generator[i:i + chunk_size]
                    full_response += chunk
                    yield chunk
                    await asyncio.sleep(0.01)
            except Exception as e:
                error_msg = "⚠️ AI is busy — please try again in a moment."
                full_response = error_msg
                yield error_msg
                print(f"[stream] Error: {e}")
        finally:
            if full_response:
                # Update in-memory (capped at 20 turns to prevent RAM bloat)
                if user_id not in conversation_memory:
                    conversation_memory[user_id] = []
                conversation_memory[user_id].append({"user": message, "assistant": full_response})
                if len(conversation_memory[user_id]) > 20:
                    conversation_memory[user_id] = conversation_memory[user_id][-20:]

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
                                                {"role": "assistant", "content": full_response}
                                            ]
                                        }
                                    },
                                    "$set": {"updated_at": __import__("datetime").datetime.utcnow()}
                                }
                            )
                        except Exception as e:
                            print("DB save error:", e)

    return StreamingResponse(generate(), media_type="text/plain")

# Frontend/Render compatibility aliases for streaming
@app.post("/streamchat")
async def streamchat(request: ChatRequest):
    return await stream_chat(request)

@app.post("/api/streamchat")
async def api_streamchat(request: ChatRequest):
    return await stream_chat(request)

# -----------------------------------
# UPLOAD PDF  (saves metadata to MongoDB documents collection)
# -----------------------------------

import os
import datetime

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_email: str = "",
    chat_id: str = "",
):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"

    # Read file content for size tracking
    content = await file.read()
    file_size = len(content)

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Process for RAG
    chunks = process_pdf(file_path)
    create_vector_store(chunks)

    # Save metadata to MongoDB documents collection
    doc_id = None
    docs_collection = get_documents_collection()
    if docs_collection is not None and user_email:
        doc_record = {
            "user_email": user_email,
            "file_name": file.filename,
            "file_size": file_size,
            "file_type": file.content_type or "application/octet-stream",
            "chat_id": chat_id or None,
            "pages": len(chunks),
            "uploaded_at": datetime.datetime.utcnow(),
        }
        result = await docs_collection.insert_one(doc_record)
        doc_id = str(result.inserted_id)

    return {
        "message": "PDF uploaded successfully",
        "doc_id": doc_id,
        "file_name": file.filename,
        "pages": len(chunks),
    }

# -----------------------------------
# GET DOCUMENTS (for sidebar Documents page)
# -----------------------------------

@app.get("/get-documents/{user_email}")
async def get_documents(user_email: str):
    docs_collection = get_documents_collection()
    if docs_collection is None:
        return []
    cursor = docs_collection.find(
        {"user_email": user_email},
        sort=[("uploaded_at", -1)]
    )
    docs = []
    async for doc in cursor:
        docs.append({
            "id": str(doc["_id"]),
            "file_name": doc.get("file_name", ""),
            "file_size": doc.get("file_size", 0),
            "file_type": doc.get("file_type", ""),
            "chat_id": doc.get("chat_id"),
            "pages": doc.get("pages", 0),
            "uploaded_at": doc.get("uploaded_at", "").isoformat() if doc.get("uploaded_at") else "",
        })
    return docs

# -----------------------------------
# DELETE DOCUMENT
# -----------------------------------

@app.delete("/delete-document/{doc_id}")
async def delete_document(doc_id: str):
    docs_collection = get_documents_collection()
    if docs_collection is None:
        raise HTTPException(status_code=500, detail="DB not configured")
    try:
        await docs_collection.delete_one({"_id": ObjectId(doc_id)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": "Document deleted"}

# -----------------------------------
# ASK PDF
# -----------------------------------

@app.post("/ask-pdf")
async def ask_pdf_question(

    request: ChatRequest

):

    response = ask_pdf(

        request.message

    )

    return {

        "response":

        response

    }
# -----------------------------------
# CREATE CHAT
# -----------------------------------

@app.post("/create-chat")
async def create_chat(
    request: CreateChatRequest
):

    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB not configured (MONGO_URL/DATABASE_NAME missing)."}))

    new_chat = {

        "user_email":
        request.user_email,

        "title":
        request.title,

        "messages": []

    }

    try:
        result = await collection.insert_one(new_chat)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB insert failed", "details": str(exc)}))

    return {

        "chat_id":
        str(result.inserted_id)

    }

# -----------------------------------
# GET USER CHATS
# -----------------------------------

@app.get("/get-chats/{user_email}")
async def get_chats(user_email: str):
    collection = get_chat_collection()
    if collection is None:
        # Return empty list gracefully — frontend handles it by creating a new chat
        return []

    try:
        cursor = collection.find(
            {"user_email": user_email},
            sort=[("_id", -1)]   # newest first
        )
        docs = await cursor.to_list(length=30)  # cap at 30 chats
    except Exception as exc:
        print(f"get_chats error for {user_email}: {exc}")
        return []  # return empty instead of crashing

    result = []
    for doc in docs:
        messages = doc.get("messages", [])
        # Return only last 50 messages to avoid huge payloads
        if len(messages) > 50:
            messages = messages[-50:]
        result.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", "New Chat"),
            "messages": messages,
        })
    return result

# -----------------------------------
# SAVE MESSAGE
# -----------------------------------

@app.post("/save-message")
async def save_message(
    request: MessageRequest
):

    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB not configured (MONGO_URL/DATABASE_NAME missing)."}))

    try:
        await collection.update_one(

            {

                "_id":
                ObjectId(request.chat_id)

            },

            {

                "$push": {

                    "messages": {

                        "role":
                        request.role,

                        "content":
                        request.content

                    }

                }

            }

        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB update failed", "details": str(exc)}))

    return {

        "message":
        "Saved Successfully"

    }

# -----------------------------------
# RENAME CHAT
# -----------------------------------

class RenameChatRequest(BaseModel):
    title: str

@app.patch("/rename-chat/{chat_id}")
async def rename_chat(chat_id: str, request: RenameChatRequest):
    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB not configured."}))
    try:
        await collection.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"title": request.title}}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB update failed", "details": str(exc)}))
    return {"message": "Renamed"}

# -----------------------------------
# DELETE CHAT
# -----------------------------------

@app.delete("/delete-chat/{chat_id}")
async def delete_chat(
    chat_id: str
):

    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB not configured (MONGO_URL/DATABASE_NAME missing)."}))

    try:
        await collection.delete_one({

            "_id":
            ObjectId(chat_id)

        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB delete failed", "details": str(exc)}))

    return {

        "message":
        "Chat Deleted"

    }
