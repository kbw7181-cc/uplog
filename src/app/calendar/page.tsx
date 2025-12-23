'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type Me = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string | null;
  created_at: string | null;
};

function pickName(me?: Me | null) {
  return (me?.nickname || me?.name || '').trim() || '대표님';
}

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtYM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfGrid(d: Date) {
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

type CatKey = '업무' | '회의' | '개인' | '상담' | '방문' | '기타';

function normalizeCat(v?: string | null): CatKey {
  const t = (v || '').trim();
  if (!t) return '업무';
  if (t.includes('업무')) return '업무';
  if (t.includes('회의')) return '회의';
  if (t.includes('개인')) return '개인';
  if (t.includes('상담')) return '상담';
  if (t.includes('방문')) return '방문';
  return '기타';
}

function catColor(c: CatKey) {
  // 대표님 요구: 카테고리별 색상 구분이 “한 눈에”
  switch (c) {
    case '업무': return '#ec4899'; // 핑크
    case '회의': return '#6d28d9'; // 퍼플
    case '개인': return '#0ea5e9'; // 블루
    case '상담': return '#f97316'; // 오렌지
    case '방문': return '#22c55e'; // 그린
    case '기타': return '#64748b'; // 그레이
  }
}

function catBadgeBg(c: CatKey) {
  const col = catColor(c);
  return `linear-gradient(180deg, ${col}20, ${col}12)`;
}

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

/** ✅ goals/todo: DB 스키마 없어도 “무조건 동작”해야 해서 localStorage로 고정 */
type GoalState = {
  today: string[];       // 오늘 할 일
  weekly: string;        // 주간 목표
  monthly: string;       // 월간 목표
  myGoal: string;        // 나의 목표(대표님)
  done: Record<string, boolean>; // 오늘 할 일 체크
};

function defaultGoalState(): GoalState {
  return { today: [''], weekly: '', monthly: '', myGoal: '', done: {} };
}

export default function CalendarPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<CatKey>('업무');

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ✅ 목표/할일/포인트
  const [goals, setGoals] = useState<GoalState>(defaultGoalState());

  // ✅ 친구목록/채팅 카드(자리 + 추후 대표님 기존코드 붙이면 바로 연결)
  const [friends, setFriends] = useState<{ user_id: string; name: string; online: boolean }[]>([]);
  const [unread, setUnread] = useState(0);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const monthLabel = useMemo(() => `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`, [cursor]);

  const gridDays = useMemo(() => {
    const start = startOfGrid(cursor);
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [cursor]);

  const selectedYMD = useMemo(() => fmtYMD(selected), [selected]);
  const monthKey = useMemo(() => fmtYM(cursor), [cursor]);

  // ✅ 날짜별 스케줄 그룹
  const byDay = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const r of rows) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    // 정렬: 같은 날은 created_at 기준
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    });
    return map;
  }, [rows]);

  // ✅ 월간 그래프(“건당” 확실하게): 날짜별 총 건수 + 카테고리별 분해
  const monthStats = useMemo(() => {
    const days = monthEnd.getDate();
    const out = Array.from({ length: days }).map((_, i) => {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
      const ymd = fmtYMD(d);
      const list = byDay[ymd] || [];
      const bucket: Record<CatKey, number> = { 업무: 0, 회의: 0, 개인: 0, 상담: 0, 방문: 0, 기타: 0 };
      for (const s of list) bucket[normalizeCat(s.category)] += 1;
      const total = list.length;
      return { ymd, total, bucket };
    });
    const max = Math.max(1, ...out.map((x) => x.total));
    return { out, max };
  }, [byDay, cursor, monthEnd]);

  // ✅ 목표/할일 포인트(간단 규칙): 오늘 할 일 체크 1개당 10p
  const points = useMemo(() => {
    const items = (goals.today || []).map((x) => x.trim()).filter(Boolean);
    const doneCount = items.filter((_, i) => goals.done[`t${i}`]).length;
    return doneCount * 10;
  }, [goals]);

  // 1) 로그인/프로필 + 스케줄 로드
  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) {
        router.replace('/login');
        return;
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('user_id,nickname,name,avatar_url,role')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      setMe({
        user_id: uid,
        nickname: (p as any)?.nickname ?? null,
        name: (p as any)?.name ?? null,
        avatar_url: (p as any)?.avatar_url ?? null,
        role: (p as any)?.role ?? null,
      });

      // ✅ goals localStorage 로드 (월 단위)
      try {
        const key = `uplog_goals:${uid}:${monthKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          setGoals({
            today: Array.isArray(parsed?.today) ? parsed.today : [''],
            weekly: String(parsed?.weekly || ''),
            monthly: String(parsed?.monthly || ''),
            myGoal: String(parsed?.myGoal || ''),
            done: parsed?.done && typeof parsed.done === 'object' ? parsed.done : {},
          });
        } else {
          setGoals(defaultGoalState());
        }
      } catch {
        setGoals(defaultGoalState());
      }

      // ✅ schedules 로드 (date 컬럼 기준)
      const ms = fmtYMD(monthStart);
      const me2 = fmtYMD(monthEnd);

      const { data: sch, error } = await supabase
        .from('schedules')
        .select('id,user_id,date,title,category,created_at')
        .eq('user_id', uid)
        .gte('date', ms)
        .lte('date', me2)
        .order('date', { ascending: true });

      if (!alive) return;

      if (error) {
        setRows([]);
        setErr(`달력 로드 실패: ${error.message}  (schedules: date/title/category 확인)`);
      } else {
        setRows((sch || []) as any);
        setErr(null);
      }

      // ✅ 친구/채팅 카드: “틀”은 유지하고, 기존 코드 주면 그대로 이식
      // 지금은 최소 동작: 채팅 방 unread 추정(localStorage readAt 비교)
      try {
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('id,user1_id,user2_id,created_at')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .order('created_at', { ascending: false });

        const roomIds = (rooms || []).map((r: any) => r.id);
        if (roomIds.length) {
          const { data: latest } = await supabase
            .from('chat_messages')
            .select('room_id,created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false });

          const latestByRoom: Record<string, number> = {};
          for (const m of (latest || []) as any[]) {
            const rid = String(m.room_id);
            if (latestByRoom[rid] !== undefined) continue;
            const t = new Date(String(m.created_at)).getTime();
            if (!Number.isNaN(t)) latestByRoom[rid] = t;
          }

          const getReadAt = (roomId: string) => {
            const keys = [
              `uplog_readAt:${roomId}`,
              `uplog_readAt_${roomId}`,
              `readAt:${roomId}`,
              `readAt_${roomId}`,
            ];
            for (const k of keys) {
              const v = localStorage.getItem(k);
              if (v) {
                const t = new Date(v).getTime();
                if (!Number.isNaN(t)) return t;
              }
            }
            return 0;
          };

          let cnt = 0;
          for (const rid of roomIds) {
            const last = latestByRoom[String(rid)] || 0;
            const read = getReadAt(String(rid));
            if (last > read) cnt += 1;
          }
          setUnread(cnt);
        } else setUnread(0);
      } catch {
        setUnread(0);
      }

      // ✅ friends는 대표님 기존코드 받으면 “실시간 접속/이름/카드” 그대로 이식할 자리
      setFriends([]);

      setLoading(false);
    }

    boot();
    return () => { alive = false; };
  }, [router, monthStart, monthEnd, monthKey, cursor]);

  // ✅ goals 저장(월 단위 localStorage)
  useEffect(() => {
    if (!me?.user_id) return;
    try {
      const key = `uplog_goals:${me.user_id}:${monthKey}`;
      localStorage.setItem(key, JSON.stringify(goals));
    } catch {}
  }, [goals, me?.user_id, monthKey]);

  async function addSchedule() {
    if (!me?.user_id) return;

    const t = title.trim();
    if (!t) return;

    setErr(null);

    const payload: any = {
      user_id: me.user_id,
      date: selectedYMD,
      title: t,
      category: cat,
    };

    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('id,user_id,date,title,category,created_at')
      .maybeSingle();

    if (error) {
      setErr(`저장 실패: ${error.message} (schedules 테이블/정책 확인)`);
      return;
    }

    setRows((prev) => [...prev, data as any].sort((a, b) => (a.date > b.date ? 1 : -1)));
    setTitle('');
  }

  const S: any = {
    page: { maxWidth: 1040, margin: '0 auto', padding: '14px 14px 120px' },

    topCard: {
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(60,30,90,0.12)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },

    headerRow: { padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { fontSize: 18, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.3 },
    mini: { fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },

    // ✅ 업쮸(메인=upzzu1.png): 이 페이지에서도 “확실히” 보여줌
    mascotWrap: { display: 'flex', alignItems: 'center', gap: 10 },
    mascot: {
      width: 56,
      height: 56,
      borderRadius: 18,
      objectFit: 'contain',
      background: 'transparent',
      filter: 'drop-shadow(0 10px 16px rgba(180,76,255,0.28))',
      animation: 'floaty 3.6s ease-in-out infinite',
    },
    bubble: {
      padding: '10px 12px',
      borderRadius: 18,
      border: '1px solid rgba(255,90,200,0.18)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.90))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      boxShadow: '0 12px 26px rgba(255,120,190,0.12)',
      maxWidth: 520,
    },

    monthBar: { padding: '6px 14px 14px' },
    navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.9)',
      fontWeight: 950,
      cursor: 'pointer',
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
    },
    monthLabel: { fontSize: 16, fontWeight: 950, color: '#2a0f3a' },

    // ✅ 카테고리 레전드(대표님 요구: 색상표기 확실)
    legend: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' },
    tag: (c: CatKey) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 999,
      border: `1px solid ${catColor(c)}35`,
      background: catBadgeBg(c),
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      whiteSpace: 'nowrap',
    }),
    dot: (c: CatKey) => ({
      width: 8,
      height: 8,
      borderRadius: 999,
      background: catColor(c),
      boxShadow: `0 0 0 3px ${catColor(c)}18`,
    }),

    // ✅ 달력
    grid: { padding: 14, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 },
    head: { padding: '0 14px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 },
    headCell: { textAlign: 'center', fontSize: 12, fontWeight: 950, opacity: 0.72, color: '#2a0f3a' },

    cell: {
      borderRadius: 18,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.88)',
      minHeight: 78,
      padding: '10px 10px 8px',
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
      cursor: 'pointer',
    },
    cellSelected: {
      borderColor: 'rgba(255,80,170,0.55)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      boxShadow: '0 16px 28px rgba(255,80,170,0.18)',
    },
    dayNum: { fontSize: 14, fontWeight: 950, color: '#2a0f3a' },

    // ✅ “카테고리 항목 보이도록”: 각 날짜 셀 안에 카테고리 뱃지(최대 2개) + 나머지 +N
    catRow: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 },
    catPill: (c: CatKey) => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      padding: '6px 8px',
      borderRadius: 12,
      border: `1px solid ${catColor(c)}30`,
      background: catBadgeBg(c),
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 11,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),

    // ✅ 선택한 날짜 상세 + 입력
    bottom: { padding: 14, borderTop: '1px solid rgba(60,30,90,0.08)' },
    h2: { fontSize: 15, fontWeight: 950, color: '#2a0f3a' },
    sub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },

    inputRow: { marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
    input: {
      flex: '1 1 280px',
      padding: '12px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 14,
      outline: 'none',
    },
    select: {
      padding: '12px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 14,
      outline: 'none',
    },
    save: {
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.22)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.98), rgba(255,78,147,0.96))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.18)',
      whiteSpace: 'nowrap',
    },

    list: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
    item: {
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.88)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    itemCat: { fontSize: 12, fontWeight: 950, opacity: 0.75 },

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

    // ✅ 월간 그래프(“건당 확실”): 날짜별 총건수 + 카테고리별 “스택 바”
    graph: { marginTop: 12, padding: 14 },
    graphTitle: { fontSize: 16, fontWeight: 950, color: '#2a0f3a' },
    graphSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },
    bars: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 },
    barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
    barBox: {
      width: '100%',
      height: 64,
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.86)',
      overflow: 'hidden',
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
      display: 'flex',
      alignItems: 'flex-end',
    },
    stack: { width: '100%', display: 'flex', flexDirection: 'column-reverse' as const },
    seg: (h: number, c: CatKey) => ({
      height: h,
      background: `linear-gradient(180deg, ${catColor(c)}F2, ${catColor(c)}CC)`,
    }),
    num: { fontSize: 11, fontWeight: 950, opacity: 0.85, color: '#2a0f3a' },
    lab: { fontSize: 11, fontWeight: 950, opacity: 0.78, color: '#2a0f3a' },

    // ✅ 목표/할일/포인트 카드
    goals: { marginTop: 12, padding: 14 },
    row2: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 },
    box: {
      borderRadius: 18,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.88)',
      padding: 12,
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
    },
    k: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    tarea: {
      marginTop: 8,
      width: '100%',
      minHeight: 84,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      outline: 'none',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      background: 'rgba(255,255,255,0.92)',
      resize: 'vertical' as const,
    },
    todoRow: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
    todo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.92)',
    },
    chk: { width: 18, height: 18 },
    todoInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      background: 'transparent',
    },
    addTodo: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(109,40,217,0.20)',
      background: 'linear-gradient(180deg, rgba(246,240,255,0.95), rgba(255,246,252,0.92))',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
    },
    pointBox: {
      borderRadius: 18,
      border: '1px solid rgba(255,60,130,0.20)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.90))',
      padding: 14,
      boxShadow: '0 12px 26px rgba(255,120,190,0.14)',
    },
    pTitle: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    pNum: { marginTop: 8, fontSize: 34, fontWeight: 950, letterSpacing: -0.8, color: '#2a0f3a' },
    pSub: { marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.75, color: '#2a0f3a' },

    // ✅ 친구목록/채팅 카드(달력 밑)
    friendWrap: { marginTop: 12, padding: 14 },
    cardRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    fCard: {
      borderRadius: 18,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.88)',
      padding: 12,
      boxShadow: '0 10px 18px rgba(40,10,70,0.06)',
    },
    fTitle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    fH: { fontSize: 14, fontWeight: 950, color: '#2a0f3a' },
    badge: (n: number) => ({
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid rgba(255,60,130,0.20)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.90))',
      fontWeight: 950,
      color: '#2a0f3a',
      fontSize: 12,
      whiteSpace: 'nowrap',
    }),
    empty: { marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },
    goBtn: {
      marginTop: 10,
      width: '100%',
      padding: '12px 12px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.22)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.98), rgba(255,78,147,0.96))',
      color: '#fff',
      fontWeight: 950,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.16)',
    },
  };

  const selectedList = useMemo(() => (byDay[selectedYMD] || []), [byDay, selectedYMD]);

  // ✅ 달력 셀에 “카테고리 항목” 보이게: 각 날의 스케줄을 카테고리로 압축해 표시
  const cellPreview = useMemo(() => {
    const map: Record<string, { cat: CatKey; label: string; count: number }[]> = {};
    Object.keys(byDay).forEach((ymd) => {
      const list = byDay[ymd] || [];
      const bucket: Record<CatKey, number> = { 업무: 0, 회의: 0, 개인: 0, 상담: 0, 방문: 0, 기타: 0 };
      for (const s of list) bucket[normalizeCat(s.category)] += 1;

      const items = (Object.keys(bucket) as CatKey[])
        .filter((k) => bucket[k] > 0)
        .sort((a, b) => bucket[b] - bucket[a])
        .map((k) => ({ cat: k, label: k, count: bucket[k] }));

      map[ymd] = items;
    });
    return map;
  }, [byDay]);

  const isAdmin = (me?.role || '').toLowerCase() === 'admin';

  return (
    <ClientShell>
      <div style={S.page}>
        <div style={S.topCard}>
          <div style={S.headerRow}>
            <div>
              <div style={S.title}>{pickName(me)} 님 달력</div>
              <div style={S.mini}>카테고리별 색상/항목이 달력에 보이게 정리했습니다.</div>
            </div>

            <div style={S.mascotWrap}>
              <div style={S.bubble}>
                “빈 날을 줄이는 것” 하나만 해도 이깁니다. 오늘도 한 칸만 채워요.
              </div>
              <img
                src="/assets/upzzu1.png"
                alt="upzzu"
                style={S.mascot}
                onError={(e: any) => { e.currentTarget.src = '/assets/images/logo2.png'; }}
              />
            </div>
          </div>

          <div style={S.monthBar}>
            <div style={S.navRow}>
              <button
                type="button"
                style={S.navBtn}
                onClick={() => {
                  const d = new Date(cursor);
                  d.setMonth(d.getMonth() - 1);
                  setCursor(d);
                }}
                aria-label="prev-month"
              >
                ◀
              </button>

              <div style={S.monthLabel}>{monthLabel}</div>

              <button
                type="button"
                style={S.navBtn}
                onClick={() => {
                  const d = new Date(cursor);
                  d.setMonth(d.getMonth() + 1);
                  setCursor(d);
                }}
                aria-label="next-month"
              >
                ▶
              </button>
            </div>

            <div style={S.legend}>
              {(['업무', '회의', '개인', '상담', '방문'] as CatKey[]).map((c) => (
                <span key={c} style={S.tag(c)}>
                  <span style={S.dot(c)} />
                  {c}
                </span>
              ))}
              <span style={S.tag('기타')}>
                <span style={S.dot('기타')} />
                기타
              </span>
            </div>
          </div>

          <div style={S.head}>
            {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
              <div key={w} style={S.headCell}>{w}</div>
            ))}
          </div>

          <div style={S.grid}>
            {gridDays.map((d) => {
              const ymd = fmtYMD(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const selectedCell = sameYMD(d, selected);
              const today = sameYMD(d, new Date());

              const base = {
                ...S.cell,
                ...(selectedCell ? S.cellSelected : null),
                opacity: inMonth ? 1 : 0.35,
                borderColor: today ? 'rgba(109,40,217,0.35)' : undefined,
              } as any;

              const preview = cellPreview[ymd] || [];
              const top2 = preview.slice(0, 2);
              const rest = preview.slice(2).reduce((a, b) => a + b.count, 0);

              return (
                <div key={ymd} style={base} onClick={() => setSelected(d)} title={ymd}>
                  <div style={S.dayNum}>{d.getDate()}</div>

                  <div style={S.catRow}>
                    {top2.map((x) => (
                      <div key={`${ymd}_${x.cat}`} style={S.catPill(x.cat)}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: catColor(x.cat) }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
                        </span>
                        <span style={{ opacity: 0.8 }}>{x.count}</span>
                      </div>
                    ))}

                    {rest > 0 ? (
                      <div style={S.catPill('기타')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: catColor('기타') }} />
                          더보기
                        </span>
                        <span style={{ opacity: 0.8 }}>+{rest}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.bottom}>
            <div style={S.h2}>선택한 날짜: {selectedYMD}</div>
            <div style={S.sub}>카테고리 + 제목을 저장하면, 달력 셀 안에 바로 표시됩니다.</div>

            <div style={S.inputRow}>
              <input
                style={S.input}
                value={title}
                placeholder="스케줄(예: 해피콜 3명, 미팅, 교육...)"
                onChange={(e) => setTitle(e.target.value)}
              />

              <select style={S.select} value={cat} onChange={(e) => setCat(e.target.value as any)}>
                <option value="업무">업무</option>
                <option value="회의">회의</option>
                <option value="개인">개인</option>
                <option value="상담">상담</option>
                <option value="방문">방문</option>
                <option value="기타">기타</option>
              </select>

              <button type="button" style={S.save} onClick={addSchedule}>
                저장
              </button>
            </div>

            {selectedList.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>
                이 날짜엔 아직 스케줄이 없어요.
              </div>
            ) : (
              <div style={S.list}>
                {selectedList.map((s) => {
                  const c = normalizeCat(s.category);
                  return (
                    <div key={s.id} style={S.item}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950 }}>{s.title}</div>
                        <div style={S.itemCat}>
                          <span style={{ color: catColor(c), fontWeight: 950 }}>{c}</span>
                          <span style={{ marginLeft: 8, opacity: 0.7 }}>{s.date}</span>
                        </div>
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: 999, background: catColor(c) }} />
                    </div>
                  );
                })}
              </div>
            )}

            {err ? <div style={S.warn}>{err}</div> : null}
          </div>
        </div>

        {/* ✅ 월간 그래프: “건당”이 확실하게 보이도록(스택 바) */}
        <div style={{ ...S.topCard, marginTop: 12 }}>
          <div style={S.graph}>
            <div style={S.graphTitle}>이번달 스케줄 그래프</div>
            <div style={S.graphSub}>
              날짜별 총건수 + 카테고리별 분해(색상). “몇 건 했는지”가 한 눈에 보입니다.
            </div>

            <div style={S.bars}>
              {monthStats.out.slice(-28).map((x) => {
                const d = safeDate(x.ymd) || new Date(x.ymd);
                const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

                const totalH = Math.max(6, Math.round((64 * x.total) / monthStats.max));
                const parts: { c: CatKey; n: number }[] = (['업무','회의','개인','상담','방문','기타'] as CatKey[])
                  .map((c) => ({ c, n: x.bucket[c] }))
                  .filter((p) => p.n > 0);

                // 총 높이를 카테고리별 비율로 분배
                const sum = Math.max(1, parts.reduce((a, b) => a + b.n, 0));
                const segs = parts.map((p, i) => {
                  const h = i === 0
                    ? Math.max(2, Math.round((totalH * p.n) / sum))
                    : Math.max(2, Math.round((totalH * p.n) / sum));
                  return { ...p, h };
                });

                return (
                  <div key={x.ymd} style={S.barCol} title={x.ymd}>
                    <div style={S.barBox}>
                      <div style={S.stack}>
                        {segs.map((s, idx) => (
                          <div key={`${x.ymd}_${s.c}_${idx}`} style={S.seg(s.h, s.c)} />
                        ))}
                      </div>
                    </div>
                    <div style={S.num}>{x.total}</div>
                    <div style={S.lab}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ✅ 오늘할일/주간목표/월간목표/나의목표 + 포인트 */}
        <div style={{ ...S.topCard, marginTop: 12 }}>
          <div style={S.goals}>
            <div style={S.graphTitle}>목표 & 포인트</div>
            <div style={S.graphSub}>달력과 같이 굴러가게. 복잡한 DB 없어도 바로 저장됩니다(월 단위).</div>

            <div style={S.row2}>
              <div style={S.box}>
                <div style={S.k}>오늘 할 일</div>

                <div style={S.todoRow}>
                  {(goals.today || ['']).map((v, i) => (
                    <div key={`todo_${i}`} style={S.todo}>
                      <input
                        type="checkbox"
                        style={S.chk}
                        checked={!!goals.done[`t${i}`]}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setGoals((p) => ({ ...p, done: { ...p.done, [`t${i}`]: on } }));
                        }}
                      />
                      <input
                        style={S.todoInput}
                        value={v}
                        placeholder={`할 일 ${i + 1}`}
                        onChange={(e) => {
                          const nv = e.target.value;
                          setGoals((p) => {
                            const arr = [...(p.today || [])];
                            arr[i] = nv;
                            return { ...p, today: arr };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  style={S.addTodo}
                  onClick={() => setGoals((p) => ({ ...p, today: [...(p.today || []), ''] }))}
                >
                  + 할 일 추가
                </button>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={S.k}>주간 목표</div>
                    <textarea
                      style={S.tarea}
                      value={goals.weekly}
                      onChange={(e) => setGoals((p) => ({ ...p, weekly: e.target.value }))}
                      placeholder="예) 해피콜 50명 / 방문 5건 / 신규 2건"
                    />
                  </div>
                  <div>
                    <div style={S.k}>월간 목표</div>
                    <textarea
                      style={S.tarea}
                      value={goals.monthly}
                      onChange={(e) => setGoals((p) => ({ ...p, monthly: e.target.value }))}
                      placeholder="예) 계약 3건 / 실적 300만 / 거절 40개 기록"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={S.k}>나의 목표 (대표님)</div>
                  <textarea
                    style={S.tarea}
                    value={goals.myGoal}
                    onChange={(e) => setGoals((p) => ({ ...p, myGoal: e.target.value }))}
                    placeholder="예) 중요한 건 빈 날을 줄여가는 것입니다."
                  />
                </div>
              </div>

              <div>
                <div style={S.pointBox}>
                  <div style={S.pTitle}>이번 달 포인트</div>
                  <div style={S.pNum}>{points}p</div>
                  <div style={S.pSub}>오늘 할 일 체크 1개당 10p (대표님 규칙으로 바꾸기 쉬움)</div>
                </div>

                <div style={{ ...S.box, marginTop: 12 }}>
                  <div style={S.k}>빠른 이동</div>
                  <button type="button" style={S.goBtn} onClick={() => router.push('/my-up')}>
                    오늘의 U P 기록하러 가기
                  </button>
                  <button type="button" style={{ ...S.goBtn, marginTop: 10 }} onClick={() => router.push('/chats')}>
                    UPLOG 채팅 열기 (미열람 {unread}개)
                  </button>
                  {isAdmin ? (
                    <button type="button" style={{ ...S.goBtn, marginTop: 10 }} onClick={() => router.push('/admin')}>
                      관리자 페이지
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ 달력 밑: 친구목록 + UPLOG 채팅 카드(대표님 기존코드 이식 자리) */}
        <div style={{ ...S.topCard, marginTop: 12 }}>
          <div style={S.friendWrap}>
            <div style={S.graphTitle}>친구 & UPLOG 채팅</div>
            <div style={S.graphSub}>대표님 기존 코드 주면 “실시간 접속/이름/카드” 그대로 복구해서 붙입니다.</div>

            <div style={S.cardRow}>
              <div style={S.fCard}>
                <div style={S.fTitle}>
                  <div style={S.fH}>친구목록</div>
                  <div style={S.badge(friends.length)}>{friends.length}명</div>
                </div>

                {friends.length === 0 ? (
                  <div style={S.empty}>아직 친구 목록 데이터 연결 전입니다. (기존 코드 주면 그대로 붙입니다)</div>
                ) : (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {friends.slice(0, 6).map((f) => (
                      <div key={f.user_id} style={{ ...S.item, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 999,
                            background: f.online ? '#22c55e' : '#94a3b8',
                            boxShadow: f.online ? '0 0 0 4px rgba(34,197,94,0.16)' : 'none',
                          }} />
                          <div style={{ fontWeight: 950 }}>{f.name}</div>
                        </div>
                        <div style={{ fontWeight: 950, opacity: 0.75 }}>{f.online ? '접속중' : '오프라인'}</div>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" style={S.goBtn} onClick={() => router.push('/friends')}>
                  친구 관리 열기
                </button>
              </div>

              <div style={S.fCard}>
                <div style={S.fTitle}>
                  <div style={S.fH}>UPLOG 채팅</div>
                  <div style={S.badge(unread)}>{unread} 미열람</div>
                </div>

                <div style={S.empty}>
                  채팅은 /chats 기준으로 통일되어 있습니다. 아래 버튼으로 바로 들어가세요.
                </div>

                <button type="button" style={S.goBtn} onClick={() => router.push('/chats')}>
                  채팅방 열기
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div>
        ) : null}

        <style jsx>{`
          @keyframes floaty{
            0%{ transform: translateY(0); }
            50%{ transform: translateY(-7px); }
            100%{ transform: translateY(0); }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
