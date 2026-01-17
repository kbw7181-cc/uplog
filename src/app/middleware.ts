import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function hasSupabaseSessionCookie(req: NextRequest) {
  const all = req.cookies.getAll();
  return all.some((c) => c.name.startsWith('sb-') && (c.value || '').length > 10);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅✅✅ 핵심: settings는 "프로필 수정" 페이지라서 무조건 통과해야 함 (모바일 쿠키 판별 흔들림 방지)
  const allow =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/settings') || // ✅ 추가
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
