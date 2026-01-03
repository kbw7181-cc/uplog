'use client';

import Link from 'next/link';

export default function GatePage() {
  return (
    <main className="gate">
      <div className="gate-bg" aria-hidden="true" />

      <section className="gate-center" aria-label="UPLOG 시작">
        <div className="gate-logo" aria-hidden="true">
          {/* main.png에 로고가 이미 있으면 이건 시각적 안정용(안 보이면 무시됨) */}
        </div>

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
        .gate{
          position: relative;
          min-height: 100svh; /* ✅ 하단 검은줄 방지 핵심 */
          overflow: hidden;
          background: #7b3bbf; /* ✅ 배경색 먼저 채워서 빈틈 방지 */
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .gate-bg{
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28)),
            url('/main.png') center / cover no-repeat;
          transform: scale(1.01); /* ✅ 1px 삐져나옴/라인 방지 */
          filter: saturate(1.08);
        }

        .gate-center{
          position: relative;
          width: min(720px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          padding-top: 56px;
          padding-bottom: 24px;
          /* ✅ 버튼이 너무 밑으로 안 내려가게 “중앙 아래” 느낌으로 */
          transform: translateY(140px);
        }

        @media (max-height: 760px){
          .gate-center{ transform: translateY(110px); }
        }
        @media (max-height: 680px){
          .gate-center{ transform: translateY(90px); }
        }

        .gate-actions{
          width: min(520px, 100%);
          padding: 12px;
          border-radius: 18px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(10px);
          box-shadow:
            0 12px 30px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.22);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .gate-btn{
          height: 54px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.2px;
          text-decoration: none;
          transition: transform .12s ease, filter .12s ease, background .12s ease;
          user-select: none;
        }

        .gate-btn:active{
          transform: translateY(1px) scale(0.99);
        }

        .gate-btn-primary{
          color: #ffffff;
          background: linear-gradient(90deg, rgba(255,72,158,0.95), rgba(172,88,255,0.95));
          box-shadow:
            0 10px 22px rgba(255,72,158,0.25),
            0 10px 22px rgba(172,88,255,0.18);
        }

        .gate-btn-primary:hover{
          filter: brightness(1.05);
        }

        .gate-btn-ghost{
          color: rgba(255,255,255,0.92);
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
        }

        .gate-btn-ghost:hover{
          background: rgba(255,255,255,0.16);
        }
      `}</style>
    </main>
  );
}
