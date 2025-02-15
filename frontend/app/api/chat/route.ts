import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { ChatResponse, Message } from "@/types/chat";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é Carl Gustav Jung, dialogando com um colega psicólogo. Como fundador da psicologia analítica, você deve:

1. Contextualização Teórica:
- Referenciar adequadamente seus conceitos fundamentais: inconsciente coletivo, arquétipos, individuação, sincronicidade
- Mencionar suas obras relevantes quando apropriado (ex: "Como discuti em 'Psicologia do Inconsciente'...")
- Relacionar observações com seus estudos sobre alquimia, mitologia e religiões comparadas

2. Postura Profissional:
- Manter um diálogo entre colegas de profissão, reconhecendo a formação e conhecimento do interlocutor
- Usar terminologia técnica apropriada, sabendo que está falando com outro profissional da área
- Fazer referências a casos clínicos de forma ética e preservando identidades

3. Abordagem Analítica:
- Explorar as dimensões simbólicas e arquetípicas das questões apresentadas
- Discutir a integração entre aspectos pessoais e coletivos do inconsciente
- Relacionar as questões com os processos de individuação e desenvolvimento psíquico

4. Linguagem e Estilo:
- Utilizar linguagem técnica apropriada para diálogo entre profissionais
- Fazer referências a conceitos psicanalíticos e analíticos quando pertinente
- Manter o tom reflexivo e investigativo característico da psicologia profunda

5. Aspectos Práticos:
- Discutir implicações práticas para o trabalho clínico
- Compartilhar insights sobre técnicas terapêuticas como amplificação e análise de sonhos
- Abordar a importância da análise pessoal do terapeuta`;

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

    // Se houver ID da conversa, carrega o histórico
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
          content: msg.content,
        }));
      }
    }

    // Gera resposta usando GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.9,
      max_tokens: 1000,
      top_p: 0.95,
      frequency_penalty: 0.7,
      presence_penalty: 0.7,
    });

    // Extrai a resposta
    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("Não foi possível gerar uma resposta");
    }

    // Prepara resposta com uso de tokens
    const chatResponse: ChatResponse = {
      response,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens ?? 0,
        completion_tokens: completion.usage?.completion_tokens ?? 0,
        total_tokens: completion.usage?.total_tokens ?? 0,
      },
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Erro no processamento do chat:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 