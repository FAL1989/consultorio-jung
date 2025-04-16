import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  // Pega o código da URL
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
      // Tentar garantir que a sessão persista
      const { data } = await supabase.auth.getSession();
      
      // Redirect COM timestamp para evitar cache
      return NextResponse.redirect(new URL(`/chat?auth_success=${Date.now()}`, req.url));
    } catch (error) {
      // Redirect para login com info do erro
      return NextResponse.redirect(
        new URL(`/login?error=callback_failed&t=${Date.now()}`, req.url)
      );
    }
  }

  // Redirect mais seguro
  return NextResponse.redirect(new URL('/login?error=no_code', req.url));
} 