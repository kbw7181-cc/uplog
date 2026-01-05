// ✅✅✅ 전체복붙: (지금 / 라우트를 먹는 그 page.tsx)
'use client';

import Link from 'next/link';

export default function Page() {
  return (
    <main className="gate">
      <div className="bg" aria-hidden="true" />

      {/* ✅ 적용 확인용: 이게 안 뜨면 '다른 파일'이 렌더링 중 */}
      <div className="badge">GATE APPLY ✅</div>

      {/* ✅ 이미지 하단의 박힌 글씨 영역 살짝 덮기 + 버튼 도크 배경 */}
      <div className="dockBg" aria-hidden="true" />

      {/* ✅ 무조건 보이는 버튼(라운드/테두리/그림자 강하게) */}
      <nav className="dock" aria-label="시작">
        <Link href="/login" className="pill primary">
          로그인
        </Link>
        <Link href="/register" className="pill ghost">
          회원가입
        </Link>
      </nav>

      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          background: #120022; /* ✅ 하단 하얀줄 방지 */
        }
        :global(*) {
          box-sizing: border-box;
        }

        .gate {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #120022;
        }

        .bg {
          position: fixed;
          inset: 0;
          background: url('/main.png') center / cover no-repeat;
          z-index: 0;
        }

        /* ✅ 상단 적용 확인 */
        .badge {
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 2147483647;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          border: 2px solid rgba(255, 255, 255, 0.5);
          color: #fff;
          font-weight: 1000;
          font-size: 13px;
          letter-spacing: 0.2px;
          backdrop-filter: blur(8px);
        }

        /* ✅ 하단 도크 배경(이미지 글씨 덮기 + 버튼 대비) */
        .dockBg {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 260px;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(10, 0, 22, 0.88) 0%,
            rgba(70, 20, 120, 0.35) 55%,
            rgba(0, 0, 0, 0) 100%
          );
          backdrop-filter: blur(10px);
        }

        /* ✅ 버튼 도크: 무조건 최상단 */
        .dock {
          position: fixed;
          left: 50%;
          bottom: 58px;
          transform: translateX(-50%);
          z-index: 2147483646;
          display: flex;
          gap: 14px;
        }

        /* ✅ 버튼: 라운드/테두리/그림자 "안 보일 수가 없게" */
        .pill {
          min-width: 190px;
          height: 58px;
          border-radius: 999px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-decoration: none;
          user-select: none;
          cursor: pointer;

          font-size: 18px;
          font-weight: 1000;

          border: 3px solid rgba(255, 255, 255, 0.95);
          color: rgba(255, 255, 255, 0.98);

          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.45),
            0 0 18px rgba(255, 255, 255, 0.14),
            inset 0 0 0 1px rgba(255, 255, 255, 0.22);

          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);

          transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease,
            background 0.14s ease, border-color 0.14s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .primary {
          background: linear-gradient(
            90deg,
            rgba(255, 77, 184, 0.45) 0%,
            rgba(184, 107, 255, 0.32) 55%,
            rgba(124, 58, 237, 0.28) 100%
          );
          box-shadow:
            0 22px 52px rgba(255, 77, 184, 0.22),
            0 18px 42px rgba(0, 0, 0, 0.42),
            inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        }

        .ghost {
          background: rgba(255, 255, 255, 0.12);
        }

        .pill:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          border-color: rgba(255, 255, 255, 1);
          background: rgba(255, 255, 255, 0.18);
        }

        .pill:active {
          transform: translateY(0);
          filter: brightness(0.98);
          box-shadow: inset 0 8px 14px rgba(0, 0, 0, 0.45);
        }

        @media (max-width: 420px) {
          .pill {
            min-width: 160px;
            height: 54px;
            font-size: 17px;
          }
          .dock {
            bottom: 48px;
            gap: 10px;
          }
        }
      `}</style>
    </main>
  );
}
