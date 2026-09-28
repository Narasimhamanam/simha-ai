"""
Simha AI Document RAG Chain.
Grounds query responses solely in uploaded user documents with citation tracking,
rich metadata retrieval, and comprehensive logging.
"""
import os
import re
from typing import Optional, List, Dict, Any
from llm import generate_response

_vector_db = None


def get_vector_db():
    global _vector_db
    if _vector_db is None:
        from langchain_chroma import Chroma
        from rag.vector_store import _get_embedding_model

        os.makedirs("chroma_db", exist_ok=True)
        _vector_db = Chroma(
            persist_directory="chroma_db",
            embedding_function=_get_embedding_model(),
        )
    return _vector_db


def query_document_rag(
    question: str,
    doc_id: Optional[str] = None,
    k: int = 4,
) -> Dict[str, Any]:
    """
    Retrieves grounded context for the query, logging all telemetry:
    query, retrieved chunks, similarity scores, document IDs, final prompt, and response.
    """
    clean_question = question.strip()
    if not clean_question:
        return {
            "response": "Please enter a valid question regarding your document.",
            "sources": [],
            "chunks_found": 0,
            "doc_id": doc_id,
        }

    vector_db = get_vector_db()

    # 1. Similarity Search with Chroma filter if doc_id provided
    results = []
    try:
        if doc_id and doc_id != "all":
            try:
                results = vector_db.similarity_search_with_score(
                    clean_question,
                    k=k,
                    filter={"doc_id": str(doc_id)},
                )
            except Exception as filter_err:
                print(f"[Simha RAG] Metadata filter search notice: {filter_err}")
                results = []
        else:
            results = vector_db.similarity_search_with_score(clean_question, k=k)
    except Exception as search_err:
        print(f"[Simha RAG] Vector search error: {search_err}")
        results = []

    # 2. Telemetry Logging (Audit compliance)
    print("=" * 60)
    print(f"[Simha RAG Telemetry]")
    print(f"Query: {clean_question}")
    print(f"Target Doc ID: {doc_id}")
    print(f"Retrieved Chunks: {len(results)}")

    sources: List[Dict[str, Any]] = []
    context_blocks: List[str] = []

    for idx, (doc, score) in enumerate(results):
        meta = doc.metadata or {}
        fn = meta.get("filename", "document")
        pg = meta.get("page", 1)
        cid = meta.get("chunk_id", f"c_{idx+1}")
        did = meta.get("doc_id", "unknown")
        score_val = float(score)

        print(f"  Chunk {idx+1}: doc_id={did} | filename={fn} | page={pg} | score={score_val:.4f}")

        # Build context block
        context_blocks.append(
            f"--- [Source: {fn} | Page: {pg} | Chunk: {cid}] ---\n{doc.page_content.strip()}"
        )

        # Build clean citation
        src_label = f"{fn} — Page {pg}" if pg else fn
        if not any(s["label"] == src_label for s in sources):
            sources.append({
                "label": src_label,
                "filename": fn,
                "page": pg,
                "chunk_id": cid,
                "doc_id": did,
                "similarity_score": round(score_val, 4),
            })

    context_str = "\n\n".join(context_blocks)

    if not results or not context_str.strip():
        response_text = "Information not found in the uploaded document."
        print(f"Final Model Response: {response_text}")
        print("=" * 60)
        return {
            "response": response_text,
            "sources": [],
            "chunks_found": 0,
            "doc_id": doc_id,
        }

    # 3. LLM Prompt Construction
    prompt = f"""You are Simha AI Document Intelligence (Simha Docs).
Answer the user's question accurately using ONLY the document context provided below.

STRICT GROUNDING RULES:
1. Base your answer STRICTLY on the facts stated in the DOCUMENT CONTEXT.
2. If the answer cannot be found in the document context, respond EXACTLY:
   "Information not found in the uploaded document."
3. Do not assume, extrapolate, or hallucinate outside the given text.
4. Keep answers clear, accurate, and concise with markdown formatting.
5. When relevant, reference the source document and page number.

DOCUMENT CONTEXT:
{context_str}

USER QUESTION:
{clean_question}

ANSWER:"""

    print(f"Final Prompt:\n{prompt}")

    # 4. Generate Answer via Router (with intelligent local extraction fallback)
    try:
        response_text = generate_response(
            prompt=prompt,
            temperature=0.1,
            max_tokens=1024,
        )
    except Exception as gen_err:
        print(f"[Simha RAG] Generator exception: {gen_err}")
        response_text = None

    # Fallback if API returned busy or error message
    if not response_text or "momentarily busy" in response_text:
        top_doc, top_score = results[0]
        # Query relevance check: verify distance threshold and token presence
        stop_words = {"what", "is", "the", "a", "an", "in", "of", "for", "to", "and", "or", "how", "why", "who", "where", "tell", "me", "about"}
        q_tokens = [w.lower() for w in re.findall(r"\w+", clean_question) if w.lower() not in stop_words and len(w) > 2]
        matches = [t for t in q_tokens if t in top_doc.page_content.lower()]

        # Score <= 1.2 is strongly relevant in L2 distance; require keyword match if score is higher
        if (matches or top_score <= 1.05) and top_score <= 1.30:
            response_text = f"Based on the document context:\n\n{top_doc.page_content.strip()}"
        else:
            response_text = "Information not found in the uploaded document."

    print(f"Model Response:\n{response_text}")
    print("=" * 60)

    return {
        "response": response_text,
        "sources": sources,
        "chunks_found": len(results),
        "doc_id": doc_id,
    }


def ask_pdf(question: str, doc_id: Optional[str] = None) -> str:
    """Backward-compatible entry point returning string response."""
    result = query_document_rag(question=question, doc_id=doc_id)
    return result["response"]
