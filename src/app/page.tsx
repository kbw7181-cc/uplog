// ✅✅✅ 전체복붙: src/app/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Tone = 'soft' | 'strong' | 'final' | 'ai';
type Slide = { tone: Tone; lines: (string | JSX.Element)[] };

function P({ children }: { children: React.ReactNode }) {
  return <span className="point">{children}</span>;
}

/* =========================================================
   ✅ 슬라이드: 6장 → 2장으로 압축
   - 덩어리로 짧게, 한 번에 읽히게
========================================================= */
const SLIDES: Slide[] = [
  {
    tone: 'soft',
    lines: [
      <>
        <P>기억</P> 말고 <P>기록</P>.
      </>,
      '일정 · 고객 · 메모 · 성과를 한 화면에.',
    ],
  },
  {
    tone: 'final',
    lines: [
      <>
        반론 대응은 <P>AI</P>가 정리하고,
      </>,
      '경험은 데이터가 됩니다. 지금 시작할까요?',
    ],
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useSoftSlides(total: number, opts?: { holdMs?: number; fadeMs?: number }) {
  const holdMs = opts?.holdMs ?? 4600;
  const fadeMs = opts?.fadeMs ?? 1400;

  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIdx(0);
    setDone(false);
  }, [total]);

  useEffect(() => {
    if (!Number.isFinite(total) || total <= 0) {
      setDone(true);
      return;
    }

    if (idx > total - 1) {
      setIdx(total - 1);
      return;
    }

    if (idx >= total - 1) {
      const t = window.setTimeout(() => setDone(true), holdMs + fadeMs);
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => {
      setIdx((v) => clamp(v + 1, 0, total - 1));
    }, holdMs);

    return () => window.clearTimeout(t);
  }, [idx, total, holdMs, fadeMs]);

  return { idx, done, fadeMs };
}

export default function Page() {
  const [hover, setHover] = useState<'login' | 'join' | null>(null);

  // ✅ 2장이라 너무 오래 기다리면 답답할 수 있어서 살짝 단축
  const { idx, done, fadeMs } = useSoftSlides(SLIDES.length, { holdMs: 3200, fadeMs: 1200 });

  const safeIdx = clamp(idx, 0, Math.max(0, SLIDES.length - 1));
  const slide = SLIDES[safeIdx] ?? SLIDES[SLIDES.length - 1];

  const dockStyle: React.CSSProperties = useMemo(
    () => ({
      width: 'min(620px, calc(100vw - 34px))',
      padding: 12,
      borderRadius: 999,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.22), 0 22px 58px rgba(0,0,0,0.33)',
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
        ? '0 0 0 2px rgba(255,255,255,1), 0 0 40px rgba(255,77,184,0.65), 0 0 90px rgba(168,85,247,0.45), 0 28px 70px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(255,255,255,0.62), 0 0 14px rgba(255,77,184,0.28), 0 0 22px rgba(168,85,247,0.20), 0 16px 34px rgba(0,0,0,0.40)',
      borderColor: on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)',
      transform: on ? 'translateY(-2px) scale(1.03)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.10)' : 'brightness(1)',
    };
  }, [baseBtn, hover]);

  const joinBtn: React.CSSProperties = useMemo(() => {
    const on = hover === 'join';
    return {
      ...baseBtn,
      background:
        'linear-gradient(90deg, rgba(168,85,247,0.62) 0%, rgba(255,255,255,0.18) 55%, rgba(124,58,237,0.62) 100%)',
      boxShadow: on
        ? '0 0 0 2px rgba(255,255,255,1), 0 0 40px rgba(168,85,247,0.62), 0 0 90px rgba(255,77,184,0.35), 0 28px 70px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(255,255,255,0.58), 0 0 14px rgba(168,85,247,0.26), 0 0 22px rgba(255,77,184,0.16), 0 16px 34px rgba(0,0,0,0.40)',
      borderColor: on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)',
      transform: on ? 'translateY(-2px) scale(1.03)' : 'translateY(0px) scale(1)',
      filter: on ? 'brightness(1.08)' : 'brightness(1)',
    };
  }, [baseBtn, hover]);

  return (
    <main className="gate">
      <div className="bg" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="spark" aria-hidden="true" />

      <section className="center" aria-label="UPLOG 시작">
        <div className="brand">
          <div className="text">
            <h1 className="title">UPLOG</h1>
            <p className="tagline">오늘도 나를 UP시키다</p>
          </div>

          <div className="slideCard" aria-label="소개 슬라이드">
            <div key={safeIdx} className={`slide ${slide?.tone ?? ''}`} style={{ animationDuration: `${fadeMs}ms` }}>
              <div className="lines">
                {slide.lines.map((t, i) => (
                  <div key={i} className="line">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`actions ${done ? 'show' : ''}`} aria-label="로그인/회원가입">
            <div style={dockStyle}>
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
            </div>
          </div>
        </div>
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
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.14), transparent 60%),
            radial-gradient(circle at 50% 94%, rgba(0, 0, 0, 0.22), transparent 62%);
        }

        .spark {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.12), transparent 56%);
        }

        .center {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: grid;
          place-items: start center;
          padding: 86px 16px 34px;
        }

        .brand {
          width: min(860px, 94vw);
          display: grid;
          justify-items: center;
          gap: 18px;
          text-align: center;
        }

        .text {
          display: grid;
          gap: 8px;
          justify-items: center;
        }

        .title {
          margin: 0;
          font-size: 56px;
          font-weight: 950;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
          line-height: 1.05;
        }

        .tagline {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.18);
        }

        .slideCard {
          width: min(820px, 94vw);
          border-radius: 28px;
          padding: 24px 26px;
          text-align: left;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.26);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          overflow: hidden;
          margin-top: 10px;
        }

        .slide {
          animation-name: slideIn;
          animation-timing-function: ease;
          animation-fill-mode: both;
        }

        @keyframes slideIn {
          0% {
            opacity: 0;
            filter: blur(16px);
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0px);
          }
        }

        .lines {
          display: grid;
          gap: 12px;
        }

        .line {
          font-size: 20px;
          font-weight: 950;
          line-height: 1.5;
          letter-spacing: -0.2px;
          color: rgba(255, 255, 255, 0.94);
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.16);
          word-break: keep-all;
        }

        .soft .line {
          opacity: 0.93;
        }

        .final .line {
          font-size: 22px;
          font-weight: 1000;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 0 18px rgba(255, 122, 217, 0.22), 0 0 34px rgba(168, 85, 247, 0.16),
            0 2px 16px rgba(0, 0, 0, 0.2);
        }

        .point {
          background: linear-gradient(90deg, #ff7ad9 0%, #b86bff 50%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 1000;
          text-shadow: 0 0 16px rgba(255, 122, 217, 0.28), 0 0 22px rgba(168, 85, 247, 0.2);
        }

        .actions {
          opacity: 0;
          transform: translateY(12px);
          filter: blur(12px);
          pointer-events: none;
          transition: opacity 900ms ease, transform 900ms ease, filter 900ms ease;
          margin-top: 18px;
        }
        .actions.show {
          opacity: 1;
          transform: translateY(0px);
          filter: blur(0px);
          pointer-events: auto;
        }

        @media (max-width: 520px) {
          .center {
            padding-top: 74px;
          }
          .title {
            font-size: 46px;
          }
          .tagline {
            font-size: 16px;
          }
          .line {
            font-size: 17px;
          }
          .final .line {
            font-size: 18px;
          }
          .slideCard {
            padding: 20px 18px;
            border-radius: 22px;
          }
        }
      `}</style>
    </main>
  );
}
