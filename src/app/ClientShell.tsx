// src/app/ClientShell.tsx
'use client';

import { usePathname } from 'next/navigation';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ 이 페이지들에서는 상단 “대시보드로” 같은 공통 링크를 숨김
  const hideTopNav =
    pathname === '/support-chat' ||
    pathname === '/support' ||
    pathname === '/rebuttal';

  return (
    <>
      {!hideTopNav ? (
        <div style={{ padding: '10px 12px', textAlign: 'center', color: '#6b41ff', fontWeight: 900 }}>
          {/* 여기(공통영역)에 원래 “← 대시보드로”가 있었을 확률이 큼 */}
        </div>
      ) : null}

      {children}
    </>
  );
}
