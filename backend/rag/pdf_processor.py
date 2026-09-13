"""
Universal document processor for Astra AI Docs.
Supported: PDF, DOCX, TXT, CSV (and plain text fallback).
Accepts files up to 30MB with robust multi-format chunking.
"""
import os
from pathlib import Path

# Safe imports for LangChain Document across versions
try:
    from langchain_core.documents import Document
except ImportError:
    try:
        from langchain.schema import Document
    except ImportError:
        class Document:
            def __init__(self, page_content: str, metadata: dict = None):
                self.page_content = page_content
                self.metadata = metadata or {}


def process_document(file_path: str):
    """
    Processes any supported document (PDF, DOCX, TXT, CSV) and returns LangChain Document chunks.
    Falls back gracefully to plain-text / direct loaders if community loaders are unavailable.
    """
    ext = Path(file_path).suffix.lower()
    docs = []

    try:
        if ext == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(file_path)
            pages_text = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join([p for p in pages_text if p.strip()])
            docs = [Document(page_content=text or "[Empty PDF]", metadata={"source": file_path, "pages": len(reader.pages)})]

        elif ext in (".docx", ".doc"):
            import docx2txt
            text = docx2txt.process(file_path) or ""
            docs = [Document(page_content=text or "[Empty DOCX]", metadata={"source": file_path})]

        elif ext == ".csv":
            import csv
            rows = []
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    rows.append(", ".join(row))
            docs = [Document(page_content="\n".join(rows) or "[Empty CSV]", metadata={"source": file_path})]

        elif ext in (".txt", ".md", ".rst"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            docs = [Document(page_content=text, metadata={"source": file_path})]

        else:
            # Generic fallback: try reading as UTF-8 text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            docs = [Document(page_content=text, metadata={"source": file_path})]

    except Exception as exc:
        raise ValueError(f"Could not process document '{file_path}': {exc}") from exc

    if not docs:
        docs = [Document(page_content="[Empty document]", metadata={"source": file_path})]

    # Efficient chunker: chunks documents into ~800 character windows with 100 character overlap
    chunks = []
    for doc in docs:
        text = doc.page_content or ""
        if not text.strip():
            continue
        start = 0
        step = 700  # 800 size with 100 overlap
        while start < len(text):
            chunk_txt = text[start : start + 800]
            if chunk_txt.strip():
                chunks.append(Document(page_content=chunk_txt, metadata=doc.metadata))
            start += step
        if not chunks and text.strip():
            chunks.append(Document(page_content=text, metadata=doc.metadata))

    return chunks if chunks else docs


# ── Backward-compatible alias used by main.py ────────────────────────────────
def process_pdf(file_path: str):
    """Legacy alias — now handles all document types, not just PDF."""
    return process_document(file_path)