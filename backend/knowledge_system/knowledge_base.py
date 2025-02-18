from typing import Dict, List, Optional
from pydantic import BaseModel

class JungianConcept(BaseModel):
    """Representa um conceito junguiano."""
    name: str
    description: str
    category: str
    related_concepts: List[str]
    examples: List[str]
    references: List[str]
    metadata: Dict[str, str]

class JungianArchetype(JungianConcept):
    """Representa um arquétipo junguiano."""
    symbols: List[str]
    manifestations: List[str]
    psychological_function: str

class TherapeuticProcess(BaseModel):
    """Representa um processo terapêutico junguiano."""
    name: str
    description: str
    stages: List[str]
    techniques: List[str]
    indications: List[str]
    contraindications: List[str]
    expected_outcomes: List[str]

class JungianKnowledgeBase:
    def __init__(self, vector_store):
        self.concepts: Dict[str, JungianConcept] = {}
        self.archetypes: Dict[str, JungianArchetype] = {}
        self.processes: Dict[str, TherapeuticProcess] = {}
        self.vector_store = vector_store
    
    async def query(self, query: str, max_results: int = 3) -> List[Dict]:
        """Realiza uma busca semântica na base de conhecimento."""
        try:
            results = self.vector_store.similarity_search(
                query=query,
                k=max_results
            )
            
            return [
                {
                    "title": doc.metadata.get("title", ""),
                    "content": doc.page_content,
                    "category": doc.metadata.get("category", ""),
                    "references": doc.metadata.get("references", []),
                    "confidence": 0.8  # TODO: Implementar cálculo de confiança
                }
                for doc in results
            ]
        except Exception as e:
            raise Exception(f"Erro ao realizar busca: {str(e)}")
    
    def add_concept(self, concept: JungianConcept) -> None:
        """Adiciona um conceito à base de conhecimento."""
        self.concepts[concept.name] = concept
    
    def add_archetype(self, archetype: JungianArchetype) -> None:
        """Adiciona um arquétipo à base de conhecimento."""
        self.archetypes[archetype.name] = archetype
    
    def add_process(self, process: TherapeuticProcess) -> None:
        """Adiciona um processo terapêutico à base de conhecimento."""
        self.processes[process.name] = process
    
    def get_concept(self, name: str) -> Optional[JungianConcept]:
        """Recupera um conceito pelo nome."""
        return self.concepts.get(name)
    
    def get_archetype(self, name: str) -> Optional[JungianArchetype]:
        """Recupera um arquétipo pelo nome."""
        return self.archetypes.get(name)
    
    def get_process(self, name: str) -> Optional[TherapeuticProcess]:
        """Recupera um processo terapêutico pelo nome."""
        return self.processes.get(name)
    
    def get_related_concepts(self, concept_name: str) -> List[JungianConcept]:
        """Recupera conceitos relacionados a um conceito específico."""
        concept = self.get_concept(concept_name)
        if not concept:
            return []
        return [
            self.get_concept(related_name)
            for related_name in concept.related_concepts
            if self.get_concept(related_name)
        ]
    
    def search_by_category(self, category: str) -> List[JungianConcept]:
        """Busca conceitos por categoria."""
        return [
            concept for concept in self.concepts.values()
            if concept.category == category
        ]
    
    def get_archetype_manifestations(self, archetype_name: str) -> List[str]:
        """Recupera manifestações de um arquétipo específico."""
        archetype = self.get_archetype(archetype_name)
        return archetype.manifestations if archetype else []
    
    def get_therapeutic_techniques(self) -> List[str]:
        """Recupera todas as técnicas terapêuticas disponíveis."""
        techniques = set()
        for process in self.processes.values():
            techniques.update(process.techniques)
        return list(techniques)

# Exemplo de uso:
def create_sample_knowledge_base() -> JungianKnowledgeBase:
    """Cria uma base de conhecimento de exemplo com alguns conceitos fundamentais."""
    kb = JungianKnowledgeBase()
    
    # Adiciona conceito de Individuação
    individuacao = JungianConcept(
        name="Individuação",
        description="Processo de desenvolvimento psicológico que visa à integração dos aspectos conscientes e inconscientes da psique.",
        category="Processo Psicológico",
        related_concepts=["Self", "Sombra", "Persona"],
        examples=[
            "Reconhecimento e integração da Sombra",
            "Desenvolvimento da personalidade autêntica",
            "Reconciliação de opostos psíquicos"
        ],
        references=["O Eu e o Inconsciente", "Psicologia e Alquimia"],
        metadata={
            "importance": "fundamental",
            "complexity": "high"
        }
    )
    kb.add_concept(individuacao)
    
    # Adiciona arquétipo da Sombra
    sombra = JungianArchetype(
        name="Sombra",
        description="Aspectos reprimidos ou negados da personalidade",
        category="Arquétipo",
        related_concepts=["Persona", "Individuação", "Inconsciente Pessoal"],
        examples=[
            "Projeção de aspectos negativos em outros",
            "Comportamentos compulsivos",
            "Sentimentos de culpa e vergonha"
        ],
        references=["Psicologia e Alquimia", "Aion"],
        metadata={
            "importance": "fundamental",
            "integration_priority": "high"
        },
        symbols=["Escuridão", "Figuras Sombrias", "Caverna"],
        manifestations=[
            "Comportamentos compensatórios",
            "Projeções negativas",
            "Complexos psicológicos"
        ],
        psychological_function="Integração de aspectos negados da personalidade"
    )
    kb.add_archetype(sombra)
    
    return kb 