import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 20,
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg,#ffe7f4 0%,#f7f1ff 45%,#e9f6ff 100%)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 920,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(168,85,247,0.18)',
          borderRadius: 22,
          padding: 18,
          boxShadow: '0 18px 50px rgba(0,0,0,0.12)',
          color: '#1b1030',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>페이지를 찾을 수 없어요</h1>
        <p style={{ marginTop: 10, fontSize: 14, fontWeight: 850, opacity: 0.8 }}>
          버튼이 이동시키는 경로가 실제 라우트와 다를 때 발생할 수 있어요.
        </p>

        <Link
          href="/home"
          style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 950,
            color: '#fff',
            textDecoration: 'none',
            background: 'linear-gradient(135deg,#ff4da0 0%,#8b5cf6 55%,#38bdf8 110%)',
          }}
        >
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
