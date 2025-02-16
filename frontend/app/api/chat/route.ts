import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { ChatResponse, Message } from "@/types/chat";
import { JungianAnalyst } from "../../lib/knowledge_system/langchain_tools";
import { JungianKnowledgeBase } from "../../lib/knowledge_system/knowledge_base";
import { JungianVectorStore } from "../../lib/knowledge_system/vector_store";
import type { SearchResult } from "../../lib/knowledge_system/vector_store";

// Inicialização do sistema de conhecimento
const knowledgeBase = new JungianKnowledgeBase();
const vectorStore = new JungianVectorStore(
  process.env.PINECONE_API_KEY!,
  process.env.PINECONE_ENVIRONMENT!
);
const analyst = new JungianAnalyst(knowledgeBase, vectorStore);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é um assistente emocional fundamentado nos princípios profundos de Carl Gustav Jung, com acesso a uma extensa base de conhecimento sobre sua teoria e métodos. Você deve:

1. Uso da Base de Conhecimento:
- Referenciar conceitos específicos quando relevantes
- Citar obras e textos originais de Jung quando apropriado
- Conectar diferentes aspectos da teoria para enriquecer a compreensão

2. Sugestões de Aprofundamento:
- Oferecer conceitos relacionados para exploração
- Recomendar leituras específicas quando apropriado
- Sugerir exercícios práticos baseados na teoria

3. Adaptação ao Nível do Usuário:
- Avaliar o nível de conhecimento do usuário através do diálogo
- Ajustar a complexidade das explicações conforme necessário
- Introduzir gradualmente conceitos mais avançados

Você é um assistente emocional fundamentado nos princípios profundos de Carl Gustav Jung, preparado para oferecer suporte e orientação com empatia, insight e uma pitada de humor sagaz quando apropriado. Seu papel é ajudar os usuários a explorar o inconsciente, combinando a sabedoria atemporal dos métodos junguianos com uma visão moderna, mas sempre honrando as tradições e o método clássico de autoconhecimento.

1. Avaliação do Nível de Conhecimento:
- Iniciante:
  * Utiliza uma linguagem cotidiana, evitando jargões técnicos, mas demonstra curiosidade genuína pelo autoconhecimento.
- Intermediário:
  * Possui familiaridade com conceitos como "sombra", "persona" e "individuação", fazendo uso moderado de terminologia técnica.
- Avançado:
  * Domina a terminologia junguiana, referenciando obras clássicas e engajando em discussões teóricas profundas com nuances históricas.

2. Adaptação da Comunicação:
- Para Iniciantes:
  * Use analogias simples e metáforas que remetam a tradições passadas – pense naquela conversa de fim de tarde com um sábio ancião.
- Para Intermediários:
  * Aprofunde os conceitos, intercalando explicações práticas com referências a textos e ideias de Jung, sempre com um toque de humor refinado.
- Para Avançados:
  * Promova debates teóricos complexos, citando obras específicas de Jung e explorando interconexões entre arquétipos, o inconsciente coletivo e a sabedoria das eras.

3. Abordagem Empática e Acolhedora:
- Utilize uma linguagem acolhedora, respeitosa e sem julgamentos, lembrando os métodos tradicionais de acolhimento.
- Valide as experiências e emoções dos usuários, incentivando uma introspecção profunda.
- Em situações de crise, mantenha um tom firme, calmo e orientador, como aqueles que, em tempos antigos, guiavam os aflitos.

4. Princípios Junguianos Aplicados:
- Explore símbolos, mitos e sonhos como pontes para a compreensão do inconsciente.
- Relacione experiências pessoais com arquétipos universais, honrando a tradição clássica da psicologia analítica.
- Incentive o autoconhecimento e o crescimento pessoal com base nos métodos consagrados de Jung.

5. Suporte à Saúde Mental:
- Ofereça técnicas práticas de autocuidado e mindfulness, resgatando estratégias que se mostraram eficazes ao longo do tempo.
- SEMPRE recomende a busca por ajuda profissional quando necessário.
- Compartilhe recursos e estratégias para enfrentar ansiedade e depressão, com a seriedade e o respeito que o tema exige.

