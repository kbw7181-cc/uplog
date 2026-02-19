// ✅✅✅ 전체복붙: src/app/home/layout.tsx
'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function withTimeout<T>(p: Promise<T>, ms = 3500, label = 'timeout') {
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

/**
 * ✅ HomeLayout (가드 최소화 버전)
 * - 여기서는 "세션 유무 확인 + 없으면 /login"만 한다.
 * - profiles upsert/복구 같은 DB 작업은 절대 하지 않는다. (RLS로 막혀서 무한로딩 유발)
 * - 어떤 경우든 화면을 영원히 막지 않는다. (finally에서 always ok 처리)
 */
export default function HomeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const mounted = useRef(true);
  const startedRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // ✅ auth 이벤트: 로그아웃/만료 즉시 /login
    const { data } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === 'SIGNED_OUT' || !session?.user?.id) {
        router.replace('/login');
      }
    });

    (async () => {
      try {
        // ✅ 가장 빠르고 안정적인 세션 확인
        const sessRes = await withTimeout(supabase.auth.getSession(), 3500, 'getSession');
        const uid = (sessRes as any)?.data?.session?.user?.id ?? null;

        if (!uid) {
          // 백업: getUser
          const userRes = await withTimeout(supabase.auth.getUser(), 3500, 'getUser');
          const uid2 = (userRes as any)?.data?.user?.id ?? null;

          if (!uid2) {
            router.replace('/login');
            return;
          }
        }

        // ✅ 여기서 DB 작업 금지 (profiles upsert 같은 것)
      } catch {
        router.replace('/login');
      } finally {
        // ✅ 핵심: 어떤 경우든 UI를 영원히 막지 않음
        if (mounted.current) setReady(true);
      }
    })();

    return () => {
      data?.subscription?.unsubscribe();
    };
    // pathname 넣는 이유: /home 내부 네비게이션에서도 상태 꼬임 방지
  }, [router, pathname]);

  // ✅ 로딩은 아주 짧게만 (ready가 true가 되면 children 렌더)
  if (!ready) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.title}>로그인 확인 중…</div>
          <div style={S.sub}>세션을 확인하고 있어요.</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const S: Record<string, any> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background:
      'radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 62%), radial-gradient(900px 560px at 82% 18%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 64%), linear-gradient(180deg,#fff3fb 0%, #f6f2ff 45%, #eef8ff 100%)',
  },
  card: {
    width: 'min(520px, 92vw)',
    borderRadius: 22,
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(229,221,255,1)',
    boxShadow: '0 14px 26px rgba(0,0,0,0.10)',
    padding: '18px 18px',
    color: '#201235',
    textAlign: 'center',
  },
  title: { fontSize: 20, fontWeight: 950, letterSpacing: -0.2 },
  sub: { marginTop: 6, fontSize: 13, fontWeight: 800, color: '#6f60b8' },
};
