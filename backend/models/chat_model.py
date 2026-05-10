from pydantic import BaseModel
from typing import List

class Message(BaseModel):
    role: str
    content: str

class Chat(BaseModel):
    user_email: str
    title: str
    messages: List[Message] = []