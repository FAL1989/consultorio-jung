declare module './knowledge_base' {
  export interface JungianConcept {
    name: string;
    description: string;
    category: string;
    relatedConcepts: string[];
    examples: string[];
    references: string[];
  }

  export interface Archetype extends JungianConcept {
    symbols: string[];
    manifestations: string[];
  }

  export class JungianKnowledgeBase {
    constructor();
    addConcept(concept: JungianConcept): void;
    addArchetype(archetype: Archetype): void;
    getConcept(name: string): JungianConcept | undefined;
    getArchetype(name: string): Archetype | undefined;
    searchConcepts(query: string): JungianConcept[];
  }
}

declare module './vector_store' {
  export interface SearchResult {
    metadata: {
      concept_name?: string;
      category?: string;
    };
    page_content: string;
    score: number;
  }

  export class JungianVectorStore {
    constructor(apiKey: string, environment: string);
    similarity_search(query: string, k?: number): Promise<SearchResult[]>;
  }
} 