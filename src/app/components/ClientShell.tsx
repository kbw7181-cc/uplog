'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <AppHeader />
      <main className="main">{children}</main>

      <style jsx>{`
        .shell {
          min-height: 100vh;
          background:
            radial-gradient(1200px 600px at 15% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%),
            radial-gradient(1200px 700px at 78% 22%, rgba(243,232,255,0.85) 0%, rgba(255,255,255,0) 60%),
            linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 50%, #f8f4ff 100%);
        }
        .main {
          max-width: 1120px;
          margin: 0 auto;
          padding: 12px 16px 80px;
        }
      `}</style>
    </div>
  );
}
