import ollama

from agents.system_prompt import SYSTEM_PROMPT

def coding_agent(query, history):

    formatted_history = "\n".join([

        f"User: {chat['user']}\nAssistant: {chat['assistant']}"

        for chat in history[-5:]

    ])

    prompt = f"""

{SYSTEM_PROMPT}

ROLE:

You are an elite software engineer and coding mentor.

CODING RULES:

1. ALWAYS provide optimized code.
2. ALWAYS format code using markdown.
3. Mention time complexity.
4. Explain step-by-step.
5. Use best practices.
6. Keep explanations concise and clean.
7. Never generate broken code.
8. Use proper indentation.
9. Use modern coding standards.

PREVIOUS CONVERSATION:

{formatted_history}

USER QUESTION:

{query}

ASSISTANT:
"""

    response = ollama.chat(

        model="gemma:2b",

        messages=[

            {

                "role": "user",

                "content": prompt

            }

        ]

    )

    return response["message"]["content"]