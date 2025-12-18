import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UPLOG',
  description: '오늘도 나를 UP 시키다',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
