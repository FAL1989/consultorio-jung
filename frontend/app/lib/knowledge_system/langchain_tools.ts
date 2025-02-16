import type { JungianKnowledgeBase } from './knowledge_base';
import type { JungianVectorStore, SearchResult } from './vector_store';

interface Reference {
  title: string;
  author: string;
  year: string;
}

export class JungianAnalyst {
  constructor(
    private knowledgeBase: JungianKnowledgeBase,
    private vectorStore: JungianVectorStore
  ) {}

  async get_relevant_references(text: string): Promise<Reference[]> {
    // Busca referências relevantes baseadas no texto
    const searchResults = await this.vectorStore.similarity_search(text, 2);
    
    // Mapeia os resultados para referências
    const references: Reference[] = searchResults.map((result: SearchResult) => ({
      title: result.metadata.concept_name || "Obra de Jung",
      author: "Carl Gustav Jung",
      year: result.metadata.category === "Processo Psicológico" ? "1964" : "1944"
    }));

    // Adiciona referências fixas se necessário
    if (references.length < 2) {
      references.push({
        title: "O Homem e seus Símbolos",
        author: "Carl Gustav Jung",
        year: "1964"
      });
    }

    return references;
  }
} 