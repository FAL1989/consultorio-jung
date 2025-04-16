import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Pega a URL do backend da variável de ambiente (a mesma usada em /chat)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!BACKEND_URL) {
  throw new Error("Variável de ambiente NEXT_PUBLIC_BACKEND_API_URL não está definida!");
}

/**
 * POST /api/transcribe
 * Recebe um arquivo de áudio via FormData, verifica autenticação
 * e encaminha para o backend para transcrição.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ADICIONADO: Verificação de sessão Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (!session) {
      console.error("Erro de sessão Supabase:", sessionError);
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    // FIM ADIÇÃO: Verificação de sessão

    // Extrai o FormData (que contém o arquivo de áudio)
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo de áudio foi enviado." },
        { status: 400 }
      );
    }

    // ADICIONADO: Encaminhar o FormData para o backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        // Não definir 'Content-Type', o fetch fará isso automaticamente para FormData
        'Authorization': `Bearer ${session.access_token}`, // Envia token Supabase
      },
      body: formData, // Envia o FormData diretamente
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error("Erro do backend na transcrição:", backendResponse.status, errorData);
      return NextResponse.json(
        { error: errorData.detail || 'Erro ao transcrever áudio no servidor' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    // Retorna a resposta do backend (que deve conter a transcrição)
    return NextResponse.json(data);

  } catch (error) {
    console.error("Erro interno na rota /api/transcribe:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar transcrição" },
      { status: 500 }
    );
  }
} 