'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
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

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setErr(humanize(error.message));
      setSubmitting(false);
      return;
    }

    router.replace('/login');
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

      <section className="card" aria-label="회원가입">
        <header className="head">
          <div className="brand">
            <img className="logo" src="/gogo.png" alt="UPLOG" />
            <div className="brandText">
              <div className="title">UPLOG</div>
              <div className="sub">회원가입</div>
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
              placeholder="8자 이상 권장"
              autoComplete="new-password"
            />
          </label>

          {err && <div className="err">{err}</div>}

          {/* ✅ 메인: 회원가입 */}
          <button className="btn btnPrimary" type="submit" disabled={submitting}>
            {submitting ? '가입 중…' : '회원가입'}
          </button>

          {/* ✅ 서브: 로그인 하러가기 */}
          <button className="btn btnGhost" type="button" onClick={() => router.push('/login')}>
            로그인 하러가기
          </button>
        </form>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

function humanize(msg: string) {
  const m = (msg || '').toLowerCase();
  if (m.includes('anonymous sign-ins are disabled')) return 'Supabase 인증 설정이 막혀 있어요. Auth 설정 확인 필요.';
  if (m.includes('user already registered')) return '이미 가입된 이메일이에요. 로그인으로 진행해 주세요.';
  return msg;
}

const styles = `
  .auth{ position:relative; min-height:100svh; overflow:hidden; display:grid; place-items:center; padding:18px; background:#7b3bbf; }
  .bg{ position:absolute; inset:0;
    background:
      radial-gradient(circle at 20% 18%, rgba(255,82,168,0.40), transparent 48%),
      radial-gradient(circle at 82% 28%, rgba(172,88,255,0.48), transparent 52%),
      radial-gradient(circle at 48% 92%, rgba(255,255,255,0.10), transparent 55%),
      linear-gradient(180deg, rgba(20,0,36,0.22), rgba(20,0,36,0.40));
  }
  .card{
    position:relative; width:min(640px,100%);
    border-radius:26px; padding:20px;
    background:rgba(255,255,255,0.12);
    border:2px solid rgba(255,255,255,0.26);
    backdrop-filter:blur(12px);
    box-shadow:0 18px 48px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22);
    color:rgba(255,255,255,0.96);
  }
  .brand{ display:flex; align-items:center; gap:12px; }
  .logo{ width:48px; height:48px; object-fit:contain; }
  .title{ font-size:24px; font-weight:950; letter-spacing:-0.4px; }
  .sub{ font-size:18px; font-weight:900; opacity:0.95; }

  .form{ display:grid; gap:14px; padding:14px 6px 6px; }
  .lbl{ display:grid; gap:10px; }
  .lblt{ font-size:16px; font-weight:900; }

  .inp{
    height:58px; border-radius:18px;
    border:2px solid rgba(255,255,255,0.26);
    background:rgba(0,0,0,0.22);
    color:rgba(255,255,255,0.96);
    padding:0 16px; outline:none; font-size:18px;
  }
  .inp::placeholder{ color:rgba(255,255,255,0.72); }

  .err{
    padding:12px 14px; border-radius:18px;
    background:rgba(255,60,120,0.18);
    border:2px solid rgba(255,60,120,0.26);
    font-size:16px; font-weight:850;
  }

  .btn{
    height:60px; border-radius:18px;
    border:2px solid rgba(255,255,255,0.26);
    font-size:20px; font-weight:950;
    color:rgba(255,255,255,0.98);
    cursor:pointer;
    transition: transform .12s ease, filter .12s ease, background .12s ease;
  }
  .btn:active{ transform: translateY(1px) scale(0.99); }
  .btnPrimary{ background:linear-gradient(90deg, rgba(255,72,158,0.98), rgba(172,88,255,0.98)); }
  .btnGhost{ background:rgba(0,0,0,0.18); }
`;
