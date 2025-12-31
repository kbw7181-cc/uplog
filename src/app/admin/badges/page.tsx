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
  email?: string | null;
  avatar_url: string | null;
  career?: string | null;
};

export default function AdminBadgesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState<string>(() => {
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

  const selectedProfile = selectedUserId ? profilesById[selectedUserId] : null;
  const selectedBadges = useMemo(() => winners.filter((w) => w.winner_user_id === selectedUserId), [winners, selectedUserId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      // ✅ month_start / month_end 계산 (monthKey 기준)
      const [yy, mm] = monthKey.split('-').map(Number);
      const monthStart = new Date(yy, mm - 1, 1);
      const monthEnd = new Date(yy, mm, 0); // 마지막날

      const month_start = toYMD(monthStart);
      const month_end = toYMD(monthEnd);

      // 1) 월간 배지 winner 목록
      const { data: badgeRows } = await supabase
        .from('monthly_badges')
        .select('badge_code,badge_name,winner_user_id,month_start,month_end')
        .eq('month_start', month_start)
        .eq('month_end', month_end)
        .order('badge_name', { ascending: true });

      const list = (badgeRows ?? []) as WinnerRow[];

      // 2) 수상자 프로필 한번에 가져오기
      const ids = Array.from(new Set(list.map((x) => x.winner_user_id).filter(Boolean)));
      let profMap: Record<string, ProfileRow> = {};

      if (ids.length > 0) {
        // ✅ profiles PK는 user_id (대표님 프로젝트 규칙)
        const { data: profRows } = await supabase
          .from('profiles')
          .select('user_id,nickname,name,avatar_url,career')
          .in('user_id', ids);

        for (const p of (profRows ?? []) as any[]) {
          profMap[p.user_id] = {
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
      setProfilesById(profMap);

      // 기본 선택: 첫 수상자
      setSelectedUserId((prev) => prev ?? (list[0]?.winner_user_id ?? null));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [monthKey]);

  // ✅ 수상자 그룹(한 명당 카드 하나)
  const grouped = useMemo(() => {
    const map: Record<string, WinnerRow[]> = {};
    for (const w of winners) {
      if (!map[w.winner_user_id]) map[w.winner_user_id] = [];
      map[w.winner_user_id].push(w);
    }
    return Object.entries(map).map(([userId, rows]) => ({ userId, rows }));
  }, [winners]);

  return (
    <div style={{ padding: 26, color: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.4 }}>배지 관리</div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900, opacity: 0.8 }}>
              월 선택해서 월간 배지 수상 현황을 확인해요
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={ghostBtn()} onClick={() => router.push('/admin')}>관리자 홈</button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(15,23,42,0.12)' }}>
              <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.85 }}>월 선택</div>
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                style={{
                  height: 36,
                  borderRadius: 12,
                  border: '1px solid rgba(15,23,42,0.14)',
                  background: '#fff',
                  fontWeight: 950,
                  padding: '0 10px',
                }}
              >
                {makeMonthOptions(18).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 수상자 목록 */}
        <div style={panel()}>
          <div style={{ fontWeight: 950, fontSize: 15, marginBottom: 10 }}>
            ● {monthLabel} 월간 배지 수상자 목록
          </div>

          {loading ? (
            <div style={{ padding: 14, fontWeight: 900, opacity: 0.75 }}>불러오는 중…</div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: 14, fontWeight: 900, opacity: 0.75 }}>이 달에는 수상 데이터가 없어요.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {grouped.map((g) => {
                const p = profilesById[g.userId];
                const isSel = selectedUserId === g.userId;
                const avatarSrc = getAvatarSrc(p?.avatar_url);

                return (
                  <div
                    key={g.userId}
                    style={{
                      borderRadius: 18,
                      border: isSel ? '2px solid rgba(236,72,153,0.40)' : '1px solid rgba(15,23,42,0.12)',
                      background: 'rgba(255,255,255,0.62)',
                      padding: 14,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedUserId(g.userId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* ✅✅✅ 여기! avatar_url 그대로 쓰면 깨짐 → getAvatarSrc 적용 */}
                      <img
                        src={avatarSrc}
                        alt="profile"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          objectFit: 'cover',
                          border: '1px solid rgba(15,23,42,0.10)',
                          background: '#fff',
                          flex: '0 0 auto',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 18, lineHeight: 1.15 }}>
                          {p?.nickname ?? p?.name ?? '사용자'}
                          {p?.career ? <span style={{ marginLeft: 8, fontWeight: 900, fontSize: 13, opacity: 0.75 }}>({p.career})</span> : null}
                        </div>
                        <div style={{ marginTop: 6, fontWeight: 900, fontSize: 13, opacity: 0.8 }}>
                          {g.userId}
                        </div>
                      </div>

                      <div style={{ fontWeight: 1000, color: 'rgba(236,72,153,0.95)', fontSize: 18 }}>
                        {g.rows.length} 개
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {g.rows.map((r) => (
                        <span
                          key={r.badge_code}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.75)',
                            border: '1px solid rgba(168,85,247,0.18)',
                            fontWeight: 950,
                            fontSize: 12,
                          }}
                        >
                          {r.badge_name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 수상자 상세 */}
        <div style={panel()}>
          <div style={{ fontWeight: 950, fontSize: 15, marginBottom: 10 }}>● 수상자 상세</div>

          {!selectedUserId ? (
            <div style={{ padding: 14, fontWeight: 900, opacity: 0.75 }}>수상자를 선택해주세요.</div>
          ) : (
            <div style={{ borderRadius: 18, border: '1px solid rgba(15,23,42,0.12)', background: 'rgba(255,255,255,0.62)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={getAvatarSrc(selectedProfile?.avatar_url)}
                  alt="profile"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    objectFit: 'cover',
                    border: '1px solid rgba(15,23,42,0.10)',
                    background: '#fff',
                    flex: '0 0 auto',
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, fontSize: 20 }}>
                    {selectedProfile?.nickname ?? selectedProfile?.name ?? '사용자'}
                    {selectedProfile?.career ? <span style={{ marginLeft: 8, fontWeight: 900, fontSize: 13, opacity: 0.75 }}>({selectedProfile.career})</span> : null}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 900, fontSize: 13, opacity: 0.8 }}>
                    {selectedUserId}
                  </div>
                </div>

                <button style={ghostBtn()} onClick={() => router.push('/admin/users')}>
                  회원 관리로 이동
                </button>
              </div>

              <div style={{ marginTop: 12, fontWeight: 950, fontSize: 13, opacity: 0.85 }}>
                받은 배지
              </div>

              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedBadges.map((r) => (
                  <span
                    key={r.badge_code}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.75)',
                      border: '1px solid rgba(236,72,153,0.18)',
                      fontWeight: 950,
                      fontSize: 12,
                    }}
                  >
                    {r.badge_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

function panel(): React.CSSProperties {
  return {
    marginTop: 16,
    borderRadius: 22,
    border: '1px solid rgba(15,23,42,0.12)',
    background: 'rgba(255,255,255,0.52)',
    backdropFilter: 'blur(10px)',
    padding: 14,
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    height: 40,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(15,23,42,0.14)',
    background: 'rgba(255,255,255,0.70)',
    color: '#0f172a',
    fontWeight: 950,
    cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(15,23,42,0.10)',
    whiteSpace: 'nowrap',
  };
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

function normalizeTier(raw: string) {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (s === '3' || s.includes('paid3') || s.includes('vip3') || s.includes('pro3') || s.includes('tier3')) return 'paid3';
  if (s === '2' || s.includes('paid2') || s.includes('vip2') || s.includes('pro2') || s.includes('tier2')) return 'paid2';
  if (s === '1' || s.includes('paid1') || s.includes('vip1') || s.includes('pro1') || s.includes('tier1')) return 'paid1';
  return 'free';
}
