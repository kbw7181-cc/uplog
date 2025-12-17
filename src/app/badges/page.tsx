'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type MonthlyBadgeRow = {
  badge_code: string;
  badge_name: string;
  winner_user_id: string | null;
  month_start: string | null;
  month_end: string | null;
  reason: string;
  winner_name?: string | null;
  streak_len?: number; // ✅ 연속 개월
  crown?: string;      // ✅ 👑👑 / 👑👑👑
};

function toYM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function monthStartISO(ym: string) {
  return `${ym}-01`;
}
function nextMonthStartISO(ym: string) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function ymLabel(iso: string | null) {
  if (!iso) return '';
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  return `${y}.${m}`;
}
function crownByStreak(n: number) {
  if (n >= 3) return '👑👑👑';
  if (n === 2) return '👑👑';
  if (n === 1) return '👑';
  return '';
}
function iconByCode(code: string) {
  switch (code) {
    case 'monthly_top':
      return '👑';
    case 'attendance_month_mvp':
      return '🔥';
    case 'streak_month_king':
      return '⏳';
    case 'most_likes_month':
      return '❤️';
    case 'most_posts_month':
      return '✍️';
    case 'mvp_amount_month':
      return '💰';
    case 'mvp_count_month':
      return '📊';
    default:
      return '🏅';
  }
}
function reasonByCode(code: string) {
  return code === 'monthly_top'
    ? '이번 달 종합 활동 지표 1위를 기록했습니다'
    : code === 'streak_month_king'
    ? '이번 달 가장 꾸준한 기록을 남겼습니다'
    : code === 'most_likes_month'
    ? '이번 달 가장 많은 좋아요를 받았습니다'
    : code === 'mvp_count_month'
    ? '이번 달 실적 건수 목표를 가장 많이 달성했습니다'
    : code === 'mvp_amount_month'
    ? '이번 달 실적 금액 목표를 가장 크게 달성했습니다'
    : code === 'attendance_month_mvp'
    ? '이번 달 출석 기록 MVP입니다'
    : code === 'most_posts_month'
    ? '이번 달 커뮤니티에 가장 많은 글을 작성했습니다'
    : '이번 달 최고 성과를 기록했습니다';
}

