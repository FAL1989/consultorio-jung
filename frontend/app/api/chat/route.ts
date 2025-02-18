import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BACKEND_URL) {
  console.error("NEXT_PUBLIC_API_URL não está definida!");
}

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
    
    const url = `${BACKEND_URL}/api/chat`;
    console.log("Fazendo requisição para:", url);
    
    // Encaminha a requisição para o backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...body,
        user_id: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na resposta do servidor: ${response.status} ${response.statusText}\n${
          errorData.error || 'Sem detalhes do erro'
        }`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Erro detalhado no processamento do chat:", error);
    
    let errorMessage = "Erro interno do servidor";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Se for um erro de rede, pode ser problema de CORS ou backend offline
      if (error.message.includes('fetch failed')) {
        errorMessage = "Não foi possível conectar ao servidor. Por favor, tente novamente em alguns instantes.";
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 