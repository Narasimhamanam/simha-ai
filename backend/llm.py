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

        model="llama3-70b-8192",

        messages=[

            {

                "role": "user",

                "content": prompt

            }

        ],

        temperature=0.5,

        max_tokens=2048

    )

    return completion.choices[0].message.content