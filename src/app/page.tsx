'use client';

import Link from 'next/link';

export default function GatePage() {
  return (
    <main className="gate">
      <div className="gateBg" aria-hidden="true" />

      <section className="gateCenter" aria-label="UPLOG 시작">
        <div className="btnRow" role="group" aria-label="로그인/회원가입">
          <Link href="/login" className="gateBtn gateBtnPrimary" aria-label="로그인">
            로그인
          </Link>
          <Link href="/register" className="gateBtn gateBtnGhost" aria-label="회원가입">
            회원가입
          </Link>
        </div>
      </section>

      {/* ✅ 전역으로 강하게(다른 CSS가 덮어도 버튼이 무조건 살아남게) */}
      <style jsx global>{`
        .gate {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background: #7b3bbf;
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .gateBg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.34)),
            url('/main.png') center / cover no-repeat;
          transform: scale(1.01);
          filter: saturate(1.08);
        }

        .gateCenter {
          position: relative;
          width: min(760px, 100%);
          display: flex;
          justify-content: center;

          /* ✅ 글귀 아래로 살짝 더 내려서 고정 */
          padding-top: 300px;
          padding-bottom: 28px;
        }
        @media (max-height: 820px) {
          .gateCenter {
            padding-top: 260px;
          }
        }
        @media (max-height: 720px) {
          .gateCenter {
            padding-top: 230px;
          }
        }

        .btnRow {
          width: min(640px, 100%);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          animation: floaty 2.6s ease-in-out infinite;
        }

        @keyframes floaty {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
          100% {
            transform: translateY(0);
          }
        }

        /* ✅ 핵심: 다른 전역 a 스타일이 덮어도 버튼이 무조건 “버튼처럼” 보이게 !important */
        .gateBtn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;

          height: 64px !important;
          border-radius: 20px !important;

          font-size: 22px !important;
          font-weight: 950 !important;
          letter-spacing: -0.3px !important;
          text-decoration: none !important;

          border: 2px solid rgba(255, 255, 255, 0.28) !important;
          backdrop-filter: blur(10px) !important;

          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;

          transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease !important;
          user-select: none !important;

          color: rgba(255, 255, 255, 0.98) !important;
        }

        .gateBtn:active {
          transform: translateY(1px) scale(0.99) !important;
        }

        .gateBtnPrimary {
          background: linear-gradient(90deg, rgba(255, 72, 158, 0.98), rgba(172, 88, 255, 0.98)) !important;
        }
        .gateBtnPrimary:hover {
          filter: brightness(1.06) !important;
        }

        .gateBtnGhost {
          background: rgba(0, 0, 0, 0.18) !important;
        }
        .gateBtnGhost:hover {
          background: rgba(0, 0, 0, 0.24) !important;
        }
      `}</style>
    </main>
  );
}
