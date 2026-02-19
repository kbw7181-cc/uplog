// ✅✅✅ 전체복붙: src/app/components/AuthGuard.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ✅ settings는 "프로필 미완성이어도 들어가서 수정"해야 하므로 PUBLIC에 포함
const PUBLIC_EXACT = ['/'];
const PUBLIC_PREFIXES = ['/login', '/register', '/settings', '/privacy', '/support-chat'];

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function withTimeout<T>(p: Promise<T>, ms = 4500, label = 'timeout') {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label}(${ms}ms)`)), ms);
    p.then((v) => {
      window.clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      window.clearTimeout(t);
      reject(e);
    });
  });
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = useMemo(() => isPublicPath(pathname), [pathname]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ✅ 공개 페이지는 절대 막지 않기
    if (isPublic) {
      setChecking(false);
      return () => {
        mounted = false;
      };
    }

    const verify = async () => {
      try {
        // ✅ 가장 안정적인 흐름: session → 없으면 user
        const sessRes = await withTimeout(supabase.auth.getSession(), 4500, 'getSession');
        const uid = (sessRes as any)?.data?.session?.user?.id ?? null;

        if (!uid) {
          // 백업: getUser
          const userRes = await withTimeout(supabase.auth.getUser(), 4500, 'getUser');
          const uid2 = (userRes as any)?.data?.user?.id ?? null;

          if (!uid2) {
            router.replace('/login');
            return;
          }
        }

        // ✅ 프로필 조회는 "가드에서 필수 아님" (RLS 막혀도 앱이 죽지 않게)
        // 필요하면 다른 곳(ClientShell 등)에서 로드하는 게 안전함.
      } catch (e) {
        // ✅ 어떤 에러든 로그인으로 보내고 끝
        router.replace('/login');
      } finally {
        // ✅ 무조건 종료 (여기가 핵심)
        if (mounted) setChecking(false);
      }
    };

    verify();

    // ✅ 인증 상태 변화 구독: 로그아웃/만료면 즉시 /login
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (!session?.user?.id) {
        router.replace('/login');
        // ✅ 여기서도 무조건 종료
        setChecking(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [isPublic, router, pathname]);

  // ✅ 공개 페이지는 로딩 마스크 없이 바로 렌더
  if (isPublic) return <>{children}</>;

  // ✅ 보호 페이지: 체크 중에는 최소 로딩만
  if (checking) {
    return (
      <div
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          background: '#7b3bbf',
          color: '#fff',
          fontWeight: 900,
        }}
      >
        로딩중…
      </div>
    );
  }

  return <>{children}</>;
}
