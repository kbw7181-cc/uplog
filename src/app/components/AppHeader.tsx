'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AppHeader() {
  const router = useRouter();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(90,40,120,0.12)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* ✅ 로고 */}
        <div
          onClick={() => router.push('/home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Image
            src="/lolo.png"
            alt="UPLOG"
            width={36}
            height={36}
            priority
            style={{
              borderRadius: 8,
            }}
          />

          <div
            style={{
              fontSize: 20,
              fontWeight: 950,
              letterSpacing: -0.4,
              color: '#2a1236',
            }}
          >
            UPLOG
          </div>
        </div>
      </div>
    </header>
  );
}
