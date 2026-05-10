from langchain_chroma import Chroma

from langchain_huggingface import (
    HuggingFaceEmbeddings
)

from llm import generate_response

embedding_model = HuggingFaceEmbeddings(

    model_name=
    "sentence-transformers/all-MiniLM-L6-v2"

)

def ask_pdf(question):

    vector_db = Chroma(

        persist_directory="chroma_db",

        embedding_function=
        embedding_model

    )

    docs = vector_db.similarity_search(

        question,

        k=3

    )

    context = "\n".join([

        doc.page_content

        for doc in docs

    ])

    prompt = f"""

You are Simha AI,
an intelligent document assistant.

STRICT RULES:

1. Use ONLY document context.
2. Never hallucinate.
3. If answer missing:
   say:
   "Information not found in document."
4. Keep answers concise.
5. Use markdown formatting.
6. Use bullet points when useful.
7. Make response readable.

DOCUMENT CONTEXT:

{context}

QUESTION:

{question}

ANSWER:

"""

    response = generate_response(prompt)

    return response