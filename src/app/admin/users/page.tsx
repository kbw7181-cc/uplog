'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type ProfileRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  role: string | null; // user/admin/suspended...
  created_at: string | null;
};

type MonthlyBadgeReportRow = {
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  month_start: string | null;
  month_end: string | null;
  reason?: string | null;
};

type SanctionRow = {
  id: string;
  user_id: string | null;
  scope: string | null; // all/community/chat/support/customers/myup...
  action: string | null; // disable/mute/ban...
  starts_at: string | null;
  ends_at: string | null; // null이면 영구
  is_hard?: boolean | null;
  type?: string | null; // soft/hard (DB 컬럼 존재 시)
  note?: string | null;
  created_at?: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmtDateTime(d?: string | null) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safeStr(v?: string | null) {
  return (v ?? '').toString().trim();
}

function roleMeta(role?: string | null) {
  const r = (role ?? 'user').toLowerCase();
  if (r === 'admin') return { label: '관리자', cls: 'pill pillAdmin' };
  if (r === 'suspended') return { label: '정지', cls: 'pill pillSuspended' };
  return { label: '일반', cls: 'pill pillUser' };
}

function monthRangeLabel(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}.${String(m).padStart(2, '0')} 월`;
}

function getMonthStartEndYMD(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { startYMD: ymd(start), endYMD: ymd(end) };
}

function isActiveSanction(s: SanctionRow) {
  const now = Date.now();
  const st = s.starts_at ? new Date(s.starts_at).getTime() : 0;
  const en = s.ends_at ? new Date(s.ends_at).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isNaN(st) || Number.isNaN(en)) return false;
  return st <= now && now <= en;
}

type ScopeKey = 'all' | 'community' | 'chat' | 'support' | 'customers' | 'myup';
const SCOPE_META: { id: ScopeKey; label: string; hint: string }[] = [
  { id: 'all', label: '전체', hint: 'UPLOG 전체 사용 제한(하드/소프트 설정 가능)' },
  { id: 'community', label: '커뮤니티', hint: '글/댓글/좋아요 등 커뮤니티 기능 제한' },
  { id: 'chat', label: '채팅', hint: '채팅 작성/전송 제한' },
  { id: 'support', label: '문의', hint: '문의 작성 제한(관리자/CS용)' },
  { id: 'customers', label: '고객관리', hint: '고객 등록/수정/삭제 제한' },
  { id: 'myup', label: '나의UP', hint: '나의UP 기록/저장 제한' },
];

type DurationKey = '1d' | '3d' | '7d' | '14d' | '30d' | 'forever';
const DURATION_META: { id: DurationKey; label: string; days: number | null }[] = [
  { id: '1d', label: '1일', days: 1 },
  { id: '3d', label: '3일', days: 3 },
  { id: '7d', label: '7일', days: 7 },
  { id: '14d', label: '14일', days: 14 },
  { id: '30d', label: '30일', days: 30 },
  { id: 'forever', label: '영구', days: null },
];

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [q, setQ] = useState('');

  // ✅ 우측 패널
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  // ✅ 배지(사유 포함)
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [badgeErr, setBadgeErr] = useState<string | null>(null);
  const [badges, setBadges] = useState<MonthlyBadgeReportRow[]>([]);
  const [badgeSource, setBadgeSource] = useState<'report' | 'basic' | 'none'>('none');

  // ✅ 제재(조회 + 부여)
  const [sanLoading, setSanLoading] = useState(false);
  const [sanErr, setSanErr] = useState<string | null>(null);
  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);

  const [grantScope, setGrantScope] = useState<ScopeKey>('community');
  const [grantDuration, setGrantDuration] = useState<DurationKey>('7d');
  const [grantHard, setGrantHard] = useState(false);
  const [grantNote, setGrantNote] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMsg, setGrantMsg] = useState<string | null>(null);

  async function fetchProfiles() {
    setLoading(true);
    setErr(null);

    // ✅ avatar_url 포함 (프로필 이미지 깨짐 해결)
    const first = await supabase
      .from('profiles')
      .select('user_id,email,name,nickname,avatar_url,role,created_at')
      .order('created_at', { ascending: false });

    if (!first.error) {
      setRows(
        ((first.data as any[]) ?? []).map((x) => ({
          user_id: x.user_id,
          email: x.email ?? null,
          name: x.name ?? null,
          nickname: x.nickname ?? null,
          avatar_url: x.avatar_url ?? null,
          role: x.role ?? null,
          created_at: x.created_at ?? null,
        }))
      );
      setLoading(false);
      return;
    }

    // fallback
    const second = await supabase
      .from('profiles')
      .select('user_id,email,name,avatar_url,role,created_at')
      .order('created_at', { ascending: false });

    if (second.error) {
      setErr(second.error.message);
      setRows([]);
    } else {
      setRows(
        ((second.data as any[]) ?? []).map((x) => ({
          user_id: x.user_id,
          email: x.email ?? null,
          name: x.name ?? null,
          avatar_url: x.avatar_url ?? null,
          role: x.role ?? null,
          created_at: x.created_at ?? null,
        }))
      );
    }

    setLoading(false);
  }

  // ✅ 월간 배지는 month_start/month_end가 date일 가능성이 높음 → YYYY-MM-DD로 딱 맞춰 조회
  async function fetchMonthlyBadgesWithReason(userId: string) {
    setBadgeLoading(true);
    setBadgeErr(null);
    setBadges([]);
    setBadgeSource('none');

    const { startYMD, endYMD } = getMonthStartEndYMD(new Date());

    // 1) reason 포함 뷰 우선
    const report = await supabase
      .from('monthly_badge_winners_report')
      .select('badge_code,badge_name,winner_user_id,month_start,month_end,reason')
      .eq('winner_user_id', userId)
      .eq('month_start', startYMD)
      .eq('month_end', endYMD)
      .order('badge_name', { ascending: true });

    if (!report.error) {
      setBadges(((report.data as any[]) ?? []) as MonthlyBadgeReportRow[]);
      setBadgeSource('report');
      setBadgeLoading(false);
      return;
    }

    // 2) 기본 테이블 fallback
    const basic = await supabase
      .from('monthly_badges')
      .select('badge_code,badge_name,winner_user_id,month_start,month_end')
      .eq('winner_user_id', userId)
      .eq('month_start', startYMD)
      .eq('month_end', endYMD)
      .order('badge_name', { ascending: true });

    if (basic.error) {
      setBadgeErr(report.error?.message || basic.error.message);
      setBadges([]);
      setBadgeSource('none');
    } else {
      const withPlaceholder = (((basic.data as any[]) ?? []) as any[]).map((b) => ({
        ...b,
        reason: '사유 데이터 준비중',
      }));
      setBadges(withPlaceholder as MonthlyBadgeReportRow[]);
      setBadgeSource('basic');
    }

    setBadgeLoading(false);
  }

  async function fetchActiveSanctions(userId: string) {
    setSanLoading(true);
    setSanErr(null);
    setSanctions([]);

    const res = await supabase
      .from('sanctions')
      .select('id,user_id,scope,action,starts_at,ends_at,is_hard,type,note,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (res.error) {
      setSanErr(res.error.message);
      setSanctions([]);
      setSanLoading(false);
      return;
    }

    const all = ((res.data as any[]) ?? []) as SanctionRow[];
    setSanctions(all.filter(isActiveSanction));
    setSanLoading(false);
  }

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC로 패널 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanelOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        safeStr(r.user_id),
        safeStr(r.email),
        safeStr(r.name),
        safeStr(r.nickname ?? null),
        safeStr(r.role),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [q, rows]);

  async function setRole(userId: string, role: 'user' | 'admin' | 'suspended') {
    setSavingId(userId);
    setErr(null);

    const { error } = await supabase.from('profiles').update({ role }).eq('user_id', userId);

    if (error) {
      setErr(error.message);
    } else {
      setRows((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role } : p)));
      setSelected((prev) => (prev?.user_id === userId ? { ...prev, role } : prev));
    }

    setSavingId(null);
  }

  function openPanel(p: ProfileRow) {
    setSelected(p);
    setPanelOpen(true);

    // 패널 열 때 부여 UI 초기화
    setGrantScope('community');
    setGrantDuration('7d');
    setGrantHard(false);
    setGrantNote('');
    setGrantMsg(null);

    fetchMonthlyBadgesWithReason(p.user_id);
    fetchActiveSanctions(p.user_id);
  }

  async function grantSanction() {
    if (!selected) return;
    setGrantBusy(true);
    setGrantMsg(null);

    const scope = grantScope;
    const is_hard = grantHard || scope === 'all';
    const action = is_hard ? 'ban' : 'disable';
    const starts_at = new Date().toISOString();
    const days = DURATION_META.find((d) => d.id === grantDuration)?.days ?? 7;
    const ends_at = days === null ? null : addDaysISO(days);
    const note = safeStr(grantNote) || null;

    const payload = {
      user_id: selected.user_id,
      scope,
      action,
      starts_at,
      ends_at,
      is_hard,
      type: is_hard ? 'hard' : 'soft',
      note,
    };

    const res = await supabase.from('sanctions').insert([payload]);

    if (res.error) {
      setGrantMsg(`⚠ 제재 부여 실패: ${res.error.message}`);
      setGrantBusy(false);
      return;
    }

    setGrantMsg('✅ 제재가 부여되었습니다.');
    setGrantBusy(false);

    fetchActiveSanctions(selected.user_id);
  }

  async function revokeSanction(id: string) {
    if (!selected) return;
    if (!confirm('이 제재를 해제(삭제)할까요?')) return;

    const res = await supabase.from('sanctions').delete().eq('id', id);
    if (res.error) {
      alert(`해제 실패: ${res.error.message}`);
      return;
    }

    fetchActiveSanctions(selected.user_id);
  }

  const monthLabel = monthRangeLabel(new Date());

  return (
    <div className="page">
      <div className="bg" />
      <div className="overlay" />

      <div className="top">
        <div>
          <h1 className="h1">회원관리</h1>
          <div className="sub">
            총 <b>{filtered.length}</b>명 · 역할 변경/정지 관리
          </div>
        </div>

        <div className="navBtns">
          <button className="navBtn" onClick={() => router.push('/admin')}>
            ← 관리자 대시보드
          </button>
          <button className="navBtn strong" onClick={() => fetchProfiles()} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      <div className="searchWrap">
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일 / 닉네임 / UID / 역할 검색"
        />
      </div>

      {err ? <div className="error">⚠ {err}</div> : null}

      {loading ? (
        <div className="loading">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">검색 결과가 없습니다.</div>
      ) : (
        <div className="grid">
          {filtered.map((p) => {
            const displayName = safeStr(p.nickname ?? null) || safeStr(p.name) || '사용자';
            const email = safeStr(p.email) || '(이메일 없음)';
            const meta = roleMeta(p.role);
            const avatarSrc = getAvatarSrc(p.avatar_url);

            return (
              <div key={p.user_id} className="card">
                <div className="cardTop">
                  <div className="who">
                    <div className="whoRow">
                      {/* ✅ 리스트에서도 프로필 이미지 노출 */}
                      <img
                        className="miniAvatar"
                        src={avatarSrc}
                        alt="profile"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                        }}
                      />

                      <div className="whoText">
                        <div className="nameRow">
                          <div className="name">{displayName}</div>
                          <div className={meta.cls}>{meta.label}</div>
                        </div>

                        <div className="email">{email}</div>

                        <div className="metaRow">
                          <span className="uid">UID: {p.user_id}</span>
                          <span className="dot">·</span>
                          <span className="date">가입: {fmtDate(p.created_at) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="viewBtn" onClick={() => openPanel(p)}>
                    보기
                  </button>
                </div>

                <div className="actions">
                  <button className="actBtn user" disabled={savingId === p.user_id} onClick={() => setRole(p.user_id, 'user')}>
                    일반
                  </button>
                  <button className="actBtn admin" disabled={savingId === p.user_id} onClick={() => setRole(p.user_id, 'admin')}>
                    관리자
                  </button>
                  <button
                    className="actBtn suspended"
                    disabled={savingId === p.user_id}
                    onClick={() => setRole(p.user_id, 'suspended')}
                  >
                    정지
                  </button>
                </div>

                {savingId === p.user_id ? <div className="saving">저장 중…</div> : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ 우측 슬라이드 패널 */}
      <div className={`panelScrim ${panelOpen ? 'on' : ''}`} onClick={() => setPanelOpen(false)} />
      <aside className={`panel ${panelOpen ? 'on' : ''}`}>
        <div className="panelHead">
          <div className="panelTitle">회원 상세</div>
          <button className="panelClose" onClick={() => setPanelOpen(false)} aria-label="닫기">
            ✕
          </button>
        </div>

        {!selected ? (
          <div className="panelBody">
            <div className="panelEmpty">회원이 선택되지 않았습니다.</div>
          </div>
        ) : (
          <div className="panelBody">
            {(() => {
              const displayName = safeStr(selected.nickname ?? null) || safeStr(selected.name) || '사용자';
              const email = safeStr(selected.email) || '(이메일 없음)';
              const meta = roleMeta(selected.role);
              const avatarSrc = getAvatarSrc(selected.avatar_url);

              return (
                <>
                  <div className="heroCard">
                    {/* ✅ 상세에서도 실제 이미지 */}
                    <img
                      className="heroAvatar"
                      src={avatarSrc}
                      alt="profile"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/upzzu1.png';
                      }}
                    />

                    <div className="heroInfo">
                      <div className="heroTop">
                        <div className="heroName">{displayName}</div>
                        <div className={meta.cls}>{meta.label}</div>
                      </div>
                      <div className="heroEmail">{email}</div>
                      <div className="heroMeta">
                        <div>
                          UID: <b>{selected.user_id}</b>
                        </div>
                        <div>
                          가입일: <b>{fmtDate(selected.created_at) || '-'}</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ✅ 월간 배지 + 사유 */}
                  <div className="panelSection">
                    <div className="secTitle">
                      이번 달 배지 <span className="secSub">({monthLabel})</span>
                    </div>

                    <div className="tinyInfo">
                      {badgeSource === 'report'
                        ? '사유 포함 리포트 기준'
                        : badgeSource === 'basic'
                        ? '기본 배지 데이터(사유 준비중)'
                        : ''}
                    </div>

                    {badgeLoading ? (
                      <div className="miniMsg">불러오는 중…</div>
                    ) : badgeErr ? (
                      <div className="miniErr">
                        ⚠ 월간 배지 조회 실패: <b>{badgeErr}</b>
                        <div className="miniHint">(monthly_badge_winners_report 뷰가 없거나 RLS로 막히면 이 메시지가 뜹니다.)</div>
                      </div>
                    ) : badges.length === 0 ? (
                      <div className="miniMsg">이번 달 수상 배지가 없습니다.</div>
                    ) : (
                      <div className="badgeList">
                        {badges.map((b, idx) => (
                          <div key={`${b.badge_code ?? 'badge'}-${idx}`} className="badgeItem">
                            <div className="badgeDot" />
                            <div className="badgeText">
                              <div className="badgeName">{b.badge_name ?? b.badge_code ?? '배지'}</div>
                              <div className="badgeReason">{safeStr(b.reason) || '사유 데이터 준비중'}</div>
                              <div className="badgeCode">{b.badge_code ?? ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✅ 현재 제재 + 해제 */}
                  <div className="panelSection">
                    <div className="secTitle">현재 제재</div>

                    {sanLoading ? (
                      <div className="miniMsg">불러오는 중…</div>
                    ) : sanErr ? (
                      <div className="miniErr">
                        ⚠ 제재 조회 실패: <b>{sanErr}</b>
                        <div className="miniHint">(sanctions 테이블이 없거나 RLS/권한 문제입니다.)</div>
                      </div>
                    ) : sanctions.length === 0 ? (
                      <div className="miniMsg">현재 활성 제재가 없습니다.</div>
                    ) : (
                      <div className="sanList">
                        {sanctions.map((s) => (
                          <div key={s.id} className="sanItem">
                            <div className={`sanPill ${s.is_hard ? 'hard' : 'soft'}`}>
                              {s.is_hard ? '하드 정지' : '소프트 제재'}
                            </div>

                            <div className="sanMain">
                              <div className="sanLine">
                                <b>{safeStr(s.scope) || 'scope'}</b> · {safeStr(s.action) || 'action'}
                              </div>
                              <div className="sanTime">
                                {fmtDateTime(s.starts_at)} ~ {s.ends_at ? fmtDateTime(s.ends_at) : '영구'}
                              </div>
                              {safeStr(s.note) ? <div className="sanNote">{safeStr(s.note)}</div> : null}
                            </div>

                            <button className="sanKill" onClick={() => revokeSanction(s.id)}>
                              해제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✅ 제재 부여 UI */}
                  <div className="panelSection">
                    <div className="secTitle">제재 부여</div>
                    <div className="grantHint">기능별 · 기간별(1/3/7/14/30/영구) 운영용</div>

                    <div className="grantRow">
                      <div className="lbl">범위</div>
                      <div className="seg">
                        {SCOPE_META.map((s) => (
                          <button
                            key={s.id}
                            className={`chip ${grantScope === s.id ? 'on' : ''}`}
                            onClick={() => setGrantScope(s.id)}
                            type="button"
                            title={s.hint}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grantRow">
                      <div className="lbl">기간</div>
                      <div className="seg">
                        {DURATION_META.map((d) => (
                          <button
                            key={d.id}
                            className={`chip ${grantDuration === d.id ? 'on' : ''}`}
                            onClick={() => setGrantDuration(d.id)}
                            type="button"
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grantRow">
                      <div className="lbl">모드</div>
                      <div className="toggleRow">
                        <button className={`toggle ${grantHard ? 'on' : ''}`} onClick={() => setGrantHard((v) => !v)} type="button">
                          {grantHard ? '하드 정지' : '소프트 제재'}
                        </button>
                        <div className="toggleHint">
                          {grantHard || grantScope === 'all' ? '전체 사용 금지에 가까운 강한 제재' : '해당 기능만 제한하는 제재'}
                        </div>
                      </div>
                    </div>

                    <div className="grantRow">
                      <div className="lbl">메모</div>
                      <textarea
                        className="ta"
                        value={grantNote}
                        onChange={(e) => setGrantNote(e.target.value)}
                        placeholder="사유/근거/관리자 메모 (예: 커뮤니티 7일 정지, 욕설 3회)"
                      />
                    </div>

                    <div className="grantBtns">
                      <button className="grantBtn" disabled={grantBusy} onClick={grantSanction}>
                        {grantBusy ? '부여 중…' : '제재 부여'}
                      </button>

                      <button
                        className="ghostBtn"
                        type="button"
                        onClick={() => {
                          if (!selected) return;
                          fetchActiveSanctions(selected.user_id);
                        }}
                      >
                        제재 새로고침
                      </button>
                    </div>

                    {grantMsg ? <div className="grantMsg">{grantMsg}</div> : null}
                  </div>

                  {/* ✅ 권한/정지(role) 조치 */}
                  <div className="panelSection">
                    <div className="secTitle">role 빠른 조치</div>
                    <div className="panelActions">
                      <button className="pAct user" disabled={savingId === selected.user_id} onClick={() => setRole(selected.user_id, 'user')}>
                        일반
                      </button>
                      <button className="pAct admin" disabled={savingId === selected.user_id} onClick={() => setRole(selected.user_id, 'admin')}>
                        관리자
                      </button>
                      <button
                        className="pAct suspended"
                        disabled={savingId === selected.user_id}
                        onClick={() => setRole(selected.user_id, 'suspended')}
                      >
                        정지
                      </button>
                    </div>
                    {savingId === selected.user_id ? <div className="miniMsg">저장 중…</div> : null}
                  </div>

                  <div className="panelFoot">
                    <button className="footBtn" onClick={() => setPanelOpen(false)}>
                      닫기
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </aside>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.page{
  position:relative;
  min-height:100vh;
  width:100%;
  overflow:hidden;
  color:#0b0b0f; /* ✅ 더 진한 글씨 */
}
.bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(1200px 600px at 15% 20%, #ffffff 0%, rgba(255,255,255,0) 60%),
    radial-gradient(1200px 600px at 80% 25%, #f3e8ff 0%, rgba(255,255,255,0) 60%),
    linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 50%, #f8f4ff 100%);
}
.overlay{
  position:absolute;
  inset:0;
  pointer-events:none;
  background: radial-gradient(900px 500px at 60% 10%, rgba(255,79,216,0.10), transparent 60%);
}

.top{
  position:relative;
  max-width:1120px;
  margin:0 auto;
  padding: 28px 18px 12px;
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
}
.h1{ font-size:28px; font-weight:950; letter-spacing:-0.6px; color:#12061a; }
.sub{ margin-top:6px; font-size:14px; font-weight:900; color:#1b1026; opacity:0.92; }

.navBtns{ display:flex; gap:10px; flex-wrap:wrap; }
.navBtn{
  border:1px solid rgba(18,6,26,0.16);
  background: rgba(255,255,255,0.82);
  padding:10px 14px;
  border-radius:999px;
  font-weight:950;
  color:#12061a;
  box-shadow: 0 10px 28px rgba(40,10,70,0.08);
}
.navBtn.strong{
  background: linear-gradient(135deg, rgba(255,79,216,0.22), rgba(185,130,255,0.22));
  border-color: rgba(255,79,216,0.26);
}
.navBtn:disabled{ opacity:0.55; cursor:not-allowed; }

.searchWrap{
  position:relative;
  max-width:1120px;
  margin:0 auto;
  padding: 0 18px 14px;
}
.search{
  width:100%;
  height:44px;
  border-radius:14px;
  border:1px solid rgba(18,6,26,0.16);
  background: rgba(255,255,255,0.90);
  padding: 0 14px;
  font-size:17px;
  font-weight:900;
  color:#0b0b0f;
  outline:none;
  box-shadow: 0 12px 30px rgba(40,10,70,0.08);
}
.search::placeholder{ color: rgba(11,11,15,0.45); font-weight:900; }

.error{ position:relative; max-width:1120px; margin:0 auto; padding: 10px 18px; color:#6b1024; font-weight:950; }
.loading, .empty{ position:relative; max-width:1120px; margin: 14px auto 0; padding: 18px; font-weight:950; color:#12061a; }

.grid{
  position:relative;
  max-width:1120px;
  margin: 0 auto;
  padding: 10px 18px 70px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap:14px;
}
@media (max-width: 920px){
  .grid{ grid-template-columns: 1fr; }
  .top{ align-items:flex-start; flex-direction:column; }
}

.card{
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(18,6,26,0.12);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(40,10,70,0.10);
  padding: 14px 14px 12px;
  backdrop-filter: blur(10px);
}
.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.who{ flex:1; min-width:0; }
.whoRow{ display:flex; gap:12px; align-items:flex-start; }
.miniAvatar{
  width:48px; height:48px;
  border-radius: 16px;
  object-fit: cover;
  background:#fff;
  border: 1px solid rgba(18,6,26,0.10);
  flex: 0 0 auto;
}
.whoText{ flex:1; min-width:0; }

.nameRow{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.name{ font-size:20px; font-weight:1000; color:#0b0b0f; letter-spacing:-0.3px; }
.email{ margin-top:4px; font-size:14px; font-weight:950; color:#15101f; opacity:0.92; word-break:break-all; }
.metaRow{
  margin-top:8px;
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  font-size:12px; font-weight:950; color: rgba(11,11,15,0.70);
}
.dot{ opacity:0.5; }

.viewBtn{
  border-radius: 14px;
  padding: 10px 12px;
  border:1px solid rgba(18,6,26,0.14);
  background: linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.18));
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 12px 24px rgba(40,10,70,0.10);
  white-space:nowrap;
}

/* pill */
.pill{
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 1000;
  border: 1px solid rgba(18,6,26,0.14);
  color:#0b0b0f;
}
.pillUser{ background: rgba(73,183,255,0.16); border-color: rgba(73,183,255,0.25); }
.pillAdmin{ background: rgba(255,79,216,0.18); border-color: rgba(255,79,216,0.30); }
.pillSuspended{ background: rgba(255,94,122,0.18); border-color: rgba(255,94,122,0.32); }

/* actions */
.actions{ margin-top:12px; display:flex; gap:8px; }
.actBtn{
  flex:1;
  height:40px;
  border-radius: 14px;
  border: 1px solid rgba(18,6,26,0.14);
  font-weight: 1000;
  color:#0b0b0f;
  background: rgba(255,255,255,0.90);
  box-shadow: 0 12px 24px rgba(40,10,70,0.08);
}
.actBtn.user{ background: linear-gradient(135deg, rgba(73,183,255,0.14), rgba(143,215,255,0.10)); }
.actBtn.admin{ background: linear-gradient(135deg, rgba(255,79,216,0.16), rgba(185,130,255,0.14)); }
.actBtn.suspended{ background: linear-gradient(135deg, rgba(255,94,122,0.14), rgba(255,154,174,0.10)); }
.actBtn:disabled{ opacity:0.6; cursor:not-allowed; }
.saving{ margin-top:10px; font-size:12px; font-weight:950; color: rgba(11,11,15,0.65); }

/* panel */
.panelScrim{
  position:fixed; inset:0;
  background: rgba(10, 6, 18, 0.30);
  opacity:0; pointer-events:none;
  transition: opacity .18s ease;
  z-index:40;
}
.panelScrim.on{ opacity:1; pointer-events:auto; }

.panel{
  position:fixed; top:0; right:0;
  height:100vh;
  width:min(520px, 92vw);
  background: rgba(255,255,255,0.92);
  border-left: 1px solid rgba(18,6,26,0.12);
  box-shadow: -18px 0 40px rgba(40,10,70,0.14);
  transform: translateX(104%);
  transition: transform .22s ease;
  z-index:45;
  backdrop-filter: blur(12px);
  display:flex;
  flex-direction:column;
}
.panel.on{ transform: translateX(0); }

.panelHead{
  padding: 16px 16px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.panelTitle{ font-size:18px; font-weight:1000; color:#0b0b0f; letter-spacing:-0.2px; }
.panelClose{
  width:38px; height:38px;
  border-radius: 12px;
  border:1px solid rgba(18,6,26,0.14);
  background: rgba(255,255,255,0.90);
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 10px 22px rgba(40,10,70,0.10);
}
.panelBody{ padding: 0 16px 16px; overflow:auto; }
.panelEmpty{ padding: 16px; font-weight:950; color:#0b0b0f; }

.heroCard{
  margin-top: 6px;
  border-radius: 18px;
  border:1px solid rgba(18,6,26,0.12);
  background: rgba(255,255,255,0.84);
  box-shadow: 0 14px 30px rgba(40,10,70,0.10);
  padding: 14px;
  display:flex;
  gap:12px;
  align-items:flex-start;
}
.heroAvatar{
  width:64px; height:64px;
  border-radius: 18px;
  object-fit: cover;
  background:#fff;
  border: 1px solid rgba(18,6,26,0.10);
  flex: 0 0 auto;
}
.heroInfo{ flex:1; min-width:0; }
.heroTop{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.heroName{ font-size:18px; font-weight:1000; color:#0b0b0f; }
.heroEmail{
  margin-top:4px;
  font-size:13px; font-weight:950;
  color:#111019;
  word-break:break-all;
  opacity:0.92;
}
.heroMeta{
  margin-top:8px;
  display:grid;
  gap:6px;
  font-size:12px;
  font-weight:950;
  color: rgba(11,11,15,0.70);
}

.panelSection{
  margin-top: 12px;
  border-radius: 18px;
  border:1px solid rgba(18,6,26,0.12);
  background: rgba(255,255,255,0.84);
  box-shadow: 0 14px 30px rgba(40,10,70,0.10);
  padding: 12px;
}
.secTitle{ font-size:14px; font-weight:1000; color:#0b0b0f; }
.secSub{ margin-left:6px; font-size:12px; font-weight:950; color: rgba(11,11,15,0.62); }

.tinyInfo{ margin-top:6px; font-size:11px; font-weight:950; color: rgba(11,11,15,0.55); }
.miniMsg{ margin-top:10px; font-size:13px; font-weight:950; color: rgba(11,11,15,0.70); }
.miniErr{ margin-top:10px; font-size:13px; font-weight:1000; color:#6b1024; }
.miniHint{ margin-top:6px; font-size:12px; font-weight:950; color: rgba(11,11,15,0.65); }

/* badges */
.badgeList{ margin-top:10px; display:grid; gap:8px; }
.badgeItem{
  display:flex; gap:10px; align-items:flex-start;
  padding: 10px;
  border-radius: 14px;
  border:1px solid rgba(18,6,26,0.10);
  background: rgba(255,255,255,0.78);
}
.badgeDot{
  width:10px; height:10px; margin-top:5px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255,79,216,0.9), rgba(185,130,255,0.9));
}
.badgeName{ font-size:13px; font-weight:1000; color:#0b0b0f; }
.badgeReason{
  margin-top:4px;
  font-size:12px;
  font-weight:950;
  color: rgba(11,11,15,0.78);
  line-height:1.35;
}
.badgeCode{ margin-top:3px; font-size:11px; font-weight:950; color: rgba(11,11,15,0.55); }

/* sanctions */
.sanList{ margin-top:10px; display:grid; gap:10px; }
.sanItem{
  display:flex;
  gap:10px;
  align-items:flex-start;
  padding: 10px;
  border-radius: 14px;
  border:1px solid rgba(18,6,26,0.10);
  background: rgba(255,255,255,0.78);
}
.sanPill{
  padding:6px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:1000;
  border:1px solid rgba(18,6,26,0.12);
  white-space:nowrap;
}
.sanPill.soft{
  background: rgba(255,79,216,0.12);
  border-color: rgba(255,79,216,0.22);
  color:#0b0b0f;
}
.sanPill.hard{
  background: rgba(255,94,122,0.14);
  border-color: rgba(255,94,122,0.26);
  color:#0b0b0f;
}
.sanMain{ flex:1; min-width:0; }
.sanLine{ font-size:13px; font-weight:1000; color:#0b0b0f; }
.sanTime{ margin-top:4px; font-size:12px; font-weight:950; color: rgba(11,11,15,0.70); }
.sanNote{ margin-top:6px; font-size:12px; font-weight:950; color: rgba(11,11,15,0.75); line-height:1.35; }
.sanKill{
  height:34px;
  padding: 0 10px;
  border-radius: 12px;
  border:1px solid rgba(18,6,26,0.12);
  background: rgba(255,255,255,0.92);
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 10px 18px rgba(40,10,70,0.08);
}

/* grant UI */
.grantHint{
  margin-top:6px;
  font-size:12px;
  font-weight:950;
  color: rgba(11,11,15,0.65);
}
.grantRow{
  margin-top:10px;
  display:grid;
  grid-template-columns: 56px 1fr;
  gap:10px;
  align-items:flex-start;
}
.lbl{
  font-size:12px;
  font-weight:1000;
  color:#0b0b0f;
  padding-top: 8px;
}
.seg{ display:flex; gap:8px; flex-wrap:wrap; }
.chip{
  height:34px;
  padding: 0 12px;
  border-radius: 999px;
  border:1px solid rgba(18,6,26,0.14);
  background: rgba(255,255,255,0.90);
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 10px 18px rgba(40,10,70,0.06);
}
.chip.on{
  background: linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.16));
  border-color: rgba(255,79,216,0.26);
}
.toggleRow{ display:grid; gap:6px; }
.toggle{
  height:36px;
  border-radius: 14px;
  border:1px solid rgba(18,6,26,0.14);
  background: rgba(255,255,255,0.92);
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 10px 18px rgba(40,10,70,0.06);
}
.toggle.on{
  background: linear-gradient(135deg, rgba(255,94,122,0.18), rgba(255,154,174,0.14));
  border-color: rgba(255,94,122,0.26);
  color:#0b0b0f;
}
.toggleHint{
  font-size:12px;
  font-weight:950;
  color: rgba(11,11,15,0.65);
}
.ta{
  width:100%;
  min-height: 76px;
  border-radius: 14px;
  border:1px solid rgba(18,6,26,0.14);
  background: rgba(255,255,255,0.92);
  padding: 10px 12px;
  font-size:13px;
  font-weight:950;
  color:#0b0b0f;
  outline:none;
  box-shadow: 0 12px 24px rgba(40,10,70,0.08);
  resize: vertical;
}
.grantBtns{ margin-top: 10px; display:flex; gap:10px; }
.grantBtn{
  flex:1;
  height:44px;
  border-radius: 16px;
  border:1px solid rgba(18,6,26,0.14);
  background: linear-gradient(135deg, rgba(255,79,216,0.20), rgba(185,130,255,0.18));
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 14px 30px rgba(40,10,70,0.10);
}
.grantBtn:disabled{ opacity:0.6; cursor:not-allowed; }
.ghostBtn{
  height:44px;
  padding: 0 12px;
  border-radius: 16px;
  border:1px solid rgba(18,6,26,0.12);
  background: rgba(255,255,255,0.92);
  font-weight:1000;
  color:#0b0b0f;
  box-shadow: 0 12px 24px rgba(40,10,70,0.06);
}
.grantMsg{
  margin-top:10px;
  font-size:13px;
  font-weight:1000;
  color:#0b0b0f;
}

/* role buttons inside panel */
.panelActions{ margin-top:10px; display:flex; gap:8px; }
.pAct{
  flex:1;
  height:40px;
  border-radius: 14px;
  border: 1px solid rgba(18,6,26,0.14);
  font-weight: 1000;
  color:#0b0b0f;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 12px 24px rgba(40,10,70,0.08);
}
.pAct.user{ background: linear-gradient(135deg, rgba(73,183,255,0.14), rgba(143,215,255,0.10)); }
.pAct.admin{ background: linear-gradient(135deg, rgba(255,79,216,0.16), rgba(185,130,255,0.14)); }
.pAct.suspended{ background: linear-gradient(135deg, rgba(255,94,122,0.14), rgba(255,154,174,0.10)); }
.pAct:disabled{ opacity:0.6; cursor:not-allowed; }

.panelFoot{ margin-top: 12px; padding-bottom: 8px; }
.footBtn{
  width:100%;
  height:44px;
  border-radius: 16px;
  border:1px solid rgba(18,6,26,0.14);
  background: linear-gradient(135deg, rgba(255,79,216,0.16), rgba(185,130,255,0.14));
  font-weight: 1000;
  color:#0b0b0f;
  box-shadow: 0 14px 30px rgba(40,10,70,0.10);
}
`;
