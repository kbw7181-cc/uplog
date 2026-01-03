'use client';

import Link from 'next/link';

export default function GatePage() {
  return (
    <main className="gate">
      <div className="gate-bg" aria-hidden="true" />

      <section className="gate-center" aria-label="UPLOG 시작">
        {/* 🔥 버튼을 “슬로건 아래”로 고정 */}
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
          min-height: 100svh; /* ✅ 하단 검은줄 방지 */
          overflow: hidden;
          background: #7b3bbf;
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .gate-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.32)),
            url('/main.png') center / cover no-repeat;
          transform: scale(1.01);
          filter: saturate(1.08);
        }

        .gate-center {
          position: relative;
          width: min(760px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          /* ✅ 글귀 아래로 오게: 화면 하단 붙지 않게 */
          padding-top: 240px;
          padding-bottom: 28px;
        }

        @media (max-height: 820px) {
          .gate-center {
            padding-top: 200px;
          }
        }
        @media (max-height: 720px) {
          .gate-center {
            padding-top: 170px;
          }
        }

        .gate-actions {
          width: min(560px, 100%);
          padding: 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.26);
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.22);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;

          /* ✅ 둥둥 */
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
          height: 56px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px; /* ✅ 가독성 */
          font-weight: 900;
          letter-spacing: -0.2px;
          text-decoration: none;
          user-select: none;
          transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
        }

        .gate-btn:active {
          transform: translateY(1px) scale(0.99);
        }

        .gate-btn-primary {
          color: #ffffff;
          background: linear-gradient(90deg, rgba(255, 72, 158, 0.98), rgba(172, 88, 255, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.28); /* ✅ 라운드 테두리 */
          box-shadow: 0 14px 30px rgba(255, 72, 158, 0.24), 0 14px 30px rgba(172, 88, 255, 0.18);
        }

        .gate-btn-primary:hover {
          filter: brightness(1.06);
        }

        .gate-btn-ghost {
          color: rgba(255, 255, 255, 0.96); /* ✅ 글씨 밝게 */
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.26); /* ✅ 라운드 테두리 */
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .gate-btn-ghost:hover {
          background: rgba(0, 0, 0, 0.24);
        }
      `}</style>
    </main>
  );
}
