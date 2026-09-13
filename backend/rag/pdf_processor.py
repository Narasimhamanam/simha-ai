"""
Universal document processor for Astra AI Docs.
Supported: PDF, DOCX, TXT, CSV (and plain text fallback).
"""
import os
from pathlib import Path


def process_document(file_path: str):
    """
    Processes any supported document and returns LangChain Document chunks.
    Falls back to plain-text reading if extension is unrecognised.
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain.schema import Document

    ext = Path(file_path).suffix.lower()

    try:
        if ext == ".pdf":
            from langchain_community.document_loaders import PyPDFLoader
            loader = PyPDFLoader(file_path)
            docs = loader.load()

        elif ext in (".docx", ".doc"):
            from langchain_community.document_loaders import Docx2txtLoader
            loader = Docx2txtLoader(file_path)
            docs = loader.load()

        elif ext == ".csv":
            from langchain_community.document_loaders import CSVLoader
            loader = CSVLoader(file_path)
            docs = loader.load()

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

    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
    chunks = splitter.split_documents(docs)
    return chunks


# ── Backward-compatible alias used by main.py ────────────────────────────────
def process_pdf(file_path: str):
    """Legacy alias — now handles all document types, not just PDF."""
    return process_document(file_path)