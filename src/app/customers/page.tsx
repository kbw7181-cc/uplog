'use client';

import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';

export default function CustomersPage() {
  const router = useRouter();
  return (
    <ClientShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>고객관리</h1>
        <p style={{ opacity: 0.8, fontWeight: 800 }}>임시 페이지(404 방지). 기존 고객관리 코드 붙일 자리.</p>
        <button
          onClick={() => router.push('/home')}
          style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, fontWeight: 900 }}
        >
          홈으로
        </button>
      </div>
    </ClientShell>
  );
}
