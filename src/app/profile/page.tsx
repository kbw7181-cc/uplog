// ✅✅✅ 전체복붙: src/app/profile/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type ProfileRow = {
  user_id: string;
  name: string | null;
  nickname: string | null;
  industry: string | null;
  grade: string | null;
  career: string | null;
  company: string | null;
  department: string | null;
  team: string | null;
  avatar_url: string | null;
  main_goal: string | null;
};

type MonthlyBadgeRow = {
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  month_start: string | null; // YYYY-MM-DD
  month_end: string | null; // YYYY-MM-DD
};

function yyyymmFromDateStr(d: string | null | undefined) {
  const s = String(d || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s.slice(0, 7); // YYYY-MM
}

function badgeIcon(code: string) {
  const c = (code || '').toLowerCase();
  if (c.includes('top')) return '👑';
  if (c.includes('streak')) return '🔥';
  if (c.includes('likes')) return '💖';
  if (c.includes('mvp') && c.includes('amount')) return '💎';
  if (c.includes('mvp')) return '🏆';
  if (c.includes('attendance')) return '📅';
  if (c.includes('posts')) return '📝';
  return '✨';
}

function badgeDesc(code: string, name: string) {
  const c = (code || '').toLowerCase();
  // ✅ 배지 설명(프로필에서 항상 보여주기)
  if (c.includes('monthly_top')) return '이번 달 전체 1등(대체/종합) 기준으로 수상';
  if (c.includes('streak')) return '연속 기록/활동(스트릭) 기반 수상';
  if (c.includes('most_likes')) return '받은 좋아요 수가 가장 많아 수상';
  if (c.includes('most_posts')) return '커뮤니티 게시글 수가 가장 많아 수상';
  if (c.includes('mvp_count')) return '실적 “건수” 기준 MVP 수상';
  if (c.includes('mvp_amount')) return '실적 “금액” 기준 MVP 수상';
  if (c.includes('attendance')) return '출석/활동일수 기준 MVP 수상';
  // name 기반 fallback
  if ((name || '').includes('출석')) return '출석/활동일수 기준 MVP 수상';
  if ((name || '').includes('좋아요')) return '받은 좋아요 수가 가장 많아 수상';
  if ((name || '').includes('게시')) return '게시글 수가 가장 많아 수상';
  if ((name || '').includes('금액')) return '실적 “금액” 기준 MVP 수상';
  if ((name || '').includes('건수')) return '실적 “건수” 기준 MVP 수상';
  return '이번 달 활동/성과 기준으로 수상';
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // 입력값(폼)
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [grade, setGrade] = useState('');
  const [career, setCareer] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [mainGoal, setMainGoal] = useState(''); // ✅ 최종목표 입력란

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // 배지(누적)
  const [badgeRows, setBadgeRows] = useState<MonthlyBadgeRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const avatarSrc = useMemo(() => {
    // ✅ 기본 이미지는 public/upzzu1.png (문구/경고는 제거)
    const raw = avatarUrl || '';
    const src = raw ? getAvatarSrc(raw) : '/upzzu1.png';
    // 캐시 버스팅(설정 직후 즉시 반영)
    return `${src}${src.includes('?') ? '&' : '?'}v=${Date.now()}`;
  }, [avatarUrl]);

  const badgeAgg = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; months: string[] }>();
    (badgeRows || []).forEach((r) => {
      const code = String(r.badge_code || '').trim();
      const name = String(r.badge_name || r.badge_code || '').trim();
      if (!code && !name) return;

      const key = `${code}|${name}`;
      const month = yyyymmFromDateStr(r.month_start);
      if (!map.has(key)) map.set(key, { code, name, count: 0, months: [] });

      const it = map.get(key)!;
      it.count += 1;
      if (month) it.months.push(month);
    });

    const list = Array.from(map.values()).map((x) => {
      const uniqMonths = Array.from(new Set(x.months)).sort().reverse();
      return { ...x, months: uniqMonths };
    });

    // 많이 받은 순 → 최신 월 우선
    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const am = a.months[0] || '';
      const bm = b.months[0] || '';
      return bm.localeCompare(am);
    });

    const totalEarned = (badgeRows || []).length;
    const uniqueBadges = list.length;

    return { list, totalEarned, uniqueBadges };
  }, [badgeRows]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (!alive) return;

      if (uErr || !u?.user) {
        router.replace('/login');
        return;
      }

      const uid = u.user.id;
      setUserId(uid);

      // 프로필 로드
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, name, nickname, industry, grade, career, company, department, team, avatar_url, main_goal')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      if (pErr) {
        setErr(`프로필 로드 실패: ${pErr.message}`);
      }

      const row: ProfileRow = {
        user_id: uid,
        name: (p as any)?.name ?? null,
        nickname: (p as any)?.nickname ?? null,
        industry: (p as any)?.industry ?? null,
        grade: (p as any)?.grade ?? null,
        career: (p as any)?.career ?? null,
        company: (p as any)?.company ?? null,
        department: (p as any)?.department ?? null,
        team: (p as any)?.team ?? null,
        avatar_url: (p as any)?.avatar_url ?? null,
        main_goal: (p as any)?.main_goal ?? null,
      };

      setProfile(row);

      setNickname(String(row.nickname ?? ''));
      setName(String(row.name ?? ''));
      setIndustry(String(row.industry ?? ''));
      setGrade(String(row.grade ?? ''));
      setCareer(String(row.career ?? ''));
      setCompany(String(row.company ?? ''));
      setDepartment(String(row.department ?? ''));
      setTeam(String(row.team ?? ''));
      setMainGoal(String(row.main_goal ?? ''));

      setAvatarUrl(row.avatar_url ?? null);

      // ✅ 배지 누적 로드(월간 배지 히스토리)
      try {
        const { data: mb, error: mbErr } = await supabase
          .from('monthly_badges')
          .select('badge_code, badge_name, winner_user_id, month_start, month_end')
          .eq('winner_user_id', uid)
          .order('month_start', { ascending: false });

        if (!alive) return;
        if (mbErr) {
          setBadgeRows([]);
        } else {
          setBadgeRows(((mb || []) as MonthlyBadgeRow[]) || []);
        }
      } catch {
        if (!alive) return;
        setBadgeRows([]);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErr(null);

    const payload: any = {
      user_id: userId,
      nickname: nickname.trim() || null,
      name: name.trim() || null,
      industry: industry.trim() || null,
      grade: grade.trim() || null,
      career: career.trim() || null,
      company: company.trim() || null,
      department: department.trim() || null,
      team: team.trim() || null,
      main_goal: mainGoal.trim() || null, // ✅ 최종목표 저장
      avatar_url: avatarUrl || null,
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

    if (error) {
      setErr(`저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setProfile((prev) => (prev ? ({ ...prev, ...payload } as any) : (payload as any)));
    setSaving(false);
    setErr('저장 완료 ✨');
  }

  async function onPickAvatar(file: File) {
    if (!userId) return;

    setAvatarUploading(true);
    setErr(null);

    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png';
      const path = `avatars/${userId}/${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png',
      });

      if (upErr) {
        setErr(`이미지 업로드 실패: ${upErr.message}`);
        setAvatarUploading(false);
        return;
      }

      // ✅ DB에는 “경로(avatars/...)” 저장, 화면은 getAvatarSrc로 Public URL 변환
      setAvatarUrl(path);

      // 저장까지 바로 반영
      const { error: pErr } = await supabase.from('profiles').upsert(
        {
          user_id: userId,
          avatar_url: path,
        },
        { onConflict: 'user_id' }
      );

      if (pErr) {
        setErr(`프로필 반영 실패: ${pErr.message}`);
        setAvatarUploading(false);
        return;
      }

      setErr('프로필 이미지 변경 완료 ✨');
    } catch (e: any) {
      setErr(`이미지 처리 실패: ${String(e?.message || e)}`);
    } finally {
      setAvatarUploading(false);
    }
  }

  const S: any = {
    page: { maxWidth: 980, margin: '0 auto', padding: '18px 14px 90px' },
    top: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: 950, letterSpacing: -0.6, color: '#2a0f3a' },

    card: {
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(60,30,90,0.12)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    headerCard: {
      borderRadius: 26,
      border: '2px solid rgba(255,80,170,0.28)',
      background:
        'radial-gradient(900px 420px at 18% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,219,239,0.85), rgba(226,214,255,0.85))',
      boxShadow: '0 18px 46px rgba(255,80,170,0.12), 0 22px 48px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    pad: { padding: 14 },

    sectionTitle: { fontSize: 16, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.3 },
    sectionSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },

    row: { display: 'flex', gap: 14, alignItems: 'center' },

    // ✅ 입력란 가로 너무 긴 문제 해결: 중앙 정렬 + maxWidth + 2열 그리드
    formWrap: { marginTop: 12, maxWidth: 740, marginLeft: 'auto', marginRight: 'auto' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    gridFull: { gridColumn: '1 / -1' },

    label: { fontSize: 12, fontWeight: 950, color: '#2a0f3a', opacity: 0.82, marginBottom: 6 },
    input: {
      width: '100%',
      padding: '11px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    saveBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.25)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.18)',
      whiteSpace: 'nowrap' as const,
    },
    ghostBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.10)',
      whiteSpace: 'nowrap' as const,
    },

    avatarWrap: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      padding: 14,
    },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 22,
      objectFit: 'cover' as const,
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(255,90,200,0.22)',
      boxShadow: '0 14px 22px rgba(180,76,255,0.14)',
      flex: '0 0 auto',
    },
    pill: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      boxShadow: '0 10px 20px rgba(255,120,190,0.12)',
      whiteSpace: 'nowrap',
    },
    warn: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      background: 'rgba(255,235,245,0.9)',
      border: '1px solid rgba(255,80,160,0.18)',
      color: '#6a1140',
      fontWeight: 950,
      fontSize: 13,
    },

    badgeGrid: { marginTop: 10, display: 'grid', gap: 10 },
    badgeCard: {
      padding: '12px 12px',
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.85)',
      color: '#2a0f3a',
      boxShadow: '0 10px 20px rgba(40,10,70,0.06)',
    },
    badgeTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    badgeName: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 950 },
    badgeSub: { marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.78, lineHeight: 1.35 },
    badgeMonths: { marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    mini: { fontSize: 12, fontWeight: 950, opacity: 0.75 },
  };

  if (loading) {
    return (
      <ClientShell>
        <div style={S.page}>
          <div style={S.top}>
            <div style={S.title}>프로필 설정</div>
          </div>
          <div style={{ ...S.card, padding: 14, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div>
        </div>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <div style={S.page}>
        <div style={S.top}>
          <div style={S.title}>프로필 설정</div>
          <button type="button" style={S.ghostBtn} onClick={() => router.back()}>
            뒤로
          </button>
        </div>

        {/* 상단 카드 */}
        <div style={S.headerCard}>
          <div style={S.avatarWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt="avatar"
              style={S.avatar}
              onError={(e: any) => {
                e.currentTarget.src = '/upzzu1.png';
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: '#2a0f3a' }}>
                {nickname?.trim() ? nickname.trim() : '닉네임을 설정해 주세요'}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={S.pill}>🏷️ 누적 배지 {badgeAgg.totalEarned}</span>
                <span style={S.pill}>✨ 배지 종류 {badgeAgg.uniqueBadges}</span>
                <span style={{ ...S.pill, opacity: 0.9 }}>🎯 최종목표 {mainGoal?.trim() ? '설정됨' : '미설정'}</span>
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    if (f) onPickAvatar(f);
                    e.currentTarget.value = '';
                  }}
                />
                <button type="button" style={S.saveBtn} onClick={() => fileRef.current?.click()} disabled={avatarUploading}>
                  {avatarUploading ? '업로드 중…' : '프로필 이미지 변경'}
                </button>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, color: '#2a0f3a', alignSelf: 'center' }}>
                  기본 이미지: <b>public/upzzu1.png</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 입력 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>기본 정보</div>
            <div style={S.sectionSub}>입력란 폭을 줄이고, 여유 간격을 넉넉히 잡았어요.</div>

            <form onSubmit={onSaveProfile} style={S.formWrap}>
              <div style={S.grid}>
                <div>
                  <div style={S.label}>닉네임</div>
                  <input style={S.input} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 세일즈킹업쮸" />
                </div>
                <div>
                  <div style={S.label}>이름(실명)</div>
                  <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김OO" />
                </div>

                <div>
                  <div style={S.label}>업종</div>
                  <input style={S.input} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="예: 보험 / 화장품 / 금융" />
                </div>
                <div>
                  <div style={S.label}>등급</div>
                  <input style={S.input} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: A / B / VIP" />
                </div>

                <div>
                  <div style={S.label}>경력</div>
                  <input style={S.input} value={career} onChange={(e) => setCareer(e.target.value)} placeholder="예: 3년차" />
                </div>
                <div>
                  <div style={S.label}>회사</div>
                  <input style={S.input} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="예: UPLOG" />
                </div>

                <div>
                  <div style={S.label}>부서</div>
                  <input style={S.input} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="예: 영업본부" />
                </div>
                <div>
                  <div style={S.label}>팀</div>
                  <input style={S.input} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="예: 1팀" />
                </div>

                <div style={S.gridFull}>
                  <div style={S.label}>✅ 최종 목표(메인에 노출되는 목표)</div>
                  <input style={S.input} value={mainGoal} onChange={(e) => setMainGoal(e.target.value)} placeholder="예: 월 계약 30건 / 월 매출 1,000만" />
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="submit" style={S.saveBtn} disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>

              {err ? <div style={S.warn}>{err}</div> : null}
            </form>
          </div>
        </div>

        {/* 배지 설명 + 누적 배지 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>배지 목록(누적) + 설명</div>
            <div style={S.sectionSub}>활동량에 따라 부여된 배지를 “누적 횟수 + 받은 월”까지 표시합니다.</div>

            {badgeAgg.list.length === 0 ? (
              <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>아직 수상 배지가 없어요. 이번 달 기록부터 쌓아봐요 ✨</div>
            ) : (
              <div style={S.badgeGrid}>
                {badgeAgg.list.map((b) => (
                  <div key={`${b.code}|${b.name}`} style={S.badgeCard}>
                    <div style={S.badgeTop}>
                      <div style={S.badgeName}>
                        <span style={{ fontSize: 18 }}>{badgeIcon(b.code)}</span>
                        <span>{b.name || b.code}</span>
                      </div>
                      <span style={S.pill}>누적 {b.count}회</span>
                    </div>

                    <div style={S.badgeSub}>설명: {badgeDesc(b.code, b.name)}</div>

                    <div style={S.badgeMonths}>
                      <span style={S.mini}>받은 월:</span>
                      {b.months.length === 0 ? (
                        <span style={{ ...S.mini, opacity: 0.7 }}>월 정보 없음</span>
                      ) : (
                        b.months.slice(0, 12).map((m) => (
                          <span key={`${b.code}-${m}`} style={{ ...S.pill, padding: '6px 10px', fontSize: 12, boxShadow: '0 8px 14px rgba(255,120,190,0.10)' }}>
                            {m}
                          </span>
                        ))
                      )}
                      {b.months.length > 12 ? <span style={{ ...S.mini, opacity: 0.7 }}>+{b.months.length - 12}개월</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* (선택) 원본 월간 배지 히스토리: 디버깅용으로 깔끔히 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>월간 배지 수상 히스토리</div>
            <div style={S.sectionSub}>월별로 어떤 배지를 받았는지 한 줄로 확인합니다.</div>

            {badgeRows.length === 0 ? (
              <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>표시할 히스토리가 없어요.</div>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {badgeRows.slice(0, 30).map((r, idx) => {
                  const code = String(r.badge_code || '');
                  const name = String(r.badge_name || r.badge_code || '');
                  const month = yyyymmFromDateStr(r.month_start) || 'YYYY-MM';
                  return (
                    <div key={`${code}-${month}-${idx}`} style={{ ...S.badgeCard, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 950 }}>
                          <span style={{ fontSize: 16 }}>{badgeIcon(code)}</span>
                          <span style={{ opacity: 0.9 }}>{month}</span>
                          <span>{name}</span>
                        </div>
                        <span style={{ ...S.mini, opacity: 0.72 }}>{code}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        @media (max-width: 820px) {
          /* 모바일에서 1열로 */
          :global(.profile-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </ClientShell>
  );
}