export default function AdminPage() {
  const router = useRouter();

  const monthOptions = useMemo(() => {
    const now = new Date();
    const arr: { ym: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = toYM(d);
      arr.push({ ym, label: `${ym.slice(0, 4)}.${ym.slice(5, 7)}` });
    }
    return arr;
  }, []);

  const [ym, setYm] = useState(() => toYM(new Date()));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [monthlyBadges, setMonthlyBadges] = useState<MonthlyBadgeRow[]>([]);
  const [selected, setSelected] = useState<MonthlyBadgeRow | null>(null);

  const title = useMemo(() => `${ym.slice(0, 4)}.${ym.slice(5, 7)} 월간 배지`, [ym]);

  async function load(targetYm = ym) {
    setLoading(true);
    setErr(null);

    const start = monthStartISO(targetYm);
    const nextStart = nextMonthStartISO(targetYm);

    // 1) 월간 배지 (선택 월)
    const { data, error } = await supabase
      .from('monthly_badges')
      .select('badge_code,badge_name,winner_user_id,month_start,month_end')
      .gte('month_start', start)
      .lt('month_start', nextStart)
      .order('badge_code', { ascending: true });

    if (error) {
      setErr(error.message);
      setMonthlyBadges([]);
      setLoading(false);
      return;
    }

    const baseRows = (data ?? []).map((r: any) => ({
      ...r,
      reason: reasonByCode(r.badge_code),
    })) as MonthlyBadgeRow[];

    // 2) 닉네임 매핑
    const winnerIds = Array.from(
      new Set(baseRows.map((r) => r.winner_user_id).filter(Boolean))
    ) as string[];

    const nameMap = new Map<string, string>();
    if (winnerIds.length > 0) {
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('user_id,name')
        .in('user_id', winnerIds);

      if (!pErr && profs) {
        for (const p of profs as any[]) {
          if (p?.user_id && typeof p?.name === 'string') nameMap.set(p.user_id, p.name);
        }
      }
    }

    // 3) 연속수상 streak(배지코드별) 매핑
    const { data: streakRows } = await supabase
      .from('v_monthly_badge_streaks')
      .select('badge_code,winner_user_id,streak_len,last_month');

    const streakMap = new Map<string, { streak_len: number; last_month: string }>();
    for (const s of (streakRows ?? []) as any[]) {
      const key = `${s.badge_code}::${s.winner_user_id}`;
      streakMap.set(key, {
        streak_len: Number(s.streak_len ?? 0),
        last_month: String(s.last_month ?? ''),
      });
    }

    // 선택 월이 “마지막 수상 월”인 경우만 streak 표시
    const thisMonthKey = `${targetYm}-01`;

    const finalRows = baseRows.map((r) => {
      const winner_name = r.winner_user_id ? nameMap.get(r.winner_user_id) ?? null : null;
      const key = `${r.badge_code}::${r.winner_user_id}`;
      const hit = r.winner_user_id ? streakMap.get(key) : null;

      const streak_len =
        hit && hit.last_month === thisMonthKey ? Math.max(1, hit.streak_len) : 1;

      return {
        ...r,
        winner_name,
        streak_len,
        crown: crownByStreak(streak_len),
      };
    });

    setMonthlyBadges(finalRows);
    setLoading(false);
  }

  useEffect(() => {
    load(ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="page">
      <div className="top">
        <div>
          <h1>{title}</h1>
          <p>배지별 연속 수상(2연속/3연속) 왕관 업그레이드까지 표시합니다.</p>
        </div>

        <div className="actions">
          <select className="sel" value={ym} onChange={(e) => setYm(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m.ym} value={m.ym}>
                {m.label}
              </option>
            ))}
          </select>

          <button className="btn ghost" onClick={() => router.push('/home')}>
            홈
          </button>
          <button className="btn primary" onClick={() => load(ym)}>
            새로고침
          </button>
        </div>
      </div>

      {err && <div className="error">에러: {err}</div>}
      {loading && <div className="loading">불러오는 중…</div>}

      <div className="badgeGrid">
        {monthlyBadges.map((b) => (
          <button
            key={b.badge_code}
            className={`badgeCard ${b.badge_code}`}
            onClick={() => setSelected(b)}
            type="button"
          >
            <div className="shine" />

            <div className="badgeHeader">
              <div className="badgeIcon">{iconByCode(b.badge_code)}</div>
              <div className="titles">
                <div className="badgeName">{b.badge_name}</div>
                <div className="badgeCode">{b.badge_code}</div>
              </div>
            </div>

            <div className="badgeReason">{b.reason}</div>

            <div className="badgeFooter">
              <span className="badgeMonth">{ymLabel(b.month_start) || title.slice(0, 7)}</span>

              <span className="badgeUser">
                {b.winner_name ? `🏆 ${b.winner_name}` : `${b.winner_user_id?.slice(0, 8)}…`}

                <span className="streakPill">
                  {b.crown} {b.streak_len}연속
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="modalBackdrop" onClick={() => setSelected(null)}>
          <div className={`modalCard ${selected.badge_code}`} onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="modalIcon">{iconByCode(selected.badge_code)}</div>
              <div className="modalTitles">
                <div className="modalName">{selected.badge_name}</div>
                <div className="modalCode">{selected.badge_code}</div>
              </div>
              <button className="modalClose" onClick={() => setSelected(null)} type="button">
                닫기
              </button>
            </div>

            <div className="modalReason">{selected.reason}</div>

            <div className="modalInfo">
              <div className="pill">📅 {title}</div>
              <div className="pill">
                👤 수상자: <b>{selected.winner_name ?? selected.winner_user_id ?? '-'}</b>
              </div>
              <div className="pill">
                {selected.crown} <b>{selected.streak_len}연속</b>
              </div>
            </div>

            <div className="modalHint">ESC로 닫기 · 바깥 클릭으로 닫기</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .page {
          max-width: 1120px;
          margin: 0 auto;
          padding: 34px 18px 80px;
          color: #fdf2ff;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
        }

        h1 {
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -0.3px;
        }

        p {
          margin-top: 6px;
          font-size: 14px;
          opacity: 0.85;
          font-weight: 800;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .sel {
          height: 44px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 900;
          outline: none;
          cursor: pointer;
        }

        .btn {
          height: 44px;
          padding: 0 14px;
          border-radius: 999px;
          font-weight: 900;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.12);
        }

        .btn.primary {
          border: none;
          background: linear-gradient(135deg, #ff4fd8, #b982ff);
        }

        .btn.ghost {
          background: rgba(255, 255, 255, 0.06);
        }

        .error {
          margin-top: 16px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 80, 120, 0.2);
          font-weight: 850;
        }

        .loading {
          margin-top: 16px;
          font-size: 16px;
          font-weight: 850;
        }

        .badgeGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }

        .badgeCard {
          position: relative;
          overflow: hidden;
          text-align: left;
          border: none;
          width: 100%;
          padding: 18px;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          cursor: pointer;
          color: #fff;
        }

        .badgeCard:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 52px rgba(0, 0, 0, 0.35);
          filter: saturate(1.05);
        }

        .shine {
          position: absolute;
          inset: -70px -80px auto auto;
          width: 240px;
          height: 240px;
          border-radius: 999px;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.24),
            rgba(255, 255, 255, 0)
          );
          opacity: 0.6;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.22s ease;
        }

        .badgeCard:hover .shine {
          opacity: 0.95;
          transform: translate(-10px, 8px) scale(1.08);
        }

        .badgeHeader {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .badgeIcon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 24px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .badgeName {
          font-size: 20px;
          font-weight: 950;
        }

        .badgeCode {
          font-size: 12px;
          opacity: 0.72;
          font-weight: 800;
          margin-top: 2px;
        }

        .badgeReason {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 16px;
          font-weight: 850;
          line-height: 1.5;
        }

        .badgeFooter {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          opacity: 0.9;
          font-weight: 800;
        }

        .badgeMonth {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
        }

        .badgeUser {
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .streakPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-weight: 950;
          font-size: 12px;
          flex: 0 0 auto;
        }

        /* 배지별 색상 */
        .monthly_top { background: linear-gradient(135deg, #f6d365, #fda085); }
        .attendance_month_mvp { background: linear-gradient(135deg, #ff512f, #dd2476); }
        .streak_month_king { background: linear-gradient(135deg, #8360c3, #2ebf91); }
        .most_likes_month { background: linear-gradient(135deg, #ff5f9e, #ffc371); }
        .most_posts_month { background: linear-gradient(135deg, #43cea2, #185a9d); }
        .mvp_amount_month { background: linear-gradient(135deg, #f7971e, #ffd200); }
        .mvp_count_month { background: linear-gradient(135deg, #56ccf2, #2f80ed); }

        /* 모달 */
        .modalBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          padding: 22px;
          z-index: 9999;
        }

        .modalCard {
          width: min(720px, 96vw);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
          padding: 18px 18px 16px;
          color: #fff;
        }

        .modalTop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modalIcon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 26px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modalTitles { flex: 1; min-width: 0; }
        .modalName { font-size: 22px; font-weight: 950; }
        .modalCode { margin-top: 3px; font-size: 12px; opacity: 0.75; font-weight: 900; }

        .modalClose {
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .modalReason {
          margin-top: 14px;
          padding: 16px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.26);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 18px;
          font-weight: 900;
          line-height: 1.55;
        }

        .modalInfo { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }

        .pill {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-weight: 900;
          font-size: 13px;
        }

        .modalHint { margin-top: 12px; font-size: 12px; opacity: 0.8; font-weight: 800; text-align: right; }

        @media (prefers-reduced-motion: reduce) {
          .badgeCard, .btn, .shine { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
