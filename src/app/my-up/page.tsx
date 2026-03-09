// ✅✅✅ 전체복붙: src/app/my-up/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';
import { fetchLiveWeatherSlots, resolveRegionFromProfile, type WeatherSlot } from '@/lib/weatherClient';

type Me = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  role: string | null;
  avatar_url: string | null;
  career: string | null;
  company: string | null;
  team: string | null;
  main_goal: string | null;
  address_text?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  title: string;
  schedule_date: string;
  schedule_time?: string | null;
  category?: string | null;
  created_at?: string | null;
};

type MonthlyBadgeRow = {
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  month_start: string | null;
  month_end: string | null;
};

type DailyTask = { id: string; content: string; done: boolean; task_date: string };
type MonthTaskStats = { total: number; done: number; days: number };

type UpLogRow = {
  id: string;
  user_id: string;
  log_date: string | null;
  mood?: string | null;
  day_goal?: string | null;
  week_goal?: string | null;
  month_goal?: string | null;
  created_at?: string | null;
  good?: string | null;
  bad?: string | null;
  tomorrow?: string | null;
};

const EMO_QUOTES: string[] = [
  '대표님, 오늘은 “빈 날을 줄이는 것” 하나만 해도 이깁니다.',
  '관리의 차이가 성장률의 차이입니다.',
  '기록은 배신하지 않습니다. 오늘 1줄이면 충분해요.',
  '거절은 숫자일 뿐, 대표님의 실력은 계속 쌓이고 있어요.',
  '오늘 1건의 행동이 내일의 10건을 부릅니다.',
];

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function fmtKoreanDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
}
function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
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

type ScheduleCategoryKind = 'work' | 'attendance' | 'etc';
type ScheduleCategoryMeta = { label: string; badgeClass: string; kind: ScheduleCategoryKind };

function getScheduleCategoryMeta(category: string | null | undefined): ScheduleCategoryMeta {
  const c = (category ?? '').toLowerCase();

  if (c === 'consult' || c === '상담') return { label: '상담', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'visit' || c === '방문') return { label: '방문', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'happy' || c === '해피콜') return { label: '해피콜', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'gift' || c === 'present' || c === '선물' || c === '사은품') return { label: '사은품', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'delivery' || c === '택배' || c === '배송') return { label: '배송', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'meeting' || c === '회의') return { label: '회의', badgeClass: 'cat-work', kind: 'work' };
  if (c === 'edu' || c === 'education' || c === '교육') return { label: '교육', badgeClass: 'cat-edu', kind: 'work' };
  if (c === 'event' || c === '행사' || c === '행사/이벤트') return { label: '행사/이벤트', badgeClass: 'cat-event', kind: 'work' };

  if (
    c === '근태' ||
    c === 'attendance' ||
    c.includes('출근') ||
    c.includes('지각') ||
    c.includes('조퇴') ||
    c.includes('외출') ||
    c.includes('결근') ||
    c.includes('출장') ||
    c.includes('퇴근') ||
    c === 'late' ||
    c === 'early' ||
    c === 'out' ||
    c === 'absent' ||
    c === 'trip' ||
    c === 'close'
  ) {
    return { label: '근태', badgeClass: 'cat-attend', kind: 'attendance' };
  }

  return { label: '기타', badgeClass: 'cat-etc', kind: 'etc' };
}

function getMoodEmoji(code: string | null | undefined): string {
  if (!code) return '';
  if (code === '🙂' || code === '😎' || code === '🔥' || code === '😭' || code === '😔' || code === '😐') return code;
  switch (code) {
    case 'tired':
      return '😭';
    case 'down':
      return '😔';
    case 'focus':
      return '😐';
    case 'smile':
      return '🙂';
    case 'fire':
      return '🔥';
    case 'confident':
      return '😎';
    default:
      return '🙂';
  }
}

function weatherEmoji(desc: string) {
  if (!desc) return '🌤';
  if (desc.includes('맑')) return '☀️';
  if (desc.includes('비')) return '🌧️';
  if (desc.includes('눈')) return '❄️';
  if (desc.includes('구름')) return '⛅';
  if (desc.includes('흐')) return '☁️';
  return '🌤';
}

function badgeIcon(code: string) {
  const c = (code || '').toLowerCase();
  if (c.includes('top')) return '👑';
  if (c.includes('streak')) return '🔥';
  if (c.includes('likes')) return '💖';
  if (c.includes('mvp')) return '🏆';
  if (c.includes('amount')) return '💎';
  if (c.includes('attendance')) return '📅';
  if (c.includes('posts')) return '📝';
  return '✨';
}

function lsGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}
function lsSetJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function lsGetStr(key: string, fallback = '') {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function lsSetStr(key: string, value: string) {
  try {
    localStorage.setItem(key, value ?? '');
  } catch {}
}

function moveJsonIfNeeded(fromKey: string, toKey: string) {
  try {
    const fromRaw = localStorage.getItem(fromKey);
    if (!fromRaw) return;

    const toRaw = localStorage.getItem(toKey);
    if (!toRaw) {
      localStorage.setItem(toKey, fromRaw);
    }
  } catch {}
}
function moveStrIfNeeded(fromKey: string, toKey: string) {
  try {
    const fromRaw = localStorage.getItem(fromKey);
    if (!fromRaw) return;

    const toRaw = localStorage.getItem(toKey);
    if (!toRaw) {
      localStorage.setItem(toKey, fromRaw);
    }
  } catch {}
}

function buildAiAdvice(slots: WeatherSlot[], when: Date) {
  const hour = when.getHours();
  const nowSlot =
    slots.find((s) => {
      const hh = Number(String(s.time || '').slice(0, 2));
      return Number.isFinite(hh) && hh === hour;
    }) || slots[0];

  const temp = nowSlot?.temp ?? null;
  const desc = nowSlot?.desc ?? '';
  const lines: string[] = [];

  if (desc.includes('비') || desc.includes('눈')) {
    lines.push('우산/미끄럼 주의. 외근은 “동선 최소화”로 묶어주세요.');
    lines.push('실내 접점: 해피콜/문자인사/리마인드로 “접점 20개”를 먼저 확보하세요.');
  } else if (desc.includes('맑')) {
    lines.push('날씨가 좋습니다. “방문/소개 요청”에 최적. 오늘 한 번만 더 발로 뛰면 성과가 붙어요.');
    lines.push('외근 전: 미팅 1건당 질문 3개(니즈/예산/결정권)만 고정해서 체크하세요.');
  } else if (desc.includes('구름') || desc.includes('흐')) {
    lines.push('컨디션 흔들리기 쉬운 날. “정리 5분 + 연락 10분”으로 리듬을 잡으세요.');
  } else {
    lines.push('변수가 많을 수 있어요. 스케줄을 “핵심 1개 + 보조 2개”로 단순화하세요.');
  }

  if (typeof temp === 'number') {
    if (temp >= 28) lines.push('더위 주의. 일정 사이에 10분 쿨다운을 끼워 넣으세요.');
    if (temp <= 5) lines.push('추위 주의. 외근은 짧게, 실내 접점(전화/메시지) 비중을 높여주세요.');
  }

  if (hour < 11) lines.push('오전엔 “신규 접점 확보”가 잘 됩니다. 첫 연락 5개부터.');
  else if (hour < 16) lines.push('오후엔 “상담/방문/클로징” 집중. 결정을 묻는 한 문장을 꼭 넣으세요.');
  else lines.push('퇴근 전 20분: 오늘 기록 + 내일 1순위 1개만 확정하면 다음날이 쉬워집니다.');

  return lines.slice(0, 4);
}

async function loadSchedules(uid: string, monthCursor: Date) {
  const from = fmtYMD(startOfMonth(monthCursor));
  const to = fmtYMD(endOfMonth(monthCursor));

  const { data, error } = await supabase
    .from('schedules')
    .select('id, user_id, title, schedule_date, schedule_time, category, created_at')
    .eq('user_id', uid)
    .gte('schedule_date', from)
    .lte('schedule_date', to);

  if (error) return { rows: [] as ScheduleRow[], error: error.message };

  const rows = ((data || []) as ScheduleRow[]).slice().sort((a, b) => {
    const ad = String(a.schedule_date || '');
    const bd = String(b.schedule_date || '');
    if (ad !== bd) return ad.localeCompare(bd);

    const at = String(a.schedule_time || '');
    const bt = String(b.schedule_time || '');
    if (at !== bt) return at.localeCompare(bt);

    const ac = String(a.created_at || '');
    const bc = String(b.created_at || '');
    return ac.localeCompare(bc);
  });

  return { rows, error: null as any };
}

async function loadUpLogs(uid: string, monthCursor: Date) {
  const from = fmtYMD(startOfMonth(monthCursor));
  const to = fmtYMD(endOfMonth(monthCursor));

  const { data, error } = await supabase
    .from('up_logs')
    .select('id, user_id, log_date, mood, day_goal, week_goal, month_goal, good, bad, tomorrow, created_at')
    .eq('user_id', uid)
    .gte('log_date', from)
    .lte('log_date', to);

  if (error) return { rows: [] as UpLogRow[], error: error.message };

  const rows = ((data || []) as UpLogRow[]).slice().sort((a, b) => {
    const ad = String(a.log_date || '').slice(0, 10);
    const bd = String(b.log_date || '').slice(0, 10);
    if (ad && bd) return ad.localeCompare(bd);
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;

    const ac = String(a.created_at || '');
    const bc = String(b.created_at || '');
    return ac.localeCompare(bc);
  });

  return { rows, error: null as any };
}

async function loadReflection(uid: string, date: string) {
  const { data, error } = await supabase.from('up_reflections').select('good, bad, tomorrow').eq('user_id', uid).eq('log_date', date).maybeSingle();
  if (error) return { row: null as any, error: error.message };
  return {
    row: data
      ? { good: String((data as any).good ?? ''), bad: String((data as any).bad ?? ''), tomorrow: String((data as any).tomorrow ?? '') }
      : null,
    error: null as any,
  };
}

async function saveReflection(uid: string, date: string, payload: { good: string; bad: string; tomorrow: string }) {
  const { error } = await supabase.from('up_reflections').upsert(
    {
      user_id: uid,
      log_date: date,
      good: payload.good.trim() || null,
      bad: payload.bad.trim() || null,
      tomorrow: payload.tomorrow.trim() || null,
    },
    { onConflict: 'user_id,log_date' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null as any };
}

async function loadDailyTasks(uid: string, date: string) {
  const { data, error } = await supabase.from('daily_tasks').select('id, task_date, content, done').eq('user_id', uid).eq('task_date', date);
  if (error) return { rows: [] as DailyTask[], error: error.message };

  const rows = ((data || []) as any[])
    .map((t) => ({ id: t.id, task_date: t.task_date, content: t.content ?? '', done: !!t.done }) as DailyTask)
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  return { rows, error: null as any };
}

async function loadMonthlyTaskStats(uid: string, monthCursor: Date) {
  const from = fmtYMD(startOfMonth(monthCursor));
  const to = fmtYMD(endOfMonth(monthCursor));

  const { data, error } = await supabase.from('daily_tasks').select('task_date, done').eq('user_id', uid).gte('task_date', from).lte('task_date', to);
  if (error) return { stats: { total: 0, done: 0, days: 0 } as MonthTaskStats, error: error.message };

  const rows = (data || []) as any[];
  let total = 0;
  let done = 0;
  const daySet = new Set<string>();

  rows.forEach((r) => {
    const d = String(r.task_date || '').slice(0, 10);
    if (d) daySet.add(d);
    total += 1;
    if (r.done) done += 1;
  });

  return { stats: { total, done, days: daySet.size }, error: null as any };
}

async function safeUpsertUpLog(uid: string, ymd: string, payload: Record<string, any>) {
  const base = { user_id: uid, log_date: ymd, ...payload };

  const tryUpsert = async (obj: any) => {
    const { data, error } = await supabase.from('up_logs').upsert(obj, { onConflict: 'user_id,log_date' }).select('id').maybeSingle();
    if (error) throw error;
    return data as any;
  };

  const tryFallbackUpdateOrInsert = async (obj: any) => {
    const { data: exist, error: exErr } = await supabase.from('up_logs').select('id').eq('user_id', uid).eq('log_date', ymd).maybeSingle();
    if (exErr) throw exErr;

    if (exist?.id) {
      const { error: upErr } = await supabase.from('up_logs').update(obj).eq('id', exist.id).eq('user_id', uid);
      if (upErr) throw upErr;
      return { id: exist.id };
    }

    const { data: ins, error: inErr } = await supabase.from('up_logs').insert(obj).select('id').maybeSingle();
    if (inErr) throw inErr;
    return ins;
  };

  try {
    await tryUpsert(base);
    return { ok: true, reduced: false };
  } catch (e: any) {
    const msg = String(e?.message || '');

    if (msg.includes('42703') || msg.toLowerCase().includes('column') || msg.toLowerCase().includes('does not exist')) {
      const core: any = { user_id: uid, log_date: ymd };
      ['mood', 'day_goal', 'week_goal', 'month_goal'].forEach((k) => {
        if (payload[k] !== undefined) core[k] = payload[k];
      });

      try {
        try {
          await tryUpsert(core);
        } catch {
          await tryFallbackUpdateOrInsert(core);
        }
        return { ok: true, reduced: true, reason: msg };
      } catch (e2: any) {
        return { ok: false, reduced: true, reason: String(e2?.message || e2) };
      }
    }

    const lower = msg.toLowerCase();
    const looksLikeConflictSpec =
      lower.includes('on conflict') ||
      lower.includes('conflict') ||
      lower.includes('unique') ||
      lower.includes('exclusion constraint') ||
      lower.includes('no unique') ||
      lower.includes('42p10');

    if (looksLikeConflictSpec) {
      try {
        await tryFallbackUpdateOrInsert(base);
        return { ok: true, reduced: false, reason: msg };
      } catch (e3: any) {
        return { ok: false, reduced: false, reason: String(e3?.message || e3) };
      }
    }

    return { ok: false, reduced: false, reason: msg };
  }
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function MyUpPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [uidKey, setUidKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return sessionStorage.getItem('uplog_uid_key') || '';
    } catch {
      return '';
    }
  });

  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const selectedYMD = useMemo(() => fmtYMD(selectedDate), [selectedDate]);
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => fmtYMD(new Date()), []);
  const monthLabel = useMemo(() => formatMonthLabel(monthCursor), [monthCursor]);

  const coachLine = useMemo(() => {
    const d = new Date();
    const key = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
    return EMO_QUOTES[key % EMO_QUOTES.length];
  }, []);
  const mentalLine = useMemo(() => EMO_QUOTES[(new Date().getDate() + 2) % EMO_QUOTES.length], []);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [upLogs, setUpLogs] = useState<UpLogRow[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [myBadges, setMyBadges] = useState<{ code: string; name: string }[]>([]);
  const [todayWeather, setTodayWeather] = useState<WeatherSlot[]>([]);
  const [weatherLabel, setWeatherLabel] = useState('서울');
  const [monthTaskStats, setMonthTaskStats] = useState<MonthTaskStats>({ total: 0, done: 0, days: 0 });

  const [err, setErr] = useState<string | null>(null);

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleTime, setScheduleTime] = useState<string>(nowHHMM());
  const [scheduleCat, setScheduleCat] = useState<string>('상담');

  const [mood, setMood] = useState<string>('🙂');
  const [dayGoal, setDayGoal] = useState<string>('');
  const [weekGoal, setWeekGoal] = useState<string>('');
  const [monthGoal, setMonthGoal] = useState<string>('');

  const [good, setGood] = useState<string>('');
  const [bad, setBad] = useState<string>('');
  const [tomorrowPlan, setTomorrowPlan] = useState<string>('');

  const [taskInput, setTaskInput] = useState('');

  const [goalsFlash, setGoalsFlash] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [scheduleFlash, setScheduleFlash] = useState<'idle' | 'saving' | 'saved'>('idle');

  const anonReflectKey = useMemo(() => `uplog_reflect__${selectedYMD}`, [selectedYMD]);
  const anonGoalsKey = useMemo(() => `uplog_goals__${selectedYMD}`, [selectedYMD]);
  const anonTaskDraftKey = useMemo(() => `uplog_taskdraft__${selectedYMD}`, [selectedYMD]);

  const reflectKey = useMemo(() => (uidKey ? `uplog_reflect_${uidKey}_${selectedYMD}` : anonReflectKey), [uidKey, selectedYMD, anonReflectKey]);
  const goalsKey = useMemo(() => (uidKey ? `uplog_goals_${uidKey}_${selectedYMD}` : anonGoalsKey), [uidKey, selectedYMD, anonGoalsKey]);
  const taskDraftKey = useMemo(() => (uidKey ? `uplog_taskdraft_${uidKey}_${selectedYMD}` : anonTaskDraftKey), [uidKey, selectedYMD, anonTaskDraftKey]);

  useEffect(() => {
    if (!uidKey) return;
    moveJsonIfNeeded(anonGoalsKey, goalsKey);
    moveJsonIfNeeded(anonReflectKey, reflectKey);
    moveStrIfNeeded(anonTaskDraftKey, taskDraftKey);
  }, [uidKey, anonGoalsKey, anonReflectKey, anonTaskDraftKey, goalsKey, reflectKey, taskDraftKey]);

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(monthCursor);
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [monthCursor]);

  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const s of schedules) {
      const d = s.schedule_date;
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [schedules]);

  const upByDate = useMemo(() => {
    const map: Record<string, UpLogRow> = {};
    for (const u of upLogs) {
      const d = (u.log_date || '').slice(0, 10);
      if (d) map[d] = u;
    }
    return map;
  }, [upLogs]);

  const selectedSchedules = useMemo(() => {
    const list = (schedulesByDate[selectedYMD] || []).slice();
    return list.sort((a, b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));
  }, [schedulesByDate, selectedYMD]);

  const selectedMood = useMemo(() => {
    const row = upByDate[selectedYMD];
    return row?.mood ?? null;
  }, [upByDate, selectedYMD]);

  const aiAdvice = useMemo(() => buildAiAdvice(todayWeather, new Date()), [todayWeather]);

  const monthLogDays = useMemo(() => {
    const set = new Set<string>();
    (upLogs || []).forEach((u) => {
      const d = String(u.log_date || '').slice(0, 10);
      if (!d) return;

      const hasAny =
        !!(u.mood && String(u.mood).trim()) ||
        !!(u.day_goal && String(u.day_goal).trim()) ||
        !!(u.week_goal && String(u.week_goal).trim()) ||
        !!(u.month_goal && String(u.month_goal).trim()) ||
        !!(u.good && String(u.good).trim()) ||
        !!(u.bad && String(u.bad).trim()) ||
        !!(u.tomorrow && String(u.tomorrow).trim());

      if (hasAny) set.add(d);
    });
    return set.size;
  }, [upLogs]);

  useEffect(() => {
    const row = upByDate[selectedYMD];

    const localGoals = lsGetJson<{ day_goal: string; week_goal: string; month_goal: string }>(goalsKey, { day_goal: '', week_goal: '', month_goal: '' });
    const nextMood = (row?.mood ?? '🙂') as string;

    const nextDay = String((row?.day_goal ?? '') || localGoals.day_goal || '');
    const nextWeek = String((row?.week_goal ?? '') || localGoals.week_goal || '');
    const nextMonth = String((row?.month_goal ?? '') || localGoals.month_goal || '');

    setMood(nextMood || '🙂');
    setDayGoal(nextDay);
    setWeekGoal(nextWeek);
    setMonthGoal(nextMonth);
    setTaskInput(lsGetStr(taskDraftKey, ''));

    (async () => {
      try {
        if (!userId) {
          const local = lsGetJson<{ good: string; bad: string; tomorrow: string }>(reflectKey, { good: '', bad: '', tomorrow: '' });
          setGood(String(local.good ?? ''));
          setBad(String(local.bad ?? ''));
          setTomorrowPlan(String(local.tomorrow ?? ''));
          return;
        }

        const r = await loadReflection(userId, selectedYMD);
        if (r.row) {
          setGood(r.row.good);
          setBad(r.row.bad);
          setTomorrowPlan(r.row.tomorrow);
          return;
        }

        const local = lsGetJson<{ good: string; bad: string; tomorrow: string }>(reflectKey, { good: '', bad: '', tomorrow: '' });
        setGood(String(local.good ?? ''));
        setBad(String(local.bad ?? ''));
        setTomorrowPlan(String(local.tomorrow ?? ''));
      } catch {
        const local = lsGetJson<{ good: string; bad: string; tomorrow: string }>(reflectKey, { good: '', bad: '', tomorrow: '' });
        setGood(String(local.good ?? ''));
        setBad(String(local.bad ?? ''));
        setTomorrowPlan(String(local.tomorrow ?? ''));
      }
    })();
  }, [selectedYMD, upByDate, goalsKey, userId, reflectKey, taskDraftKey]);

  useEffect(() => {
    let t: any = null;
    t = setTimeout(() => {
      lsSetJson(goalsKey, { day_goal: dayGoal ?? '', week_goal: weekGoal ?? '', month_goal: monthGoal ?? '' });
    }, 250);
    return () => {
      if (t) clearTimeout(t);
    };
  }, [goalsKey, dayGoal, weekGoal, monthGoal]);

  useEffect(() => {
    let t: any = null;
    t = setTimeout(() => {
      lsSetJson(reflectKey, { good: good ?? '', bad: bad ?? '', tomorrow: tomorrowPlan ?? '' });
    }, 350);
    return () => {
      if (t) clearTimeout(t);
    };
  }, [reflectKey, good, bad, tomorrowPlan]);

  useEffect(() => {
    let t: any = null;
    t = setTimeout(() => {
      lsSetStr(taskDraftKey, taskInput ?? '');
    }, 180);
    return () => {
      if (t) clearTimeout(t);
    };
  }, [taskDraftKey, taskInput]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const t = await loadDailyTasks(userId, selectedYMD);
      if (t.error) setTasks([]);
      else setTasks(t.rows);
    })();
  }, [userId, selectedYMD]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setErr(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      if (userErr || !userData?.user) {
        router.replace('/login');
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);
      setUidKey(uid);
      try {
        sessionStorage.setItem('uplog_uid_key', uid);
      } catch {}

      const { data: p } = await supabase
        .from('profiles')
        .select('user_id, nickname, name, role, avatar_url, career, company, team, main_goal, address_text, lat, lon')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      const prof: any = p ?? {};
      const region = resolveRegionFromProfile(prof);

      setWeatherLabel(region.label);

      setMe({
        user_id: uid,
        nickname: prof.nickname ?? null,
        name: prof.name ?? null,
        role: prof.role ?? null,
        avatar_url: prof.avatar_url ?? null,
        career: prof.career ?? null,
        company: prof.company ?? null,
        team: prof.team ?? null,
        main_goal: prof.main_goal ?? null,
        address_text: prof.address_text ?? null,
        lat: prof.lat ?? null,
        lon: prof.lon ?? null,
      });

      try {
        const todayStr = fmtYMD(new Date());
        const { data: mb, error: mbErr } = await supabase
          .from('monthly_badges')
          .select('badge_code, badge_name, winner_user_id, month_start, month_end')
          .eq('winner_user_id', uid)
          .lte('month_start', todayStr)
          .gte('month_end', todayStr);

        if (!alive) return;

        if (mbErr) setMyBadges([]);
        else {
          const list = ((mb || []) as MonthlyBadgeRow[])
            .map((r) => ({ code: String(r.badge_code || ''), name: String(r.badge_name || r.badge_code || '') }))
            .filter((x) => x.code || x.name);

          const seen = new Set<string>();
          const uniq = list.filter((x) => {
            const k = `${x.code}|${x.name}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });

          setMyBadges(uniq);
        }
      } catch {
        setMyBadges([]);
      }

      const sch = await loadSchedules(uid, monthCursor);
      if (!alive) return;
      if (sch.error) setErr((prev) => prev || `달력 로드 실패: ${sch.error}`);
      setSchedules(sch.rows);

      const up = await loadUpLogs(uid, monthCursor);
      if (!alive) return;
      setUpLogs(up.rows);

      const ms = await loadMonthlyTaskStats(uid, monthCursor);
      if (!alive) return;
      if (ms.error) setMonthTaskStats({ total: 0, done: 0, days: 0 });
      else setMonthTaskStats(ms.stats);

      try {
        const live = await fetchLiveWeatherSlots(region.lat, region.lon);
        if (!alive) return;
        setTodayWeather(Array.isArray(live) ? (live as WeatherSlot[]) : []);
      } catch {
        if (!alive) return;
        setTodayWeather([]);
      }

      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router, monthCursor]);

  const monthLegendCounts = useMemo(() => {
    let work = 0;
    let attend = 0;
    let etc = 0;

    (schedules ?? []).forEach((s) => {
      const meta = getScheduleCategoryMeta(s.category);
      if (meta.kind === 'attendance') attend += 1;
      else if (meta.kind === 'work') work += 1;
      else etc += 1;
    });

    return { work, attend, etc };
  }, [schedules]);

  const todayTaskMini = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    return { total, done };
  }, [tasks]);

  async function addSchedule() {
    if (!userId) return;
    const title = scheduleTitle.trim();
    if (!title) return;

    setErr(null);
    setScheduleFlash('saving');

    const payload: any = {
      user_id: userId,
      title,
      schedule_date: selectedYMD,
      schedule_time: scheduleTime ? scheduleTime.slice(0, 5) : null,
      category: scheduleCat,
    };

    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('id, user_id, title, schedule_date, schedule_time, category, created_at')
      .maybeSingle();

    if (error) {
      setScheduleFlash('idle');
      setErr(`스케줄 저장 실패: ${error.message}`);
      return;
    }

    setSchedules((prev) => [...prev, (data as any)].sort((a, b) => (a.schedule_date > b.schedule_date ? 1 : -1)));
    setScheduleTitle('');
    setScheduleTime(nowHHMM());

    setScheduleFlash('saved');
    window.setTimeout(() => setScheduleFlash('idle'), 900);
  }

  async function deleteSchedule(id: string) {
    if (!userId) return;
    setSchedules((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from('schedules').delete().eq('id', id).eq('user_id', userId);
    if (error) setErr(`스케줄 삭제 실패: ${error.message}`);
  }

  async function saveMood(nextMood: string) {
    if (!userId) return;

    setMood(nextMood);
    setUpLogs((prev) => {
      const next = prev.slice();
      const idx = next.findIndex((x) => (x.log_date || '').slice(0, 10) === selectedYMD);
      if (idx >= 0) next[idx] = { ...next[idx], mood: nextMood };
      else next.push({ id: `local_${selectedYMD}`, user_id: userId, log_date: selectedYMD, mood: nextMood } as any);
      return next;
    });

    const res = await safeUpsertUpLog(userId, selectedYMD, { mood: nextMood });
    if (!res.ok) setErr(`기분 저장 실패: ${res.reason || 'unknown'}`);
  }

  async function saveGoals() {
    if (!userId) return;
    setErr(null);
    setGoalsFlash('saving');

    const payload: any = {
      day_goal: dayGoal.trim() || null,
      week_goal: weekGoal.trim() || null,
      month_goal: monthGoal.trim() || null,
    };

    lsSetJson(goalsKey, {
      day_goal: payload.day_goal ?? '',
      week_goal: payload.week_goal ?? '',
      month_goal: payload.month_goal ?? '',
    });

    setUpLogs((prev) => {
      const next = prev.slice();
      const idx = next.findIndex((x) => (x.log_date || '').slice(0, 10) === selectedYMD);
      if (idx >= 0) next[idx] = { ...next[idx], ...payload };
      else next.push({ id: `local_${selectedYMD}`, user_id: userId, log_date: selectedYMD, ...payload } as any);
      return next;
    });

    const res = await safeUpsertUpLog(userId, selectedYMD, payload);
    if (!res.ok) {
      setGoalsFlash('idle');
      setErr(`목표 저장은 로컬로 저장됨 (DB 정책/제약 확인 필요): ${res.reason || 'unknown'}`);
      return;
    }

    setGoalsFlash('saved');
    window.setTimeout(() => setGoalsFlash('idle'), 900);
  }

  async function saveReflect() {
    if (!userId) return;
    setErr(null);

    lsSetJson(reflectKey, { good, bad, tomorrow: tomorrowPlan });

    const res = await saveReflection(userId, selectedYMD, { good, bad, tomorrow: tomorrowPlan });
    if (!res.ok) {
      setErr(`회고 저장 실패 (DB): ${res.error}`);
      return;
    }

    setErr('회고 저장 완료 ✨');
  }

  async function addTask() {
    if (!userId) return;
    const text = taskInput.trim();
    if (!text) return;

    setTaskInput('');
    setErr(null);

    const optimisticId = `tmp_${Date.now()}`;
    setTasks((prev) => [...prev, { id: optimisticId, task_date: selectedYMD, content: text, done: false }]);

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({ user_id: userId, task_date: selectedYMD, content: text, done: false })
      .select('id, task_date, content, done')
      .maybeSingle();

    if (error) {
      setTasks((prev) => prev.filter((t) => t.id !== optimisticId));
      setErr(`할 일 저장 실패: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === optimisticId ? ({ id: data!.id, task_date: data!.task_date, content: data!.content ?? '', done: !!data!.done } as any) : t))
    );

    const ms = await loadMonthlyTaskStats(userId, monthCursor);
    if (!ms.error) setMonthTaskStats(ms.stats);
  }

  async function toggleTask(task: DailyTask) {
    if (!userId) return;
    const nextDone = !task.done;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)));
    setMonthTaskStats((prev) => ({ ...prev, done: prev.done + (nextDone ? 1 : -1) }));

    const { error } = await supabase.from('daily_tasks').update({ done: nextDone }).eq('id', task.id).eq('user_id', userId);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      setMonthTaskStats((prev) => ({ ...prev, done: prev.done + (task.done ? 1 : -1) }));
      setErr(`체크 저장 실패: ${error.message}`);
    }
  }

  async function deleteTask(id: string) {
    if (!userId) return;

    const target = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (target) {
      setMonthTaskStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        done: Math.max(0, prev.done - (target.done ? 1 : 0)),
      }));
    }

    const { error } = await supabase.from('daily_tasks').delete().eq('id', id).eq('user_id', userId);
    if (error) setErr(`할 일 삭제 실패: ${error.message}`);
  }

  const HEADER_MASCOT_SIZE = 132;
  const HEADER_BUBBLE_MIN_H = 96;

  const goalsBtnText = goalsFlash === 'saving' ? '저장 중…' : goalsFlash === 'saved' ? '저장됨 ✓' : '목표 저장';
  const scheduleBtnText = scheduleFlash === 'saving' ? '저장 중…' : scheduleFlash === 'saved' ? '저장됨 ✓' : '스케줄 저장';

  const S: any = {
    shell: {
      minHeight: '100vh',
      width: '100%',
      padding: '18px 0 80px',
      background:
        'radial-gradient(1200px 520px at 12% 10%, rgba(255,120,190,0.20) 0%, rgba(255,120,190,0.00) 60%), radial-gradient(1000px 520px at 88% 16%, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0.00) 62%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,243,250,0.92) 35%, rgba(245,243,255,0.92) 100%)',
    },
    page: { maxWidth: 1040, margin: '0 auto', padding: '0 14px' },

    top: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    titleWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
    title: {
      fontSize: 26,
      fontWeight: 950,
      letterSpacing: -0.6,
      color: '#1f0a2c',
      textShadow: '0 1px 0 rgba(255,255,255,0.65)',
    },

    headerCard: {
      borderRadius: 26,
      border: '2px solid rgba(255,80,170,0.22)',
      background:
        'radial-gradient(900px 420px at 18% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,219,239,0.85), rgba(226,214,255,0.85))',
      boxShadow: '0 18px 46px rgba(255,80,170,0.10), 0 22px 48px rgba(40,10,70,0.08)',
      overflow: 'hidden',
      backdropFilter: 'blur(6px)',
    },
    coachWrap: { padding: 14 },
    coachRow: { display: 'grid', gridTemplateColumns: `1fr ${HEADER_MASCOT_SIZE}px`, gap: 12, alignItems: 'center' },

    bubble: {
      padding: '12px 14px',
      borderRadius: 18,
      border: '1px solid rgba(255,90,200,0.20)',
      background: 'rgba(255,255,255,0.82)',
      color: '#2a0f3a',
      fontWeight: 950,
      boxShadow: '0 14px 30px rgba(255,120,190,0.10)',
      lineHeight: 1.35,
      position: 'relative',
      minHeight: HEADER_BUBBLE_MIN_H,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    bubbleSub: { marginTop: 6, fontSize: 12, opacity: 0.78, fontWeight: 900 },

    mascotWrap: {
      width: HEADER_MASCOT_SIZE,
      height: HEADER_MASCOT_SIZE,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      background: 'transparent',
      overflow: 'visible',
    },
    mascot: {
      width: HEADER_MASCOT_SIZE,
      height: HEADER_MASCOT_SIZE,
      objectFit: 'contain',
      background: 'transparent',
      filter: 'drop-shadow(0 14px 22px rgba(180,76,255,0.22))',
      animation: 'floaty 3.8s ease-in-out infinite',
      flex: '0 0 auto',
    },

    card: {
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(60,30,90,0.10)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.08)',
      overflow: 'hidden',
      backdropFilter: 'blur(6px)',
    },
    pad: { padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: 950, color: '#1f0a2c', letterSpacing: -0.3 },
    sectionSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },
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

    pills: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' },
    pill: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(255,90,200,0.20)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      boxShadow: '0 10px 20px rgba(255,120,190,0.10)',
      whiteSpace: 'nowrap',
    },

    input: {
      width: '100%',
      maxWidth: '100%',
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
    textarea: {
      width: '100%',
      maxWidth: '100%',
      minHeight: 92,
      padding: '12px 12px',
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      resize: 'vertical' as const,
      lineHeight: 1.4,
      boxSizing: 'border-box' as const,
    },

    field: { marginTop: 12 },
    small: { fontSize: 12, opacity: 0.75, fontWeight: 900, color: '#2a0f3a' },

    saveBtn: (flash: 'idle' | 'saving' | 'saved') => ({
      padding: '11px 14px',
      borderRadius: 14,
      border: flash === 'saved' ? '1px solid rgba(34,197,94,0.40)' : '1px solid rgba(255,60,130,0.25)',
      background:
        flash === 'saved'
          ? 'linear-gradient(180deg, rgba(34,197,94,0.95), rgba(16,185,129,0.95))'
          : flash === 'saving'
          ? 'linear-gradient(180deg, rgba(244,114,182,0.80), rgba(236,72,153,0.80))'
          : 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: flash === 'saving' ? 'wait' : 'pointer',
      boxShadow:
        flash === 'saved'
          ? '0 16px 28px rgba(34,197,94,0.20), 0 0 0 6px rgba(34,197,94,0.10)'
          : '0 14px 26px rgba(255,60,130,0.16)',
      whiteSpace: 'nowrap' as const,
      transition: 'transform 0.06s ease, filter 0.18s ease, box-shadow 0.18s ease',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      opacity: flash === 'saving' ? 0.92 : 1,
    }),

    ghostBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.08)',
      whiteSpace: 'nowrap' as const,
    },

    calTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 14 },
    calBtn: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(90,30,120,0.14)',
      background: 'rgba(246,240,255,0.75)',
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
      background: 'rgba(255,255,255,0.86)',
      padding: '10px 8px',
      minHeight: 66,
      cursor: 'pointer',
      boxShadow: '0 10px 20px rgba(40,10,70,0.06)',
      userSelect: 'none' as const,
      boxSizing: 'border-box' as const,
    },
    dayCellSelected: {
      borderColor: 'rgba(255,80,170,0.55)',
      boxShadow: '0 16px 28px rgba(255,80,170,0.16)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.92))',
    },
    dayCellToday: { borderColor: 'rgba(109,40,217,0.35)' },
    dayHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    dayNum: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },

    dotRow: { marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' },
    dotItem: { display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 950, fontSize: 12, color: '#2a0f3a', opacity: 0.92 },
    dot: { width: 9, height: 9, borderRadius: 999 },
    dotAttend: { background: '#f59e0b' },
    dotWork: { background: '#22c55e' },
    dotEtc: { background: '#ec4899' },

    moodRow: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' },
    moodBtn: {
      padding: '10px 12px',
      borderRadius: 999,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      color: '#2a0f3a',
      boxShadow: '0 12px 22px rgba(40,10,70,0.08)',
      whiteSpace: 'nowrap' as const,
    },
    moodBtnOn: {
      borderColor: 'rgba(255,80,170,0.55)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      boxShadow: '0 16px 28px rgba(255,80,170,0.14)',
    },

    item: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.86)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 13,
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      boxSizing: 'border-box' as const,
    },

    scheduleRowTop: {
      marginTop: 10,
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 10,
      alignItems: 'end',
    },
    scheduleSmallInput: {
      width: '100%',
      maxWidth: '100%',
      padding: '10px 10px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 13,
      color: '#2a0f3a',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    scheduleContentInput: {
      width: '100%',
      maxWidth: '100%',
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

    taskRow: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    taskBtn: {
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.25)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.16)',
      whiteSpace: 'nowrap' as const,
    },
    checkBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      border: '1px solid rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 950,
      cursor: 'pointer',
      flex: '0 0 32px',
    },
  };

  const moodOptions = useMemo(
    () => [
      { code: '😭', label: '힘듦' },
      { code: '😔', label: '다운' },
      { code: '😐', label: '보통' },
      { code: '🙂', label: '괜찮음' },
      { code: '😎', label: '좋음' },
      { code: '🔥', label: '불타요' },
    ],
    []
  );

  return (
    <ClientShell>
      <div style={S.shell}>
        <div style={S.page}>
          <div style={S.top}>
            <div style={S.titleWrap}>
              <div style={S.title}>나의 U P 관리</div>
            </div>
          </div>

          <div style={S.headerCard}>
            <div style={S.coachWrap}>
              <div style={S.coachRow}>
                <div style={S.bubble}>
                  <div style={{ fontSize: 14, fontWeight: 950 }}>오늘 가이드</div>
                  <div style={{ marginTop: 6 }}>{coachLine}</div>
                  <div style={S.bubbleSub}>멘탈 한 줄: {mentalLine}</div>
                </div>

                <div style={S.mascotWrap}>
                  <img
                    src="/upzzu6.png"
                    onError={(e: any) => {
                      e.currentTarget.src = '/gogo.png';
                    }}
                    alt="upzzu"
                    style={S.mascot}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.pad}>
              <div style={S.sectionTitle}>이번달 활동 카운트</div>
              <div style={S.sectionSub}>“기록/체크/스케줄”을 한눈에 배지처럼 보여줍니다.</div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={S.pill}>
                  🗓️ 기록일수 <b style={{ marginLeft: 6 }}>{monthLogDays}</b>
                </span>
                <span style={S.pill}>
                  ✅ 체크리스트 <b style={{ marginLeft: 6 }}>{monthTaskStats.done}</b> / {monthTaskStats.total}
                </span>
                <span style={S.pill}>
                  📌 스케줄 <b style={{ marginLeft: 6 }}>{schedules.length}</b>
                </span>
                <span style={S.pill}>
                  🟢 업무 <b style={{ marginLeft: 6 }}>{monthLegendCounts.work}</b>
                </span>
                <span style={S.pill}>
                  🟠 근태 <b style={{ marginLeft: 6 }}>{monthLegendCounts.attend}</b>
                </span>
                <span style={S.pill}>
                  💗 기타 <b style={{ marginLeft: 6 }}>{monthLegendCounts.etc}</b>
                </span>

                <span style={{ ...S.pill, opacity: 0.88 }}>
                  오늘 체크 <b style={{ marginLeft: 6 }}>{todayTaskMini.done}</b> / {todayTaskMini.total}
                </span>
                <span style={{ ...S.pill, opacity: 0.88 }}>
                  오늘 스케줄 <b style={{ marginLeft: 6 }}>{selectedSchedules.length}</b>
                </span>
              </div>
            </div>
          </div>

          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.pad}>
              <div style={S.sectionTitle}>이번달 배지 목록</div>
              <div style={S.sectionSub}>이모지 + 배지 이름으로 깔끔하게 표시합니다.</div>

              {myBadges.length === 0 ? (
                <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>아직 이번달 수상 배지가 없어요. 첫 기록부터 쌓아봐요 ✨</div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {myBadges.map((b, i) => (
                    <div key={`${b.code}-${i}`} style={{ ...S.pill, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{badgeIcon(b.code)}</span>
                      <span>{b.name || b.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.pad}>
              <div style={S.sectionTitle}>AI 조언 (날씨 · 시간 · 추천 관리)</div>
              <div style={S.sectionSub}>
                {weatherLabel} · {todayWeather?.[0] ? `${weatherEmoji(todayWeather[0].desc)} ${todayWeather[0].desc}` : '날씨 정보를 불러오는 중'}
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {aiAdvice.map((line, idx) => (
                  <div key={idx} style={{ ...S.item, marginTop: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 950 }}>✨</div>
                      <div style={{ flex: 1 }}>{line}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.pad}>
              <div style={{ fontSize: 14, fontWeight: 950, color: '#2a0f3a' }}>오늘 기분 체크</div>
              <div style={S.moodRow}>
                {moodOptions.map((m) => {
                  const on = mood === m.code;
                  return (
                    <button key={m.code} type="button" className="press-btn" style={{ ...S.moodBtn, ...(on ? S.moodBtnOn : null) }} onClick={() => saveMood(m.code)} title={m.label}>
                      <span style={{ fontSize: 16, marginRight: 6 }}>{m.code}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.75, color: '#2a0f3a' }}>
                선택 날짜 기분: <b>{getMoodEmoji(selectedMood) || '미선택'}</b>
              </div>

              <div style={{ marginTop: 14, fontSize: 14, fontWeight: 950, color: '#2a0f3a' }}>월/주/오늘 목표</div>

              <div style={S.field}>
                <div style={{ ...S.small, marginBottom: 6 }}>이번 달 목표</div>
                <input style={S.input} value={monthGoal} onChange={(e) => setMonthGoal(e.target.value)} placeholder="예: 30건 계약" />
              </div>

              <div style={S.field}>
                <div style={{ ...S.small, marginBottom: 6 }}>이번 주 목표</div>
                <input style={S.input} value={weekGoal} onChange={(e) => setWeekGoal(e.target.value)} placeholder="예: 신규고객 3명" />
              </div>

              <div style={S.field}>
                <div style={{ ...S.small, marginBottom: 6 }}>오늘 목표</div>
                <input style={S.input} value={dayGoal} onChange={(e) => setDayGoal(e.target.value)} placeholder="예: 안부문자 10명" />
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`press-btn save-flash ${goalsFlash === 'saved' ? 'saved' : ''}`}
                  style={S.saveBtn(goalsFlash)}
                  onClick={saveGoals}
                  disabled={goalsFlash === 'saving'}
                >
                  <span className="shine" />
                  {goalsBtnText}
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: '#2a0f3a' }}>오늘 할 일 입력</div>

                <div style={S.taskRow}>
                  <input
                    style={{ ...S.input, flex: '1 1 280px' }}
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="할 일 한 줄 입력 (예: 해피콜 10명)"
                  />
                  <button type="button" className="press-btn" style={S.taskBtn} onClick={addTask}>
                    추가
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>등록된 할 일이 없어요.</div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    {tasks.map((t) => (
                      <div key={t.id} style={{ ...S.item, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <button type="button" className="press-btn" style={S.checkBtn} onClick={() => toggleTask(t)} aria-label="체크">
                            {t.done ? '✓' : ''}
                          </button>
                          <div
                            style={{
                              fontWeight: 950,
                              textDecoration: t.done ? 'line-through' : 'none',
                              opacity: t.done ? 0.55 : 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.content}
                          </div>
                        </div>
                        <button type="button" className="press-btn" style={{ ...S.ghostBtn, padding: '8px 10px', fontSize: 12 }} onClick={() => deleteTask(t.id)}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedYMD !== todayYMD ? (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>
                    ※ 홈 체크리스트는 “오늘({todayYMD})”만 보여요. 오늘 체크 연동이 목적이면 달력에서 오늘을 선택해 입력하세요.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.calTop}>
              <button
                type="button"
                className="press-btn"
                style={S.calBtn}
                onClick={() => {
                  const d = new Date(monthCursor);
                  d.setMonth(d.getMonth() - 1);
                  setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                ◀
              </button>

              <div style={{ fontSize: 16, fontWeight: 950, color: '#2a0f3a' }}>{monthLabel}</div>

              <button
                type="button"
                className="press-btn"
                style={S.calBtn}
                onClick={() => {
                  const d = new Date(monthCursor);
                  d.setMonth(d.getMonth() + 1);
                  setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                ▶
              </button>
            </div>

            <div style={{ padding: '0 14px 12px' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={S.pill}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...S.dot, ...S.dotAttend }} />
                    근태 <b style={{ marginLeft: 4 }}>{monthLegendCounts.attend}</b>
                  </span>
                </span>
                <span style={S.pill}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...S.dot, ...S.dotWork }} />
                    업무 <b style={{ marginLeft: 4 }}>{monthLegendCounts.work}</b>
                  </span>
                </span>
                <span style={S.pill}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...S.dot, ...S.dotEtc }} />
                    기타 <b style={{ marginLeft: 4 }}>{monthLegendCounts.etc}</b>
                  </span>
                </span>
              </div>
            </div>

            <div style={S.calGridWrap}>
              <div style={S.weekHead}>
                {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                  <div key={w} style={S.weekHeadCell}>
                    {w}
                  </div>
                ))}
              </div>

              <div style={S.daysGrid}>
                {gridDays.map((d) => {
                  const ymd = fmtYMD(d);
                  const inMonth = d.getMonth() === monthCursor.getMonth();
                  const selected = sameYMD(d, selectedDate);
                  const isToday = sameYMD(d, today);

                  const list = schedulesByDate[ymd] || [];
                  let workN = 0;
                  let attendN = 0;
                  let etcN = 0;

                  list.forEach((s) => {
                    const meta = getScheduleCategoryMeta(s.category);
                    if (meta.kind === 'attendance') attendN += 1;
                    else if (meta.kind === 'work') workN += 1;
                    else etcN += 1;
                  });

                  const style: any = {
                    ...S.dayCell,
                    ...(selected ? S.dayCellSelected : null),
                    ...(isToday ? S.dayCellToday : null),
                    opacity: inMonth ? 1 : 0.35,
                  };

                  return (
                    <div key={ymd} style={style} onClick={() => setSelectedDate(d)} title={ymd}>
                      <div style={S.dayHead}>
                        <div style={S.dayNum}>{d.getDate()}</div>
                        <div style={{ width: 14 }} />
                      </div>

                      {(attendN > 0 || workN > 0 || etcN > 0) && (
                        <div style={S.dotRow}>
                          {attendN > 0 && (
                            <span style={S.dotItem} title="근태">
                              <span style={{ ...S.dot, ...S.dotAttend }} />
                              {attendN}
                            </span>
                          )}
                          {workN > 0 && (
                            <span style={S.dotItem} title="업무">
                              <span style={{ ...S.dot, ...S.dotWork }} />
                              {workN}
                            </span>
                          )}
                          {etcN > 0 && (
                            <span style={S.dotItem} title="기타">
                              <span style={{ ...S.dot, ...S.dotEtc }} />
                              {etcN}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: 14, borderTop: '1px solid rgba(60,30,90,0.08)' }}>
              <div style={S.sectionTitle}>선택한 날짜: {fmtKoreanDate(selectedDate)}</div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...S.pill, opacity: 0.92 }}>
                  🙂 기분 <b style={{ marginLeft: 6 }}>{getMoodEmoji(selectedMood) || '미선택'}</b>
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: '#2a0f3a' }}>스케줄 입력 (달력 연동)</div>

                <div style={S.scheduleRowTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...S.small, marginBottom: 6 }}>시간</div>
                    <input style={S.scheduleSmallInput} type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} aria-label="time" />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...S.small, marginBottom: 6 }}>카테고리</div>
                    <select style={S.scheduleSmallInput as any} value={scheduleCat} onChange={(e) => setScheduleCat(e.target.value)} aria-label="category">
                      <option value="상담">상담</option>
                      <option value="방문">방문</option>
                      <option value="해피콜">해피콜</option>
                      <option value="사은품">사은품</option>
                      <option value="배송">배송</option>
                      <option value="회의">회의</option>
                      <option value="교육">교육</option>
                      <option value="행사/이벤트">행사/이벤트</option>
                      <option value="출근">출근</option>
                      <option value="지각">지각</option>
                      <option value="조퇴">조퇴</option>
                      <option value="외출">외출</option>
                      <option value="결근">결근</option>
                      <option value="출장">출장</option>
                      <option value="퇴근">퇴근</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ ...S.small, marginBottom: 6 }}>내용</div>
                  <input
                    style={S.scheduleContentInput}
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    placeholder="예: 해피콜 10명 / 미팅 / 교육 / 방문 2건..."
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`press-btn save-flash ${scheduleFlash === 'saved' ? 'saved' : scheduleFlash === 'saving' ? 'saving' : ''}`}
                    style={S.saveBtn(scheduleFlash)}
                    onClick={addSchedule}
                    disabled={scheduleFlash === 'saving'}
                  >
                    <span className="shine" />
                    {scheduleBtnText}
                  </button>

                  <span style={{ ...S.pill, opacity: 0.92 }}>
                    선택 날짜 스케줄 <b style={{ marginLeft: 6 }}>{selectedSchedules.length}개</b>
                  </span>
                </div>

                {selectedSchedules.length === 0 ? (
                  <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>이 날짜엔 아직 스케줄이 없어요.</div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    {selectedSchedules.map((s) => {
                      const meta = getScheduleCategoryMeta(s.category);
                      return (
                        <div key={s.id} style={S.item}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                            <div style={{ minWidth: 54, fontWeight: 950, opacity: 0.8 }}>{(s.schedule_time || '--:--').slice(0, 5)}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 950, opacity: 0.75 }}>
                                <span className={meta.badgeClass}>{meta.label}</span>
                              </div>
                            </div>
                          </div>

                          <button type="button" className="press-btn" style={{ ...S.ghostBtn, padding: '8px 10px', fontSize: 12 }} onClick={() => deleteSchedule(s.id)}>
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: '#2a0f3a' }}>하루 회고</div>
                <div style={S.sectionSub}>저장 버튼을 누르면 DB(가능하면)로 저장됩니다. (작성 중은 로컬 자동 저장)</div>

                <div style={S.field}>
                  <div style={{ ...S.small, marginBottom: 6 }}>오늘 잘한 점</div>
                  <textarea style={S.textarea} value={good} onChange={(e) => setGood(e.target.value)} placeholder="예: 거절에도 흔들리지 않고 15명에게 연락함" />
                </div>

                <div style={S.field}>
                  <div style={{ ...S.small, marginBottom: 6 }}>오늘 아쉬웠던 점</div>
                  <textarea style={S.textarea} value={bad} onChange={(e) => setBad(e.target.value)} placeholder="예: 일정이 밀리면서 방문 동선이 비효율적이었음" />
                </div>

                <div style={S.field}>
                  <div style={{ ...S.small, marginBottom: 6 }}>내일 할 일</div>
                  <textarea style={S.textarea} value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)} placeholder="예: 오전 해피콜 10명 + 오후 방문 1건 확정" />
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="press-btn save-flash" style={S.saveBtn('idle')} onClick={saveReflect}>
                    <span className="shine" />
                    회고 저장
                  </button>
                </div>

                {err ? <div style={S.warn}>{err}</div> : null}
              </div>
            </div>
          </div>

          {loading ? <div style={{ marginTop: 14, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div> : null}

          <style jsx>{PAGE_STYLES}</style>
        </div>
      </div>
    </ClientShell>
  );
}

const PAGE_STYLES = `
  @keyframes floaty {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
    100% { transform: translateY(0px); }
  }

  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }

  :global(.press-btn){
    position: relative;
    transform: translateY(0) scale(1);
    transition: transform 120ms ease, filter 120ms ease, box-shadow 160ms ease, opacity 160ms ease;
    will-change: transform, filter;
  }
  :global(.press-btn:active){
    transform: translateY(1px) scale(0.985);
    filter: brightness(0.98);
  }
  :global(.press-btn:focus-visible){
    outline:none;
    box-shadow: 0 0 0 3px rgba(255,47,149,0.18);
  }

  :global(.save-flash.saving){ opacity: 0.78; }
  :global(.save-flash.saved){ animation: savePop 520ms ease both; }

  @keyframes savePop{
    0%{ transform: translateY(0) scale(1); }
    35%{ transform: translateY(-1px) scale(1.03); }
    100%{ transform: translateY(0) scale(1); }
  }

  :global(.save-flash .shine){
    position:absolute;
    inset:0;
    border-radius:inherit;
    pointer-events:none;
    opacity:0;
    background: radial-gradient(140px 60px at 22% 22%, rgba(255,255,255,0.38), rgba(255,255,255,0) 60%);
    transition: opacity 180ms ease;
  }
  :global(.save-flash:hover .shine){ opacity: 0.9; }

  :global(input[type="text"]),
  :global(input[type="tel"]),
  :global(input[type="time"]),
  :global(input[type="date"]),
  :global(select),
  :global(textarea){
    font-size:13px;
    line-height:1.2;
  }

  :global(select),
  :global(.schedule-category),
  :global(.category-select),
  :global(.cat-select){
    height:36px;
    padding:6px 10px;
  }

  :global(.time-input),
  :global(.category-input),
  :global(.content-input),
  :global(.schedule-time),
  :global(.schedule-category),
  :global(.schedule-content){
    min-height:36px;
  }

  :global(.schedule-input-row),
  :global(.schedule-form-row),
  :global(.schedule-inputs),
  :global(.schedule-grid){
    row-gap:8px;
    column-gap:10px;
  }

  :global(select){
    -webkit-appearance:none;
    -moz-appearance:none;
    appearance:none;
    background-clip:padding-box;
  }

  :global(.cat-work),
  :global(.cat-attend),
  :global(.cat-edu),
  :global(.cat-event),
  :global(.cat-etc){
    display:inline-flex;
    align-items:center;
    padding:3px 8px;
    border-radius:999px;
    font-weight:900;
    font-size:11px;
    line-height:1;
    white-space:nowrap;
  }

  :global(.cat-work){
    border:1px solid rgba(34, 197, 94, 0.22);
    background:rgba(236, 253, 245, 0.75);
    color:#065f46;
  }

  :global(.cat-attend){
    border:1px solid rgba(245, 158, 11, 0.24);
    background:rgba(255, 247, 237, 0.75);
    color:#7c2d12;
  }

  :global(.cat-edu){
    border:1px solid rgba(59, 130, 246, 0.22);
    background:rgba(239, 246, 255, 0.78);
    color:#1e40af;
  }

  :global(.cat-event){
    border:1px solid rgba(168, 85, 247, 0.22);
    background:rgba(243, 232, 255, 0.75);
    color:#5b21b6;
  }

  :global(.cat-etc){
    border:1px solid rgba(236, 72, 153, 0.18);
    background:rgba(255, 241, 242, 0.75);
    color:#9f1239;
  }
`;