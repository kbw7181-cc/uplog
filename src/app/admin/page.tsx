// ✅✅✅ 전체복붙: src/app/admin/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Stat = {
  users_total: number;
  users_new7: number;

  supports_total: number;
  supports_unread: number;
  supports_open: number;

  badges_month: number;

  admins_total?: number;
  rebuttals_total?: number;
  community_posts_total?: number;
};

type Tone =
  | 'violet'
  | 'violetSoft'
  | 'pink'
  | 'pinkSoft'
  | 'blue'
  | 'mint'
  | 'mintSoft'
  | 'amber'
  | 'amberSoft';

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stat, setStat] = useState<Stat>({
    users_total: 0,
    users_new7: 0,
    supports_total: 0,
    supports_unread: 0,
    supports_open: 0,
    badges_month: 0,
    admins_total: 0,
    rebuttals_total: 0,
    community_posts_total: 0,
  });

  const monthLabel = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}년 ${m}월`;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const safeCount = async (fn: () => any) => {
        try {
          const r: any = await fn();
          if (r?.error) {
            console.log('[admin home] count error:', r.error);
            return 0;
          }
          return (r?.count ?? 0) as number;
        } catch (e) {
          console.log('[admin home] count exception:', e);
          return 0;
        }
      };

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const users_total = await safeCount(() =>
        supabase.from('profiles').select('user_id', { count: 'exact', head: true })
      );

      const users_new7 = await safeCount(() =>
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).gte('created_at', since)
      );

      const admins_total = await safeCount(() =>
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('role', 'admin')
      );

      const supports_total = await safeCount(() =>
        supabase.from('supports').select('id', { count: 'exact', head: true })
      );

      const supports_unread = await safeCount(() =>
        supabase.from('supports').select('id', { count: 'exact', head: true }).eq('is_read_admin', false)
      );

      const supports_open = await safeCount(() =>
        supabase.from('supports').select('id', { count: 'exact', head: true }).in('status', ['open', 'pending'])
      );

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const mm = String(m).padStart(2, '0');
      const month_start = `${y}-${mm}-01`;
      const month_end = `${y}-${mm}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

      const badges_month = await safeCount(() =>
        supabase
          .from('monthly_badges')
          .select('badge_code', { count: 'exact', head: true })
          .eq('month_start', month_start)
          .eq('month_end', month_end)
      );

      const rebuttals_total = await safeCount(() =>
        supabase.from('rebuttals').select('id', { count: 'exact', head: true })
      );

      const community_posts_total = await safeCount(() =>
        supabase.from('community_posts').select('id', { count: 'exact', head: true })
      );

      if (!alive) return;

      setStat({
        users_total,
        users_new7,
        supports_total,
        supports_unread,
        supports_open,
        badges_month,
        admins_total,
        rebuttals_total,
        community_posts_total,
      });

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={page()}>
      <div style={wrap()}>
        {/* 헤더 */}
        <div style={header()}>
          <div>
            <div style={title()}>관리자 홈</div>
            <div style={sub()}>신규 이슈 · 핵심만</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={topPill()} onClick={() => router.push('/admin')}>
              관리자 홈
            </button>
            <button type="button" style={topPill()} onClick={() => router.push('/home')}>
              서비스 홈
            </button>
            <button type="button" style={topPill()} onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="mgrid" style={menuGrid()}>
          <MenuCard tone="violet" title="회원 관리" desc="전체 / 신규" onClick={() => router.push('/admin/users')} />
          <MenuCard tone="pink" title="문의 관리" desc="전체 / 미열람 / 진행중" onClick={() => router.push('/admin/support')} />
          <MenuCard tone="blue" title="배지 관리" desc="월간 수상자 / 내역" onClick={() => router.push('/admin/badges')} />
        </div>

        {/* 핵심 통계만 (대시보드 메뉴/버튼 자체 제거) */}
        <div className="sgrid" style={grid()}>
          <StatCard
            tone="violet"
            label="👥 전체 회원"
            value={stat.users_total}
            subLabel={`최근 7일 신규 ${stat.users_new7}`}
            glow
            loading={loading}
            onClick={() => router.push('/admin/users')}
          />
          <StatCard
            tone="amber"
            label="✨ 신규 회원 (7일)"
            value={stat.users_new7}
            subLabel="최근 7일 기준"
            loading={loading}
            glow={stat.users_new7 > 0}
            onClick={() => router.push('/admin/users')}
          />
          <StatCard
            tone="pink"
            label="🚨 미열람 문의"
            value={stat.supports_unread}
            subLabel="확인 필요"
            glow={stat.supports_unread > 0}
            loading={loading}
            onClick={() => router.push('/admin/support?tab=unread')}
          />
          <StatCard
            tone="mintSoft"
            label="🧩 진행중 문의"
            value={stat.supports_open}
            subLabel="open / pending"
            glow={stat.supports_open > 0}
            loading={loading}
            onClick={() => router.push('/admin/support')}
          />
          <StatCard
            tone="blue"
            label="👑 이번달 배지"
            value={stat.badges_month}
            subLabel={monthLabel}
            glow={stat.badges_month > 0}
            loading={loading}
            onClick={() => router.push('/admin/badges')}
          />
          <StatCard
            tone="violetSoft"
            label="🛡️ 관리자 수"
            value={stat.admins_total ?? 0}
            subLabel="role=admin"
            loading={loading}
          />
          <StatCard
            tone="mint"
            label="📚 반론 자산"
            value={stat.rebuttals_total ?? 0}
            subLabel="rebuttals"
            loading={loading}
            glow={(stat.rebuttals_total ?? 0) > 0}
            onClick={() => router.push('/rebuttal')}
          />
          <StatCard
            tone="amberSoft"
            label="📝 커뮤니티 글"
            value={stat.community_posts_total ?? 0}
            subLabel="community_posts"
            loading={loading}
            glow={(stat.community_posts_total ?? 0) > 0}
            onClick={() => router.push('/community')}
          />
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            .mgrid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            .sgrid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
          @media (max-width: 520px) {
            .mgrid {
              grid-template-columns: 1fr !important;
            }
            .sgrid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ---------------- components ---------------- */

function MenuCard({
  tone,
  title,
  desc,
  onClick,
}: {
  tone: Tone;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={menuCard(tone)}>
      <div style={{ fontWeight: 1000, fontSize: 16, color: '#12071a' }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: 'rgba(18,7,26,0.58)' }}>{desc}</div>
    </button>
  );
}

