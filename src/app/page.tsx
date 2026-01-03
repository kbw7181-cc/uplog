// ✅✅✅ 전체복붙: src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AppGatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          router.replace('/home');
          return;
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="gate-loading">
        로딩중…
        <style jsx>{`
          .gate-loading {
            min-height: 100vh;
            display: grid;
            place-items: center;
            color: #fff;
            background: radial-gradient(circle at 15% 10%, rgba(236, 72, 153, 0.25), transparent 55%),
              radial-gradient(circle at 85% 20%, rgba(168, 85, 247, 0.25), transparent 55%),
              linear-gradient(180deg, #0b0610, #07030b);
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="gate">
      {/* ✅ 배경 이미지: public/main.png (이미지 가리지 않게 "하단 카드"로 배치) */}
      <div className="bg" aria-hidden="true" />

      {/* ✅ 하단 고정 카드 */}
      <section className="card" aria-label="UPLOG 시작">
        <div className="brand">
          <div className="title">UPLOG</div>
          <div className="sub">오늘도 나를 UP시키다</div>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={() => router.push('/login')}>
            로그인
          </button>
          <button className="btn ghost" onClick={() => router.push('/signup')}>
            회원가입
          </button>
        </div>
      </section>

      <style jsx>{`
        .gate {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: linear-gradient(180deg, #2a0f3a, #16081f);
        }

        /* ✅ 배경 이미지가 "가려지지 않게" 중앙 위로 살짝 올리고, 카드가 하단에만 차지 */
        .bg {
          position: absolute;
          inset: 0;
          background-image: url('/main.png'); /* ✅ public/main.png */
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center;
          filter: saturate(1.02);
          transform: translateY(-2%);
        }

        /* ✅ 하단 카드가 이미지 대부분을 가리지 않도록: 높이/패딩 최소 + 아래쪽만 */
        .card {
          position: absolute;
          left: 50%;
          bottom: 28px; /* ✅ 더 아래로 */
          transform: translateX(-50%);
          width: min(520px, calc(100% - 28px));
          border-radius: 26px;
          padding: 18px 16px 14px;

          background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.10));
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);

          color: #fff;
        }

        .brand {
          text-align: center;
          margin-bottom: 12px; /* ✅ 더 компакт */
        }
        .title {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 0.6px;
          text-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        }
        .sub {
          margin-top: 4px;
          font-size: 13px;
          opacity: 0.9;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn {
          height: 50px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          cursor: pointer;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.2px;
          user-select: none;

          transition: transform 160ms ease, box-shadow 180ms ease, filter 180ms ease,
            border-color 180ms ease;
        }

        /* ✅ 둥둥(부드럽게) */
        .btn {
          animation: floaty 2.8s ease-in-out infinite;
        }
        .btn.ghost {
          animation-delay: 0.15s;
        }

        @keyframes floaty {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .primary {
          background: linear-gradient(90deg, rgba(236, 72, 153, 0.96), rgba(168, 85, 247, 0.96));
          box-shadow: 0 16px 40px rgba(168, 85, 247, 0.22);
          color: #1a0623;
          text-shadow: none;
        }

        .ghost {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.28);
          filter: saturate(1.06);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.25);
        }

        .btn:active {
          transform: translateY(0px) scale(0.995);
        }

        /* ✅ 작은 화면에서 카드가 이미지 더 덜 가리게: 더 낮게 + 더 얇게 */
        @media (max-width: 520px) {
          .card {
            bottom: 18px;
            padding: 16px 14px 12px;
            border-radius: 22px;
          }
          .title {
            font-size: 28px;
          }
          .btn {
            height: 48px;
            border-radius: 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
