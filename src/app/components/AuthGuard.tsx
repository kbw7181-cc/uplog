// ✅✅✅ 전체복붙: src/app/components/AuthGuard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const PUBLIC_PATHS = ['/', '/login', '/register'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ✅ 공개 페이지는 절대 막지 않기
        const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
        if (isPublic) {
          if (mounted) setChecking(false);
          return;
        }

        // ✅ 1) 세션 체크
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthGuard] getSession error:', error);
        }

        const uid = data.session?.user?.id ?? null;
        const hasSession = !!uid;

        if (!hasSession) {
          router.replace('/login');
          return;
        }

        // ✅ 2) profiles 로드 (중복 안전: 최신 1개)
        //    - 기존 `.single()` 쓰면 중복 row에서 터질 수 있음
        const { data: rows, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, nickname, role, is_admin, plan, theme, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(1);

        if (pErr) {
          // RLS/권한/기타 에러가 있으면 여기로 떨어짐
          console.warn('[AuthGuard] profiles fetch error:', pErr);
        } else {
          const profile = rows?.[0] ?? null;

          if (!profile) {
            // ✅ 프로필이 없으면 앱 전부 깨지지 않게 통과시키되, 경고만 출력
            //    (원하면 여기서 /settings 로 강제 이동도 가능)
            console.warn('[AuthGuard] profile row not found for uid:', uid);
            // router.replace('/settings'); return; // 필요시 사용
          }
        }

        if (mounted) setChecking(false);
      } catch (e) {
        console.warn('[AuthGuard] unexpected error:', e);
        // 예상치 못한 에러여도 앱이 벽돌 되지 않게
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // ✅ 공개 페이지는 로딩 마스크도 없이 바로 렌더
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
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
