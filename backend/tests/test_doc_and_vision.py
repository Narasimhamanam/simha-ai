import unittest
import os
import tempfile
from rag.pdf_processor import process_document
from main import MAX_DOC_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES

class TestDocAndVision(unittest.TestCase):
    def test_size_limits(self):
        # 30MB = 30 * 1024 * 1024 = 31457280 bytes
        self.assertEqual(MAX_DOC_SIZE_BYTES, 30 * 1024 * 1024)
        # 20MB = 20 * 1024 * 1024 = 20971520 bytes
        self.assertEqual(MAX_IMAGE_SIZE_BYTES, 20 * 1024 * 1024)

    def test_text_doc_processing(self):
        temp_fd, temp_path = tempfile.mkstemp(suffix=".txt")
        with open(temp_fd, "w", encoding="utf-8") as f:
            f.write("Astra AI is an advanced AI SaaS platform for study, coding, and productivity.")

        try:
            chunks = process_document(temp_path)
            self.assertTrue(len(chunks) > 0)
            self.assertIn("Astra AI", chunks[0].page_content)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_csv_doc_processing(self):
        temp_fd, temp_path = tempfile.mkstemp(suffix=".csv")
        with open(temp_fd, "w", encoding="utf-8") as f:
            f.write("name,role,score\nAlice,Researcher,98\nBob,Engineer,95")

        try:
            chunks = process_document(temp_path)
            self.assertTrue(len(chunks) > 0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_docx_handling(self):
        import zipfile
        temp_fd, temp_path = tempfile.mkstemp(suffix=".docx")
        os.close(temp_fd)
        with zipfile.ZipFile(temp_path, "w") as z:
            z.writestr("word/document.xml", "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:body><w:p><w:r><w:t>Internship Project Report</w:t></w:r></w:p></w:body></w:document>")

        try:
            chunks = process_document(temp_path)
            self.assertTrue(len(chunks) > 0)
            self.assertIn("Internship Project Report", chunks[0].page_content)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

if __name__ == "__main__":
    unittest.main()
