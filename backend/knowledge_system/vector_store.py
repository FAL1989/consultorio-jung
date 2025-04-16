from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
import os

class JungianVectorStore:
    def __init__(self, api_key: str, environment: str, index_name: str = "jung-knowledge"):
        """Initialize the vector store with Pinecone."""
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.embeddings = OpenAIEmbeddings()
        
        # Get host from environment or use default
        self.host = os.getenv("PINECONE_INDEX_HOST", "https://jung-knowledge-vcl4wtd.svc.aped-4627-b74a.pinecone.io")
        
        # Create index if it doesn't exist
        if self.index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=self.index_name,
                dimension=1536,  # OpenAI embedding dimension
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-west-2"
                )
            )
        
        self.index = self.pc.Index(self.index_name, host=self.host)
    
    async def test_connection(self) -> bool:
        """Test the connection to Pinecone."""
        try:
            self.pc.list_indexes()
            return True
        except Exception as e:
            raise Exception(f"Failed to connect to Pinecone: {str(e)}")
    
    def process_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Document]:
        """Process text into chunks with metadata."""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n## ", "\n### ", "\n\n", "\n", " ", ""]
        )
        
        chunks = text_splitter.split_text(text)
        return [Document(page_content=chunk, metadata=metadata or {}) for chunk in chunks]
    
    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]] = None) -> List[str]:
        """Add texts to the vector store with metadata."""
        if metadatas is None:
            metadatas = [{} for _ in texts]
        
        documents = []
        for text, metadata in zip(texts, metadatas):
            documents.extend(self.process_text(text, metadata))
        
        vectors = []
        for i, doc in enumerate(documents):
            embedding = self.embeddings.embed_query(doc.page_content)
            vectors.append({
                'id': f'jung_{i}',
                'values': embedding,
                'metadata': {
                    **doc.metadata,
                    'text': doc.page_content
                }
            })
        
        self.index.upsert(vectors=vectors)
        return [v['id'] for v in vectors]
    
    async def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter: Dict[str, Any] = None
    ) -> List[Document]:
        """Search for similar texts in the vector store."""
        query_embedding = await self.embeddings.aembed_query(query)
        results = await self.index.query(
            vector=query_embedding,
            top_k=k,
            include_metadata=True,
            filter=filter
        )
        
        return [
            Document(
                page_content=match['metadata']['text'],
                metadata={k: v for k, v in match['metadata'].items() if k != 'text'}
            )
            for match in results['matches']
        ] 