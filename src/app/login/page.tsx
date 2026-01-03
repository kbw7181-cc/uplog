'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace('/home');
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErr(error.message);
      setSubmitting(false);
      return;
    }

    router.replace('/home');
  }

  if (loading) {
    return (
      <main className="auth">
        <div className="bg" aria-hidden="true" />
        <div className="card">로딩중…</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="auth">
      <div className="bg" aria-hidden="true" />

      <section className="card" aria-label="로그인">
        <header className="head">
          <div className="brand">
            <img className="logo" src="/assets/gogo.png" alt="UPLOG" />
            <div className="brandText">
              <div className="title">UPLOG</div>
              <div className="sub">오늘도 나를 UP시키다</div>
            </div>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <label className="lbl">
            <span className="lblt">이메일</span>
            <input
              className="inp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              autoComplete="email"
            />
          </label>

          <label className="lbl">
            <span className="lblt">비밀번호</span>
            <input
              className="inp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </label>

          {err && <div className="err">{err}</div>}

          <button className="btn btnPrimary" type="submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <div className="foot">
            <span className="muted">아직 계정이 없나요?</span>
            <Link href="/register" className="btn btnGhost">
              회원가입
            </Link>
          </div>
        </form>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .auth{
    position: relative;
    min-height: 100svh;
    overflow: hidden;
    display: grid;
    place-items: center;
    padding: 18px;
    background: #7b3bbf;
  }
  .bg{
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 18%, rgba(255, 82, 168, 0.40), transparent 48%),
      radial-gradient(circle at 82% 28%, rgba(172, 88, 255, 0.48), transparent 52%),
      radial-gradient(circle at 48% 92%, rgba(255, 255, 255, 0.10), transparent 55%),
      linear-gradient(180deg, rgba(20, 0, 36, 0.22), rgba(20, 0, 36, 0.40));
    filter: saturate(1.06);
  }

  .card{
    position: relative;
    width: min(560px, 100%);
    border-radius: 24px;
    padding: 18px;
    background: rgba(255,255,255,0.12);
    border: 1.5px solid rgba(255,255,255,0.26);
    backdrop-filter: blur(12px);
    box-shadow: 0 18px 48px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.96);
    animation: floaty 2.8s ease-in-out infinite;
  }

  @keyframes floaty{
    0%{ transform: translateY(0); }
    50%{ transform: translateY(-6px); }
    100%{ transform: translateY(0); }
  }

  .head{ padding: 6px 6px 12px; }
  .brand{
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo{
    width: 44px;
    height: 44px;
    object-fit: contain;
    filter: drop-shadow(0 10px 16px rgba(0,0,0,0.20));
  }
  .brandText{ display: grid; gap: 2px; }
  .title{
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.4px;
  }
  .sub{
    font-size: 14px;
    opacity: 0.95;
  }

  .form{ display: grid; gap: 12px; padding: 10px 6px 6px; }
  .lbl{ display: grid; gap: 8px; }
  .lblt{
    font-size: 14px;
    font-weight: 800;
    color: rgba(255,255,255,0.95);
  }

  .inp{
    height: 52px;
    border-radius: 16px;
    border: 1.5px solid rgba(255,255,255,0.26);
    background: rgba(0,0,0,0.22);
    color: rgba(255,255,255,0.96);
    padding: 0 14px;
    outline: none;
    font-size: 16px;
  }
  .inp::placeholder{ color: rgba(255,255,255,0.70); }
  .inp:focus{
    border-color: rgba(255, 140, 210, 0.65);
    box-shadow: 0 0 0 4px rgba(255, 82, 168, 0.18);
  }

  .err{
    padding: 11px 12px;
    border-radius: 16px;
    background: rgba(255, 60, 120, 0.18);
    border: 1.5px solid rgba(255, 60, 120, 0.26);
    font-size: 14px;
    font-weight: 700;
  }

  .btn{
    height: 52px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 950;
    text-decoration: none;
    user-select: none;
    border: 1.5px solid rgba(255,255,255,0.26); /* ✅ 버튼 테두리 */
    transition: transform .12s ease, filter .12s ease, background .12s ease;
  }

  .btnPrimary{
    color: #fff;
    background: linear-gradient(90deg, rgba(255,72,158,0.98), rgba(172,88,255,0.98));
    box-shadow: 0 14px 30px rgba(255,72,158,0.22), 0 14px 30px rgba(172,88,255,0.16);
    cursor: pointer;
  }
  .btnPrimary:disabled{ opacity: 0.72; cursor: not-allowed; }
  .btnPrimary:hover{ filter: brightness(1.06); }
  .btn:active{ transform: translateY(1px) scale(0.99); }

  .foot{
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    padding-top: 4px;
  }
  .muted{ opacity: 0.92; font-size: 14px; font-weight: 700; }

  .btnGhost{
    padding: 0 16px;
    height: 44px;
    border-radius: 14px;
    background: rgba(0,0,0,0.20);
    color: rgba(255,255,255,0.96);
    border: 1.5px solid rgba(255,255,255,0.26);
  }
  .btnGhost:hover{ background: rgba(0,0,0,0.26); }
`;
