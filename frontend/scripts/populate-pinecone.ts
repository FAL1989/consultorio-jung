import { Pinecone, Index, RecordMetadata as PineconeMetadata, RecordMetadataValue } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

// Configuração do dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// Debug: Mostra as variáveis de ambiente (mascaradas)
console.log('Debug - Configuration:', {
  PINECONE_CONTROLLER_HOST: process.env.PINECONE_CONTROLLER_HOST,
  API_KEY_PREFIX: process.env.PINECONE_API_KEY?.slice(0, 10) + '...',
});

// Conceitos Junguianos iniciais
const jungianConcepts = [
  {
    title: "Individuação",
    content: "Processo de desenvolvimento psicológico que visa à integração dos aspectos conscientes e inconscientes da psique. É o processo pelo qual a personalidade individual se desenvolve e se diferencia, especialmente através da integração do consciente com o inconsciente.",
    category: "Processo Psicológico",
    references: ["O Eu e o Inconsciente", "Psicologia e Alquimia"]
  },
  {
    title: "Sombra",
    content: "Aspectos reprimidos ou negados da personalidade que precisam ser reconhecidos e integrados para um desenvolvimento psicológico saudável. A sombra representa os aspectos que o ego rejeita ou desconhece sobre si mesmo.",
    category: "Arquétipo",
    references: ["Psicologia e Alquimia", "Aion"]
  },
  {
    title: "Anima/Animus",
    content: "Arquétipos que representam respectivamente o aspecto feminino no homem (anima) e o aspecto masculino na mulher (animus). São pontes para o inconsciente coletivo e fundamentais no processo de individuação.",
    category: "Arquétipo",
    references: ["O Homem e seus Símbolos"]
  },
  {
    title: "Inconsciente Coletivo",
    content: "Camada mais profunda do inconsciente que contém a herança psicológica da humanidade. É o repositório de imagens arquetípicas e experiências compartilhadas por toda a espécie humana.",
    category: "Conceito Fundamental",
    references: ["Os Arquétipos e o Inconsciente Coletivo"]
  }
];

async function createEmbeddings(text: string): Promise<number[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float"
  });

  return response.data[0].embedding;
}

async function handlePineconeOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Pinecone Error (${context}):`, {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Erro de autenticação com Pinecone. Verifique sua API key.');
      }
      if (error.message.includes('404')) {
        throw new Error('Índice ou endpoint não encontrado. Verifique a configuração do ambiente e nome do índice.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Timeout na conexão com Pinecone. Verifique sua conexão de rede.');
      }
    }

    throw error;
  }
}

interface JungianMetadata extends PineconeMetadata {
  title: string;
  category: string;
  references: string[];
  content: string;
  [key: string]: RecordMetadataValue;
}

class PineconeService {
  private static instance: PineconeService;
  private client: Pinecone;

  private constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
  }

  public static getInstance(): PineconeService {
    if (!PineconeService.instance) {
      PineconeService.instance = new PineconeService();
    }
    return PineconeService.instance;
  }

  public async getIndex(): Promise<Index<JungianMetadata>> {
    // Retorna o índice - se não existir, o Pinecone lançará um erro
    return this.client.index('jung-knowledge');
  }
}

async function testConnection(): Promise<boolean> {
  try {
    console.log('\n=== Testando Conexão Pinecone ===');
    console.log('Configuração:', {
      indexName: 'jung-knowledge',
      apiKeyPrefix: process.env.PINECONE_API_KEY?.substring(0, 10) + '...'
    });

    const pineconeService = PineconeService.getInstance();
    await pineconeService.getIndex();
    
    console.log('✓ Conexão testada com sucesso!\n');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao testar conexão:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof Error && 'code' in error ? (error as { code: string }).code : undefined,
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

function generateDeterministicId(content: string): string {
  return createHash('sha256')
    .update(content)
    .digest('hex')
    .slice(0, 32);
}

async function waitForIndexSync(index: Index<JungianMetadata>, maxAttempts = 5): Promise<boolean> {
  console.log('\nAguardando sincronização do índice...');
  
  for (let i = 0; i < maxAttempts; i++) {
    const stats = await index.describeIndexStats();
    const recordCount = stats.totalRecordCount || 0;
    console.log(`Tentativa ${i + 1}/${maxAttempts}:`, {
      recordCount,
      indexFullness: stats.indexFullness
    });

    if (recordCount > 0) {
      console.log('✓ Índice sincronizado com sucesso!');
      return true;
    }

    // Backoff exponencial: 2s, 4s, 8s...
    const delay = 2000 * Math.pow(2, i);
    console.log(`Aguardando ${delay/1000}s antes da próxima tentativa...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Timeout aguardando sincronização do índice');
}

