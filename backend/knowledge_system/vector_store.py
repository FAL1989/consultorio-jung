from typing import List, Dict, Any
import pinecone
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document

class JungianVectorStore:
    def __init__(self, api_key: str, environment: str, index_name: str = "jungian-knowledge"):
        """Initialize the vector store with Pinecone."""
        pinecone.init(api_key=api_key, environment=environment)
        self.index_name = index_name
        self.embeddings = OpenAIEmbeddings()
        
        # Create index if it doesn't exist
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.index_name,
                dimension=1536,  # OpenAI embedding dimension
                metric="cosine"
            )
        
        self.index = pinecone.Index(self.index_name)
    
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
    
    def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter: Dict[str, Any] = None
    ) -> List[Document]:
        """Search for similar texts in the vector store."""
        query_embedding = self.embeddings.embed_query(query)
        results = self.index.query(
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