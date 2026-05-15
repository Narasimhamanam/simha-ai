from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

_embedding_model = None

def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _embedding_model

def create_vector_store(chunks):
    vector_db = Chroma.from_documents(
        documents=chunks,
        embedding=_get_embedding_model(),
        persist_directory="chroma_db"
    )
    return vector_db