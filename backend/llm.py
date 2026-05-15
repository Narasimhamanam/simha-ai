import os
import time
from groq import Groq, RateLimitError, APIStatusError, APIConnectionError
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Models in priority order — fallback if primary is overloaded
PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"   # fast, always available


def generate_response(prompt, stream=False, max_retries=2):
    """
    Generate response with automatic retry on rate limit and model fallback.
    - Retries up to max_retries times with exponential backoff on 429
    - Falls back to a smaller/faster model if primary is unavailable
    """
    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]

    for model_idx, model in enumerate(models_to_try):
        for attempt in range(1, max_retries + 1):
            try:
                completion = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    max_tokens=2048,
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
                wait = 2 ** attempt  # 2s, 4s backoff
                print(f"[LLM] Rate limit hit on {model} attempt {attempt}. Waiting {wait}s...")
                if attempt < max_retries:
                    time.sleep(wait)
                else:
                    if model_idx < len(models_to_try) - 1:
                        print(f"[LLM] Falling back to {models_to_try[model_idx + 1]}")
                        break  # try next model
                    # Last resort — friendly message
                    if stream:
                        def rate_limit_gen():
                            yield "⚠️ The AI is currently busy due to high demand. Please wait 10 seconds and try again."
                        return rate_limit_gen()
                    return "⚠️ The AI is currently busy due to high demand. Please wait 10 seconds and try again."

            except APIConnectionError as e:
                print(f"[LLM] Connection error: {e}")
                if attempt < max_retries:
                    time.sleep(2)
                else:
                    if stream:
                        def conn_err_gen():
                            yield "⚠️ Could not reach the AI service. Please check your connection and retry."
                        return conn_err_gen()
                    return "⚠️ Could not reach the AI service. Please check your connection and retry."

            except APIStatusError as e:
                print(f"[LLM] API status error {e.status_code}: {e.message}")
                if e.status_code >= 500 and attempt < max_retries:
                    time.sleep(2)
                    continue
                if stream:
                    def api_err_gen(msg=str(e.message)):
                        yield f"⚠️ AI service error: {msg}. Please try again."
                    return api_err_gen()
                return f"⚠️ AI service error. Please try again."

            except Exception as e:
                print(f"[LLM] Unexpected error: {e}")
                if stream:
                    def generic_err_gen():
                        yield "⚠️ Something went wrong with the AI. Please try again."
                    return generic_err_gen()
                return "⚠️ Something went wrong. Please try again."

    # Should never reach here
    if stream:
        def final_fallback():
            yield "⚠️ AI is temporarily unavailable. Please try again in a moment."
        return final_fallback()
    return "⚠️ AI is temporarily unavailable. Please try again in a moment."