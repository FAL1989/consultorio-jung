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
  private concepts: Map<string, JungianConcept>;
  private archetypes: Map<string, Archetype>;

  constructor() {
    this.concepts = new Map();
    this.archetypes = new Map();
    this.initializeKnowledge();
  }

  private initializeKnowledge(): void {
    // Adiciona conceitos fundamentais
    this.addConcept({
      name: "Individuação",
      description: "Processo de desenvolvimento psicológico que visa à integração dos aspectos conscientes e inconscientes da psique.",
      category: "Processo Psicológico",
      relatedConcepts: ["Self", "Sombra", "Persona"],
      examples: [
        "Reconhecimento e integração da Sombra",
        "Desenvolvimento da personalidade autêntica"
      ],
      references: ["O Eu e o Inconsciente", "Psicologia e Alquimia"]
    });

    // Adiciona arquétipos
    this.addArchetype({
      name: "Sombra",
      description: "Aspectos reprimidos ou negados da personalidade",
      category: "Arquétipo",
      relatedConcepts: ["Persona", "Individuação"],
      examples: [
        "Projeção de aspectos negativos em outros",
        "Comportamentos compulsivos"
      ],
      references: ["Psicologia e Alquimia", "Aion"],
      symbols: ["Escuridão", "Figuras Sombrias"],
      manifestations: [
        "Comportamentos compensatórios",
        "Projeções negativas"
      ]
    });
  }

  addConcept(concept: JungianConcept): void {
    this.concepts.set(concept.name, concept);
  }

  addArchetype(archetype: Archetype): void {
    this.archetypes.set(archetype.name, archetype);
  }

  getConcept(name: string): JungianConcept | undefined {
    return this.concepts.get(name);
  }

  getArchetype(name: string): Archetype | undefined {
    return this.archetypes.get(name);
  }

  searchConcepts(query: string): JungianConcept[] {
    const results: JungianConcept[] = [];
    // Converte o Map para Array antes de iterar
    Array.from(this.concepts.values()).forEach(concept => {
      if (
        concept.name.toLowerCase().includes(query.toLowerCase()) ||
        concept.description.toLowerCase().includes(query.toLowerCase())
      ) {
        results.push(concept);
      }
    });
    return results;
  }
} 