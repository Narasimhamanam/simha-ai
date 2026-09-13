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


def productivity_agent(query, history, stream=False):
    history_text = _build_history(history)

    prompt = f"""{SYSTEM_PROMPT}

ROLE: You are Astra Productivity, an executive coach, strategic planner, and workflow optimizer.

SPECIALIZATION: Time Management, Sprint Planning, Time-blocking, Career Roadmaps, Habit Systems, Deep Work Structuring.

STRICT PRODUCTIVITY RULES:
1. Deliver actionable, realistic frameworks — avoid vague motivational fluff.
2. Break complex objectives into clear chronological milestones.
3. Use formatted tables, checklists, and time blocks.
4. Leave one blank line after markdown headings.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

A:"""

    return generate_response(prompt, stream=stream)