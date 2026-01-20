'use client';

import React from 'react';
import AppHeader from './AppHeader';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="csRoot">
      <AppHeader />

      <main className="csMain">{children}</main>

      <style jsx>{`
        .csRoot {
          width: 100%;
          min-height: 100vh;
        }

        /* 헤더 아래 컨텐츠 기본 여백/정렬 */
        .csMain {
          width: 100%;
          max-width: var(--app-maxw, 1100px);
          margin: 0 auto;
          padding: 14px 14px 80px;
        }
      `}</style>
    </div>
  );
}
