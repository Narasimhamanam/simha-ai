from fastapi import APIRouter

from pydantic import BaseModel

from fastapi.responses import StreamingResponse

from agents.router import route_query

from memory.chat_memory import conversation_memory

import asyncio

router = APIRouter()


class ChatRequest(BaseModel):

    user_id: str
    message: str


@router.post("/chat")
async def chat(request: ChatRequest):

    user_id = request.user_id

    message = request.message

    # INITIALIZE MEMORY

    if user_id not in conversation_memory:

        conversation_memory[user_id] = []

    history = conversation_memory[user_id]

    # GENERATE FULL RESPONSE

    full_response = route_query(

        message,
        history

    )

    # SAVE MEMORY

    conversation_memory[user_id].append({

        "user": message,

        "assistant": full_response

    })

    # STREAM RESPONSE

    async def generate():

        words = full_response.split()

        for word in words:

            yield word + " "

            await asyncio.sleep(0.02)

    return StreamingResponse(

        generate(),

        media_type="text/plain"

    )