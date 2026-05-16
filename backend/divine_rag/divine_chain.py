from divine_rag.divine_vector_store import get_vector_store

def get_divine_context(query, k=3):
    """Retrieve relevant Gita verses for the query."""
    try:
        vector_store = get_vector_store()
        results = vector_store.similarity_search(query, k=k)
        
        context = ""
        for doc in results:
            context += f"\n--- Verse/Teaching ---\n{doc.page_content}\n"
        return context
    except Exception as e:
        print(f"[DIVINE RAG] Error retrieving context: {e}")
        return ""
