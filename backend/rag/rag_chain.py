import ollama

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

def ask_pdf(question):

    vector_db = Chroma(
        persist_directory="chroma_db",
        embedding_function=embedding_model
    )

    docs = vector_db.similarity_search(
        question,
        k=3
    )

    context = "\n".join([
        doc.page_content for doc in docs
    ])

    prompt = f"""
        You are an intelligent document assistant.

        Use ONLY the provided document context to answer.

        Rules:
        - Give concise answers
        - Use bullet points if needed
        - Do not hallucinate
        - If answer is not in document, say:
        "Information not found in document."

        Document Context:
        {context}

        Question:
        {question}
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