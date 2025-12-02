// src/components/UplogShell.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { path: '/home', label: '홈', icon: '🏠' },
  { path: '/my-up', label: '업관리', icon: '📈' },
  { path: '/customers', label: '고객', icon: '👤' },
  { path: '/rebuttal', label: '반론', icon: '💬' },
  { path: '/community', label: '커뮤니티', icon: '🧑‍🤝‍🧑' },
];

export default function UplogShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <div className="u-page">
        <header className="u-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 로고(위에서 만든 핑크 UPLOG PNG 사용한다고 가정) */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 18,
                background:
                  'linear-gradient(135deg, #ff6ac9 0%, #ff4fa3 40%, #a293ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 18px 38px rgba(0,0,0,.45)',
              }}
            >
              {/* 혹시 public/uplog-logo-pink.png 있으면 그걸로 교체 */}
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: '#fff',
                  marginTop: 3,
                }}
              >
                ↑
              </span>
            </div>
            <div>
              <div className="u-page-title">UPLOG · {title}</div>
              <div className="u-page-sub">
                {subtitle ?? '오늘도 나를 UP시키다'}
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* 하단 네비게이션 */}
      <nav className="u-bottom-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={
                'u-bottom-nav-btn ' +
                (active ? 'u-bottom-nav-btn--active' : '')
              }
              onClick={() => router.push(item.path)}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
