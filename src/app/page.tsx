'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        background: 'linear-gradient(180deg,#B982FF,#9D60FF)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* ✅ 대표님이 준 메인 이미지 (카드처럼) */}
        <div
          style={{
            width: '100%',
            borderRadius: 32,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(120,60,180,0.55)',
          }}
        >
          <Image
            src="/main.png" // 대표님이 준 이미지 파일명 (public/main.png)
            alt="UPLOG - 오늘도 나를 UP시키다"
            width={900}
            height={600}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
          />
        </div>

        {/* ✅ 로고 밑, 중앙에 떠 있는 버튼 두 개 */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          {/* 로그인 버튼 */}
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg,#2A1A4F,#000000)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(0,0,0,0.6)',
            }}
          >
            로그인하기
          </button>

          {/* 회원가입 버튼 */}
          <button
            type="button"
            onClick={() => router.push('/register')}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
              color: '#4B1A6C',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(255,105,200,0.6)',
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </main>
  );
}
