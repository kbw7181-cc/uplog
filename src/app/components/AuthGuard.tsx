'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ✅ settings는 "프로필 미완성이어도 들어가서 수정"해야 하므로 PUBLIC에 포함
const PUBLIC_PATHS = ['/', '/login', '/register', '/settings'];

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

        // ✅ 2) profiles 로드(안전)
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
          if (!profile) {
            console.warn('[AuthGuard] profile row not found for uid:', uid);
          }
        }

        if (mounted) setChecking(false);
      } catch (e) {
        console.warn('[AuthGuard] unexpected error:', e);
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
