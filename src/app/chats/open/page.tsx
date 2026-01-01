// ✅✅✅ 전체복붙: src/app/chats/open/page.tsx
'use client';

import { Suspense } from 'react';
import ClientShell from '@/app/components/ClientShell';
import OpenChatClient from './OpenChatClient';

export default function OpenChatPage() {
  return (
    <ClientShell>
      <Suspense fallback={<div style={{ padding: 24, color: '#fff' }}>열리는 중…</div>}>
        <OpenChatClient />
      </Suspense>
    </ClientShell>
  );
}
