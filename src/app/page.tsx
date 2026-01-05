// ✅✅✅ 전체복붙: src/app/page.tsx
// 목표: “가운데 한눈에 딱”
// - 로고/타이틀/슬로건을 중앙 그룹으로 꽉 잡고(시선 고정)
// - 버튼은 도크로 아래에 깔끔하게, 크기 줄이고 가독성(흰색/굵게) 강화
// - 과한 유리판 느낌 줄이고 “프로덕트 런치 스크린”처럼 정돈
// - 로고: public/gogo.png => /gogo.png
'use client';

import Link from 'next/link';

export default function Page() {
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

      {/* ✅ 하단 버튼 */}
      <section className="dock" aria-label="로그인/회원가입">
        <Link href="/login" className="btn primary">
          로그인
        </Link>
        <Link href="/register" className="btn secondary">
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

        /* ✅ 배경: 위는 핑크, 아래는 퍼플로 “한 장” 느낌 */
        .bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: linear-gradient(180deg, #ff7ad9 0%, #b86bff 36%, #7c3aed 70%, #5b21b6 100%);
        }

        /* ✅ 위/아래 시선 고정용 비네팅 */
        .vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.14), transparent 58%),
            radial-gradient(circle at 50% 92%, rgba(0, 0, 0, 0.22), transparent 62%);
        }

        /* ✅ 중앙 반짝 라이트(과하지 않게) */
        .spark {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.12), transparent 55%);
        }

        /* ✅ 중앙 그룹: “한눈에 딱” */
        .center {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 28px 18px 170px; /* 하단 버튼 공간 확보 */
        }

        .brand {
          width: min(520px, 92vw);
          display: grid;
          justify-items: center;
          gap: 18px;
          text-align: center;
          transform: translateY(-10px); /* 살짝 위로 올려서 더 ‘중앙’ 느낌 */
        }

        /* ✅ 로고 쉘 */
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

        /* ✅ 텍스트: 굵기/간격으로 “프로” 정돈 */
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
          letter-spacing: -0.1px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.16);
        }

        /* ✅ 하단 버튼: 더 작게 + 더 ‘버튼’처럼(흰 글씨/굵게) */
        .dock {
          position: fixed;
          left: 50%;
          bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          transform: translateX(-50%);
          z-index: 10;

          width: min(740px, calc(100vw - 28px));
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;

          padding: 10px;
          border-radius: 999px;

          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .btn {
          height: 50px; /* ✅ 사이즈 줄임 */
          border-radius: 999px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-decoration: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;

          font-size: 18px; /* ✅ 정돈 */
          font-weight: 950; /* ✅ 두껍게 */
          letter-spacing: 0.3px;
          color: #ffffff; /* ✅ 흰 글씨 */

          border: 1px solid rgba(255, 255, 255, 0.26);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18);

          transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
        }

        .btn.primary {
          background: linear-gradient(90deg, #ff4db8 0%, #c86bff 55%, #7c3aed 100%);
        }

        .btn.secondary {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.12) 55%, rgba(255, 255, 255, 0.18) 100%);
        }

        .btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 46px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.22);
        }

        .btn:active {
          transform: translateY(0);
          filter: brightness(0.98);
        }

        @media (max-width: 420px) {
          .brand {
            transform: translateY(-6px);
          }
          .logoShell {
            width: 220px;
            height: 220px;
          }
          .logoCard {
            border-radius: 34px;
          }
          .title {
            font-size: 46px;
          }
          .tagline {
            font-size: 16px;
          }
          .dock {
            bottom: 54px;
          }
          .btn {
            height: 46px;
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}
