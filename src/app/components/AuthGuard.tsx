// ✅✅✅ 전체복붙: src/app/components/AuthGuard.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ✅ settings는 "프로필 미완성이어도 들어가서 수정"해야 하므로 PUBLIC에 포함
const PUBLIC_PATHS = ['/', '/login', '/register', '/settings'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = useMemo(() => {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }, [pathname]);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ✅ 공개 페이지는 절대 막지 않기
    if (isPublic) {
      setChecking(false);
      return;
    }

    // ✅ 핵심: getSession() 단발로 redirect 하지 말고,
    // 1) getUser()로 서버 기준 로그인 상태를 확인하고
    // 2) onAuthStateChange로 로그인/로그아웃 이벤트에 반응
    const verify = async () => {
      try {
        // ✅ 서버 기준 사용자 확인 (세션 초기 타이밍 null 문제 회피)
        const { data, error } = await supabase.auth.getUser();
        if (error) console.warn('[AuthGuard] getUser error:', error);

        const uid = data?.user?.id ?? null;
        if (!uid) {
          router.replace('/login');
          return;
        }

        // ✅ profiles 로드는 "참고용" (없다고 로그인 실패 처리 금지)
        const { data: rows, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, nickname, role, is_admin, plan, theme, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(1);

        if (pErr) {
          console.warn('[AuthGuard] profiles fetch error:', pErr);
        } else {
          const profile = rows?.[0] ?? null;
          if (!profile) console.warn('[AuthGuard] profile row not found for uid:', uid);
        }

        if (mounted) setChecking(false);
      } catch (e) {
        console.warn('[AuthGuard] unexpected error:', e);
        if (mounted) setChecking(false);
      }
    };

    // ✅ 1) 최초 진입 검증
    verify();

    // ✅ 2) 인증 상태 변화 구독 (로그인 직후 튕김 방지 핵심)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // 로그아웃/만료면 로그인으로
      if (!session?.user?.id) {
        // 공개페이지면 그냥 둠
        if (!isPublic) router.replace('/login');
        return;
      }

      // 로그인/토큰 갱신 이벤트면 체크 해제
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [isPublic, router]);

  // ✅ 공개 페이지는 로딩 마스크도 없이 바로 렌더
  if (isPublic) return <>{children}</>;

  if (checking) {
    return (
      <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', color: '#fff', background: '#7b3bbf' }}>
        로딩중…
      </div>
    );
  }

  return <>{children}</>;
}
