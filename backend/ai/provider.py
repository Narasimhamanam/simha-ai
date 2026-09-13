import os
import time
from abc import ABC, abstractmethod
from typing import Generator, List, Optional
from dotenv import load_dotenv

load_dotenv()


class BaseAIProvider(ABC):
    """Abstract interface for AI model providers."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        pass

    @abstractmethod
    def stream_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> Generator[str, None, None]:
        pass


class GroqProvider(BaseAIProvider):
    """
    Groq AI provider implementation with automated fallback chain,
    rate-limit handling, and streaming support.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.default_model = os.getenv("AI_MODEL", "qwen/qwen3.8-27b")

        raw_fallbacks = os.getenv(
            "AI_FALLBACK_MODELS",
            "qwen/qwen3.8-27b,groq/compound-mini,groq/compound,openai/gpt-oss-120b",
        )
        self.models_to_try = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
        if self.default_model not in self.models_to_try:
            self.models_to_try.insert(0, self.default_model)

    def _get_client(self):
        from groq import Groq
        key = self.api_key or os.getenv("GROQ_API_KEY")
        return Groq(api_key=key)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        max_retries: int = 2,
    ) -> str:
        from groq import RateLimitError, APIStatusError, APIConnectionError

        client = self._get_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        for model in self.models_to_try:
            for attempt in range(1, max_retries + 1):
                try:
                    completion = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=False,
                    )
                    return completion.choices[0].message.content or ""
                except RateLimitError:
                    wait = 2 ** attempt
                    if attempt < max_retries:
                        time.sleep(wait)
                    else:
                        break
                except (APIStatusError, APIConnectionError) as e:
                    if attempt < max_retries:
                        time.sleep(1)
                        continue
                    break
                except Exception as e:
                    print(f"[GroqProvider] Error on {model}: {e}")
                    break

        return "⚠️ Astra AI service is momentarily busy. Please try again in a moment."

    def stream_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        max_retries: int = 2,
    ) -> Generator[str, None, None]:
        from groq import RateLimitError, APIStatusError, APIConnectionError

        client = self._get_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        for model in self.models_to_try:
            for attempt in range(1, max_retries + 1):
                try:
                    completion = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=True,
                    )
                    for chunk in completion:
                        delta = chunk.choices[0].delta.content
                        if delta is not None:
                            yield delta
                    return
                except RateLimitError:
                    wait = 2 ** attempt
                    if attempt < max_retries:
                        time.sleep(wait)
                    else:
                        break
                except (APIStatusError, APIConnectionError):
                    if attempt < max_retries:
                        time.sleep(1)
                        continue
                    break
                except Exception as e:
                    print(f"[GroqProvider Stream] Error on {model}: {e}")
                    break

        yield "⚠️ Astra AI service is momentarily busy. Please try again in a moment."


class ModelRouter:
    """
    Routes requests to the active AI provider based on environment configuration.
    """

    def __init__(self):
        provider_name = os.getenv("AI_PROVIDER", "groq").lower()
        if provider_name == "groq":
            self.provider = GroqProvider()
        else:
            self.provider = GroqProvider()

    def route_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        temp = temperature if temperature is not None else float(os.getenv("AI_TEMPERATURE", "0.3"))
        tokens = max_tokens if max_tokens is not None else int(os.getenv("AI_MAX_TOKENS", "2048"))

        if stream:
            return self.provider.stream_generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temp,
                max_tokens=tokens,
            )
        return self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temp,
            max_tokens=tokens,
        )


# Global singleton router
global_model_router = ModelRouter()
