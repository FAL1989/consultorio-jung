import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Ignora a rota de callback e login
  if (req.nextUrl.pathname.startsWith('/auth/callback') || 
      req.nextUrl.pathname.startsWith('/auth/login')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Rotas que requerem autenticação
    const protectedPaths = ['/chat', '/api/chat', '/api/transcribe'];
    const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path));

    if (isProtectedPath && !session) {
      const redirectUrl = new URL('/auth/login', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error("Erro no middleware:", error);
    return res;
  }
}

// Configuração de quais rotas o middleware deve processar
export const config = {
  matcher: [
    '/chat',
    '/chat/:path*',
    '/api/chat/:path*',
    '/api/transcribe/:path*',
    '/auth/callback'
  ]
}; 