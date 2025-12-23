// ✅ 파일: src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type Me = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  role: string | null;
  avatar_url: string | null;
  career: string | null;
  company: string | null;
  team: string | null;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  category: string | null;
  created_at: string | null;
};

type UpLogRow = {
  id: string;
  user_id: string;
  log_date: string | null;
  created_at: string | null;
};

type MonthlyBadgeRow = {
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  month_start: string | null;
  month_end: string | null;
};

const EMO_QUOTES: string[] = [
  '대표님, 오늘은 “빈 날을 줄이는 것” 하나만 해도 이깁니다.',
  '관리의 차이가 성장률의 차이입니다.',
  '기록은 배신하지 않습니다. 오늘 1줄이면 충분해요.',
  '거절은 숫자일 뿐, 대표님의 실력은 계속 쌓이고 있어요.',
  '오늘 1건의 행동이 내일의 10건을 부릅니다.',
];

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtKoreanDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function pickName(me?: Me | null) {
  if (!me) return '대표님';
  return me.nickname || me.name || '대표님';
}

// ✅ avatar_url: http(s)이면 그대로, 아니면 storage publicUrl 변환, 실패하면 로고로 fallback
function getAvatarSrc(me?: Me | null) {
  const a = (me?.avatar_url || '').trim();
  if (a.startsWith('http://') || a.startsWith('https://')) return a;

  if (a) {
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(a);
      if (data?.publicUrl) return data.publicUrl;
    } catch {}
  }
  return '/assets/images/logo2.png';
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfCalendarGrid(d: Date) {
  const first = startOfMonth(d);
  const dow = first.getDay();
  const s = new Date(first);
  s.setDate(first.getDate() - dow);
  return s;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameYMD(a: Date, b: Date) {
  return fmtYMD(a) === fmtYMD(b);
}
function dotColor(cat?: string | null) {
  const c = (cat || '').toLowerCase();
  if (c.includes('회의')) return '#6d28d9';
  if (c.includes('개인')) return '#0ea5e9';
  if (c.includes('상담')) return '#f97316';
  if (c.includes('방문')) return '#22c55e';
  return '#ec4899';
}

async function loadSchedulesAuto(uid: string, monthCursor: Date) {
  const candidates = ['date', 'day', 'schedule_date', 'ymd'] as const;

  const ms = fmtYMD(startOfMonth(monthCursor));
  const me = fmtYMD(endOfMonth(monthCursor));

  for (const col of candidates) {
    const { data, error } = await supabase
      .from('schedules')
      .select(`id, user_id, ${col}, title, category, created_at`)
      .eq('user_id', uid)
      .gte(col as any, ms as any)
      .lte(col as any, me as any)
      .order(col as any, { ascending: true });

    if (!error) {
      const rows = (data || []) as any[];
      const mapped: ScheduleRow[] = rows
        .map((r) => ({
          id: String(r.id),
          user_id: String(r.user_id),
          date: String(r[col] || '').slice(0, 10),
          title: String(r.title || ''),
          category: r.category ?? null,
          created_at: r.created_at ?? null,
        }))
        .filter((r) => r.date && r.title);

      return { rows: mapped, usedCol: col, error: null as any };
    }
  }

  return { rows: [] as ScheduleRow[], usedCol: null as any, error: 'schedules 테이블 날짜 컬럼을 찾지 못했습니다.' };
}

export default function HomePage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleCat, setScheduleCat] = useState<'업무' | '회의' | '개인' | '상담' | '방문'>('업무');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scheduleErr, setScheduleErr] = useState<string | null>(null);

  const [monthCounts, setMonthCounts] = useState<{ date: string; count: number }[]>([]);
  const [upErr, setUpErr] = useState<string | null>(null);

  const [myBadges, setMyBadges] = useState<{ code: string; name: string }[]>([]);
  const [badgeErr, setBadgeErr] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => fmtKoreanDate(new Date()), []);
  const selectedYMD = useMemo(() => fmtYMD(selectedDate), [selectedDate]);

  // ✅ 오늘 날짜 기반 “고정 코치 문구”(새로고침해도 같은 날엔 같은 문구)
  const coachLine = useMemo(() => {
    const d = new Date();
    const key = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
    return EMO_QUOTES[key % EMO_QUOTES.length];
  }, []);

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(monthCursor);
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [monthCursor]);

  const monthLabel = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth() + 1;
    return `${y}년 ${m}월`;
  }, [monthCursor]);

  const scheduleCountToday = useMemo(() => {
    const ymd = fmtYMD(new Date());
    return schedules.filter((s) => s.date === ymd).length;
  }, [schedules]);

  const schedulesOfSelected = useMemo(() => schedules.filter((s) => s.date === selectedYMD), [schedules, selectedYMD]);

  const dotsByDay = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const s of schedules) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [schedules]);

  const maxMonth = useMemo(() => Math.max(1, ...monthCounts.map((x) => x.count)), [monthCounts]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setScheduleErr(null);
      setUpErr(null);
      setBadgeErr(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      if (userErr || !userData?.user) {
        router.replace('/login');
        return;
      }

      const uid = userData.user.id;

      const { data: p } = await supabase
        .from('profiles')
        .select('user_id, nickname, name, role, avatar_url, career, company, team')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      setMe({
        user_id: uid,
        nickname: (p as any)?.nickname ?? null,
        name: (p as any)?.name ?? null,
        role: (p as any)?.role ?? null,
        avatar_url: (p as any)?.avatar_url ?? null,
        career: (p as any)?.career ?? null,
        company: (p as any)?.company ?? null,
        team: (p as any)?.team ?? null,
      });

      const schRes = await loadSchedulesAuto(uid, monthCursor);
      if (!alive) return;

      if (schRes.error) {
        setSchedules([]);
        setScheduleErr(`달력 스케줄 로드 실패: ${schRes.error}`);
      } else {
        setSchedules(schRes.rows);
        setScheduleErr(null);
      }

      const ms = fmtYMD(startOfMonth(monthCursor));
      const me2 = fmtYMD(endOfMonth(monthCursor));

      const { data: ups, error: upE } = await supabase
        .from('up_logs')
        .select('id, user_id, log_date, created_at')
        .eq('user_id', uid)
        .gte('log_date', ms)
        .lte('log_date', me2);

      if (!alive) return;

      const daysInMonth = endOfMonth(monthCursor).getDate();
      const dayKeys = Array.from({ length: daysInMonth }).map((_, i) => {
        const d = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i + 1);
        return fmtYMD(d);
      });

      if (upE) {
        setMonthCounts(dayKeys.map((d) => ({ date: d, count: 0 })));
        setUpErr(`월간 성장 그래프 로드 실패: ${upE.message}`);
      } else {
        const rows = (ups || []) as UpLogRow[];
        const map: Record<string, number> = {};
        for (const k of dayKeys) map[k] = 0;

        for (const r of rows) {
          const d0 = r.log_date ? String(r.log_date).slice(0, 10) : r.created_at ? String(r.created_at).slice(0, 10) : '';
          if (d0 && map[d0] !== undefined) map[d0] += 1;
        }

        setMonthCounts(dayKeys.map((k) => ({ date: k, count: map[k] ?? 0 })));
        setUpErr(null);
      }

      const { data: mb, error: mbErr } = await supabase
        .from('monthly_badges')
        .select('badge_code, badge_name, winner_user_id, month_start, month_end')
        .eq('winner_user_id', uid);

      if (!alive) return;

      if (mbErr) {
        setMyBadges([]);
        setBadgeErr(`배지 로드 실패: ${mbErr.message}`);
      } else {
        const list = ((mb || []) as MonthlyBadgeRow[])
          .map((r) => ({
            code: String(r.badge_code || ''),
            name: String(r.badge_name || r.badge_code || ''),
          }))
          .filter((x) => x.code || x.name);

        const seen = new Set<string>();
        const uniq = list.filter((x) => {
          const k = `${x.code}|${x.name}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        setMyBadges(uniq);
        setBadgeErr(null);
      }

      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router, monthCursor]);

  async function addSchedule() {
    if (!me?.user_id) return;
    const title = scheduleTitle.trim();
    if (!title) return;

    setScheduleErr(null);

    const payload: any = {
      user_id: me.user_id,
      date: selectedYMD,
      title,
      category: scheduleCat,
    };

    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('id, user_id, date, title, category, created_at')
      .maybeSingle();

    if (error) {
      setScheduleErr(`스케줄 저장 실패: ${error.message}  (권장: schedules 테이블에 date/title/category 컬럼 추가)`);
      return;
    }

    setSchedules((prev) => [...prev, data as any].sort((a, b) => (a.date > b.date ? 1 : -1)));
    setScheduleTitle('');
  }

  const S: any = {
    page: { maxWidth: 1040, margin: '0 auto', padding: '18px 14px 120px' },
    top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
    date: { fontSize: 14, fontWeight: 900, opacity: 0.8, color: '#3b2350' },
    titleWrap: { display: 'flex', flexDirection: 'column', gap: 2 },
    name: { fontSize: 24, fontWeight: 950, letterSpacing: -0.5, color: '#2a0f3a' },
    sub: { fontSize: 13, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' },
    topBtns: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 14px',
      borderRadius: 999,
      fontWeight: 950,
      fontSize: 14,
      textDecoration: 'none',
      border: '1px solid rgba(55,20,80,0.14)',
      background: 'rgba(255,255,255,0.9)',
      color: '#2a0f3a',
      boxShadow: '0 10px 22px rgba(35,10,60,0.08)',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    },
    danger: {
      background: 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      borderColor: 'rgba(255,60,120,0.35)',
      color: '#fff',
    },
    card: {
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(60,30,90,0.12)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    profile: { padding: 14 },
    row: { display: 'flex', gap: 12, alignItems: 'flex-start' },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 18,
      objectFit: 'cover',
      flex: '0 0 72px',
      boxShadow: '0 10px 18px rgba(180,76,255,0.25)',
      border: '1px solid rgba(160,80,255,0.25)',
      background: '#fff',
    },
    pName: { fontSize: 20, fontWeight: 950, letterSpacing: -0.4, color: '#2a0f3a' },
    meta: { marginTop: 4, fontSize: 13, fontWeight: 900, color: '#2a0f3a', opacity: 0.78 },
    tags: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 },
    tag: {
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid rgba(90,30,120,0.14)',
      background: 'rgba(246,240,255,0.7)',
      color: '#3a1850',
      fontWeight: 950,
      fontSize: 12,
    },
    pills: { marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 },
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
      cursor: 'pointer',
      textDecoration: 'none',
    },
    sectionTitle: { fontSize: 16, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.3 },
    sectionSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' },
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

    // ✅ 말풍선 + 마스코트 영역 스타일(검색 키워드용 className도 같이 붙여서 아래 JSX에 둡니다)
    coachWrap: { marginTop: 12 },
    coachRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
    bubble: {
      flex: 1,
      padding: '12px 14px',
      borderRadius: 18,
      border: '1px solid rgba(255,90,200,0.20)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.90))',
      color: '#2a0f3a',
      fontWeight: 950,
      boxShadow: '0 14px 30px rgba(255,120,190,0.14)',
      lineHeight: 1.35,
      position: 'relative',
    },
    bubbleTail: {
      position: 'absolute',
      right: 16,
      bottom: -7,
      width: 14,
      height: 14,
      transform: 'rotate(45deg)',
      background: 'rgba(246,240,255,0.90)',
      borderRight: '1px solid rgba(255,90,200,0.20)',
      borderBottom: '1px solid rgba(255,90,200,0.20)',
    },
    bubbleSub: { marginTop: 6, fontSize: 12, opacity: 0.78, fontWeight: 900 },

    mascot: {
      width: 96,
      height: 96,
      borderRadius: 26,
      objectFit: 'contain',
      background: 'transparent',
      filter: 'drop-shadow(0 14px 22px rgba(180,76,255,0.26))',
      flex: '0 0 auto',
      animation: 'floaty 3.8s ease-in-out infinite',
    },

    chartWrap: { padding: 14 },
    bars: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 },
    barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
    bar: {
      width: '100%',
      height: 54,
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.85)',
      display: 'flex',
      alignItems: 'flex-end',
      overflow: 'hidden',
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
    },
    fill: { width: '100%', borderRadius: 14, background: 'linear-gradient(180deg, rgba(109,40,217,0.95), rgba(236,72,153,0.92))' },
    barLabel: { fontSize: 11, fontWeight: 950, opacity: 0.78, color: '#2a0f3a' },
    barNum: { fontSize: 11, fontWeight: 950, opacity: 0.85, color: '#2a0f3a' },

    calTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 14 },
    calBtn: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(90,30,120,0.14)',
      background: 'rgba(246,240,255,0.7)',
      color: '#3a1850',
      fontWeight: 950,
      fontSize: 13,
      cursor: 'pointer',
    },
    calGridWrap: { padding: '0 14px 14px' },
    weekHead: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 },
    weekHeadCell: { fontSize: 12, fontWeight: 950, opacity: 0.75, color: '#2a0f3a', textAlign: 'center' },
    daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 },
    dayCell: {
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.85)',
      padding: '10px 8px',
      minHeight: 58,
      cursor: 'pointer',
      boxShadow: '0 10px 20px rgba(40,10,70,0.06)',
      userSelect: 'none',
    },
    dayCellSelected: {
      borderColor: 'rgba(255,80,170,0.55)',
      boxShadow: '0 16px 28px rgba(255,80,170,0.18)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
    },
    dayCellToday: { borderColor: 'rgba(109,40,217,0.35)' },
    dayNum: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    dotRow: { marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' },
    dot: { width: 6, height: 6, borderRadius: 999 },

    sel: { padding: 14, borderTop: '1px solid rgba(60,30,90,0.08)' },
    inputRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 },
    input: {
      flex: '1 1 220px',
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
    },
    select: {
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 950,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
    },
    saveBtn: {
      padding: '10px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.25)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.18)',
    },
    item: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.85)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 13,
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
    },
    cat: { opacity: 0.7, fontWeight: 950 },

    bottomCTA: { position: 'fixed', left: 0, right: 0, bottom: 16, padding: '0 14px', zIndex: 30, pointerEvents: 'none' },
    ctaInner: { maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 10, pointerEvents: 'auto' },
    ctaBtn: {
      flex: 1,
      padding: '14px 14px',
      borderRadius: 18,
      border: '1px solid rgba(255,60,130,0.22)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.98), rgba(255,78,147,0.96))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 15,
      cursor: 'pointer',
      boxShadow: '0 18px 34px rgba(255,60,130,0.22)',
      textDecoration: 'none',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    ctaGhost: {
      flex: '0 0 auto',
      padding: '14px 14px',
      borderRadius: 18,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 15,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.10)',
      textDecoration: 'none',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
  };

  const monthLast28 = useMemo(() => monthCounts.slice(-28), [monthCounts]);

  return (
    <ClientShell>
      <div style={S.page}>
        <div style={S.top}>
          <div style={S.titleWrap}>
            <div style={S.date}>{todayLabel}</div>
            <div style={S.name}>{pickName(me)} 님</div>
            <div style={S.sub}>오늘도 나를 UP시키는 기록, UPLOG</div>
          </div>

          <div style={S.topBtns}>
            <Link href="/my-up" style={S.btn}>나의 U P</Link>
            <button type="button" style={S.btn} onClick={() => router.push('/customers')}>고객관리</button>
            <Link href="/community" style={S.btn}>커뮤니티</Link>
            <Link href="/sms-helper" style={S.btn}>문자도우미</Link>
            <button type="button" style={{ ...S.btn, ...S.danger }} onClick={() => router.push('/logout')}>로그아웃</button>
          </div>
        </div>

        <div style={{ ...S.card, ...S.profile }}>
          <div style={S.row}>
            <img
              src={getAvatarSrc(me)}
              onError={(e: any) => { e.currentTarget.src = '/assets/images/logo2.png'; }}
              alt="avatar"
              style={S.avatar}
            />

            <div style={{ flex: 1 }}>
              <div style={S.pName}>{pickName(me)}</div>

              <div style={S.meta}>
                {(me?.career || me?.company || me?.team)
                  ? [me?.career, me?.company, me?.team].filter(Boolean).join(' · ')
                  : '프로필에서 경력/회사/팀을 설정하면 여기에 표시됩니다.'}
              </div>

              <div style={S.tags}>
                <span style={S.tag}>오늘 일정 {scheduleCountToday}건</span>
                <span style={S.tag}>이번달 배지 {myBadges.length}개</span>
                {me?.role === 'admin' ? <span style={{ ...S.tag, background: 'rgba(255,235,245,0.95)' }}>관리자</span> : null}
              </div>

              <div style={S.pills}>
                <button type="button" style={S.pill} onClick={() => router.push('/calendar')}>일정 추가</button>
                <button type="button" style={S.pill} onClick={() => router.push('/my-up')}>목표관리 전체보기</button>
                <button type="button" style={S.pill} onClick={() => router.push('/chats')}>U P 채팅방 열기</button>
                {me?.role === 'admin' ? <Link href="/admin" style={S.pill}>관리자</Link> : null}
              </div>

              {/* ✅✅✅ 말풍선 + 마스코트 (대표님이 찾던 블록) */}
              <div className="home-header-bottom" style={S.coachWrap}>
                <div style={S.coachRow}>
                  <div style={S.bubble}>
                    {coachLine}
                    <div style={S.bubbleTail} />
                    <div style={S.bubbleSub}>
                      (날씨/목표/체크리스트는 DB 스키마 확정 후 한 번에 붙입니다)
                    </div>
                  </div>

                  {/* ✅ mp4 안씀: png만 / 경로는 images로 */}
                  <img
                    src="/assets/images/upzzu1.png"
                    onError={(e: any) => { e.currentTarget.src = '/assets/images/logo2.png'; }}
                    alt="upzzu"
                    style={S.mascot}
                  />
                </div>
              </div>

              {scheduleErr ? <div style={S.warn}>{scheduleErr}</div> : null}
              {upErr ? <div style={S.warn}>{upErr}</div> : null}
              {badgeErr ? <div style={S.warn}>{badgeErr}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.chartWrap}>
            <div style={S.sectionTitle}>이번달 배지 목록</div>
            <div style={S.sectionSub}>받은 배지는 대표님 자산입니다.</div>

            {myBadges.length === 0 ? (
              <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>
                아직 수상 배지가 없어요. 이번달 첫 기록부터 쌓아봐요.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myBadges.map((b) => (
                  <span key={`${b.code}-${b.name}`} style={S.tag}>
                    {b.name || b.code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.chartWrap}>
            <div style={S.sectionTitle}>이번달 성장 그래프</div>
            <div style={S.sectionSub}>중요한 건 빈 날을 줄여가는 것입니다.</div>

            <div style={S.bars}>
              {monthLast28.map((w) => {
                const d = safeDate(w.date) || new Date(w.date);
                const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                const h = Math.max(6, Math.round((54 * w.count) / maxMonth));

                return (
                  <div key={w.date} style={S.barCol}>
                    <div style={S.bar}>
                      <div style={{ ...S.fill, height: h }} />
                    </div>
                    <div style={S.barNum}>{w.count}</div>
                    <div style={S.barLabel}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.calTop}>
            <button
              type="button"
              style={S.calBtn}
              onClick={() => {
                const d = new Date(monthCursor);
                d.setMonth(d.getMonth() - 1);
                setMonthCursor(d);
              }}
            >
              ◀
            </button>

            <div style={{ fontSize: 16, fontWeight: 950, color: '#2a0f3a' }}>{monthLabel}</div>

            <button
              type="button"
              style={S.calBtn}
              onClick={() => {
                const d = new Date(monthCursor);
                d.setMonth(d.getMonth() + 1);
                setMonthCursor(d);
              }}
            >
              ▶
            </button>
          </div>

          <div style={S.calGridWrap}>
            <div style={S.weekHead}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} style={S.weekHeadCell}>{w}</div>
              ))}
            </div>

            <div style={S.daysGrid}>
              {gridDays.map((d) => {
                const ymd = fmtYMD(d);
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const selected = sameYMD(d, selectedDate);
                const isToday = sameYMD(d, today);

                const daySchedules = dotsByDay[ymd] || [];
                const topDots = daySchedules.slice(0, 5);

                const style = {
                  ...S.dayCell,
                  ...(selected ? S.dayCellSelected : null),
                  ...(isToday ? S.dayCellToday : null),
                  opacity: inMonth ? 1 : 0.35,
                } as any;

                return (
                  <div key={ymd} style={style} onClick={() => setSelectedDate(d)} title={ymd}>
                    <div style={S.dayNum}>{d.getDate()}</div>
                    <div style={S.dotRow}>
                      {topDots.map((s, i) => (
                        <span key={`${s.id}_${i}`} style={{ ...S.dot, background: dotColor(s.category) }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={S.sel}>
            <div style={S.sectionTitle}>선택한 날짜: {fmtKoreanDate(selectedDate)}</div>
            <div style={S.sectionSub}>가벼운 한 줄만 적어도, 기록은 쌓입니다.</div>

            <div style={S.inputRow}>
              <input
                style={S.input}
                value={scheduleTitle}
                placeholder="스케줄(예: 해피콜 3명, 미팅, 교육...)"
                onChange={(e) => setScheduleTitle(e.target.value)}
              />

              <select style={S.select} value={scheduleCat} onChange={(e) => setScheduleCat(e.target.value as any)}>
                <option value="업무">업무</option>
                <option value="회의">회의</option>
                <option value="개인">개인</option>
                <option value="상담">상담</option>
                <option value="방문">방문</option>
              </select>

              <button type="button" style={S.saveBtn} onClick={addSchedule}>저장</button>
            </div>

            {schedulesOfSelected.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>
                이 날짜엔 아직 스케줄이 없어요.
              </div>
            ) : (
              <div>
                {schedulesOfSelected.map((s) => (
                  <div key={s.id} style={S.item}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{s.title}</div>
                      <div style={S.cat}>{s.category || '업무'}</div>
                    </div>
                    <div style={{ fontWeight: 950, opacity: 0.7 }}>{s.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={S.bottomCTA}>
          <div style={S.ctaInner}>
            <Link href="/my-up" style={S.ctaBtn}>오늘의 U P 기록하러 가기</Link>
            <button type="button" style={S.ctaGhost} onClick={() => router.push('/chats')}>채팅</button>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 14, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div>
        ) : null}

        <style jsx>{`
          @keyframes floaty {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
