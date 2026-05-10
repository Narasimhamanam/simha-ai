from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel

from bson import ObjectId

from database import chat_collection

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

    user_id: str
    message: str

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

    user_id = request.user_id
    message = request.message

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

# -----------------------------------
# STREAM CHAT
# -----------------------------------

@app.post("/stream-chat")
async def stream_chat(request: ChatRequest):

    user_id = request.user_id
    message = request.message

    # MEMORY INIT

    if user_id not in conversation_memory:

        conversation_memory[user_id] = []

    history = conversation_memory[user_id]

    # GENERATE FULL RESPONSE

    full_response = route_query(

        message,
        history

    )

    # STREAM TOKENS

    async def generate():

        words = full_response.split()

        for word in words:

            yield word + " "

            await asyncio.sleep(0.03)

    # SAVE MEMORY

    conversation_memory[user_id].append({

        "user": message,

        "assistant": full_response

    })

    return StreamingResponse(

        generate(),

        media_type="text/plain"

    )
# -----------------------------------
# UPLOAD PDF
# -----------------------------------

@app.post("/upload-pdf")
async def upload_pdf(

    file: UploadFile = File(...)

):

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

    new_chat = {

        "user_email":
        request.user_email,

        "title":
        request.title,

        "messages": []

    }

    result = await (
        chat_collection.insert_one(
            new_chat
        )
    )

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

    chats_cursor = (
        chat_collection.find({

            "user_email":
            user_email

        })
    )

    chats = []

    async for chat in chats_cursor:

        chats.append({

            "id":
            str(chat["_id"]),

            "title":
            chat["title"],

            "messages":
            chat.get("messages", [])

        })

    return chats

# -----------------------------------
# SAVE MESSAGE
# -----------------------------------

@app.post("/save-message")
async def save_message(
    request: MessageRequest
):

    await chat_collection.update_one(

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

    await chat_collection.delete_one({

        "_id":
        ObjectId(chat_id)

    })

    return {

        "message":
        "Chat Deleted"

    }