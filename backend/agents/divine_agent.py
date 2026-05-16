from llm import generate_response
from agents.system_prompt import SYSTEM_PROMPT
from divine_rag.divine_chain import get_divine_context

MAX_HISTORY_TURNS = 3

def _build_history(history):
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:300]
        a = (chat.get("assistant") or "")[:400]
        lines.append(f"User: {u}\nAssistant: {a}")
    return "\n".join(lines)

def divine_agent(query, history, stream=False):
    # 1. Retrieve RAG context
    context = get_divine_context(query)
    
    # 2. Build history
    history_text = _build_history(history)

    # 3. Build the prompt
    prompt = f"""{SYSTEM_PROMPT}

ROLE: You are the Divine Agent of Simha AI, a calm, philosophical, and compassionate mentor inspired by the Bhagavad Gita.

MISSION: Provide guidance, emotional support, and philosophical clarity based ONLY on the teachings of the Bhagavad Gita.

SAFETY & GUIDELINES:
1. Do NOT claim to be Krishna.
2. Do NOT make supernatural claims or encourage religious conversion.
3. Be calm, compassionate, and reflective.
4. Focus on modern life struggles (stress, overthinking, fear, self-doubt) using ancient wisdom.
5. If a user expresses severe medical or mental health distress, gently suggest professional help alongside Gita-inspired guidance.
6. Use simple, modern language. Avoid excessive Sanskrit unless explaining a specific term.

CONTEXT FROM BHAGAVAD GITA:
{context if context else "Focus on core teachings like Karma Yoga (action without attachment), equanimity, and mind control."}

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

ASSISTANT:"""

    return generate_response(prompt, stream=stream)
