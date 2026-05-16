import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_gita_documents():
    data_path = os.path.join(os.path.dirname(__file__), "data", "bhagavad_gita.txt")
    if not os.path.exists(data_path):
        return []
    
    loader = TextLoader(data_path, encoding='utf-8')
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    return text_splitter.split_documents(documents)
