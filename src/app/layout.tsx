// ✅✅✅ 전체복붙: src/app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';
import ThemeProvider from './components/ThemeProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
