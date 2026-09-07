import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ログインページ自体とログインAPIは素通し
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  const session = req.cookies.get('session');
  if (session?.value === 'authenticated') {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 静的アセット以外の全ページにミドルウェアを適用
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
