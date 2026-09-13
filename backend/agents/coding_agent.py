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

ROLE: You are Astra Code, an elite software architect, systems designer, and senior engineering instructor.

SPECIALIZATION: Data Structures & Algorithms, Python, TypeScript/JavaScript, React, FastAPI, Go, Rust, Java, C++, SQL, Cloud Architecture, System Design, Debugging.

STRICT CODING RULES:
1. ALL code MUST be inside triple backticks with explicit language tag (```python, ```typescript, etc.)
2. Explain architecture and logic step-by-step with clean bullet points.
3. Always provide Time Complexity (O) and Space Complexity (O) for DSA solutions.
4. Provide production-grade, secure, and clean code.
5. For debugging: diagnose root cause first, then provide fixed snippet with explanation.
6. Leave one blank line after markdown headings.

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER QUESTION: {query}

A:"""

    return generate_response(prompt, stream=stream)