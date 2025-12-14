// src/app/layout.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import ClientShell from './ClientShell';



export const metadata: Metadata = {
  title: 'UPLOG',
  description: '오늘도 나를 UP 시키다',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-[#B982FF]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
