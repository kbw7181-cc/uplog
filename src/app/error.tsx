'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에 확실히 찍히게
    console.error('GLOBAL_ERROR_BOUNDARY', error);
  }, [error]);

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={title}>화면 로딩 중 오류가 발생했어요</div>
        <div style={sub}>콘솔(F12)에도 에러가 찍혀있을 거예요.</div>

        <div style={box}>
          <div style={label}>message</div>
          <div style={mono}>{String(error?.message || 'unknown error')}</div>

          <div style={{ height: 10 }} />

          <div style={label}>digest</div>
          <div style={mono}>{String((error as any)?.digest || '-')}</div>
        </div>

        <div style={row}>
          <button style={btn} onClick={() => reset()} type="button">
            다시 시도
          </button>
          <button
            style={btn2}
            onClick={() => {
              try {
                location.href = '/home';
              } catch {}
            }}
            type="button"
          >
            홈으로
          </button>
        </div>

        <div style={hint}>
          ✅ 해결 팁: 이 화면의 <b>message</b>를 그대로 복사해서 보내주면 바로 잡습니다.
        </div>
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  background: 'linear-gradient(180deg, #0b0613 0%, #120a1f 55%, #070b16 100%)',
  color: '#fff',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
};

const card: React.CSSProperties = {
  width: 'min(920px, 96vw)',
  borderRadius: 18,
  padding: 16,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
};

const title: React.CSSProperties = { fontSize: 18, fontWeight: 900, marginBottom: 6 };
const sub: React.CSSProperties = { fontSize: 13, opacity: 0.85, marginBottom: 12 };

const box: React.CSSProperties = {
  borderRadius: 14,
  padding: 12,
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.14)',
};

const label: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 6 };
const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const row: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' };

const btn: React.CSSProperties = {
  border: 'none',
  cursor: 'pointer',
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 900,
  color: '#0b0613',
  background: 'linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%)',
};

const btn2: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.18)',
  cursor: 'pointer',
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 900,
  color: '#fff',
  background: 'rgba(255,255,255,0.06)',
};

const hint: React.CSSProperties = { marginTop: 12, fontSize: 12, opacity: 0.85 };
