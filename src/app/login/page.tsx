'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const disabled = useMemo(() => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return true;
    if (!e.includes('@')) return true;
    if (p.length < 6) return true;
    return false;
  }, [email, password]);

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const eMail = email.trim();
    const pw = password.trim();

    if (!eMail || !pw) {
      setMsg('이메일/비밀번호를 입력해줘요.');
      return;
    }
    if (!eMail.includes('@')) {
      setMsg('이메일 형식을 확인해줘요.');
      return;
    }
    if (pw.length < 6) {
      setMsg('비밀번호는 6자 이상이 좋아요.');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: eMail,
        password: pw,
      });

      if (error || !data?.session?.user) {
        setLoading(false);
        setMsg('로그인 실패! 이메일/비밀번호를 다시 확인해줘요.');
        return;
      }

      // ✅ 성공해도 안전하게 loading 해제 후 이동
      setLoading(false);
      router.replace('/home');
    } catch {
      setLoading(false);
      setMsg('로그인 중 문제가 발생했어요. 잠시 후 다시 시도해줘요.');
    }
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          background:
            'radial-gradient(circle at 15% 10%, rgba(236,72,153,0.25), transparent 55%), radial-gradient(circle at 85% 20%, rgba(168,85,247,0.25), transparent 55%), linear-gradient(180deg, #0b0610, #07030b)',
          fontSize: 16,
        }}
      >
        로딩중…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '28px 16px',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 12% 12%, rgba(236,72,153,0.22), transparent 55%), radial-gradient(circle at 88% 18%, rgba(168,85,247,0.22), transparent 55%), linear-gradient(180deg, #0b0610, #07030b)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          padding: '20px 18px 18px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 18px 55px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
          color: '#fff',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 0.2,
              marginBottom: 6,
            }}
          >
            UPLOG 로그인
          </div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>이메일과 비밀번호 입력 후 들어갈 수 있어요.</div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.9 }}>이메일</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              inputMode="email"
              style={{
                height: 46,
                borderRadius: 14,
                padding: '0 14px',
                outline: 'none',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.22)',
                color: '#fff',
                fontSize: 16,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.9 }}>비밀번호</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              type="password"
              autoComplete="current-password"
              style={{
                height: 46,
                borderRadius: 14,
                padding: '0 14px',
                outline: 'none',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.22)',
                color: '#fff',
                fontSize: 16,
              }}
            />
          </label>

          {msg ? (
            <div
              style={{
                marginTop: 2,
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(255, 59, 100, 0.14)',
                border: '1px solid rgba(255, 59, 100, 0.25)',
                fontSize: 14,
              }}
            >
              {msg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={disabled || loading}
            style={{
              marginTop: 8,
              height: 48,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.16)',
              background:
                disabled || loading
                  ? 'rgba(255,255,255,0.10)'
                  : 'linear-gradient(90deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95))',
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 0.2,
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              boxShadow: disabled || loading ? 'none' : '0 14px 34px rgba(168,85,247,0.22)',
            }}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/signup')}
            style={{
              height: 46,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
}
