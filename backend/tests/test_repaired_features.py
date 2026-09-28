import unittest
import os
import io
import shutil
import tempfile
from fastapi.testclient import TestClient

from main import app
from rag.pdf_processor import process_document
from rag.rag_chain import query_document_rag, ask_pdf
from rag.vector_store import create_vector_store
from agents.email_agent import generate_email_draft


class TestRepairedFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_dir = tempfile.mkdtemp(prefix="simha_test_")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir, ignore_errors=True)

    # ─────────────────────────────────────────────────────────────
    # 1. EMAIL COMPOSER TESTS
    # ─────────────────────────────────────────────────────────────
    def test_01_email_draft_schema_and_endpoints(self):
        """Test that both /generate-email and /generate-email-draft are active and functional."""
        payload = {
            "prompt": "Write a professional email requesting project approval.",
            "recipient_name": "Executive Board",
            "recipient_email": "board@company.com",
            "context": "Q3 product redesign deliverables",
            "tone": "professional",
            "additional_instructions": "Keep it concise.",
            "sender_name": "Narasimha",
            "user_email": "narasimha@simha.ai",
        }

        # Test /generate-email
        res1 = self.client.post("/generate-email", json=payload)
        self.assertEqual(res1.status_code, 200, f"/generate-email failed: {res1.text}")
        data1 = res1.json()
        self.assertIn("subject", data1)
        self.assertIn("body", data1)
        self.assertIn("tone", data1)
        self.assertTrue(len(data1["body"]) > 20)

        # Test /generate-email-draft (alias used by frontend)
        res2 = self.client.post("/generate-email-draft", json=payload)
        self.assertEqual(res2.status_code, 200, f"/generate-email-draft failed: {res2.text}")
        data2 = res2.json()
        self.assertIn("subject", data2)
        self.assertIn("body", data2)

    def test_02_email_agent_direct_call(self):
        """Direct unit test of generate_email_draft."""
        draft = generate_email_draft(
            prompt="Schedule team sync tomorrow at 10 AM",
            sender_name="Simha Engineer",
            recipient_name="Team Lead",
            recipient_email="lead@example.com",
            tone="urgent",
            additional_instructions="Mention room B3",
        )
        self.assertIsInstance(draft, dict)
        self.assertIn("subject", draft)
        self.assertIn("body", draft)
        self.assertEqual(draft["to"], "lead@example.com")
        self.assertIn("urgent", draft["tone"].lower())

    # ─────────────────────────────────────────────────────────────
    # 2. DOCUMENT UPLOAD & EXTRACTION METADATA TESTS
    # ─────────────────────────────────────────────────────────────
    def test_03_document_metadata_retention(self):
        """Verify that document chunking retains doc_id, filename, page, chunk_id, created_at."""
        sample_txt = os.path.join(self.test_dir, "sample.txt")
        with open(sample_txt, "w", encoding="utf-8") as f:
            f.write("Line 1: Simha AI knowledge base test.\nLine 2: Autonomous multi-agent framework.")

        chunks = process_document(sample_txt, filename="sample.txt", doc_id="doc_xyz_123")
        self.assertTrue(len(chunks) >= 1)
        meta = chunks[0].metadata

        self.assertEqual(meta["doc_id"], "doc_xyz_123")
        self.assertEqual(meta["filename"], "sample.txt")
        self.assertEqual(meta["page"], 1)
        self.assertIn("chunk_id", meta)
        self.assertIn("created_at", meta)

    def test_04_document_upload_api(self):
        """Test /upload-pdf endpoint with real multipart file upload."""
        file_content = b"Simha AI System Architecture Overview: High performance reactive frontend with FastAPI."
        files = {
            "file": ("architecture_doc.txt", io.BytesIO(file_content), "text/plain")
        }
        data = {
            "user_email": "architect@simha.ai",
            "chat_id": "workspace-default",
        }

        res = self.client.post("/upload-pdf", files=files, data=data)
        self.assertEqual(res.status_code, 200, f"Upload failed: {res.text}")
        payload = res.json()
        self.assertIn("doc_id", payload)
        self.assertIsNotNone(payload["doc_id"])
        self.assertEqual(payload["file_name"], "architecture_doc.txt")
        self.assertIn("pages", payload)
        self.assertEqual(payload["status"], "ready")

    # ─────────────────────────────────────────────────────────────
    # 3. DETERMINISTIC RAG RETRIEVAL TEST (MANDATED FACT)
    # ─────────────────────────────────────────────────────────────
    def test_05_deterministic_rag_retrieval(self):
        """
        Uploads a deterministic document containing:
        'Project Simha AI has a fictional test code: SIMHA-TEST-48291'
        and verifies that query retrieval finds this exact chunk and answers with it.
        """
        deterministic_doc = os.path.join(self.test_dir, "simha_spec.txt")
        secret_fact = "Project Simha AI has a fictional test code: SIMHA-TEST-48291"
        with open(deterministic_doc, "w", encoding="utf-8") as f:
            f.write(f"CONFIDENTIAL SPECIFICATION\n\n{secret_fact}\n\nAuthorized personnel only.")

        test_doc_id = "test_doc_48291"
        chunks = process_document(deterministic_doc, filename="simha_spec.txt", doc_id=test_doc_id)
        self.assertTrue(len(chunks) > 0)

        # Index into Chroma vector store
        create_vector_store(chunks)

        # Query Document RAG for the specific test code
        rag_output = query_document_rag(
            question="What is the test code?",
            doc_id=test_doc_id,
        )

        self.assertIsInstance(rag_output, dict)
        self.assertTrue(rag_output["chunks_found"] > 0, "No chunks were retrieved for the question.")
        self.assertTrue(len(rag_output["sources"]) > 0, "No sources/citations were generated.")

        # Verify source metadata
        src = rag_output["sources"][0]
        self.assertEqual(src["filename"], "simha_spec.txt")
        self.assertIn("similarity_score", src)

        # Verify that the retrieved response or context contains the secret code
        full_text = rag_output["response"]
        self.assertIn("SIMHA-TEST-48291", full_text, "Secret test code was missing from RAG response.")

    def test_06_rag_unanswerable_question(self):
        """Verify strict anti-hallucination when fact is not present in document."""
        # Query for something completely absent from any indexed doc
        rag_output = query_document_rag(
            question="What is the secret recipe for Martian blueberry cheesecake?",
            doc_id="non_existent_doc_id_9999",
        )
        self.assertIn("not found", rag_output["response"].lower())


if __name__ == "__main__":
    unittest.main()
