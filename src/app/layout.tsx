// ✅✅✅ 전체복붙: src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import ThemeProvider from './components/ThemeProvider';
import ClientBoot from './components/ClientBoot';
import AuthGuard from './components/AuthGuard';

export const metadata: Metadata = {
  title: 'UPLOG',
  description: '오늘도 나를 UP시키다',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ThemeProvider>
          <AuthGuard>
            <ClientBoot>{children}</ClientBoot>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
