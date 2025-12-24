'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';


export default function Page() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '18px 18px 120px',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(1200px 600px at 15% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%),' +
          'radial-gradient(1200px 700px at 78% 22%, rgba(243,232,255,0.85) 0%, rgba(255,255,255,0) 60%),' +
          'linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 50%, #f8f4ff 100%)',
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 26,
          padding: 14,
          boxShadow: '0 22px 60px rgba(40,10,70,0.14)',
          border: '1px solid rgba(90,40,120,0.14)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid rgba(90,40,120,0.10)',
            background: '#fff',
          }}
        >
          <Image
            src="/assets/main.png"
            alt="UPLOG"
            fill
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* ✅ 하단 고정 버튼바 (클래스 없이 인라인) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2147483647,
          padding: '12px 14px 16px',
          background: 'rgba(255,255,255,0.96)',
          borderTop: '2px solid rgba(255,79,161,0.65)',
          backdropFilter: 'blur(10px)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            width: 'min(720px, 100%)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              height: 58,
              borderRadius: 16,
              border: 0,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(90deg, #ff4fa1, #a855f7)',
              boxShadow: '0 14px 28px rgba(168,85,247,0.22)',
              display: 'block', // ✅ 전역이 숨겨도 다시 띄움
            }}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() => router.push('/register')}
            style={{
              height: 58,
              borderRadius: 16,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 900,
              color: '#2a1236',
              background: '#fff',
              border: '2px solid rgba(168,85,247,0.7)',
              boxShadow: '0 10px 22px rgba(40,10,70,0.10)',
              display: 'block', // ✅ 전역이 숨겨도 다시 띄움
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
