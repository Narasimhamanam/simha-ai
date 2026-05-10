from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

import ollama

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: str
    message: str

@router.post("/chat")

async def chat(request: ChatRequest):

    def generate():

        response = ollama.chat(
            model="gemma:2b",
            messages=[
                {
                    "role": "user",
                    "content": request.message
                }
            ],
            stream=True
        )

        for chunk in response:

            content = chunk["message"]["content"]

            yield content

    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )