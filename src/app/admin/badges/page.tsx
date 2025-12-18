'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ProfileLite = {
  user_id: string;
  email: string | null;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
};

type MonthlyBadgeReportRow = {
  id: string;
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  month_start: string | null; // YYYY-MM-DD
  month_end: string | null;   // YYYY-MM-DD
  reason: string | null;      // ✅ view에서 계산된 사유
};

type WinnerCard = {
  user_id: string;
  email: string;
  nickname: string;
  realName: string;
  avatar_url: string | null;
  month_start: string;
  month_end: string;
  badges: { code: string; name: string; reason: string }[];
};

function ymd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function monthOptions() {
  const now = new Date();
  const list: { key: string; label: string; start: string; end: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(dt.getFullYear(), dt.getMonth(), 1);
    const end = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = `${dt.getFullYear()}년 ${String(dt.getMonth() + 1).padStart(2, '0')}월`;
    list.push({ key, label, start: ymd(start), end: ymd(end) });
  }
  return list;
}

function safeText(v: any) {
  return v == null ? '' : String(v);
}

function pickNickname(p: Partial<ProfileLite> | null | undefined) {
  const n = safeText(p?.nickname).trim();
  if (n) return n;
  const nm = safeText(p?.name).trim();
  if (nm) return nm;
  return '사용자';
}

function initials(name: string) {
  const s = (name || '').trim();
  return s ? s.slice(0, 1) : 'U';
}

