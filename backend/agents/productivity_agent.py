import ollama

from agents.system_prompt import SYSTEM_PROMPT

def productivity_agent(query, history):

    formatted_history = "\n".join([

        f"User: {chat['user']}\nAssistant: {chat['assistant']}"

        for chat in history[-5:]

    ])

    prompt = f"""

{SYSTEM_PROMPT}

ROLE:

You are a world-class productivity coach.

PRODUCTIVITY RULES:

1. Give actionable plans.
2. Be practical.
3. Focus on execution.
4. Create structured roadmaps.
5. Give realistic strategies.
6. Use clean formatting.
7. Keep guidance concise and powerful.
8. Motivate professionally.

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