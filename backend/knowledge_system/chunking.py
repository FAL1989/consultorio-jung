from typing import List, Dict, Any
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
import re

class JungianTextProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=[
                "\n## ",  # Seções principais
                "\n### ",  # Subseções
                "\n\n",    # Parágrafos
                "\n",      # Linhas
                ". ",      # Sentenças
                " ",       # Palavras
                ""        # Caracteres
            ]
        )
    
    def extract_metadata(self, text: str) -> Dict[str, Any]:
        """Extrai metadados do texto."""
        metadata = {
            "categories": [],
            "concepts": [],
            "references": []
        }
        
        # Extrai categorias (títulos de seção)
        categories = re.findall(r'\n## (.*?)\n', text)
        metadata["categories"] = categories
        
        # Extrai conceitos (palavras-chave em negrito)
        concepts = re.findall(r'\*\*(.*?)\*\*', text)
        metadata["concepts"] = list(set(concepts))
        
        # Extrai referências (citações)
        references = re.findall(r'\[(\d+)\]', text)
        metadata["references"] = list(set(references))
        
        return metadata
    
    def process_text(self, text: str) -> List[Document]:
        """Processa o texto em chunks com metadados."""
        # Extrai metadados globais
        global_metadata = self.extract_metadata(text)
        
        # Divide o texto em chunks
        chunks = self.text_splitter.split_text(text)
        
        documents = []
        for i, chunk in enumerate(chunks):
            # Extrai metadados específicos do chunk
            chunk_metadata = self.extract_metadata(chunk)
            
            # Combina com metadados globais
            metadata = {
                "chunk_id": i,
                "total_chunks": len(chunks),
                "global_categories": global_metadata["categories"],
                "global_concepts": global_metadata["concepts"],
                "global_references": global_metadata["references"],
                "local_categories": chunk_metadata["categories"],
                "local_concepts": chunk_metadata["concepts"],
                "local_references": chunk_metadata["references"]
            }
            
            documents.append(Document(
                page_content=chunk,
                metadata=metadata
            ))
        
        return documents
    
    def process_section(self, section_title: str, section_text: str) -> List[Document]:
        """Processa uma seção específica do texto."""
        # Adiciona metadados específicos da seção
        metadata = {
            "section_title": section_title,
            "section_type": "main" if section_title.startswith("## ") else "sub"
        }
        
        # Processa o texto da seção
        documents = self.process_text(section_text)
        
        # Adiciona metadados da seção a todos os documentos
        for doc in documents:
            doc.metadata.update(metadata)
        
        return documents
    
    def extract_sections(self, text: str) -> Dict[str, str]:
        """Extrai seções do texto."""
        sections = {}
        current_section = ""
        current_content = []
        
        for line in text.split("\n"):
            if line.startswith("## "):
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = line[3:].strip()
                current_content = [line]
            else:
                current_content.append(line)
        
        if current_section:
            sections[current_section] = "\n".join(current_content)
        
        return sections
    
    def process_research_paper(self, text: str) -> List[Document]:
        """Processa um artigo de pesquisa completo."""
        # Extrai seções
        sections = self.extract_sections(text)
        
        documents = []
        for section_title, section_text in sections.items():
            section_docs = self.process_section(section_title, section_text)
            documents.extend(section_docs)
        
        return documents
    
    def extract_key_concepts(self, documents: List[Document]) -> List[str]:
        """Extrai conceitos-chave de um conjunto de documentos."""
        concepts = set()
        for doc in documents:
            concepts.update(doc.metadata.get("local_concepts", []))
            concepts.update(doc.metadata.get("global_concepts", []))
        
        return list(concepts)
    
    def extract_citations(self, documents: List[Document]) -> List[str]:
        """Extrai citações de um conjunto de documentos."""
        citations = set()
        for doc in documents:
            citations.update(doc.metadata.get("local_references", []))
            citations.update(doc.metadata.get("global_references", []))
        
        return list(citations)
    
    def get_section_summary(self, documents: List[Document], section_title: str) -> str:
        """Obtém um resumo de uma seção específica."""
        section_docs = [
            doc for doc in documents
            if doc.metadata.get("section_title") == section_title
        ]
        
        if not section_docs:
            return f"Seção '{section_title}' não encontrada."
        
        # Combina o conteúdo dos documentos da seção
        content = "\n".join(doc.page_content for doc in section_docs)
        
        # Extrai conceitos e referências específicos da seção
        concepts = set()
        references = set()
        for doc in section_docs:
            concepts.update(doc.metadata.get("local_concepts", []))
            references.update(doc.metadata.get("local_references", []))
        
        summary = f"""
        Seção: {section_title}
        
        Conceitos principais: {', '.join(concepts)}
        Referências: {', '.join(references)}
        
        Conteúdo:
        {content}
        """
        
        return summary 