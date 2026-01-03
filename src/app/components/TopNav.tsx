'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  emoji: string;
};

const NAV: NavItem[] = [
  { href: '/home', label: '홈', emoji: '🏠' },
  { href: '/my-up', label: '나의UP', emoji: '📈' },
  { href: '/customers', label: '고객', emoji: '👥' },
  { href: '/rebuttal', label: '반론', emoji: '🧩' },
  { href: '/community', label: '커뮤니티', emoji: '💬' },
];

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <div style={wrap}>
      <div style={bar}>
        {/* ✅ 로고: public/gogo.png => '/gogo.png' */}
        <Link href="/home" style={logoWrap} aria-label="UPLOG 홈으로">
          <img src="/gogo.png" alt="UPLOG" style={logoImg} />
        </Link>

        {/* ✅ 메뉴: 1줄 고정 */}
        <nav style={navRow} aria-label="메인 메뉴">
          {NAV.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                style={{
                  ...pill,
                  ...(active ? pillActive : null),
                }}
              >
                <span style={pillEmoji}>{it.emoji}</span>
                <span style={pillText}>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ===== styles (inline to avoid CSS 충돌) ===== */

const wrap: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  padding: '10px 12px',
  backdropFilter: 'blur(10px)',
};

const bar: React.CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  borderRadius: 18,
  padding: '10px 12px',
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const logoWrap: React.CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  borderRadius: 14,
  background:
    'linear-gradient(135deg, rgba(255,105,180,0.18), rgba(168,85,247,0.18))',
  border: '1px solid rgba(255,255,255,0.14)',
};

const logoImg: React.CSSProperties = {
  width: 28,
  height: 28,
  objectFit: 'contain',
  display: 'block',
};

const navRow: React.CSSProperties = {
  flex: '1 1 auto',
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'nowrap', // ✅ 2줄 방지 핵심
  overflow: 'hidden',
  minWidth: 0,
};

const pill: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  height: 36,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '0 8px',
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.92)',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '-0.2px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
  whiteSpace: 'nowrap',
};

const pillActive: React.CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(255,105,180,0.20), rgba(168,85,247,0.20))',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: '0 10px 26px rgba(168,85,247,0.18)',
};

const pillEmoji: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '14px',
};

const pillText: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};
