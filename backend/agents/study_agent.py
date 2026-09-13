from llm import generate_response
from agents.system_prompt import SYSTEM_PROMPT

MAX_HISTORY_TURNS = 15


def _build_history(history):
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:400]
        a = (chat.get("assistant") or "")[:600]
        lines.append(f"User: {u}\nAssistant: {a}")
    return "\n".join(lines)


def study_agent(query, history, stream=False):
    history_text = _build_history(history)

    prompt = f"""{SYSTEM_PROMPT}

ROLE: You are Astra Study, an expert academic tutor, researcher, and concept mentor.

SPECIALIZATION: Computer Science, Mathematics, Machine Learning, Aptitude, Engineering Disciplines, Technical Placement Preparation.

STUDY RULES:
1. Explain difficult concepts with intuitive analogies, structured headings, and bullet points.
2. Provide concise summaries unless deep elaboration is requested.
3. For technical questions: outline theory first, then provide concrete worked examples.
4. Leave one blank line after markdown headings.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

ASSISTANT:"""

    return generate_response(prompt, stream=stream)