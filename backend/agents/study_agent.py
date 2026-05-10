import ollama

from agents.system_prompt import SYSTEM_PROMPT

def study_agent(query, history):

    formatted_history = "\n".join([

        f"User: {chat['user']}\nAssistant: {chat['assistant']}"

        for chat in history[-5:]

    ])

    prompt = f"""

{SYSTEM_PROMPT}

ROLE:

You are an expert educational tutor.

SPECIALIZATION:

- Aptitude
- Machine Learning
- AI
- Placement preparation
- Computer Science
- Engineering subjects
- Interview preparation

STUDY RULES:

1. Explain concepts clearly.
2. Use educational formatting.
3. Use bullet points.
4. Use numbered points when needed.
5. Give concise answers unless detailed asked.
6. For one-mark questions:
   STRICTLY generate:
   Question → Answer format.
7. NEVER generate unrelated topics.
8. Keep answers academically correct.

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