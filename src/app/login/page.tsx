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

      <section className="auth-card" aria-label="로그인">
        <header className="auth-head">
          {/* ✅ 로고: public/assets/gogo.png 고정 */}
          <div className="auth-logo" aria-hidden="true">
            <img src="/assets/gogo.png" alt="" className="auth-logoImg" />
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

          {/* ✅ 로그인 화면 메인 버튼은 로그인 1개만 */}
          <button className="auth-btn auth-primary" disabled={!canSubmit} type="submit">
            {loading ? '처리 중…' : '로그인'}
          </button>

          {/* ✅ 회원가입은 버튼이 아니라 '작은 링크'로만 */}
          <div className="auth-footer">
            <span className="auth-footText">계정이 없나요?</span>
            <Link className="auth-footLink" href="/register">
              회원가입
            </Link>
          </div>
        </form>
      </section>

      <style jsx>{`
        /* ✅ 입력창 오른쪽 치우침 방지 핵심: box-sizing + width 100% */
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
        }

        .auth-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 20% 10%, rgba(255, 70, 190, 0.28), transparent 55%),
            radial-gradient(circle at 85% 15%, rgba(145, 80, 255, 0.35), transparent 52%),
            radial-gradient(circle at 45% 95%, rgba(255, 155, 220, 0.2), transparent 50%),
            linear-gradient(135deg, #a23ea7 0%, #7b3fe6 100%);
          filter: saturate(1.05);
        }

        .auth-card {
          width: min(760px, 96vw);
          border-radius: 26px;
          padding: 24px 22px 22px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
        }

        .auth-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 6px 14px;
        }

        .auth-logo {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .auth-logoImg {
          width: 30px;
          height: 30px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 10px 18px rgba(255, 77, 184, 0.18));
        }

        .auth-titles {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .auth-brand {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.4px;
          color: rgba(255, 255, 255, 0.95);
        }

        .auth-sub {
          margin-top: 4px;
          font-size: 16px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.78);
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
          font-weight: 800;
          color: rgba(255, 255, 255, 0.85);
          margin: 10px 0 8px;
        }

        .auth-input {
          width: 100%;
          max-width: 100%;
          height: 52px;
          border-radius: 16px;
          padding: 0 16px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.22);
          outline: none;
          display: block;
        }

        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.55);
        }

        .auth-input:focus {
          border-color: rgba(255, 77, 184, 0.6);
          box-shadow: 0 0 0 3px rgba(255, 77, 184, 0.18);
        }

        .auth-msg {
          margin-top: 2px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 800;
        }

        .auth-btn {
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 900;
          user-select: none;
        }

        .auth-primary {
          margin-top: 6px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: linear-gradient(90deg, #ff4db8 0%, #b86bff 55%, #7c3aed 100%);
          color: #ffffff;
          box-shadow: 0 18px 42px rgba(255, 77, 184, 0.18);
          cursor: pointer;
        }

        .auth-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: grayscale(0.2);
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
          font-weight: 800;
          color: rgba(255, 255, 255, 0.75);
        }

        .auth-footLink {
          font-size: 13px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.95);
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(0, 0, 0, 0.14);
        }

        .auth-footLink:hover {
          border-color: rgba(255, 255, 255, 0.34);
          background: rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </main>
  );
}
