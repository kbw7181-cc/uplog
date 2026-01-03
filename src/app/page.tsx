'use client';

import Link from 'next/link';

export default function GatePage() {
  return (
    <main className="gate">
      <div className="gate-bg" aria-hidden="true" />

      <section className="gate-center" aria-label="UPLOG 시작">
        <div className="gate-actions" role="group" aria-label="로그인/회원가입">
          <Link href="/login" className="gate-btn gate-btn-primary">
            로그인
          </Link>
          <Link href="/register" className="gate-btn gate-btn-ghost">
            회원가입
          </Link>
        </div>
      </section>

      <style jsx>{`
        .gate {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background: #7b3bbf;
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .gate-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.34)),
            url('/main.png') center / cover no-repeat;
          transform: scale(1.01);
          filter: saturate(1.08);
        }

        .gate-center {
          position: relative;
          width: min(760px, 100%);
          display: flex;
          justify-content: center;

          /* ✅ 버튼을 “슬로건 아래”에서 살짝 더 아래로 */
          padding-top: 278px;
          padding-bottom: 30px;
        }

        @media (max-height: 820px) {
          .gate-center {
            padding-top: 240px;
          }
        }
        @media (max-height: 720px) {
          .gate-center {
            padding-top: 210px;
          }
        }

        /* ✅ 한 덩어리 카드 제거 -> 버튼 2개를 각각 독립 카드처럼 */
        .gate-actions {
          width: min(620px, 100%);
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

        .gate-btn {
          height: 58px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.2px;
          text-decoration: none;

          border: 1.5px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(10px);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18);

          transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease;
          user-select: none;
        }

        .gate-btn:active {
          transform: translateY(1px) scale(0.99);
        }

        .gate-btn-primary {
          color: #fff;
          background: linear-gradient(90deg, rgba(255, 72, 158, 0.98), rgba(172, 88, 255, 0.98));
        }

        .gate-btn-primary:hover {
          filter: brightness(1.06);
        }

        .gate-btn-ghost {
          color: rgba(255, 255, 255, 0.98);
          background: rgba(0, 0, 0, 0.18);
        }

        .gate-btn-ghost:hover {
          background: rgba(0, 0, 0, 0.24);
        }
      `}</style>
    </main>
  );
}
