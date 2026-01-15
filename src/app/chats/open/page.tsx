// ✅✅✅ 전체복붙: src/app/chats/open/page.tsx
import { Suspense } from 'react';
import OpenChatClient from './OpenChatClient';

export default function OpenChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#fff' }}>채팅 준비 중…</div>}>
      <OpenChatClient />
    </Suspense>
  );
}
