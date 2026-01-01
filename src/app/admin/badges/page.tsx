// ✅✅✅ 전체복붙: src/app/admin/badges/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type WinnerRow = {
  badge_code: string;
  badge_name: string;
  winner_user_id: string;
  month_start: string;
  month_end: string;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  career?: string | null;
};

const BADGE_EMOJI: Record<string, string> = {
  monthly_top: '👑',
  streak_month_king: '🔥',
  most_likes_month: '💗',
  mvp_count_month: '🏆',
  mvp_amount_month: '💎',
  attendance_month_mvp: '🗓️',
  most_posts_month: '✍️',
  // fallback
  default: '🏅',
};

export default function AdminBadgesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split('-');
    return `${y}년 ${Number(m)}월`;
  }, [monthKey]);

  const grouped = useMemo(() => {
    const map: Record<string, WinnerRow[]> = {};
    for (const w of winners) {
      if (!w.winner_user_id) continue;
      (map[w.winner_user_id] ||= []).push(w);
    }
    return Object.entries(map)
      .map(([userId, rows]) => ({
        userId,
        rows: rows.slice().sort((a, b) => a.badge_name.localeCompare(b.badge_name)),
      }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [winners]);

  const selectedProfile = selectedUserId ? profilesById[selectedUserId] : null;

  const selectedBadges = useMemo(() => {
    const list = winners.filter((w) => w.winner_user_id === selectedUserId);
    // 같은 배지가 중복될 수 있으면 code 기준 uniq
    const seen = new Set<string>();
    return list.filter((x) => {
      const k = x.badge_code ?? '';
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [winners, selectedUserId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const [yy, mm] = monthKey.split('-').map(Number);
      const monthStart = new Date(yy, mm - 1, 1);
      const monthEnd = new Date(yy, mm, 0);
      const month_start = toYMD(monthStart);
      const month_end = toYMD(monthEnd);

      const r1 = await supabase
        .from('monthly_badges')
        .select('badge_code,badge_name,winner_user_id,month_start,month_end')
        .eq('month_start', month_start)
        .eq('month_end', month_end)
        .order('badge_name', { ascending: true });

      const list = ((r1.data as any[]) ?? []) as WinnerRow[];

      const ids = Array.from(new Set(list.map((x) => x.winner_user_id).filter(Boolean)));

      let pmap: Record<string, ProfileRow> = {};
      if (ids.length > 0) {
        const r2 = await supabase.from('profiles').select('user_id,nickname,name,avatar_url,career').in('user_id', ids);
        const rows = ((r2.data as any[]) ?? []) as any[];
        for (const p of rows) {
          pmap[p.user_id] = {
            user_id: p.user_id,
            nickname: p.nickname ?? null,
            name: p.name ?? null,
            avatar_url: p.avatar_url ?? null,
            career: p.career ?? null,
          };
        }
      }

      if (!alive) return;

      setWinners(list);
      setProfilesById(pmap);
      setSelectedUserId((prev) => prev ?? (list[0]?.winner_user_id ?? null));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [monthKey]);

  return (
    <div style={page()}>
      <div style={wrap()}>
        {/* 헤더 */}
        <div style={headerCard()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: -0.3, color: '#12071a' }}>배지 관리</div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: 'rgba(18,7,26,0.70)' }}>
                {monthLabel} 월간 배지 수상자 & 수상 내역
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={pill('ghost')} onClick={() => router.push('/admin')}>
                관리자 홈
              </button>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.68)',
                  border: '1px solid rgba(18,7,26,0.10)',
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 12, color: 'rgba(18,7,26,0.75)' }}>월 선택</div>
                <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} style={selectStyle()}>
                  {makeMonthOptions(18).map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2열 */}
        <div className="grid2" style={grid2()}>
          {/* 좌: 수상자 */}
          <div style={panel()}>
            <div style={sectionTitle()}>
              수상자 목록 <span style={mutedSmall()}>(한 명당 카드 1개)</span>
            </div>

            {loading ? (
              <div style={loadingBox()}>불러오는 중…</div>
            ) : grouped.length === 0 ? (
              <div style={loadingBox()}>이 달에는 수상 데이터가 없어요.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {grouped.map((g) => {
                  const p = profilesById[g.userId];
                  const isSel = selectedUserId === g.userId;

                  const displayName = p?.nickname ?? p?.name ?? '사용자';
                  const avatar = safeAvatar(getAvatarSrc(p?.avatar_url));

                  return (
                    <button
                      key={g.userId}
                      onClick={() => setSelectedUserId(g.userId)}
                      style={{
                        textAlign: 'left',
                        borderRadius: 18,
                        border: isSel ? '2px solid rgba(236,72,153,0.70)' : '1px solid rgba(18,7,26,0.10)',
                        background: isSel
                          ? 'linear-gradient(135deg, rgba(255,79,216,0.14), rgba(185,130,255,0.12), rgba(255,255,255,0.72))'
                          : 'rgba(255,255,255,0.68)',
                        boxShadow: isSel ? '0 20px 55px rgba(236,72,153,0.16)' : '0 14px 40px rgba(20,10,40,0.10)',
                        padding: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={avatar}
                          alt="profile"
                          style={avatarStyle(52)}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 1000, fontSize: 16, color: '#12071a', lineHeight: 1.15 }}>
                            {displayName}
                            {p?.career ? (
                              <span style={{ marginLeft: 8, fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.62)' }}>
                                {p.career}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.50)' }}>
                            {shortId(g.userId)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={badgeCountPill(isSel)}>{g.rows.length}개</span>
                          {g.rows.length >= 3 ? <span style={neonDot()} /> : <span style={dimDot()} />}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {g.rows.slice(0, 5).map((r) => (
                          <span key={r.badge_code} style={chip()}>
                            {badgeEmoji(r.badge_code)} {r.badge_name}
                          </span>
                        ))}
                        {g.rows.length > 5 ? <span style={chipMuted()}>+{g.rows.length - 5}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우: 수상 내역 (코드 노출 X, 이모지+이름만) */}
          <div style={panel()}>
            <div style={sectionTitle()}>
              수상 내역 <span style={mutedSmall()}>(선택한 수상자)</span>
            </div>

            {!selectedUserId ? (
              <div style={loadingBox()}>수상자를 선택해주세요.</div>
            ) : (
              <div style={detailCard()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={safeAvatar(getAvatarSrc(selectedProfile?.avatar_url))}
                    alt="profile"
                    style={avatarStyle(64)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, fontSize: 18, color: '#12071a' }}>
                      {selectedProfile?.nickname ?? selectedProfile?.name ?? '사용자'}
                      {selectedProfile?.career ? (
                        <span style={{ marginLeft: 8, fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.62)' }}>
                          {selectedProfile.career}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.50)' }}>
                      {selectedUserId}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button style={pill('ghost')} onClick={() => router.push('/admin/users')}>
                      회원관리
                    </button>
                    <button style={pill('pink')} onClick={() => router.push('/admin/support')}>
                      문의관리
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13, color: 'rgba(18,7,26,0.80)' }}>받은 배지</div>
                  <div style={{ fontWeight: 1000, fontSize: 12, color: 'rgba(18,7,26,0.55)' }}>
                    총 {selectedBadges.length}개
                  </div>
                </div>

                {selectedBadges.length === 0 ? (
                  <div style={{ marginTop: 10, ...loadingBox() }}>이 수상자는 이 달에 받은 배지가 없어요.</div>
                ) : (
                  <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                    {selectedBadges.map((r) => (
                      <div key={r.badge_code} style={badgeRowClean()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={emojiBubble()} aria-hidden>
                              {badgeEmoji(r.badge_code)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 1000,
                                  color: '#12071a',
                                  fontSize: 14,
                                  lineHeight: 1.15,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {r.badge_name}
                              </div>
                              <div style={{ marginTop: 6, fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.55)' }}>
                                {monthLabel} 월간 배지
                              </div>
                            </div>
                          </div>

                          {/* ✅ 여기서 badge_code 완전 숨김 (코드 노출 X) */}
                          <span style={miniPill()}>
                            수상
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            .grid2 {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function badgeEmoji(code: string) {
  const key = (code ?? '').toString().trim();
  return BADGE_EMOJI[key] ?? BADGE_EMOJI.default;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeMonthOptions(n: number) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    out.push({ key: `${y}-${m}`, label: `${y}년 ${Number(m)}월` });
  }
  return out;
}

function shortId(id: string) {
  if (!id) return '';
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

// ✅ 빈 src 경고/400 방지
function safeAvatar(src: string | null | undefined) {
  const s = (src ?? '').trim();
  return s ? s : '/upzzu1.png';
}

/* ---------------- styles (inline) ---------------- */

function page(): React.CSSProperties {
  return {
    minHeight: '100vh',
    padding: 22,
    background:
      'radial-gradient(1200px 800px at 14% 10%, rgba(255,160,220,0.26), transparent 55%), radial-gradient(1200px 800px at 86% 20%, rgba(170,160,255,0.28), transparent 55%), linear-gradient(180deg, #fbf7ff 0%, #f6f8ff 55%, #fbf7ff 100%)',
  };
}
function wrap(): React.CSSProperties {
  return { maxWidth: 1120, margin: '0 auto' };
}
function headerCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background: 'rgba(255,255,255,0.70)',
    border: '1px solid rgba(18,7,26,0.10)',
    boxShadow: '0 18px 50px rgba(40,10,70,0.10)',
    padding: 14,
  };
}
function panel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background: 'rgba(255,255,255,0.66)',
    border: '1px solid rgba(18,7,26,0.10)',
    boxShadow: '0 18px 50px rgba(40,10,70,0.10)',
    padding: 14,
  };
}
function grid2(): React.CSSProperties {
  return {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  };
}
function sectionTitle(): React.CSSProperties {
  return { fontWeight: 1000, fontSize: 14, color: '#12071a', marginBottom: 10 };
}
function mutedSmall(): React.CSSProperties {
  return { fontWeight: 900, fontSize: 12, color: 'rgba(18,7,26,0.55)', marginLeft: 6 };
}
function loadingBox(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(18,7,26,0.10)',
    fontWeight: 900,
    color: 'rgba(18,7,26,0.70)',
  };
}
function selectStyle(): React.CSSProperties {
  return {
    height: 36,
    borderRadius: 12,
    border: '1px solid rgba(18,7,26,0.12)',
    background: '#fff',
    fontWeight: 950,
    padding: '0 10px',
    color: '#12071a',
    outline: 'none',
  };
}
function pill(kind: 'ghost' | 'pink'): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 38,
    padding: '0 14px',
    borderRadius: 999,
    fontWeight: 1000,
    cursor: 'pointer',
    border: '1px solid rgba(18,7,26,0.12)',
    background: 'rgba(255,255,255,0.70)',
    color: '#12071a',
    boxShadow: '0 12px 26px rgba(40,10,70,0.10)',
    whiteSpace: 'nowrap',
  };
  if (kind === 'pink') {
    base.border = '1px solid rgba(236,72,153,0.22)';
    base.background = 'linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.14), rgba(255,255,255,0.66))';
  }
  return base;
}
function avatarStyle(size: number): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 18,
    objectFit: 'cover',
    background: '#fff',
    border: '1px solid rgba(18,7,26,0.10)',
    boxShadow: '0 14px 30px rgba(40,10,70,0.10)',
    flex: '0 0 auto',
  };
}

function chip(): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.78)',
    border: '1px solid rgba(168,85,247,0.16)',
    fontWeight: 950,
    fontSize: 12,
    color: 'rgba(18,7,26,0.78)',
  };
}
function chipMuted(): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(18,7,26,0.04)',
    border: '1px dashed rgba(18,7,26,0.18)',
    fontWeight: 950,
    fontSize: 12,
    color: 'rgba(18,7,26,0.62)',
  };
}

function badgeCountPill(active: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 1000,
    fontSize: 12,
    color: active ? '#12071a' : 'rgba(18,7,26,0.70)',
    background: active ? 'rgba(236,72,153,0.14)' : 'rgba(18,7,26,0.06)',
    border: active ? '1px solid rgba(236,72,153,0.24)' : '1px solid rgba(18,7,26,0.10)',
  };
}

function neonDot(): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: 99,
    background: 'rgba(236,72,153,0.95)',
    boxShadow: '0 0 0 4px rgba(236,72,153,0.14), 0 0 14px rgba(236,72,153,0.55), 0 0 28px rgba(168,85,247,0.35)',
  };
}
function dimDot(): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: 99,
    background: 'rgba(18,7,26,0.18)',
    boxShadow: '0 0 0 4px rgba(18,7,26,0.06)',
  };
}

function detailCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: '1px solid rgba(18,7,26,0.10)',
    background: 'rgba(255,255,255,0.74)',
    padding: 14,
    boxShadow: '0 18px 50px rgba(40,10,70,0.10)',
  };
}

// ✅ 깔끔 카드 (이모지+이름만)
function badgeRowClean(): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 18,
    border: '1px solid rgba(18,7,26,0.10)',
    background: 'rgba(255,255,255,0.78)',
    boxShadow: '0 14px 35px rgba(40,10,70,0.08)',
  };
}
function emojiBubble(): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.14), rgba(255,255,255,0.78))',
    border: '1px solid rgba(236,72,153,0.18)',
    boxShadow: '0 14px 30px rgba(236,72,153,0.12)',
    fontSize: 18,
    fontWeight: 900,
    flex: '0 0 auto',
  };
}
function miniPill(): React.CSSProperties {
  return {
    padding: '7px 10px',
    borderRadius: 999,
    fontWeight: 1000,
    fontSize: 12,
    color: 'rgba(236,72,153,0.95)',
    background: 'rgba(236,72,153,0.10)',
    border: '1px solid rgba(236,72,153,0.18)',
    boxShadow: '0 10px 24px rgba(236,72,153,0.10)',
    whiteSpace: 'nowrap',
  };
}
