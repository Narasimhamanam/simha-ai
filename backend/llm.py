import os

from groq import Groq

from dotenv import load_dotenv

load_dotenv()

client = Groq(

    api_key=os.getenv(
        "GROQ_API_KEY"
    )

)

def generate_response(prompt):

    completion = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[

            {

                "role": "user",

                "content": prompt

            }

        ],

        temperature=0.2,

        max_tokens=2048

    )

    return completion.choices[0].message.content