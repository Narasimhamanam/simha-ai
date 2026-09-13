import os
from dotenv import load_dotenv
from ai.provider import global_model_router, GroqProvider

load_dotenv()


def get_groq_client():
    provider = GroqProvider()
    return provider._get_client()


def generate_response(
    prompt: str,
    stream: bool = False,
    max_retries: int = 2,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    system_prompt: str = None,
):
    """
    Unified Astra AI generator delegating to the ModelRouter.
    Provides automated fallback, exponential backoff, and streaming.
    """
    return global_model_router.route_generate(
        prompt=prompt,
        system_prompt=system_prompt,
        stream=stream,
        temperature=temperature,
        max_tokens=max_tokens,
    )