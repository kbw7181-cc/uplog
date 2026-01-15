// ✅✅✅ 전체복붙: src/app/components/ClientShell.tsx
'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
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

export default function ClientShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [gateReady, setGateReady] = useState(false);

  // ✅ 게이트 예외 라우트(여긴 검사 안 하고 통과)
  const bypass = useMemo(() => {
    const p = pathname || '';
    if (p === '/') return true; // GatePage
    if (p.startsWith('/login')) return true;
    if (p.startsWith('/register')) return true; // ✅ 프로필 입력 페이지
    if (p.startsWith('/logout')) return true;
    // 필요하면 더 추가 가능:
    // if (p.startsWith('/support')) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // ✅ bypass는 즉시 준비 완료
      if (bypass) {
        if (alive) setGateReady(true);
        return;
      }

      setGateReady(false);

      try {
        // 1) 로그인 체크
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (!alive) return;

        if (uErr || !u?.user?.id) {
          router.replace('/login');
          return;
        }

        const uid = u.user.id;

        // 2) profiles 필수정보 체크(name/phone/email)
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, name, phone, email')
          .eq('user_id', uid)
          .maybeSingle();

        if (!alive) return;

        // ✅ RLS 등으로 못 읽으면 “미완성” 취급 → register로 보내서 입력 유도
        if (pErr || !isProfileComplete((p as any) || null)) {
          router.replace('/register');
          return;
        }

        // ✅ 통과
        setGateReady(true);
      } catch {
        // 예외도 로그인/프로필 확인 실패로 간주
        router.replace('/login');
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, bypass]);

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
          /* ✅ 모바일 주소창 변화에도 안정 */
          min-height: 100dvh;

          /* ✅ 전체 배경 통일 */
          background: radial-gradient(circle at 12% 12%, rgba(236, 72, 153, 0.16), transparent 58%),
            radial-gradient(circle at 88% 18%, rgba(168, 85, 247, 0.16), transparent 58%),
            radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.75), transparent 55%),
            linear-gradient(180deg, #ffffff 0%, #fff4fb 38%, #f6f2ff 100%);

          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);

          /* ✅ 오른쪽 치우침/가로 흔들림 방지 핵심 */
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }

        .csMain {
          width: 100%;
          max-width: 100%;

          /* ✅ “vw” 쓰는 요소가 섞여도 가운데가 안 밀리게 */
          padding-left: max(var(--app-pad-x), 14px);
          padding-right: max(var(--app-pad-x), 14px);
          padding-top: var(--app-pad-top);
          padding-bottom: var(--app-pad-bottom);

          /* ✅ iOS/모바일에서 가끔 생기는 미세 스크롤 흔들림 방지 */
          overflow-x: clip;
        }

        .csInner {
          width: 100%;
          max-width: var(--app-maxw);
          margin-left: auto;
          margin-right: auto;

          /* ✅ Inner가 스크롤바 폭(vw) 영향으로 밀리는 현상 방지 */
          transform: translateZ(0);
        }
      `}</style>
    </div>
  );
}
