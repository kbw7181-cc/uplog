// ✅✅✅ 전체복붙: src/app/page.tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function Page() {
  const [hover, setHover] = useState<'login' | 'join' | null>(null);

  const dockStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'fixed',
      left: '50%',
      bottom: '64px',
      transform: 'translateX(-50%)',
      zIndex: 9999,

      width: 'min(760px, calc(100vw - 28px))',
      padding: 12,
      borderRadius: 999,

      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,

      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.25), 0 22px 60px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(10px)',
    }),
    []
  );

  const baseBtn: React.CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: 58,
      borderRadius: 999,

      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',

      textDecoration: 'none',
      color: '#fff',
      fontFamily: "Pretendard, SUIT, system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: 20,
      fontWeight: 950,
      letterSpacing: '-0.2px',

      border: '1px solid rgba(255,255,255,0.55)',
      textShadow: '0 2px 14px rgba(0,0,0,0.45)',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',

      transition: 'transform .18s ease, filter .18s ease, box-shadow .22s ease, border-color .18s ease',
    }),
    []
  );

  const loginBtn: React.CSSProperties = useMemo(() => {
    const on = hover === 'login';
    return {
      ...baseBtn,
      background:
        'linear-gradient(90deg, rgba(255,77,184,0.96) 0%, rgba(200,107,255,0.92) 55%, rgba(124,58,237,0.92) 100%)',
      boxShadow: on
        ? '0 0 0 2px rgba(255,255,255,1), 0 0 40px rgba(255,77,184,0.95), 0 0 90px rgba(168,85,247,0.75), 0 28px 70px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(255,255,255,0.62), 0 0 14px rgba(255,77,184,0.35), 0 0 22px rgba(168,85,247,0.25), 0 16px 34px rgba(0,0,0,0.42)',
      borderColor: on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)',
      transform: on ? 'translateY(-3px) scale(1.04)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.12)' : 'brightness(1)',
    };
  }, [baseBtn, hover]);

  const joinBtn: React.CSSProperties = useMemo(() => {
    const on = hover === 'join';
    return {
      ...baseBtn,
      background:
        'linear-gradient(90deg, rgba(168,85,247,0.62) 0%, rgba(255,255,255,0.18) 55%, rgba(124,58,237,0.62) 100%)',
      boxShadow: on
        ? '0 0 0 2px rgba(255,255,255,1), 0 0 40px rgba(168,85,247,0.95), 0 0 90px rgba(255,77,184,0.70), 0 28px 70px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(255,255,255,0.58), 0 0 14px rgba(168,85,247,0.35), 0 0 22px rgba(255,77,184,0.22), 0 16px 34px rgba(0,0,0,0.42)',
      borderColor: on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)',
      transform: on ? 'translateY(-3px) scale(1.04)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.12)' : 'brightness(1)',
    };
  }, [baseBtn, hover]);

  return (
    <main className="gate">
      <div className="bg" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="spark" aria-hidden="true" />

      {/* ✅ 중앙 그룹 */}
      <section className="center" aria-label="UPLOG 시작">
        <div className="brand">
          <div className="logoShell" aria-hidden="true">
            <div className="halo" />
            <div className="logoCard">
              <img className="logo" src="/gogo.png" alt="UPLOG 로고" draggable={false} />
            </div>
          </div>

          <div className="text">
            <h1 className="title">UPLOG</h1>
            <p className="tagline">오늘도 나를 UP시키다</p>
          </div>
        </div>
      </section>

      {/* ✅ 하단 버튼(무조건 보이게: 인라인 + hover state) */}
      <section style={dockStyle} aria-label="로그인/회원가입">
        <Link
          href="/login"
          style={loginBtn}
          onMouseEnter={() => setHover('login')}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover('login')}
          onBlur={() => setHover(null)}
        >
          로그인
        </Link>

        <Link
          href="/register"
          style={joinBtn}
          onMouseEnter={() => setHover('join')}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover('join')}
          onBlur={() => setHover(null)}
        >
          회원가입
        </Link>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: #0d001a;
        }

        .gate {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: linear-gradient(180deg, #ff7ad9 0%, #b86bff 36%, #7c3aed 70%, #5b21b6 100%);
        }

        .vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.14), transparent 58%),
            radial-gradient(circle at 50% 92%, rgba(0, 0, 0, 0.22), transparent 62%);
        }

        .spark {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.12), transparent 55%);
        }

        .center {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 28px 18px 200px;
        }

        .brand {
          width: min(520px, 92vw);
          display: grid;
          justify-items: center;
          gap: 18px;
          text-align: center;
          transform: translateY(-10px);
        }

        .logoShell {
          position: relative;
          width: 260px;
          height: 260px;
          display: grid;
          place-items: center;
        }

        .halo {
          position: absolute;
          inset: -18px;
          border-radius: 44px;
          background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.22), transparent 62%);
        }

        .logoCard {
          width: 100%;
          height: 100%;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.26);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .logo {
          width: 78%;
          height: auto;
          user-select: none;
          filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.18));
        }

        .text {
          display: grid;
          gap: 10px;
          justify-items: center;
        }

        .title {
          margin: 0;
          font-size: 58px;
          font-weight: 950;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
          line-height: 1.05;
        }

        .tagline {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.92);
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.18);
        }

        @media (max-width: 420px) {
          .logoShell {
            width: 220px;
            height: 220px;
          }
          .title {
            font-size: 46px;
          }
          .tagline {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
