// ✅ 파일: src/app/admin/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  return (
    <div style={{ padding: 26, color: '#fdf2ff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.4 }}>관리자 대시보드</div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, opacity: 0.85 }}>
              요약과 이동을 빠르게 처리합니다.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={btn()} onClick={() => router.push('/admin/users')}>회원관리</button>
            <button style={btn()} onClick={() => router.push('/admin/support')}>문의관리</button>
            <button style={btn()} onClick={() => router.push('/admin/badges')}>배지관리</button>
            <button style={btnGhost()} onClick={() => router.push('/home')}>홈으로</button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <Card title="회원" desc="검색/권한/정지 관리" onClick={() => router.push('/admin/users')} />
          <Card title="문의" desc="미열람/답변/상태 처리" onClick={() => router.push('/admin/support')} />
          <Card title="배지" desc="월간/주간 배지 확인" onClick={() => router.push('/admin/badges')} />
        </div>
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    height: 40,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(248,250,252,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  };
}
function btnGhost(): React.CSSProperties {
  return {
    height: 40,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(248,250,252,0.20)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.90)',
    fontWeight: 900,
    cursor: 'pointer',
  };
}

function Card({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(10,6,16,0.35)',
        boxShadow: '0 22px 60px rgba(0,0,0,0.25)',
        padding: 16,
        minHeight: 150,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, opacity: 0.82, lineHeight: 1.35 }}>{desc}</div>
      </div>

      <button
        style={{
          marginTop: 12,
          height: 44,
          borderRadius: 16,
          border: 0,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 950,
          color: '#fff',
          background: 'linear-gradient(90deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95))',
          boxShadow: '0 16px 34px rgba(168,85,247,0.22)',
        }}
      >
        열기
      </button>
    </div>
  );
}
