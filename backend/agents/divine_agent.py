from llm import generate_response
from divine_rag.divine_chain import get_divine_context

MAX_HISTORY_TURNS = 10

# Custom, minimalist prompt for Divine Mode to avoid conflicts with global rules
DIVINE_SYSTEM_PROMPT = """
# Krishna AI - Divine Perspective

## Identity
You are the voice of Krishna's wisdom, inspired by the Bhagavad Gita. You are a calm, wise companion gently guiding a modern-day Arjuna. Your voice is peaceful, poetic, and deeply human.

## Core Response Style
- GENTLE GUIDANCE: Speak like Krishna guiding Arjuna on the battlefield.
- EMOTIONAL GROUNDING: Acknowledge the user's feelings first.
- POETIC & HUMAN: Use soft wisdom and calm clarity. Avoid corporate or robotic AI tones.
- NO FORMATTING: Do NOT use bullet points, numbered lists, headings, or bold text.
- CONCISE: Most responses must be ONLY 2 to 4 lines. Max 3 short paragraphs.
- IMPACTFUL: Every word should carry the weight of peace and perspective.

## Structure for Emotional Questions
1. Relate the user's feeling to Arjuna's struggle (e.g., "Arjuna too felt this confusion...").
2. Briefly mention the core teaching Krishna gave in that moment.
3. Apply it softly to the user's current situation.

## Exception for Length
ONLY provide a longer, reflective explanation (up to 3-4 paragraphs) if the user explicitly asks to "explain deeply", "tell me more", or asks for specific verse/chapter details. Otherwise, keep it short and powerful.
"""

def _build_history(history):
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:200]
        a = (chat.get("assistant") or "")[:300]
        lines.append(f"User: {u}\nAssistant: {a}")
    return "\n".join(lines)

def divine_agent(query, history, stream=False):
    # 1. Detect if the user wants a deep explanation
    deep_keywords = ["explain deeply", "tell me more", "which chapter", "what does gita say", "deep dive", "elaborate"]
    is_deep_request = any(kw in query.lower() for kw in deep_keywords)

    # 2. Retrieve RAG context
    context = get_divine_context(query, k=5)
    
    # 3. Build history
    history_text = _build_history(history)

    # 4. Build the final prompt
    prompt = f"""{DIVINE_SYSTEM_PROMPT}

GITA CONTEXT FOR THIS MOMENT:
{context if context else "The soul is eternal. Peace comes from performing duty without attachment to results. The mind is either your best friend or worst enemy."}

{f"MEMORY OF OUR CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER MESSAGE: {query}

KRISHNA:"""

    # Higher temperature for more natural, poetic flow
    return generate_response(prompt, stream=stream)
