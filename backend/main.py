from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel

from bson import ObjectId

from database import get_chat_collection

from agents.router import route_query
from memory.chat_memory import conversation_memory

import asyncio
from fastapi import UploadFile, File
import shutil

from rag.pdf_processor import process_pdf
from rag.vector_store import create_vector_store
from rag.rag_chain import ask_pdf

app = FastAPI()

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

    return {

        "message":
        "Simha AI Backend Running"

    }

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
    user_id = request.user_id
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

    if not user_id:
        user_id = "guest"
        
    if not message:
        raise HTTPException(status_code=400, detail=str({"error": "Missing message/query in request."}))

    # MEMORY INIT
    if user_id not in conversation_memory:
        conversation_memory[user_id] = []

    history = conversation_memory[user_id]

    # GENERATE STREAMING RESPONSE
    async def generate():
        full_response = ""
        try:
            generator = route_query(message, history, stream=True)
            for chunk in generator:
                full_response += chunk
                yield chunk
                await asyncio.sleep(0)
        finally:
            # SAVE MEMORY AFTER STREAM ENDS
            if full_response:
                conversation_memory[user_id].append({
                    "user": message,
                    "assistant": full_response
                })
                if request.chat_id:
                    collection = get_chat_collection()
                    if collection is not None:
                        try:
                            await collection.update_one(
                                {"_id": ObjectId(request.chat_id)},
                                {
                                    "$push": {
                                        "messages": {
                                            "$each": [
                                                {"role": "user", "content": message, "file": request.file_name},
                                                {"role": "assistant", "content": full_response}
                                            ]
                                        }
                                    }
                                }
                            )
                        except Exception as e:
                            print("DB save error:", e)

    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )

# Frontend/Render compatibility aliases for streaming
@app.post("/streamchat")
async def streamchat(request: ChatRequest):
    return await stream_chat(request)

@app.post("/api/streamchat")
async def api_streamchat(request: ChatRequest):
    return await stream_chat(request)

# -----------------------------------
# UPLOAD PDF
# -----------------------------------

import os

@app.post("/upload-pdf")
async def upload_pdf(

    file: UploadFile = File(...)

):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"

    with open(

        file_path,
        "wb"

    ) as buffer:

        shutil.copyfileobj(

            file.file,
            buffer

        )

    chunks = process_pdf(

        file_path

    )

    create_vector_store(

        chunks

    )

    return {

        "message":

        "PDF uploaded successfully"

    }

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
async def get_chats(
    user_email: str
):

    collection = get_chat_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB not configured (MONGO_URL/DATABASE_NAME missing)."}))

    try:
        cursor = collection.find({
            "user_email": user_email
        })

        docs = await cursor.to_list(length=50)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str({"error": "MongoDB find failed", "details": str(exc)}))

    return [
        {
            "id": str(doc["_id"]),
            "title": doc["title"],
            "messages": doc.get("messages", []),
        }
        for doc in docs
    ]

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
