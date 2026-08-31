import os
import time
from groq import Groq, RateLimitError, APIStatusError, APIConnectionError
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Models in priority order — automatic fallback if primary is unavailable or errors
MODELS_TO_TRY = [
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "groq/compound",
    "openai/gpt-oss-120b",
]

def get_groq_client():
    load_dotenv(override=False)
    api_key = os.getenv("GROQ_API_KEY")
    return Groq(api_key=api_key)

def generate_response(prompt, stream=False, max_retries=2, temperature=0.2, max_tokens=2048):
    """
    Generate response with automatic retry and robust multi-model fallback.
    """
    client = get_groq_client()

    for model_idx, model in enumerate(MODELS_TO_TRY):
        for attempt in range(1, max_retries + 1):
            try:
                completion = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=stream,
                )

                if stream:
                    def generator(comp=completion, m=model):
                        try:
                            for chunk in comp:
                                delta = chunk.choices[0].delta.content
                                if delta is not None:
                                    yield delta
                        except Exception as stream_err:
                            print(f"[LLM] Stream error on {m}: {stream_err}")
                            yield f"\n\n⚠️ Response was interrupted. Please try again."
                    return generator()

                return completion.choices[0].message.content

            except RateLimitError:
                wait = 2 ** attempt
                print(f"[LLM] Rate limit on {model} (attempt {attempt}). Waiting {wait}s...")
                if attempt < max_retries:
                    time.sleep(wait)
                else:
                    print(f"[LLM] Moving to next fallback model after rate limit on {model}")
                    break

            except APIStatusError as e:
                print(f"[LLM] API status error {e.status_code} on {model}: {e.message}")
                if e.status_code >= 500 and attempt < max_retries:
                    time.sleep(1)
                    continue
                # Try next model in list
                break

            except APIConnectionError as e:
                print(f"[LLM] Connection error on {model}: {e}")
                if attempt < max_retries:
                    time.sleep(1)
                    continue
                break

            except Exception as e:
                print(f"[LLM] Error on {model}: {e}")
                break

    # If all models failed
    if stream:
        def final_fallback():
            yield "⚠️ AI is temporarily unavailable. Please try again in a moment."
        return final_fallback()
    return "⚠️ AI is temporarily unavailable. Please try again in a moment."