function StatCard({
  tone,
  label,
  value,
  subLabel,
  glow,
  loading,
  onClick,
}: {
  tone: Tone;
  label: string;
  value: number;
  subLabel?: string;
  glow?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={statCard(tone, glow, !!onClick)}>
      <div style={{ fontWeight: 950, fontSize: 14, color: '#12071a' }}>{label}</div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 1000, fontSize: 30, color: '#12071a' }}>{loading ? '…' : value}</div>
        <div style={{ fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.52)' }}>{subLabel ?? ''}</div>
      </div>
    </button>
  );
}

/* ---------------- styles ---------------- */

function page(): React.CSSProperties {
  return {
    minHeight: '100vh',
    padding: 24,
    background:
      'radial-gradient(1200px 700px at 20% 0%, rgba(255,160,220,.25), transparent 60%), radial-gradient(1200px 700px at 80% 20%, rgba(170,160,255,.28), transparent 55%), #f7f6ff',
  };
}
function wrap(): React.CSSProperties {
  return { maxWidth: 1120, margin: '0 auto' };
}
function header(): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  };
}
function title(): React.CSSProperties {
  return { fontSize: 28, fontWeight: 1000, color: '#12071a', letterSpacing: -0.3 };
}
function sub(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 900, color: 'rgba(18,7,26,0.55)', marginTop: 4 };
}
function topPill(): React.CSSProperties {
  return {
    height: 42,
    padding: '0 16px',
    borderRadius: 999,
    border: '1px solid rgba(18,7,26,0.14)',
    background: 'rgba(255,255,255,0.86)',
    boxShadow: '0 14px 30px rgba(40,10,70,0.10)',
    fontWeight: 1000,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    color: '#12071a',
  };
}

function menuGrid(): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 14,
    marginBottom: 16,
  };
}

function menuCard(tone: Tone): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: 16,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.82)',
    border: '1px solid rgba(18,7,26,0.12)',
    boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
    cursor: 'pointer',
    userSelect: 'none',
    position: 'relative',
    zIndex: 1,
    textAlign: 'left',
    width: '100%',
  };

  const toneMap: Record<Tone, string> = {
    violet: 'rgba(168,85,247,0.22)',
    violetSoft: 'rgba(168,85,247,0.12)',
    pink: 'rgba(236,72,153,0.22)',
    pinkSoft: 'rgba(236,72,153,0.12)',
    blue: 'rgba(73,183,255,0.18)',
    mint: 'rgba(34,197,94,0.16)',
    mintSoft: 'rgba(34,197,94,0.10)',
    amber: 'rgba(245,158,11,0.18)',
    amberSoft: 'rgba(245,158,11,0.10)',
  };

  base.boxShadow = `0 18px 40px rgba(40,10,70,0.10), 0 0 0 2px ${toneMap[tone]}`;
  return base;
}

function grid(): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 14,
    paddingBottom: 28,
  };
}

function statCard(tone: Tone, glow?: boolean, clickable?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: 18,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.86)',
    border: '1px solid rgba(18,7,26,0.12)',
    boxShadow: '0 18px 42px rgba(40,10,70,0.10)',
    textAlign: 'left',
    width: '100%',
    cursor: clickable ? 'pointer' : 'default',
  };

  const glowMap: Record<Tone, { ring: string; neon: string }> = {
    violet: { ring: 'rgba(168,85,247,0.24)', neon: 'rgba(168,85,247,0.55)' },
    violetSoft: { ring: 'rgba(168,85,247,0.14)', neon: 'rgba(168,85,247,0.25)' },
    pink: { ring: 'rgba(236,72,153,0.26)', neon: 'rgba(236,72,153,0.60)' },
    pinkSoft: { ring: 'rgba(236,72,153,0.16)', neon: 'rgba(236,72,153,0.28)' },
    blue: { ring: 'rgba(73,183,255,0.22)', neon: 'rgba(73,183,255,0.55)' },
    mint: { ring: 'rgba(34,197,94,0.18)', neon: 'rgba(34,197,94,0.45)' },
    mintSoft: { ring: 'rgba(34,197,94,0.12)', neon: 'rgba(34,197,94,0.26)' },
    amber: { ring: 'rgba(245,158,11,0.16)', neon: 'rgba(245,158,11,0.45)' },
    amberSoft: { ring: 'rgba(245,158,11,0.10)', neon: 'rgba(245,158,11,0.22)' },
  };

  const t = glowMap[tone];

  base.boxShadow = glow
    ? `0 18px 42px rgba(40,10,70,0.10), 0 0 0 2px ${t.ring}, 0 0 22px ${t.neon}`
    : `0 18px 42px rgba(40,10,70,0.10), 0 0 0 2px ${t.ring}`;

  return base;
}
