"""
Universal document processor for Simha Docs.
Supported: PDF, DOCX, TXT, CSV, MD (and plain text fallback).
Accepts files up to 30MB with robust multi-format chunking and rich metadata tagging.
"""
import os
import datetime
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


def process_document(file_path: str, filename: str = "", doc_id: str = ""):
    """
    Processes any supported document (PDF, DOCX, TXT, CSV, MD) and returns LangChain Document chunks
    with complete metadata (doc_id, filename, page, chunk_id, created_at).
    """
    ext = Path(file_path).suffix.lower()
    doc_name = filename or Path(file_path).name
    current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_pages = []

    try:
        if ext == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(file_path)
            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1
                page_text = page.extract_text() or ""
                if page_text.strip():
                    raw_pages.append({
                        "text": page_text,
                        "page": page_num,
                    })

        elif ext in (".docx", ".doc"):
            import docx2txt
            text = docx2txt.process(file_path) or ""
            if text.strip():
                # Split large docx by double newlines into approximate sections/pages
                sections = [s.strip() for s in text.split("\n\n\n") if s.strip()]
                if not sections:
                    sections = [text]
                for sec_idx, sec in enumerate(sections):
                    raw_pages.append({"text": sec, "page": sec_idx + 1})

        elif ext == ".csv":
            import csv
            rows = []
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    rows.append(", ".join(row))
            # Group every 50 CSV rows into a page/section
            step = 50
            for page_idx in range(0, max(1, len(rows)), step):
                chunk_rows = rows[page_idx : page_idx + step]
                if chunk_rows:
                    raw_pages.append({"text": "\n".join(chunk_rows), "page": (page_idx // step) + 1})

        elif ext in (".txt", ".md", ".rst"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            if text.strip():
                raw_pages.append({"text": text, "page": 1})

        else:
            # Generic fallback: read as UTF-8 text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            if text.strip():
                raw_pages.append({"text": text, "page": 1})

    except Exception as exc:
        raise ValueError(f"Could not extract content from '{file_path}': {exc}") from exc

    if not raw_pages:
        raw_pages = [{"text": "[Empty or unreadable document]", "page": 1}]

    # Chunking: 800 character window with 120 character overlap, retaining page metadata
    chunks = []
    chunk_counter = 0

    for page_entry in raw_pages:
        page_num = page_entry["page"]
        text = page_entry["text"].strip()
        if not text:
            continue

        start = 0
        step = 680  # 800 window, 120 overlap
        while start < len(text):
            chunk_txt = text[start : start + 800].strip()
            if chunk_txt:
                chunk_counter += 1
                chunk_meta = {
                    "source": file_path,
                    "filename": doc_name,
                    "doc_id": str(doc_id) if doc_id else "default",
                    "page": page_num,
                    "chunk_id": f"{doc_id}_{chunk_counter}" if doc_id else str(chunk_counter),
                    "created_at": current_time,
                }
                chunks.append(Document(page_content=chunk_txt, metadata=chunk_meta))
            start += step

    if not chunks:
        chunk_meta = {
            "source": file_path,
            "filename": doc_name,
            "doc_id": str(doc_id) if doc_id else "default",
            "page": 1,
            "chunk_id": f"{doc_id}_1" if doc_id else "1",
            "created_at": current_time,
        }
        chunks.append(Document(page_content=raw_pages[0]["text"][:800], metadata=chunk_meta))

    return chunks


# Backward-compatible alias
def process_pdf(file_path: str, filename: str = "", doc_id: str = ""):
    return process_document(file_path, filename=filename, doc_id=doc_id)