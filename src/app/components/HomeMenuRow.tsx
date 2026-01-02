'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = {
  href: string;
  label: string;
  emoji: string;
};

const ITEMS: Item[] = [
  { href: '/my-up', label: '나의 U P 관리', emoji: '📈' },
  { href: '/customers', label: '고객관리', emoji: '👥' },
  { href: '/rebuttal', label: '반론 아카이브', emoji: '🧩' },
  { href: '/sms-helper', label: '문자 도우미', emoji: '✉️' },
  { href: '/community', label: '커뮤니티', emoji: '💬' },
];

export default function HomeMenuRow() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <section style={wrap} aria-label="홈 메뉴">
      <div style={rail}>
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                ...btn,
                ...(active ? btnActive : null),
              }}
            >
              <span style={emoji}>{it.emoji}</span>
              <span style={text}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const wrap: React.CSSProperties = {
  width: '100%',
  marginTop: 16,
};

const rail: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',        // ✅ 무조건 1줄
  gap: 10,
  alignItems: 'stretch',
  overflowX: 'auto',         // ✅ 화면 좁아도 1줄 유지(가로 스크롤)
  paddingBottom: 6,
  WebkitOverflowScrolling: 'touch',
};

const btn: React.CSSProperties = {
  flex: '1 0 0',             // ✅ 5개가 가능한 한 한 줄로 균등 분배
  minWidth: 140,             // ✅ 너무 좁아지면 가로 스크롤로 넘어가게
  height: 54,                // ✅ 세로로 길쭉한 바 느낌 제거
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  textDecoration: 'none',
  color: '#fff',
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: '-0.2px',
  whiteSpace: 'nowrap',

  background:
    'linear-gradient(135deg, rgba(255,105,180,0.40), rgba(168,85,247,0.40))',
  border: '1px solid rgba(255,255,255,0.20)',
  boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
};

const btnActive: React.CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(255,105,180,0.55), rgba(168,85,247,0.55))',
  border: '1px solid rgba(255,255,255,0.32)',
  boxShadow: '0 14px 34px rgba(168,85,247,0.22)',
};

const emoji: React.CSSProperties = {
  fontSize: 16,
  lineHeight: '16px',
};

const text: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};
