from llm import generate_response
from agents.system_prompt import SYSTEM_PROMPT

MAX_HISTORY_TURNS = 5  # Only use last 5 Q&A pairs to stay within token budget

def _build_history(history):
    """Build a compact history string, capped to avoid token overflow."""
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:400]   # truncate very long user msgs
        a = (chat.get("assistant") or "")[:600]  # truncate very long AI msgs
        lines.append(f"User: {u}\nAssistant: {a}")
    return "\n".join(lines)


def study_agent(query, history, stream=False):
    history_text = _build_history(history)

    prompt = f"""{SYSTEM_PROMPT}

ROLE: You are Simha AI, an expert educational tutor, academic mentor, and placement preparation assistant.

SPECIALIZATION: Aptitude, Machine Learning, AI, Placement Preparation, Computer Science, Engineering Subjects, Interview Preparation.

STUDY RULES:
1. Explain concepts clearly with proper headings, bullet points, and numbered lists.
2. Give concise answers unless detailed explanation is requested.
3. For one-mark questions use Question → Answer format.
4. For technical subjects: theory first, then examples.
5. Use simple, readable language like ChatGPT.
6. ALWAYS leave one blank line after headings.
7. Keep sections separated cleanly.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

ASSISTANT:"""

    return generate_response(prompt, stream=stream)