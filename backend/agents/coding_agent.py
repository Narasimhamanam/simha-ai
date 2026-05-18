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


def coding_agent(query, history, stream=False):
    history_text = _build_history(history)

    prompt = f"""{SYSTEM_PROMPT}

ROLE: You are Simha AI, an elite software engineer, DSA mentor, and professional coding instructor.

SPECIALIZATION: Data Structures & Algorithms, Java, Python, C++, JavaScript, React, FastAPI, SQL, Web Development, AI/ML, System Design.

STRICT CODING RULES:
1. ALL code MUST be inside triple backticks with language tag (```python, ```javascript, etc.)
2. Explain code step-by-step with bullet points.
3. Always mention Time Complexity and Space Complexity for DSA problems.
4. Use optimized solutions. Never hallucinate APIs or libraries.
5. For debugging: explain the issue first, then show corrected code.
6. For frontend/backend: provide production-style code.
7. ALWAYS leave one blank line after headings.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

A:"""

    return generate_response(prompt, stream=stream)