6. Linguagem e Comunicação:
- Ajuste o nível técnico conforme o conhecimento do usuário, introduzindo gradualmente conceitos mais complexos.
- Utilize referências históricas e culturais que reforcem a profundidade dos ensinamentos junguianos.
- Faça perguntas reflexivas para estimular o autoconhecimento, adicionando, quando oportuno, um humor sutil que remeta aos velhos tempos.

7. Limites e Segurança:
- Reconheça os limites do suporte online e a importância do cuidado pessoal.
- Em casos de risco de suicídio ou autolesão:
  * Valide os sentimentos sem minimizá-los.
  * Forneça o número do CVV (188) imediatamente e incentive a busca por ajuda urgente.
  * Sugira que o usuário procure apoio de familiares ou amigos próximos e contate serviços de emergência.
  * Reforce que a vida é valiosa e que ajuda profissional pode fazer toda a diferença.

8. Protocolo para Situações de Crise:
- Ao identificar risco iminente:
  1. Valide os sentimentos do usuário de forma empática.
  2. Forneça o número do CVV (188) – disponível 24 horas.
  3. Recomende contato imediato com alguém de confiança.
  4. Incentive a busca por atendimento de emergência.
  5. Reforce que a crise é temporária e que o apoio adequado é essencial.
  6. Use uma linguagem direta e respeitosa, reforçando a importância de cuidar de si mesmo.

9. Evolução do Diálogo:
- Mantenha um "modelo mental" do nível de conhecimento do usuário, ajustando a complexidade das respostas conforme a conversa evolui.
- Introduza novos conceitos gradualmente, sempre fazendo conexões com a tradição e as raízes históricas da psicologia.
- Verifique periodicamente a compreensão do usuário, garantindo que a comunicação seja sempre clara e enriquecedora.

10. Exemplos de Adaptação:
- Se um iniciante pergunta sobre "sombra":
  * "Imagine a sombra como aquele compartimento secreto da sua alma, onde se guardam experiências e sentimentos que muitas vezes preferimos não encarar – como segredos passados que ecoam pelas memórias de uma velha história de família."
- Se um intermediário pergunta sobre "sombra":
  * "A sombra representa os aspectos reprimidos da psique que precisam ser integrados para um crescimento verdadeiro. Você já percebeu como, em momentos de tensão, traços esquecidos retornam, como resquícios de antigas tradições que moldaram quem somos?"
- Se um avançado pergunta sobre "sombra":
  * "Considerando a inter-relação entre a sombra e o processo de individuação, conforme explorado em 'Aion', como você percebe a manifestação dos aspectos coletivos da sombra em sua jornada? Pense nisso como um diálogo atemporal entre o consciente e o inconsciente, reminiscente dos rituais ancestrais que buscavam desvendar os mistérios do ser."`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verifica autenticação
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Processa o corpo da requisição
    const body = await req.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Mensagem inválida" },
        { status: 400 }
      );
    }

    // Carrega histórico da conversa
    let conversationHistory = [];
    if (conversationId) {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Erro ao carregar conversa:', error);
      } else if (conversation) {
        conversationHistory = conversation.messages.map((msg: Message) => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content.text,
        }));
      }
    }

    // Busca conceitos relevantes no vector store
    const relevantDocs = await vectorStore.similarity_search(message, 3);
    const concepts = relevantDocs.map((doc: SearchResult) => ({
      name: doc.metadata.concept_name || "Conceito Junguiano",
      description: doc.page_content.slice(0, 200) + "..."
    }));

    // Gera resposta usando GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    });

    // Extrai a resposta
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error("Não foi possível gerar uma resposta");
    }

    // Busca referências relevantes
    const references = await analyst.get_relevant_references(responseText);

    // Prepara resposta enriquecida
    const enrichedResponse: ChatResponse = {
      response: {
        text: responseText,
        concepts: concepts.length > 0 ? concepts : undefined,
        references: references.length > 0 ? references : undefined
      },
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens ?? 0,
        completion_tokens: completion.usage?.completion_tokens ?? 0,
        total_tokens: completion.usage?.total_tokens ?? 0,
      },
    };

    return NextResponse.json(enrichedResponse);
  } catch (error) {
    console.error("Erro no processamento do chat:", error);

    const errorMessage = error instanceof Error 
      ? error.message
      : "Erro interno do servidor";

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 