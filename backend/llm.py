import os

from groq import Groq

from dotenv import load_dotenv

load_dotenv()

client = Groq(

    api_key=os.getenv(
        "GROQ_API_KEY"
    )

)

def generate_response(prompt, stream=False):

    completion = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[

            {

                "role": "user",

                "content": prompt

            }

        ],

        temperature=0.2,

        max_tokens=2048,

        stream=stream

    )

    if stream:
        def generator():
            for chunk in completion:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        return generator()

    return completion.choices[0].message.content