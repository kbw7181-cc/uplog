'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError('이메일 또는 비밀번호를 다시 확인해주세요.');
      return;
    }

    router.push('/home');
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#B982FF,#9D60FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
          padding: '36px 28px',
          borderRadius: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        {/* 타이틀 */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          로그인
        </h1>
        <p style={{ marginBottom: 28, opacity: 0.85 }}>
          UPLOG에 오신 걸 환영해요 💜
        </p>

        {/* 이메일 입력 */}
        <div style={{ marginBottom: 16, textAlign: 'left' }}>
          <label style={{ fontSize: 14, opacity: 0.9 }}>이메일</label>
          <input
            type="email"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              display: 'block',
              marginTop: 6,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              fontSize: 15,
              color: '#333',
              outline: 'none',
            }}
          />
        </div>

        {/* 비밀번호 입력 */}
        <div style={{ marginBottom: 24, textAlign: 'left' }}>
          <label style={{ fontSize: 14, opacity: 0.9 }}>비밀번호</label>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              display: 'block',
              marginTop: 6,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              fontSize: 15,
              color: '#333',
              outline: 'none',
            }}
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p style={{ color: '#ffb3c6', fontSize: 14, marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={onLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(90deg,#2A1A4F,#000000)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 10px 22px rgba(0,0,0,0.55)',
            marginBottom: 18,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '로그인 중...' : '로그인하기'}
        </button>

        {/* 회원가입 이동 */}
        <button
          onClick={() => router.push('/register')}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
            color: '#4B1A6C',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 10px 22px rgba(255,105,200,0.55)',
          }}
        >
          회원가입
        </button>
      </div>
    </main>
  );
}
