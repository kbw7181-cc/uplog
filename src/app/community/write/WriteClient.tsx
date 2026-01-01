// ✅✅✅ 전체복붙: src/app/community/write/WriteClient.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function WriteClient() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        padding: 18,
        background:
          'radial-gradient(900px 520px at 14% 12%, rgba(168,85,247,0.18) 0%, rgba(255,255,255,0) 60%),' +
          'radial-gradient(900px 520px at 82% 18%, rgba(255,79,161,0.14) 0%, rgba(255,255,255,0) 60%),' +
          'linear-gradient(180deg, #f8f4ff 0%, #ffffff 55%, #f8f4ff 100%)',
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 22,
          border: '1px solid rgba(90,40,120,0.14)',
          boxShadow: '0 18px 46px rgba(40,10,70,0.12)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#2a1236' }}>커뮤니티 글쓰기</h2>
            <p style={{ margin: '8px 0 0', color: 'rgba(42,18,54,0.72)', fontSize: 13 }}>
              현재 배포 준비 중입니다. (글쓰기 UI는 배포 후 복원)
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/community')}
            style={{
              height: 42,
              padding: '0 14px',
              borderRadius: 14,
              border: '1px solid rgba(168,85,247,0.35)',
              background: 'linear-gradient(90deg, rgba(255,79,161,0.12), rgba(168,85,247,0.12))',
              color: '#2a1236',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            목록으로
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: '1px dashed rgba(168,85,247,0.35)',
            background: 'rgba(255,255,255,0.75)',
            padding: 16,
            color: '#2a1236',
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          ✅ 지금은 배포 우선이라 글쓰기 기능만 잠시 숨겨둔 상태예요.<br />
          빌드 통과 확인되면, 원래 글쓰기 UI를 여기로 다시 복원하면 됩니다.
        </div>
      </div>
    </div>
  );
}
