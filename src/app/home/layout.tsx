// ✅✅✅ 전체복붙: src/app/home/layout.tsx
'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * ✅ HomeLayout (인증 가드 + profiles 자동 복구)
 * - 비로그인: 즉시 /login
 * - 로그인: profiles(user_id) 존재 확인 → 없으면 upsert로 최소 생성
 * - SIGNED_OUT 이벤트: 즉시 /login
 *
 * ⚠️ "관리자로 로그인했는데 다른 회원 정보로 뜸" 방지 포인트
 * - uid는 반드시 supabase.auth.getUser()/getSession()에서 받은 현재 세션의 user.id만 사용
 * - profiles 조회는 eq('user_id', uid)로만
 * - (중요) 쿠키/스토리지에 예전 세션이 남아있으면 이런 현상이 나올 수 있음
 *   → /logout 페이지에서 signOut + 토큰삭제가 이미 있으면 그 흐름을 꼭 쓰기
 */

export default function HomeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    // ✅ auth 이벤트: 로그아웃/만료 즉시 튕김
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    const waitForUser = async () => {
      // 로그인 직후 storage 세션 타이밍 흡수
      for (let i = 0; i < 8; i++) {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id) return u.user;

        const { data: s } = await supabase.auth.getSession();
        if (s?.session?.user?.id) return s.session.user;

        await new Promise((r) => setTimeout(r, 120));
      }
      return null;
    };

    (async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        const user = await waitForUser();
        if (!user?.id) {
          router.replace('/login');
          return;
        }

        const uid = user.id;

        // ✅ 1) profiles 존재 확인 (중복/에러 대비: maybeSingle)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', uid)
          .maybeSingle();

        // ✅ 2) 없으면 자동 생성(회원가입 때 RLS로 실패했어도 여기서 복구)
        if (!profile && !profileErr) {
          const payload: any = {
            user_id: uid,
            email: user.email ?? null,
            role: 'user',
          };

          const meta: any = user.user_metadata || {};
          if (meta.name) payload.name = String(meta.name);
          if (meta.nickname) payload.nickname = String(meta.nickname);

          // ⚠️ upsert가 RLS에 막히면 여기서 실패함 → 아래 "필요한 것"의 RLS 정책을 꼭 확인
          await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
        }

        if (!alive) return;
        setOk(true);
      } catch {
        router.replace('/login');
      }
    })();

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  if (!ok) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.title}>로그인 확인 중…</div>
          <div style={S.sub}>세션/프로필을 동기화하고 있어요.</div>
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