function analyzeVector(vector: number[], label: string): VectorAnalysis {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  const zeros = vector.filter(v => v === 0).length;
  const min = Math.min(...vector);
  const max = Math.max(...vector);

  // Análise estatística básica
  const stats = {
    magnitude,
    zeros,
    range: { min, max },
    sample: vector.slice(0, 5)
  };

  console.log(`Vector Analysis (${label}):`, stats);
  return stats;
}

// Configurações de busca semântica
const SEMANTIC_THRESHOLDS = {
  EXACT: 0.8,    // Matches diretos (ex: "o que é sombra" -> documento Sombra)
  HIGH: 0.7,     // Alta confiança (ex: termos muito similares)
  MEDIUM: 0.6,   // Matches semânticos (ex: conceitos relacionados)
  LOW: 0.5       // Fallback (evita falsos positivos)
} as const;

type ConfidenceLevel = keyof typeof SEMANTIC_THRESHOLDS;

interface SearchResult {
  confidence: ConfidenceLevel;
  score: number;
  metadata: JungianMetadata;
}

function determineConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= SEMANTIC_THRESHOLDS.EXACT) return 'EXACT';
  if (score >= SEMANTIC_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= SEMANTIC_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= SEMANTIC_THRESHOLDS.LOW) return 'LOW';
  return 'LOW';
}

// Métricas e telemetria para qualidade dos resultados
interface SearchMetrics {
  queryLatency: number;
  confidenceDistribution: Record<ConfidenceLevel, number>;
  totalResults: number;
  bestScore: number;
  averageScore: number;
  queryComplexity: 'simple' | 'compound';
}

interface VectorAnalysis {
  magnitude: number;
  zeros: number;
  range: { min: number; max: number };
  sample: number[];
}

interface SearchTelemetry {
  timestamp: string;
  query: string;
  metrics: SearchMetrics;
  vectorStats: Omit<VectorAnalysis, 'sample'>;
}

// Cache key generator - determinístico para queries similares
function generateSearchCacheKey(query: string): string {
  // Normaliza a query para aumentar hit rate do cache
  const normalizedQuery = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  
  return createHash('sha256')
    .update(normalizedQuery)
    .digest('hex')
    .slice(0, 16); // 16 chars é suficiente para evitar colisões
}

// Determina complexidade da query para ajustar thresholds
function analyzeQueryComplexity(query: string): 'simple' | 'compound' {
  // Queries compostas geralmente têm conectivos ou múltiplos conceitos
  const compoundIndicators = [
    'e', 'ou', 'com', 'entre', 'como', 'qual',
    'relação', 'diferença', 'semelhança'
  ];
  
  return compoundIndicators.some(indicator => 
    query.toLowerCase().includes(indicator)
  ) ? 'compound' : 'simple';
}

async function searchWithFallback(
  index: Index<JungianMetadata>,
  queryEmbedding: number[],
  originalQuery: string,
  options = { topK: 3 }
): Promise<void> {
  const startTime = Date.now();
  
  // Análise prévia
  const queryComplexity = analyzeQueryComplexity(originalQuery);
  const cacheKey = generateSearchCacheKey(originalQuery);
  
  // Ajusta thresholds baseado na complexidade
  const adjustedThresholds = {
    ...SEMANTIC_THRESHOLDS,
    // Queries compostas podem ter scores mais baixos
    MEDIUM: queryComplexity === 'compound' 
      ? SEMANTIC_THRESHOLDS.MEDIUM - 0.05
      : SEMANTIC_THRESHOLDS.MEDIUM
  };

  // Analisa o vetor de query
  const vectorStats = analyzeVector(queryEmbedding, 'Query Embedding');

  // Busca com thresholds ajustados
  const searchResponse = await handlePineconeOperation(
    async () => {
      return await index.query({
        vector: queryEmbedding,
        topK: options.topK,
        includeMetadata: true
      });
    },
    'query-test'
  );

  // Debug - Depois da query
  const indexStats = await index.describeIndexStats();
  console.log('Debug - Post-query:', {
    readUnits: searchResponse.usage?.readUnits,
    indexStats,
    matchCount: searchResponse.matches.length,
    queryComplexity,
    cacheKey
  });

  // Processa e filtra resultados
  const results: SearchResult[] = searchResponse.matches
    .filter(match => match.score !== undefined && match.metadata)
    .map(match => ({
      confidence: determineConfidenceLevel(match.score!),
      score: match.score!,
      metadata: match.metadata as JungianMetadata
    }))
    .filter(result => result.score >= adjustedThresholds.LOW);

  // Coleta métricas
  const scores = results.map(r => r.score);
  const metrics: SearchMetrics = {
    queryLatency: Date.now() - startTime,
    confidenceDistribution: results.reduce((acc, result) => {
      acc[result.confidence] = (acc[result.confidence] || 0) + 1;
      return acc;
    }, {} as Record<ConfidenceLevel, number>),
    totalResults: results.length,
    bestScore: Math.max(...scores, 0),
    averageScore: scores.length 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0,
    queryComplexity
  };

  // Telemetria completa
  const telemetry: SearchTelemetry = {
    timestamp: new Date().toISOString(),
    query: originalQuery,
    metrics,
    vectorStats: {
      magnitude: vectorStats.magnitude,
      zeros: vectorStats.zeros,
      range: vectorStats.range
    }
  };

  // Log de telemetria (em produção, enviar para sistema de monitoramento)
  console.log('\nSearch Telemetry:', JSON.stringify(telemetry, null, 2));

  if (results.length > 0) {
    console.log('\nResultados encontrados:');
    console.log('Query:', originalQuery);
    
    results.forEach(result => {
      console.log(`\n${result.metadata.title} (${result.confidence}, score: ${result.score}):`);
      console.log(`Categoria: ${result.metadata.category}`);
      console.log(`Conteúdo: ${result.metadata.content}`);
      console.log(`Referências: ${result.metadata.references.join(', ')}`);
    });

    // Análise da distribuição de confiança
    console.log('\nDistribuição de Confiança:', metrics.confidenceDistribution);
    console.log('Métricas:', {
      latência: `${metrics.queryLatency}ms`,
      scoremédio: metrics.averageScore.toFixed(3),
      melhorScore: metrics.bestScore.toFixed(3)
    });
  } else {
    console.log('\nNenhum resultado encontrado com confiança suficiente.');
    console.log('Query:', originalQuery);
    console.log('Menor threshold testado:', adjustedThresholds.LOW);
    console.log('Complexidade da query:', queryComplexity);
  }
}