export default function AdminBadgesPage() {
  const router = useRouter();

  const opts = useMemo(() => monthOptions(), []);
  const [monthKey, setMonthKey] = useState(opts[0]?.key ?? '');
  const currentOpt = useMemo(() => opts.find((o) => o.key === monthKey) ?? opts[0], [opts, monthKey]);

  // ✅ deps 길이 고정(오류 방지)
  const monthStart = currentOpt?.start ?? '';
  const monthEnd = currentOpt?.end ?? '';

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [winners, setWinners] = useState<WinnerCard[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedUserId) return null;
    return winners.find((w) => w.user_id === selectedUserId) ?? null;
  }, [selectedUserId, winners]);

  const [selectedBadgeCode, setSelectedBadgeCode] = useState<string>('monthly_top');

  const selectedBadge = useMemo(() => {
    if (!selected) return null;
    return selected.badges.find((b) => b.code === selectedBadgeCode) ?? selected.badges[0] ?? null;
  }, [selected, selectedBadgeCode]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        // ✅ view에서 읽기 (reason 포함)
        const qb = await supabase
          .from('monthly_badges_report')
          .select('id,badge_code,badge_name,winner_user_id,month_start,month_end,reason')
          .gte('month_start', monthStart)
          .lte('month_end', monthEnd);

        if (qb.error) throw qb.error;

        const rows = (qb.data ?? []) as MonthlyBadgeReportRow[];
        const winnerIds = Array.from(new Set(rows.map((r) => r.winner_user_id).filter(Boolean).map(String)));

        if (winnerIds.length === 0) {
          if (!mounted) return;
          setWinners([]);
          setSelectedUserId(null);
          return;
        }

        const qp = await supabase
          .from('profiles')
          .select('user_id,email,nickname,name,avatar_url')
          .in('user_id', winnerIds);

        const profiles = (qp.data ?? []) as ProfileLite[];

        const byUser: Record<string, WinnerCard> = {};
        for (const wid of winnerIds) {
          const p = profiles.find((x) => String(x.user_id) === String(wid)) ?? null;
          byUser[wid] = {
            user_id: wid,
            email: safeText(p?.email) || '',
            nickname: pickNickname(p),
            realName: safeText(p?.name).trim(),
            avatar_url: p?.avatar_url ?? null,
            month_start: monthStart,
            month_end: monthEnd,
            badges: [],
          };
        }

        for (const r of rows) {
          const uid = r.winner_user_id ? String(r.winner_user_id) : '';
          if (!uid || !byUser[uid]) continue;
          byUser[uid].badges.push({
            code: safeText(r.badge_code),
            name: safeText(r.badge_name),
            reason: safeText(r.reason) || '월간 수상 기록',
          });
        }

        const list = Object.values(byUser)
          .sort((a, b) => b.badges.length - a.badges.length)
          .map((w) => ({
            ...w,
            // monthly_top이 있으면 맨 앞으로
            badges: [...w.badges].sort((x, y) => (x.code === 'monthly_top' ? -1 : y.code === 'monthly_top' ? 1 : 0)),
          }));

        if (!mounted) return;
        setWinners(list);
        setSelectedUserId((prev) => {
          if (prev && list.some((x) => x.user_id === prev)) return prev;
          return list[0]?.user_id ?? null;
        });
        setSelectedBadgeCode('monthly_top');
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ? String(e.message) : '배지 데이터를 불러오지 못했습니다.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [monthStart, monthEnd]);

  return (
    <div className="page">
      <div className="top">
        <div>
          <div className="h1">배지 관리</div>
          <div className="sub">월 선택해서 월간 배지 수상 현황을 확인해요</div>
        </div>

        <div className="topRight">
          <button className="ghostBtn" onClick={() => router.push('/admin')} type="button">
            관리자 홈
          </button>

          <div className="selectWrap">
            <span className="selectLabel">월 선택</span>
            <select className="select" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
              {opts.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {loading ? (
        <div className="loading">불러오는 중…</div>
      ) : winners.length === 0 ? (
        <div className="empty">
          <div className="emptyTitle">{currentOpt?.label} 월간 배지 데이터가 없어요.</div>
          <div className="emptySub">monthly_badges에 해당 월 데이터가 생성되어야 보여요.</div>
        </div>
      ) : (
        <div className="grid">
          {/* 좌측 목록 */}
          <section className="panel">
            <div className="panelTitle">
              <span className="dot" />
              <span>{currentOpt?.label} 월간 배지 수상자 목록</span>
            </div>

            <div className="winnerList">
              {winners.map((w) => (
                <button
                  key={w.user_id}
                  type="button"
                  className={`winnerCard ${selectedUserId === w.user_id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedUserId(w.user_id);
                    setSelectedBadgeCode('monthly_top');
                  }}
                >
                  <div className="who">
                    <div className="avatar">
                      {w.avatar_url ? (
                        <img className="avatarImg" src={w.avatar_url} alt="profile" />
                      ) : (
                        <div className="avatarFallback">{initials(w.nickname)}</div>
                      )}
                    </div>

                    <div className="whoText">
                      <div className="nickRow">
                        <span className="nick">{w.nickname}</span>
                        {w.realName ? <span className="realName">({w.realName})</span> : null}
                      </div>
                      {w.email ? <div className="meta">{w.email}</div> : <div className="meta muted">이메일 없음</div>}
                    </div>

                    <div className="cnt">
                      <span className="cntNum">{w.badges.length}</span>
                      <span className="cntUnit">개</span>
                    </div>
                  </div>

                  <div className="topBadge">
                    <div className="topBadgeInner">
                      <span className="crown">👑</span>
                      <div>
                        <div className="topName">{w.badges[0]?.name || '월간 배지'}</div>
                        <div className="topSub">{w.badges[0]?.code === 'monthly_top' ? '대표 배지' : '대표 배지 후보'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pillWrap">
                    {w.badges.slice(0, 7).map((b, idx) => (
                      <span key={`${b.code}-${idx}`} className="pill">
                        {b.name}
                      </span>
                    ))}
                    {w.badges.length > 7 ? <span className="pill more">+{w.badges.length - 7}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 우측 상세 */}
          <aside className="panel detail">
            <div className="panelTitle">
              <span className="dot" />
              <span>수상자 상세</span>
            </div>

            {selected ? (
              <>
                <div className="detailHead">
                  <div className="detailAvatar">
                    {selected.avatar_url ? (
                      <img className="avatarImg big" src={selected.avatar_url} alt="profile" />
                    ) : (
                      <div className="avatarFallback big">{initials(selected.nickname)}</div>
                    )}
                  </div>

                  <div className="detailInfo">
                    <div className="detailNickRow">
                      <div className="detailNick">{selected.nickname}</div>
                      {selected.realName ? <div className="detailReal">({selected.realName})</div> : null}
                    </div>
                    <div className="detailEmail">{selected.email || '이메일 없음'}</div>
                    <div className="detailRange">
                      {selected.month_start} ~ {selected.month_end}
                    </div>
                  </div>

                  <div className="detailBtnRow">
                    <button className="smallBtn" type="button" onClick={() => router.push('/admin/users')}>
                      회원 관리로 이동
                    </button>
                  </div>
                </div>

                <div className="sec">
                  <div className="secLabel">받은 배지</div>
                  <div className="pillWrap bigPills">
                    {selected.badges.map((b, idx) => (
                      <button
                        key={`${b.code}-${idx}`}
                        type="button"
                        className={`pill btnPill ${b.code === selectedBadgeCode ? 'sel' : ''} ${
                          b.code === 'monthly_top' ? 'gold' : ''
                        }`}
                        onClick={() => setSelectedBadgeCode(b.code)}
                      >
                        {b.code === 'monthly_top' ? '👑 ' : ''}
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sec">
                  <div className="secLabel">설명(사유)</div>
                  <div className="descCard">
                    <div className="descTitle">{selectedBadge?.code === 'monthly_top' ? '👑 ' : ''}{selectedBadge?.name}</div>
                    <div className="descText">{selectedBadge?.reason}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="emptySmall">왼쪽에서 수상자를 선택하면 상세가 보여요.</div>
            )}
          </aside>
        </div>
      )}

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.page{
  max-width: 1180px;
  margin: 0 auto;
  padding: 34px 18px 90px;
  color: #2a1236;
}
.top{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
  margin-bottom:18px;
}
.h1{font-size:28px;font-weight:1000;letter-spacing:-0.5px;}
.sub{margin-top:8px;font-size:13px;font-weight:900;opacity:0.85;color:#3b1a4b;}
.topRight{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ghostBtn{
  padding:10px 14px;border-radius:14px;border:1px solid rgba(128,56,255,0.16);
  background:rgba(255,255,255,0.75);font-weight:1000;cursor:pointer;
  box-shadow:0 10px 24px rgba(70,20,120,0.10);
}
.ghostBtn:hover{background:rgba(255,255,255,0.90);}
.selectWrap{
  display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;
  border:1px solid rgba(128,56,255,0.14);background:rgba(255,255,255,0.78);
  box-shadow:0 10px 24px rgba(70,20,120,0.10);
}
.selectLabel{font-size:12px;font-weight:1000;opacity:0.85;color:#3b1a4b;}
.select{
  border:none;outline:none;background:rgba(255,255,255,0.85);
  border-radius:10px;padding:8px 10px;font-weight:1000;color:#2a1236;
}
.err{
  margin:12px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,94,122,0.30);
  background:rgba(255,94,122,0.12);font-weight:1000;color:#5a1020;
}
.loading{padding:18px 0;font-weight:1000;color:#3b1a4b;}
.empty{
  margin-top:10px;padding:18px;border-radius:18px;border:1px solid rgba(128,56,255,0.14);
  background:rgba(255,255,255,0.72);box-shadow:0 16px 40px rgba(70,20,120,0.10);
}
.emptyTitle{font-size:16px;font-weight:1000;}
.emptySub{margin-top:6px;font-size:13px;font-weight:900;opacity:0.85;}
.grid{display:grid;grid-template-columns:1.15fr 0.85fr;gap:14px;align-items:start;}
@media (max-width: 980px){.grid{grid-template-columns:1fr;}}
.panel{
  padding:16px;border-radius:20px;border:1px solid rgba(128,56,255,0.14);
  background:rgba(255,255,255,0.72);box-shadow:0 16px 40px rgba(70,20,120,0.10);
}
.panelTitle{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:1000;margin-bottom:12px;}
.dot{width:10px;height:10px;border-radius:999px;background:linear-gradient(90deg,#FF4FD8,#B44CFF);box-shadow:0 8px 18px rgba(180,76,255,0.18);}
.winnerList{display:flex;flex-direction:column;gap:12px;}
.winnerCard{
  text-align:left;width:100%;padding:14px;border-radius:18px;border:1px solid rgba(128,56,255,0.12);
  background:rgba(255,255,255,0.80);box-shadow:0 12px 30px rgba(70,20,120,0.08);cursor:pointer;
}
.winnerCard:hover{background:rgba(255,255,255,0.92);}
.active{border-color:rgba(255,79,216,0.22);box-shadow:0 16px 40px rgba(255,79,216,0.10);}
.who{display:flex;align-items:center;gap:12px;}
.avatar{width:52px;height:52px;border-radius:16px;overflow:hidden;flex:0 0 auto;}
.avatarImg{width:100%;height:100%;object-fit:cover;border-radius:16px;}
.avatarFallback{
  width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  font-weight:1000;background:linear-gradient(135deg, rgba(255,79,216,0.22), rgba(180,76,255,0.18));
  color:#2a1236;border:1px solid rgba(180,76,255,0.16);
}
.whoText{flex:1;min-width:0;}
.nickRow{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.nick{font-size:18px;font-weight:1000;letter-spacing:-0.3px;}
.realName{font-size:13px;font-weight:1000;opacity:0.75;}
.meta{margin-top:4px;font-size:13px;font-weight:900;opacity:0.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.muted{opacity:0.55;}
.cnt{display:flex;align-items:baseline;gap:6px;flex:0 0 auto;padding-left:10px;}
.cntNum{font-size:18px;font-weight:1000;background:linear-gradient(90deg,#FF4FD8,#B44CFF);-webkit-background-clip:text;background-clip:text;color:transparent;}
.cntUnit{font-size:12px;font-weight:1000;opacity:0.7;}
.topBadge{
  margin-top:12px;padding:12px;border-radius:16px;border:1px solid rgba(255,189,92,0.40);
  background:linear-gradient(135deg, rgba(255,189,92,0.22), rgba(255,255,255,0.65));
}
.topBadgeInner{display:flex;align-items:center;gap:10px;}
.crown{font-size:18px;}
.topName{font-size:14px;font-weight:1000;}
.topSub{margin-top:2px;font-size:12px;font-weight:900;opacity:0.75;}
.pillWrap{margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;}
.pill{
  padding:8px 12px;border-radius:999px;border:1px solid rgba(128,56,255,0.14);
  background:rgba(255,255,255,0.92);font-size:13px;font-weight:1000;color:#2a1236;
}
.more{opacity:0.75;}
.gold{border-color:rgba(255,189,92,0.55);background:linear-gradient(135deg, rgba(255,189,92,0.22), rgba(255,255,255,0.90));}
.detail{position:sticky;top:18px;}
@media (max-width: 980px){.detail{position:relative;top:auto;}}
.detailHead{
  display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;border:1px solid rgba(128,56,255,0.12);
  background:rgba(255,255,255,0.82);box-shadow:0 12px 30px rgba(70,20,120,0.08);
}
.big{width:64px;height:64px;border-radius:18px;}
.avatarFallback.big{width:64px;height:64px;border-radius:18px;font-size:18px;}
.detailInfo{flex:1;min-width:0;}
.detailNickRow{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.detailNick{font-size:20px;font-weight:1000;letter-spacing:-0.3px;}
.detailReal{font-size:13px;font-weight:1000;opacity:0.75;}
.detailEmail{margin-top:4px;font-size:13px;font-weight:900;opacity:0.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.detailRange{margin-top:6px;font-size:12px;font-weight:1000;opacity:0.70;}
.smallBtn{
  padding:10px 12px;border-radius:14px;border:1px solid rgba(128,56,255,0.16);
  background:rgba(255,255,255,0.78);font-weight:1000;cursor:pointer;
}
.smallBtn:hover{background:rgba(255,255,255,0.92);}
.sec{margin-top:14px;}
.secLabel{font-size:13px;font-weight:1000;opacity:0.85;margin-bottom:10px;}
.btnPill{cursor:pointer;}
.btnPill:hover{background:rgba(255,255,255,0.98);}
.sel{border-color:rgba(255,79,216,0.28);box-shadow:0 10px 26px rgba(255,79,216,0.10);}
.descCard{
  padding:14px;border-radius:18px;border:1px solid rgba(128,56,255,0.12);
  background:rgba(255,255,255,0.82);box-shadow:0 12px 30px rgba(70,20,120,0.08);
}
.descTitle{font-size:14px;font-weight:1000;}
.descText{margin-top:8px;font-size:13px;font-weight:900;opacity:0.88;line-height:1.6;}
.emptySmall{
  padding:14px;border-radius:16px;border:1px dashed rgba(128,56,255,0.22);
  background:rgba(255,255,255,0.70);font-weight:1000;opacity:0.8;
}
`;
