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

          /* ✅ 더 밑으로 */
          padding-top: 360px;
          padding-bottom: 22px;
        }
        @media (max-height: 820px) {
          .gateCenter {
            padding-top: 310px;
          }
        }
        @media (max-height: 720px) {
          .gateCenter {
            padding-top: 270px;
          }
        }

        .btnRow {
          width: min(560px, 100%);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          animation: floaty 2.6s ease-in-out infinite;
        }

        @keyframes floaty {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }

        /* ✅ 버튼 크기 줄임 */
        .gateBtn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;

          height: 52px !important;
          border-radius: 18px !important;

          font-size: 18px !important;
          font-weight: 950 !important;
          letter-spacing: -0.2px !important;
          text-decoration: none !important;

          border: 1.5px solid rgba(255, 255, 255, 0.28) !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;

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
