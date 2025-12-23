'use client';

import ClientShell from '../components/ClientShell';

export default function SmsHelperPage() {
  return (
    <ClientShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950 }}>문자도우미</h1>
        <p style={{ opacity: 0.8, fontWeight: 800 }}>임시 페이지(404 방지)</p>
      </div>
    </ClientShell>
  );
}
