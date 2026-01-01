// ✅✅✅ 전체복붙: src/app/profile/theme/page.tsx
'use client';

import { Suspense } from 'react';
import ClientShell from '@/app/components/ClientShell';
import ThemeClient from './ThemeClient';

export default function ProfileThemePage() {
  return (
    <ClientShell>
      <Suspense fallback={<div style={{ padding: 24 }}>테마 불러오는 중…</div>}>
        <ThemeClient />
      </Suspense>
    </ClientShell>
  );
}
