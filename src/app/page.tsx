// ✅✅✅ 전체복붙: src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // 세션 조회 자체가 실패하면 로그인으로
          router.replace('/login');
          return;
        }

        const hasSession = !!data?.session?.user;

        if (!hasSession) {
          router.replace('/login');
        } else {
          router.replace('/home');
        }
      } catch {
        router.replace('/login');
      } finally {
        if (mounted) setChecking(false);
      }
    };

    run();

    // 세션 변화(로그인/로그아웃) 즉시 반영
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session?.user;
      router.replace(hasSession ? '/home' : '/login');
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  // 깔끔한 빈 화면(깜빡임 방지)
  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          background:
            'radial-gradient(circle at 15% 10%, rgba(236,72,153,0.25), transparent 55%), radial-gradient(circle at 85% 20%, rgba(168,85,247,0.25), transparent 55%), linear-gradient(180deg, #0b0610, #07030b)',
          fontSize: 16,
          letterSpacing: 0.2,
        }}
      >
        로딩중…
      </div>
    );
  }

  return null;
}
