'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        router.replace('/home');
        return;
      }

      if (mounted) setChecking(false);
    };

    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background:
            'radial-gradient(circle at 15% 10%, rgba(236,72,153,0.25), transparent 55%), radial-gradient(circle at 85% 20%, rgba(168,85,247,0.25), transparent 55%), linear-gradient(180deg, #0b0610, #07030b)',
          color: '#fff',
        }}
      >
        로딩중…
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        padding: '28px 18px',
        overflow: 'hidden',
        background: '#0b0610',
      }}
    >
      {/* ✅ 메인 이미지 배경 (public 기준) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/main.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.05)',
        }}
      />

      {/* 오버레이 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 15%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(to bottom, rgba(12,0,18,0.15), rgba(12,0,18,0.65))',
        }}
      />

      {/* 콘텐츠 */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          borderRadius: 28,
          padding: '26px 20px 22px',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            UPLOG
          </div>
          <div style={{ fontSize: 15, opacity: 0.85 }}>
            오늘도 나를 UP시키다
          </div>
        </div>

        {/* 버튼 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 18,
          }}
        >
          <Link
            href="/login"
            style={btnPrimary}
          >
            로그인
          </Link>

          <Link
            href="/signup"
            style={btnGhost}
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  height: 56,
  borderRadius: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  textDecoration: 'none',
  color: '#210022',
  background:
    'linear-gradient(90deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95))',
  boxShadow: '0 18px 40px rgba(168,85,247,0.35)',
};

const btnGhost: React.CSSProperties = {
  height: 56,
  borderRadius: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  textDecoration: 'none',
  color: '#fff',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.28)',
};
