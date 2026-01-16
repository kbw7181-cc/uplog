// ✅✅✅ 전체복붙: src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function hasSupabaseSessionCookie(req: NextRequest) {
  // Supabase auth helpers 사용 여부/버전에 따라 쿠키 키가 다양해질 수 있어서
  // "sb-" prefix 기반으로 넓게 체크 (최소한의 안전장치)
  const all = req.cookies.getAll();
  return all.some((c) => c.name.startsWith('sb-') && (c.value || '').length > 10);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ 항상 허용(첫화면/로그인/회원가입/로그아웃/정적파일/Next 내부/API)
  const allow =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js');

  if (allow) return NextResponse.next();

  // ✅ 보호 라우트: 세션 쿠키 있으면 통과, 없으면 로그인으로
  const authed = hasSupabaseSessionCookie(req);
  if (authed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!.*\\.).*)'],
};
