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
      {/* ✅ 배경 이미지: public/main.png */}
      <div className="bg" aria-hidden="true" />

      {/* ✅ 하단 고정 카드 (중복 문구 제거: 카드 안엔 버튼만) */}
      <section className="card" aria-label="UPLOG 시작">
        <div className="actions">
          <button className="btn primary" onClick={() => router.push('/login')}>
            로그인
          </button>
          <button className="btn ghost" onClick={() => router.push('/register')}>
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

        .bg {
          position: absolute;
          inset: 0;
          background-image: url('/main.png');
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center;
          filter: saturate(1.02);
          transform: translateY(-2%);
        }

        /* ✅ 카드가 이미지 덜 가리게: 더 얇게 + 더 아래 + 폭 적당히 */
        .card {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: min(520px, calc(100% - 28px));
          border-radius: 26px;
          padding: 14px 14px 12px;

          background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);

          color: #fff;
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

          transition: transform 160ms ease, box-shadow 180ms ease, filter 180ms ease, border-color 180ms ease;

          /* ✅ 둥둥 */
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

        @media (max-width: 520px) {
          .card {
            bottom: 14px;
            padding: 12px 12px 10px;
            border-radius: 22px;
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
