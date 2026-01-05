// src/components/MainTabs.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { path: '/home', label: '메인' },
  { path: '/my-up', label: '나의 업 관리' },
  { path: '/customers', label: '고객 관리' },
  { path: '/rebuttal', label: '반론 아카이브' },
  { path: '/community', label: '커뮤니티' },
];

export default function MainTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="u-tab-nav">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            className={`u-tab ${active ? 'u-tab--active' : ''}`}
            onClick={() => router.push(tab.path)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