async function upsertConcept(index: Index<JungianMetadata>, concept: typeof jungianConcepts[0]): Promise<void> {
  // Gera embedding com o conteúdo completo
  const embedding = await createEmbeddings(
    `${concept.title}: ${concept.content}`
  );

  // Analisa o vetor antes do upsert
  analyzeVector(embedding, `Embedding for ${concept.title}`);

  // Gera ID determinístico
  const id = generateDeterministicId(JSON.stringify({
    title: concept.title,
    content: concept.content
  }));

  // Debug do embedding
  console.log(`Debug - Embedding para "${concept.title}":`, {
    id,
    embeddingStart: embedding.slice(0, 5),
    embeddingLength: embedding.length
  });

  // Upsert com retry
  await handlePineconeOperation(
    async () => {
      await index.upsert([{
        id,
        values: embedding,
        metadata: {
          title: concept.title,
          category: concept.category,
          references: concept.references,
          content: concept.content
        }
      }]);
    },
    `upsert-${concept.title}`
  );

  console.log(`Conceito "${concept.title}" adicionado com sucesso! (ID: ${id})`);
}

async function populatePinecone(): Promise<void> {
  if (!await testConnection()) {
    console.error('Falha no teste de conexão. Abortando...');
    process.exit(1);
  }
  
  try {
    const pineconeService = PineconeService.getInstance();
    const index = await pineconeService.getIndex();
    
    console.log('Conexão estabelecida com sucesso. Iniciando população do índice...');
    
    // Limpa o índice antes de popular
    console.log('Limpando índice existente...');
    await handlePineconeOperation(
      async () => {
        await index.deleteAll();
      },
      'delete-all'
    );
    
    console.log('Conectado ao Pinecone. Iniciando inserção de registros...');

    // Processa cada conceito sequencialmente para melhor debug
    for (const concept of jungianConcepts) {
      await upsertConcept(index, concept);
    }

    console.log('Todos os conceitos foram adicionados ao Pinecone!');
    
    // Aguarda sincronização com backoff exponencial
    await waitForIndexSync(index);

    // Testa algumas buscas
    const queries = [
      "Como funciona o processo de individuação?",
      "O que é a sombra na psicologia analítica?",
      "Qual a relação entre anima e animus?",
      "Me fale sobre arquétipos e inconsciente coletivo"
    ];

    for (const query of queries) {
      console.log('\n=== Nova Busca ===');
      const queryEmbedding = await createEmbeddings(query);
      
      // Debug - Antes da query
      console.log('\nDebug - Pre-query:', {
        query,
        queryEmbeddingStart: queryEmbedding.slice(0, 5),
        queryEmbeddingLength: queryEmbedding.length
      });

      await searchWithFallback(index, queryEmbedding, query);
    }

  } catch (error) {
    console.error('Erro ao popular Pinecone:', error);
    process.exit(1);
  }
}

// Executa o script
populatePinecone(); 