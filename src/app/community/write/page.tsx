// ✅✅✅ 전체복붙: src/app/community/write/page.tsx
'use client';

import { Suspense } from 'react';
import ClientShell from '@/app/components/ClientShell';
import WriteClient from './WriteClient';

export default function CommunityWritePage() {
  return (
    <ClientShell>
      <Suspense fallback={<div style={{ padding: 24, color: '#2a1236' }}>글쓰기 여는 중…</div>}>
        <WriteClient />
      </Suspense>
    </ClientShell>
  );
}
