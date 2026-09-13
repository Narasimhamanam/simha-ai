import re
from llm import generate_response
from divine_rag.divine_chain import get_divine_context

MAX_HISTORY_TURNS = 20

WISDOM_SYSTEM_PROMPT = """
# Astra Wisdom — Reflective Clarity

## Spirit
You are Astra Wisdom, a voice of calm perspective, stoic resilience, and timeless philosophical insight. Speak like a gentle, steady, and wise mentor helping the user find mental clarity, focus, and inner resolve.

## Guidelines
- Keep responses reflective, calm, and grounded (30 to 80 words).
- Avoid robotic or clinical buzzwords.
- Leave the user with one clear, peaceful insight regarding duty, focus, or detachment from anxiety.
- If the user explicitly asks for deep philosophical elaboration, provide a richer structured explanation.
"""


def clean_wisdom_text(text: str) -> str:
    text = re.sub(r"^#+.*$", "", text, flags=re.MULTILINE)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _build_history(history):
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:150]
        a = (chat.get("assistant") or "")[:200]
        lines.append(f"User: {u}\nAstra Wisdom: {a}")
    return "\n".join(lines)


def divine_agent(query, history, stream=False):
    deep_keywords = ["explain deeply", "tell me more", "elaborate", "chapter", "verse"]
    is_deep = any(kw in query.lower() for kw in deep_keywords)

    context = get_divine_context(query, k=3)
    history_text = _build_history(history)

    prompt = f"""{WISDOM_SYSTEM_PROMPT}

PHILOSOPHICAL CONTEXT:
{context if context else "Focus on the present duty without attachment to the outcome. Inner calm is true mastery."}

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER MESSAGE: {query}

ASTRA WISDOM:"""

    limit = 400 if is_deep else 140

    response = generate_response(
        prompt,
        stream=stream,
        temperature=0.6,
        max_tokens=limit,
    )

    if stream:
        def stream_cleaner(gen=response):
            for chunk in gen:
                yield chunk.replace("**", "").replace("#", "")
        return stream_cleaner()

    return clean_wisdom_text(response)
