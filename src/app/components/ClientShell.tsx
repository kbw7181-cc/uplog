'use client';

import { ReactNode } from 'react';
import TopNav from '@/app/components/TopNav';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div style={outer}>
      <TopNav />
      <main style={main}>{children}</main>
    </div>
  );
}

const outer: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 12% 10%, rgba(168,85,247,0.22) 0%, rgba(0,0,0,0) 40%),' +
    'radial-gradient(circle at 88% 18%, rgba(255,105,180,0.18) 0%, rgba(0,0,0,0) 45%),' +
    'linear-gradient(180deg, #0b0610 0%, #0a0614 50%, #07040d 100%)',
};

const main: React.CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '14px 12px 70px',
};
