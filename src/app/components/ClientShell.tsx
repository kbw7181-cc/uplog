'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="cs-wrap">
      <AppHeader />
      <main className="cs-main">{children}</main>

      <style jsx>{`
        .cs-wrap {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 12%, rgba(236,72,153,0.18), transparent 55%),
            radial-gradient(circle at 88% 18%, rgba(168,85,247,0.18), transparent 55%),
            linear-gradient(180deg, #0b0610, #07030b);
        }

        .cs-main {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 14px 70px;
        }
      `}</style>
    </div>
  );
}
