// ✅✅✅ 전체복붙: src/app/login/page.tsx
'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.includes('@') && pw.trim().length >= 1 && !loading;
  }, [email, pw, loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw.trim(),
      });

      if (error) {
        setMsg(error.message || '로그인에 실패했어요.');
        return;
      }

      router.replace('/home');
    } catch (err: any) {
      setMsg(err?.message || '로그인 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-vignette" aria-hidden="true" />

      <section className="auth-card" aria-label="로그인">
        <header className="auth-head">
          <div className="auth-logo" aria-hidden="true">
            <div className="auth-logoHalo" aria-hidden="true" />
            {/* ✅ public/gogo.png */}
            <img src="/gogo.png" alt="" className="auth-logoImg" draggable={false} />
          </div>

          <div className="auth-titles">
            <div className="auth-brand">UPLOG</div>
            <div className="auth-sub">로그인</div>
          </div>
        </header>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            <span>이메일</span>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              inputMode="email"
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            <span>비밀번호</span>
            <input
              className="auth-input"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {msg ? <div className="auth-msg">{msg}</div> : null}

          <button className="auth-btn auth-primary" disabled={!canSubmit} type="submit">
            {loading ? '처리 중…' : '로그인'}
          </button>

          <div className="auth-footer">
            <span className="auth-footText">계정이 없나요?</span>
            <Link className="auth-footLink" href="/register">
              회원가입
            </Link>
          </div>
        </form>
      </section>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 26px 16px;
          position: relative;
          overflow: hidden;
          background: #120022;
        }

        .auth-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 20% 10%, rgba(255, 70, 190, 0.28), transparent 55%),
            radial-gradient(circle at 85% 15%, rgba(145, 80, 255, 0.35), transparent 52%),
            radial-gradient(circle at 45% 95%, rgba(255, 155, 220, 0.2), transparent 50%),
            linear-gradient(135deg, #a23ea7 0%, #7b3fe6 100%);
          filter: saturate(1.05);
          z-index: 0;
        }

        .auth-vignette {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 22%, rgba(255, 255, 255, 0.12), transparent 60%),
            radial-gradient(circle at 50% 96%, rgba(0, 0, 0, 0.22), transparent 62%);
        }

        .auth-card {
          width: min(760px, 96vw);
          border-radius: 28px;
          padding: 26px 22px 22px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        .auth-head {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 6px 6px 16px;
        }

        /* ✅ 로고 더 크게 + 라운드 테두리 강화 */
        .auth-logo {
          width: 66px;
          height: 66px;
          border-radius: 22px;
          position: relative;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.34);
          display: grid;
          place-items: center;
          overflow: hidden;

          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 14px 40px rgba(0, 0, 0, 0.28);
        }

        .auth-logoHalo {
          position: absolute;
          inset: -10px;
          border-radius: 26px;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.22), transparent 62%);
          pointer-events: none;
        }

        .auth-logoImg {
          width: 46px;
          height: 46px;
          object-fit: contain;
          display: block;
          user-select: none;
          filter: drop-shadow(0 14px 22px rgba(255, 77, 184, 0.22));
        }

        .auth-titles {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .auth-brand {
          font-size: 28px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
        }

        .auth-sub {
          margin-top: 5px;
          font-size: 16px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.86);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 6px;
        }

        .auth-label span {
          display: block;
          font-size: 14px;
          font-weight: 950;
          color: rgba(255, 255, 255, 0.92);
          margin: 10px 0 8px;
        }

        /* ✅ 입력칸 톤은 그대로(지금 스샷 느낌) */
        .auth-input {
          width: 100%;
          max-width: 100%;
          height: 54px;
          border-radius: 18px;
          padding: 0 16px;
          font-size: 16px;
          color: rgba(20, 20, 30, 0.92);
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.30);
          outline: none;
          display: block;
        }

        .auth-input::placeholder {
          color: rgba(20, 20, 30, 0.45);
        }

        .auth-input:focus {
          border-color: rgba(255, 77, 184, 0.75);
          box-shadow: 0 0 0 3px rgba(255, 77, 184, 0.22);
        }

        .auth-msg {
          margin-top: 2px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.26);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
        }

        /* ✅ 버튼: Gate(첫화면)랑 “같은 계열” 네온/라운드 */
        .auth-btn {
          height: 56px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 1000;
          user-select: none;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.34);
          transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
        }

        .auth-primary {
          margin-top: 6px;
          background: linear-gradient(90deg, rgba(255, 77, 184, 0.95) 0%, rgba(200, 107, 255, 0.92) 55%, rgba(124, 58, 237, 0.92) 100%);
          color: #ffffff;
          cursor: pointer;

          /* ✅ 기본 상태에서도 네온이 “살짝” 보이게 */
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55), 0 0 14px rgba(255, 77, 184, 0.35),
            0 0 22px rgba(168, 85, 247, 0.28), 0 18px 42px rgba(0, 0, 0, 0.36);
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.28);
        }

        .auth-primary:hover,
        .auth-primary:focus-visible {
          transform: translateY(-1px);
          filter: brightness(1.06);
          border-color: rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 26px rgba(255, 77, 184, 0.78),
            0 0 44px rgba(168, 85, 247, 0.62), 0 24px 58px rgba(0, 0, 0, 0.46);
          outline: none;
        }

        .auth-primary:active {
          transform: translateY(0px);
          filter: brightness(1.02);
        }

        .auth-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          filter: grayscale(0.2);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28), 0 16px 38px rgba(0, 0, 0, 0.3);
        }

        .auth-footer {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
        }

        .auth-footText {
          font-size: 13px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.78);
        }

        /* ✅ 회원가입 링크도 같은 네온 톤 */
        .auth-footLink {
          font-size: 13px;
          font-weight: 1000;
          color: rgba(255, 255, 255, 0.98);
          text-decoration: none;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.16);
          transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
        }

        .auth-footLink:hover,
        .auth-footLink:focus-visible {
          transform: translateY(-1px);
          filter: brightness(1.06);
          border-color: rgba(255, 255, 255, 0.55);
          box-shadow: 0 0 18px rgba(255, 77, 184, 0.24), 0 0 26px rgba(168, 85, 247, 0.18),
            0 16px 34px rgba(0, 0, 0, 0.28);
          outline: none;
        }

        @media (max-width: 420px) {
          .auth-card {
            border-radius: 24px;
          }
          .auth-logo {
            width: 60px;
            height: 60px;
            border-radius: 20px;
          }
          .auth-logoImg {
            width: 42px;
            height: 42px;
          }
          .auth-brand {
            font-size: 26px;
          }
          .auth-input {
            height: 52px;
          }
          .auth-btn {
            height: 54px;
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}
