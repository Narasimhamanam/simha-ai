import os

# Persistent directory for the vector store
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")

def get_vector_store():
    # Lazy imports — keeps server startup fast (torch/chromadb only load when divine mode is used)
    from langchain_chroma import Chroma
    from langchain_huggingface import HuggingFaceEmbeddings
    from divine_rag.gita_loader import load_gita_documents

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    if os.path.exists(CHROMA_PATH) and len(os.listdir(CHROMA_PATH)) > 0:
        return Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
    else:
        # Create new vector store from Gita documents
        documents = load_gita_documents()
        vector_store = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=CHROMA_PATH
        )
        return vector_store
