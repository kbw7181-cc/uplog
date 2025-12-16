'use client';

import { ReactNode } from 'react';

export default function ClientShell({ children }: { children: ReactNode }) {
  // ✅ 대표님: 첫 화면/전체 화면에서 "홈/새로고침/관리자페이지" 같은 디버그 바는 절대 노출 금지
  // 필요하면 나중에 /admin 내부에서만 별도 버튼을 만들면 됨.
  return <>{children}</>;
}
