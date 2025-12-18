// ✅ 파일: src/app/admin/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 720,
          margin: '30px auto',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(60,30,90,0.14)',
          borderRadius: 22,
          boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
          padding: 20,
          color: '#230b35',
          fontWeight: 950,
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: -0.6 }}>관리자 대시보드</div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
          ✅ /admin 라우팅 성공. 이제 여기서 각 관리 페이지로 이동합니다.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            onClick={() => router.push('/admin/users')}
            style={btnStyle}
          >
            회원관리
          </button>
          <button
            onClick={() => router.push('/admin/support')}
            style={btnStyle}
          >
            문의관리
          </button>
          <button
            onClick={() => router.push('/admin/badges')}
            style={btnStyle}
          >
            배지관리
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  height: 44,
  padding: '0 16px',
  borderRadius: 999,
  border: '1px solid rgba(255,79,216,0.24)',
  background: 'linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.16))',
  color: '#230b35',
  fontWeight: 950,
  boxShadow: '0 12px 24px rgba(40,10,70,0.08)',
};
