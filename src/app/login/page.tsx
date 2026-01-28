// ✅✅✅ 전체복붙: src/app/login/page.tsx
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ 디버그: 방금 "로그인 성공" 후 다시 돌아온 경우 감지
  useEffect(() => {
    const lastOk = sessionStorage.getItem('uplog_login_last_ok_ts');
    if (lastOk) {
      const ts = Number(lastOk);
      const diff = Date.now() - (Number.isFinite(ts) ? ts : 0);
      sessionStorage.removeItem('uplog_login_last_ok_ts');

      // 20초 이내면: 로그인 성공 후 /home에서 다시 /login으로 튕긴 케이스 가능성 높음
      if (diff >= 0 && diff < 20_000) {
        setMsg(
          '⚠️ 로그인 성공 직후 다시 로그인 화면으로 돌아왔습니다.\n' +
            '원인 후보: (1) /home 가드가 세션을 null로 판단 (2) 쿠키/도메인/환경변수로 세션이 유지되지 않음.\n' +
            '아래 “로그인” 다시 누르면 콘솔에 signIn/getSession/getUser 로그가 남습니다.'
        );
      }
    }
  }, []);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.includes('@') && pw.trim().length >= 1 && !loading;
  }, [email, pw, loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setMsg('이메일은 name@email.com 형식으로 입력해야 해요.');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      // ✅ 1) signIn 결과를 콘솔에 남겨서 "실패/성공"을 확정
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw.trim(),
      });

      console.log('[LOGIN] signInWithPassword result =>', { data, error });

      if (error) {
        const m = error.message || '로그인에 실패했어요.';
        setMsg(m);
        alert(m); // ✅ 지금은 무조건 띄워서 원인 확인
        return;
      }

      // ✅ 2) 성공 직후 session/user를 한 번 더 확인 (세션이 "실제로" 생겼는지)
      const s1 = await supabase.auth.getSession();
      const u1 = await supabase.auth.getUser();

      console.log('[LOGIN] getSession =>', s1);
      console.log('[LOGIN] getUser =>', u1);

      // ✅ 세션이 없으면: "성공처럼 보였지만 세션이 안 잡힘" 케이스
      const session = s1?.data?.session ?? null;
      if (!session) {
        const m =
          '로그인 응답은 성공처럼 보이지만, 세션이 생성/유지되지 않았습니다.\n' +
          '원인 후보: (1) Supabase URL/ANON_KEY 불일치 (2) 쿠키 차단/도메인 문제 (3) auth 설정 문제.\n' +
          '콘솔의 [LOGIN] getSession 로그를 확인하세요.';
        setMsg(m);
        alert(m);
        return;
      }

      // ✅ 3) /home 이동 후 다시 /login으로 돌아오면, /home 가드 문제일 확률이 높음
      sessionStorage.setItem('uplog_login_last_ok_ts', String(Date.now()));
      router.replace('/home');
    } catch (err: any) {
      const m = err?.message || '로그인 중 오류가 발생했어요.';
      setMsg(m);
      alert(m);
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

        .auth-input {
          width: 100%;
          max-width: 100%;
          height: 54px;
          border-radius: 18px;
          padding: 0 16px;
          font-size: 16px;
          color: rgba(20, 20, 30, 0.92);
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.3);
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
          white-space: pre-wrap;
        }

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
          background: linear-gradient(
            90deg,
            rgba(255, 77, 184, 0.95) 0%,
            rgba(200, 107, 255, 0.92) 55%,
            rgba(124, 58, 237, 0.92) 100%
          );
          color: #ffffff;
          cursor: pointer;
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
