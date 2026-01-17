'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppHeader from './AppHeader';
import { supabase } from '@/lib/supabaseClient';

type ProfileGateRow = {
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

function isProfileComplete(p: ProfileGateRow | null) {
  if (!p) return false;
  const nameOk = String(p.name || '').trim().length >= 1;
  const emailOk = String(p.email || '').trim().includes('@');
  const phoneOk = onlyDigits(String(p.phone || '')).length >= 10;
  return nameOk && emailOk && phoneOk;
}

// ✅ 모바일에서 세션이 늦게 잡히는 경우 방어: 짧게 몇 번 재시도
async function waitSession(maxTry = 4, gapMs = 220) {
  for (let i = 0; i < maxTry; i++) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return data.session;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return null;
}

export default function ClientShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [gateReady, setGateReady] = useState(false);
  const checkingRef = useRef(false);

  // ✅ 게이트 예외 라우트(여긴 검사 안 하고 통과)
  const bypass = useMemo(() => {
    const p = pathname || '';
    if (p === '/') return true; // GatePage
    if (p.startsWith('/login')) return true;
    if (p.startsWith('/register')) return true; // 프로필 입력 페이지
    if (p.startsWith('/logout')) return true;
    // 필요하면 더 추가 가능:
    // if (p.startsWith('/privacy')) return true;
    return false;
  }, [pathname]);

  // ✅ 프로필 미완성이어도 "여기서는" 보내지 말아야 하는 페이지
  const allowIncompleteHere = useMemo(() => {
    const p = pathname || '';
    return p.startsWith('/settings') || p.startsWith('/register');
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // ✅ bypass는 즉시 준비 완료
      if (bypass) {
        if (alive) setGateReady(true);
        return;
      }

      // ✅ 이미 통과된 상태라면, route 이동 때마다 화면을 blank로 만들지 말기(모바일 플래시/튕김 방지)
      // 단, 첫 진입에서는 gateReady가 false라 로딩 화면이 뜸
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        // 1) 로그인 체크 (모바일 지연 방어)
        const session = await waitSession(5, 240);
        if (!alive) return;

        const uid = session?.user?.id;
        if (!uid) {
          router.replace('/login');
          return;
        }

        // 2) profiles 필수정보 체크(name/phone/email)
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, name, phone, email')
          .eq('user_id', uid)
          .maybeSingle();

        if (!alive) return;

        // ✅ 핵심: profiles 조회 에러(pErr)는 모바일/네트워크/RLS 순간 이슈일 수 있으니
        // ✅ 여기서 /register로 보내지 말고 "통과"시킨다.
        // (설정 페이지에서 직접 수정 가능해야 함)
        if (pErr) {
          setGateReady(true);
          return;
        }

        const complete = isProfileComplete((p as any) || null);

        // ✅ 프로필 미완성이라도 /settings(설정)에서는 리다이렉트 금지
        if (!complete && !allowIncompleteHere) {
          router.replace('/register');
          return;
        }

        // ✅ 통과
        setGateReady(true);
      } catch {
        // 예외도 로그인 확인 실패로 간주
        router.replace('/login');
      } finally {
        checkingRef.current = false;
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, bypass, allowIncompleteHere]);

  // ✅ 게이트 확인 전에는 화면 플래시 방지(헤더 포함 숨김)
  if (!gateReady) {
    return (
      <div className="cs">
        <style jsx>{`
          :global(*),
          :global(*::before),
          :global(*::after) {
            box-sizing: border-box;
          }
          .cs {
            min-height: 100dvh;
            background: radial-gradient(circle at 12% 12%, rgba(236, 72, 153, 0.16), transparent 58%),
              radial-gradient(circle at 88% 18%, rgba(168, 85, 247, 0.16), transparent 58%),
              radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.75), transparent 55%),
              linear-gradient(180deg, #ffffff 0%, #fff4fb 38%, #f6f2ff 100%);
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            display: grid;
            place-items: center;
            padding: 24px 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="cs">
      <AppHeader />

      {/* ✅ 페이지 내용은 무조건 이 컨테이너 안에서만 여백/폭 통일 */}
      <main className="csMain">
        <div className="csInner">{children}</div>
      </main>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        .cs {
          min-height: 100dvh;
          background: radial-gradient(circle at 12% 12%, rgba(236, 72, 153, 0.16), transparent 58%),
            radial-gradient(circle at 88% 18%, rgba(168, 85, 247, 0.16), transparent 58%),
            radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.75), transparent 55%),
            linear-gradient(180deg, #ffffff 0%, #fff4fb 38%, #f6f2ff 100%);

          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);

          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }

        .csMain {
          width: 100%;
          max-width: 100%;
          padding-left: max(var(--app-pad-x), 14px);
          padding-right: max(var(--app-pad-x), 14px);
          padding-top: var(--app-pad-top);
          padding-bottom: var(--app-pad-bottom);
          overflow-x: clip;
        }

        .csInner {
          width: 100%;
          max-width: var(--app-maxw);
          margin-left: auto;
          margin-right: auto;
          transform: translateZ(0);
        }
      `}</style>
    </div>
  );
}
