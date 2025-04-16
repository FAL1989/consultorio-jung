import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = "https://mindfuljung-api-411891972932.us-central1.run.app";

if (!BACKEND_URL) {
  throw new Error("NEXT_PUBLIC_API_URL não está definida!");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { 
          error: "Não autorizado", 
          debug: {
            sessionError: sessionError?.message || null,
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }

    // Processa o corpo da requisição
    const body = await req.json();

    // Encaminha a requisição para o backend
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        message: body.message,
        conversationId: body.conversationId || null,
        user_id: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.error || 'Erro na comunicação com o servidor',
          debug: {
            status: response.status,
            timestamp: new Date().toISOString(),
            errorDetails: errorData
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
} 