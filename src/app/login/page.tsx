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

    try {
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
    } catch (e: any) {
      setErr(e?.message ?? '로그인 중 오류가 발생했어요.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="auth">
        <div className="bg" aria-hidden="true" />
        <div className="card">로딩중…</div>
        <style jsx>{baseStyles}</style>
      </main>
    );
  }

  return (
    <main className="auth">
      <div className="bg" aria-hidden="true" />

      <section className="card" aria-label="로그인">
        <header className="head">
          <div className="brand">
            <span className="mark" aria-hidden="true">↑</span>
            <span className="title">UPLOG</span>
          </div>
          <p className="sub">오늘도 나를 UP시키다</p>
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
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {err && <div className="err">{err}</div>}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <div className="foot">
            <span className="muted">아직 계정이 없나요?</span>
            <Link href="/register" className="link">회원가입</Link>
          </div>
        </form>
      </section>

      <style jsx>{baseStyles}</style>
    </main>
  );
}

const baseStyles = `
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
      radial-gradient(circle at 20% 18%, rgba(255, 82, 168, 0.38), transparent 48%),
      radial-gradient(circle at 82% 28%, rgba(172, 88, 255, 0.45), transparent 52%),
      radial-gradient(circle at 48% 92%, rgba(255, 255, 255, 0.08), transparent 55%),
      linear-gradient(180deg, rgba(20, 0, 36, 0.22), rgba(20, 0, 36, 0.38));
    filter: saturate(1.06);
  }

  .card{
    position: relative;
    width: min(520px, 100%);
    border-radius: 22px;
    padding: 18px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    backdrop-filter: blur(12px);
    box-shadow: 0 16px 44px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.92);
  }

  .head{ padding: 6px 6px 12px; }
  .brand{
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .mark{
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-weight: 900;
    background: linear-gradient(90deg, rgba(255,72,158,0.95), rgba(172,88,255,0.95));
    box-shadow: 0 10px 22px rgba(255,72,158,0.18);
  }
  .title{
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.4px;
  }
  .sub{
    margin: 8px 0 0;
    font-size: 14px;
    opacity: 0.9;
  }

  .form{ display: grid; gap: 12px; padding: 10px 6px 4px; }
  .lbl{ display: grid; gap: 8px; }
  .lblt{ font-size: 13px; opacity: 0.9; }

  .inp{
    height: 48px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(0,0,0,0.16);
    color: rgba(255,255,255,0.92);
    padding: 0 14px;
    outline: none;
    font-size: 16px;
  }
  .inp::placeholder{ color: rgba(255,255,255,0.55); }
  .inp:focus{
    border-color: rgba(255, 140, 210, 0.55);
    box-shadow: 0 0 0 4px rgba(255, 82, 168, 0.18);
  }

  .err{
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 60, 120, 0.18);
    border: 1px solid rgba(255, 60, 120, 0.24);
    font-size: 14px;
  }

  .btn{
    height: 52px;
    border-radius: 14px;
    border: 0;
    cursor: pointer;
    font-size: 17px;
    font-weight: 900;
    color: #fff;
    background: linear-gradient(90deg, rgba(255,72,158,0.95), rgba(172,88,255,0.95));
    box-shadow: 0 14px 28px rgba(255,72,158,0.22), 0 14px 28px rgba(172,88,255,0.16);
    transition: transform .12s ease, filter .12s ease;
  }
  .btn:disabled{
    opacity: 0.72;
    cursor: not-allowed;
  }
  .btn:active{ transform: translateY(1px) scale(0.99); }
  .btn:hover{ filter: brightness(1.05); }

  .foot{
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-top: 4px;
    font-size: 14px;
  }
  .muted{ opacity: 0.85; }
  .link{
    color: rgba(255,255,255,0.96);
    font-weight: 800;
    text-decoration: none;
    border-bottom: 1px solid rgba(255,255,255,0.35);
    padding-bottom: 1px;
  }
`;
