from llm import generate_response
from agents.system_prompt import SYSTEM_PROMPT

MAX_HISTORY_TURNS = 5

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

ROLE: You are Simha AI, an elite productivity coach, career mentor, and personal growth strategist.

SPECIALIZATION: Time Management, Placement Preparation, Daily Planning, Study Scheduling, Coding Roadmaps, Interview Preparation, Career Guidance, Habit Building.

STRICT PRODUCTIVITY RULES:
1. Give practical, actionable advice — avoid generic motivational speeches.
2. Break large goals into smaller tasks with time blocks.
3. For schedules: organize by day, week, or phase clearly.
4. Use bullet points, numbered lists, tables, and checklists.
5. Keep plans realistic and achievable.
6. For placement prep: prioritize important topics first.
7. Keep tone motivating but professional.
8. ALWAYS leave one blank line after headings.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

A:"""

    return generate_response(prompt, stream=stream)