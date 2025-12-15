// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  // ✅ 로그인 상태면 바로 /home 으로 보냄
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace('/home');
      }
    };
    check();
  }, [router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '100px 16px 40px',
        background:
          'linear-gradient(180deg, #C9A6FF 0%, #B982FF 35%, #9D60FF 80%, #6C3BC8 100%)',
      }}
    >
      {/* ===== 상단 헤더 ===== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 50,
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#FFD6FF',
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '-0.5px',
          }}
        >
          UPLOG
          <span
            style={{
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 12,
              fontSize: 11,
              color: '#FFD6FF',
            }}
          >
            대표님 전용
          </span>
        </div>
      </header>

      {/* ===== 메인 컨테이너 ===== */}
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          marginTop: 40,
        }}
      >
        {/* 업쯔 캐릭터 영역 */}
        <div
          style={{
            width: '100%',
            borderRadius: 32,
            padding: '32px 16px 40px',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
            boxShadow: '0 30px 70px rgba(120,60,180,0.45)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* 영상 영역 */}
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <video
              src="/assets/videos/upzzu-mascot.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* 텍스트 */}
          <div style={{ textAlign: 'center', color: '#F9FAFB' }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                marginBottom: 8,
              }}
            >
              오늘도 나를 UP시키다
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.95 }}>
              “관리가 성장률의 차이”
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          <button
            onClick={() => router.push('/login')}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg,#2A1A4F,#000000)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 12px 26px rgba(0,0,0,0.6)',
            }}
          >
            로그인하기
          </button>

          <button
            onClick={() => router.push('/register')}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
              color: '#4B1A6C',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 12px 26px rgba(255,105,200,0.55)',
            }}
          >
            회원가입
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </main>
  );
}
