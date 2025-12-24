// ✅ 파일: src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';
import { fetchLiveWeatherSlots, resolveRegionFromProfile, type WeatherSlot } from '@/lib/weatherClient';

/** ✅ 친구목록 프로필 모달(홈에서만 사용) */
type FriendProfileData = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  career: string | null;
  company: string | null;
  team: string | null;
  grade: string | null;
  avatar_url: string | null;
  badges: { code: string; name: string }[];
  counts: { likes: number; posts: number; feedback: number };
};

const EMO_QUOTES: string[] = [
  '반가워요, 저는 업쮸예요. 오늘도 대표님의 하루를 같이 기록할게요 ✨',
  '관리의 차이가 성장률의 차이입니다.',
  '중요한 건 빈 날을 줄여가는 것이에요.',
  '거절은 숫자일 뿐, 대표님의 실력은 계속 쌓이고 있어요.',
  '오늘 1건의 계약도 내일 10건의 씨앗이 됩니다.',
];

type Friend = {
  user_id: string;
  nickname: string;
  online: boolean;
  role?: string | null;
  avatarUrl?: string | null;
};

type ScheduleRow = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null;
  category?: string | null;
};

type DaySummary = { date: string; count: number };
type LatestGoals = { day_goal: string | null; week_goal: string | null; month_goal: string | null };
type RebuttalSummary = { id: string; category: string | null; content: string | null };
type DailyTask = { id: string; content: string; done: boolean; task_date: string };

type ContractLevel = 'new' | 'contract1' | 'contract2' | 'contract3';
type ContractDay = { date: string; newCount: number; c1: number; c2: number; c3: number };

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}
function getKoreanWeekday(date: Date) {
  return date.toLocaleDateString('ko-KR', { weekday: 'long' });
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

type ScheduleCategoryKind = 'work' | 'attendance' | 'etc';
type ScheduleCategoryMeta = { label: string; badgeClass: string; kind: ScheduleCategoryKind };

function getScheduleCategoryMeta(category: string | null | undefined): ScheduleCategoryMeta {
  const c = (category ?? '').toLowerCase();

  if (c === 'consult' || c === '상담') return { label: '상담', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'visit' || c === '방문') return { label: '방문', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'happy' || c === '해피콜') return { label: '해피콜', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'gift' || c === 'present' || c === '선물' || c === '사은품')
    return { label: '사은품', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'delivery' || c === '택배' || c === '배송') return { label: '배송', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'meeting' || c === '회의') return { label: '회의', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'edu' || c === 'education' || c === '교육') return { label: '교육', badgeClass: 'schedule-cat-edu', kind: 'work' };
  if (c === 'event' || c === '행사' || c === '행사/이벤트')
    return { label: '행사/이벤트', badgeClass: 'schedule-cat-event', kind: 'work' };

  if (c === 'absent' || c === 'late' || c === 'early' || c === 'out' || c === 'close' || c === '근태')
    return { label: '근태', badgeClass: 'schedule-cat-attend', kind: 'attendance' };

  return { label: '기타', badgeClass: 'schedule-cat-etc', kind: 'etc' };
}

function getMoodEmoji(code: string | null | undefined): string {
  if (!code) return '';
  if (code === '🙂' || code === '😎' || code === '🔥') return code;
  switch (code) {
    case 'tired':
      return '😭';
    case 'down':
      return '😔';
    case 'smile':
      return '🙂';
    case 'focus':
      return '😐';
    case 'fire':
      return '🔥';
    case 'confident':
      return '😎';
    default:
      return '🙂';
  }
}

function getCareerLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case '0-1':
      return '0~1년';
    case '2':
      return '2년';
    case '3':
      return '3년';
    case '4-5':
      return '4~5년';
    case '6-9':
      return '6~9년';
    case '10+':
      return '10년 이상';
    default:
      return code;
  }
}

function pickContractLevel(statusRaw: any): ContractLevel | null {
  const s = String(statusRaw ?? '').replace(/\s/g, '').toLowerCase();
  if (!s) return null;
  if (s.includes('신규') || s === 'new') return 'new';
  if (s.includes('계약3') || s === 'contract3') return 'contract3';
  if (s.includes('계약2') || s === 'contract2') return 'contract2';
  if (s.includes('계약1') || s === 'contract1') return 'contract1';
  if (s.includes('계약') || s.includes('contract')) return 'contract1';
  return null;
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
  } catch {
    // ignore
  }
}

/** ✅ 목업 친구(기존 유지). 실제 연동은 나중에 friends 테이블로 교체 */
const MOCK_FRIENDS: Friend[] = [
  { user_id: '7b1c3a3e-1b2c-4e6a-9e1a-2f5d7c9a1b2c', nickname: '김영업', online: true, role: '팀장' },
  { user_id: '9f2a1c4d-7e3b-4c1a-8d2f-1a3b5c7d9e0f', nickname: '박성장', online: true, role: '사원' },
  { user_id: '4c7d9e0f-9f2a-4d7e-8b3c-1a2f3b5c6d7e', nickname: '이멘탈', online: false, role: '대리' },
];

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('영업인');
  const [email, setEmail] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [industry, setIndustry] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [careerYears, setCareerYears] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  const [mainGoal, setMainGoal] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));

  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [todayWeather, setTodayWeather] = useState<WeatherSlot[]>([]); // ✅ 항상 배열 유지
  const [latestGoals, setLatestGoals] = useState<LatestGoals | null>(null);
  const [recentRebuttals, setRecentRebuttals] = useState<RebuttalSummary[]>([]);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);

  const [contractDays, setContractDays] = useState<ContractDay[]>([]);
  const [moodByDate, setMoodByDate] = useState<Record<string, string>>({});

  const [weatherLabel, setWeatherLabel] = useState<string>('서울');
  const [weatherLat, setWeatherLat] = useState<number>(37.5665);
  const [weatherLon, setWeatherLon] = useState<number>(126.978);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // ✅ 배지 패널
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [myBadges, setMyBadges] = useState<{ code: string; name: string }[]>([]);

  // ✅ 감성 문구
  const [emotionIndex, setEmotionIndex] = useState(0);

  // ✅ 친구 검색
  const [friendQuery, setFriendQuery] = useState('');

  // ✅ 응원 카운트(새로고침 유지)
  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [cheerPopKey, setCheerPopKey] = useState<string | null>(null);

  // ✅ 친구 프로필 모달(홈 전용)
  const [fpOpen, setFpOpen] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpData, setFpData] = useState<FriendProfileData | null>(null);
  const [fpError, setFpError] = useState<string | null>(null);

  // ✅ 친구 목록(기존 유지)
  const friends = useMemo(() => MOCK_FRIENDS, []);

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.nickname.toLowerCase().includes(q));
  }, [friendQuery, friends]);

  const badgeIcon = (code: string) => {
    const c = (code || '').toLowerCase();
    if (c.includes('top')) return '👑';
    if (c.includes('streak')) return '🔥';
    if (c.includes('likes')) return '💖';
    if (c.includes('mvp')) return '🏆';
    if (c.includes('amount')) return '💎';
    if (c.includes('attendance')) return '📅';
    if (c.includes('posts')) return '📝';
    return '✨';
  };

  const loadMyMonthlyBadges = async (uid: string) => {
    try {
      const today = formatDate(new Date());
      const { data, error } = await supabase
        .from('monthly_badges')
        .select('badge_code, badge_name, month_start, month_end')
        .eq('winner_user_id', uid)
        .lte('month_start', today)
        .gte('month_end', today);

      if (error) {
        console.error('monthly_badges error', error);
        setMyBadges([]);
        return;
      }

      const rows = (data ?? []) as any[];
      setMyBadges(
        rows
          .map((r) => ({ code: String(r.badge_code ?? ''), name: String(r.badge_name ?? '') }))
          .filter((x) => x.code || x.name)
      );
    } catch (e) {
      console.error('loadMyMonthlyBadges fatal', e);
      setMyBadges([]);
    }
  };

  // ✅ 응원 로컬 저장
  useEffect(() => {
    const savedCounts = lsGetJson<Record<string, number>>('uplog_cheer_counts', {});
    setCheerCounts(savedCounts);
  }, []);

  const persistCheerCounts = (next: Record<string, number>) => {
    setCheerCounts(next);
    lsSetJson('uplog_cheer_counts', next);
  };

  const getDailyKey = () => `uplog_cheer_daily_${todayStr}`;
  const getDailyMap = () => lsGetJson<Record<string, number>>(getDailyKey(), {});
  const setDailyMap = (m: Record<string, number>) => lsSetJson(getDailyKey(), m);

  const canCheerToday = (toUid: string) => {
    const m = getDailyMap();
    return (m[toUid] ?? 0) < 3;
  };
  const incDaily = (toUid: string) => {
    const m = getDailyMap();
    m[toUid] = (m[toUid] ?? 0) + 1;
    setDailyMap(m);
  };

  // ✅ 채팅: 무조건 1:1 방 열기(/chats/open)
  const goDirectChat = (toUid: string) => {
    if (!toUid) return;
    router.push(`/chats/open?to=${encodeURIComponent(toUid)}`);
  };

  const handleCheerRemote = async (toUid: string) => {
    if (!toUid) return;

    if (!canCheerToday(toUid)) {
      setCheerPopKey(`LIMIT_${toUid}`);
      window.setTimeout(() => setCheerPopKey((cur) => (cur === `LIMIT_${toUid}` ? null : cur)), 650);
      return;
    }

    const prevCounts = cheerCounts ?? {};
    const optimisticCounts = { ...prevCounts, [toUid]: (prevCounts[toUid] ?? 0) + 1 };
    persistCheerCounts(optimisticCounts);
    incDaily(toUid);

    setCheerPopKey(toUid);
    window.setTimeout(() => setCheerPopKey((cur) => (cur === toUid ? null : cur)), 520);

    try {
      const { data, error } = await supabase.rpc('cheer_friend', { p_to: toUid });
      if (error || !(data as any)?.ok) {
        console.warn('cheer_friend rpc skipped/fail', error, data);
      }
    } catch (e) {
      console.warn('cheer_friend rpc fatal (ignored)', e);
    }
  };

  // ✅ 친구 프로필 열기(무한 로딩 방지 타임아웃 포함)
  const openFriendProfile = async (targetUserId: string) => {
    if (!targetUserId) return;

    setFpOpen(true);
    setFpLoading(true);
    setFpError(null);
    setFpData(null);

    const timeout = window.setTimeout(() => {
      setFpLoading(false);
      setFpError('프로필 정보를 불러오지 못했어요.');
    }, 6000);

    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, nickname, name, career, company, team, grade, avatar_url')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (profErr) console.warn('friend profile profiles error', profErr);

      const today = formatDate(new Date());
      const { data: bData, error: bErr } = await supabase
        .from('monthly_badges')
        .select('badge_code, badge_name, month_start, month_end')
        .eq('winner_user_id', targetUserId)
        .lte('month_start', today)
        .gte('month_end', today);

      if (bErr) console.warn('friend profile badges error', bErr);

      const { count: postsCount } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      let feedbackCount = 0;
      try {
        const { count } = await supabase
          .from('objection_feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId);
        feedbackCount = count ?? 0;
      } catch {
        feedbackCount = 0;
      }

      let likesCount = 0;
      try {
        const { count } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId);
        likesCount = count ?? 0;
      } catch {
        likesCount = 0;
      }

      const row: any =
        prof ?? {
          user_id: targetUserId,
          nickname: null,
          name: null,
          career: null,
          company: null,
          team: null,
          grade: null,
          avatar_url: null,
        };

      const badges =
        (bData ?? [])
          .map((x: any) => ({ code: String(x.badge_code ?? ''), name: String(x.badge_name ?? '') }))
          .filter((x) => x.code || x.name) ?? [];

      setFpData({
        user_id: row.user_id,
        nickname: row.nickname ?? null,
        name: row.name ?? null,
        career: row.career ?? null,
        company: row.company ?? null,
        team: row.team ?? null,
        grade: row.grade ?? null,
        avatar_url: row.avatar_url ?? null,
        badges,
        counts: { likes: likesCount ?? 0, posts: postsCount ?? 0, feedback: feedbackCount ?? 0 },
      });

      setFpLoading(false);
    } catch (e) {
      console.warn('openFriendProfile fatal', e);
      setFpLoading(false);
      setFpError('프로필 정보를 불러오지 못했어요.');
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const newRebuttalCount = useMemo(() => recentRebuttals.length, [recentRebuttals]);
  const newScheduleCountToday = useMemo(
    () => schedules.filter((s) => s.schedule_date === todayStr).length,
    [schedules, todayStr]
  );

  // 감성 슬라이드
  useEffect(() => {
    if (EMO_QUOTES.length === 0) return;
    const timer = setInterval(() => setEmotionIndex((prev) => (prev + 1) % EMO_QUOTES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // ✅✅✅ 날씨는 "그때의 lat/lon"으로 불러오도록 인자 전달
  const loadDashboardData = async (uid: string, baseMonth: Date, lat: number, lon: number) => {
    const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0, 23, 59, 59);

    const from = formatDate(monthStart);
    const to = formatDate(monthEnd);

    const fromISO = monthStart.toISOString();
    const toISO = monthEnd.toISOString();

    const moodMap: Record<string, string> = {};
    const contractByDate: Record<string, { newCount: number; c1: number; c2: number; c3: number }> = {};

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, title, schedule_date, schedule_time, category')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to)
      .order('schedule_date', { ascending: true });

    if (scheduleError) console.error('schedules error', scheduleError);

    const safeSchedules = (scheduleRows ?? []) as ScheduleRow[];
    setSchedules(safeSchedules);

    const summaryMap: Record<string, number> = {};
    safeSchedules.forEach((row) => {
      summaryMap[row.schedule_date] = (summaryMap[row.schedule_date] ?? 0) + 1;
    });
    setDaySummaries(Object.entries(summaryMap).map(([date, count]) => ({ date, count })));

    const { data: upRows, error: upError } = await supabase
      .from('up_logs')
      .select('id, day_goal, week_goal, month_goal, log_date, mood')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to)
      .order('log_date', { ascending: true });

    if (!upError && upRows && upRows.length > 0) {
      const last = upRows[upRows.length - 1] as any;
      setLatestGoals({
        day_goal: last.day_goal ?? null,
        week_goal: last.week_goal ?? null,
        month_goal: last.month_goal ?? null,
      });

      (upRows as any[]).forEach((row) => {
        if (!row.log_date) return;
        const raw = row.log_date;
        const str = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
        if (row.mood) moodMap[str] = row.mood as string;
      });
    } else {
      setLatestGoals(null);
      if (upError) console.error('up_logs error', upError);
    }

    try {
      const { data: customerRows, error: customerError } = await supabase
        .from('customers')
        .select('id, status, created_at')
        .eq('user_id', uid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO);

      if (!customerError && customerRows) {
        (customerRows as any[]).forEach((row) => {
          const raw = (row as any).created_at;
          if (!raw) return;

          const dateStr = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
          const level = pickContractLevel((row as any).status);
          if (!level) return;

          if (!contractByDate[dateStr]) contractByDate[dateStr] = { newCount: 0, c1: 0, c2: 0, c3: 0 };

          if (level === 'new') contractByDate[dateStr].newCount += 1;
          if (level === 'contract1') contractByDate[dateStr].c1 += 1;
          if (level === 'contract2') contractByDate[dateStr].c2 += 1;
          if (level === 'contract3') contractByDate[dateStr].c3 += 1;
        });
      } else if (customerError) {
        console.error('customers error', customerError);
      }
    } catch (err) {
      console.error('customers fatal error', err);
    }

    const lastDay = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0).getDate();
    const list: ContractDay[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const cur = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), d);
      const ds = formatDate(cur);
      const obj = contractByDate[ds] ?? { newCount: 0, c1: 0, c2: 0, c3: 0 };
      list.push({ date: ds, newCount: obj.newCount, c1: obj.c1, c2: obj.c2, c3: obj.c3 });
    }
    setContractDays(list);
    setMoodByDate(moodMap);

    const { data: rebutRows, error: rebutError } = await supabase
      .from('rebuttals')
      .select('id, category, content')
      .eq('user_id', uid)
      .order('id', { ascending: false })
      .limit(3);

    if (!rebutError && rebutRows) setRecentRebuttals(rebutRows as RebuttalSummary[]);
    else {
      setRecentRebuttals([]);
      if (rebutError) console.error('rebuttals error', rebutError);
    }

    const today = formatDate(new Date());
    const { data: taskRows, error: taskError } = await supabase
      .from('daily_tasks')
      .select('id, task_date, content, done')
      .eq('user_id', uid)
      .eq('task_date', today)
      .order('id', { ascending: true });

    if (!taskError && taskRows) {
      setTodayTasks(
        taskRows.map((t: any) => ({
          id: t.id,
          task_date: t.task_date,
          content: t.content ?? '',
          done: !!t.done,
        }))
      );
    } else {
      setTodayTasks([]);
      if (taskError) console.error('daily_tasks error', taskError);
    }

    // ✅✅✅ 날씨: lat/lon 인자로 받은 값으로 호출 + 배열 가드
    try {
      const live = await fetchLiveWeatherSlots(lat, lon);
      setTodayWeather(Array.isArray(live) ? (live as WeatherSlot[]) : []);
    } catch (e) {
      console.error('weather live error', e);
      setTodayWeather([]);
    }
  };

  // init
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, nickname, industry, grade, career, company, department, team, avatar_url, main_goal, address_text, lat, lon')
        .eq('user_id', user.id)
        .maybeSingle();

      let lat = weatherLat;
      let lon = weatherLon;
      let label = weatherLabel;

      if (!profileError && profile) {
        const p: any = profile;

        if (p.nickname) setNickname(p.nickname);
        else if (p.name) setNickname(p.name);
        else if (user.email) setNickname(user.email.split('@')[0]);

        if (p.industry) setIndustry(p.industry);
        if (p.grade) setGrade(p.grade);
        if (p.career) setCareerYears(getCareerLabel(p.career));
        if (p.company) setCompany(p.company);
        if (p.department) setDepartment(p.department);
        if (p.team) setTeam(p.team);
        if (p.main_goal) setMainGoal(p.main_goal);

        const region = resolveRegionFromProfile(p);
        label = region.label;
        lat = region.lat;
        lon = region.lon;

        setWeatherLabel(label);
        setWeatherLat(lat);
        setWeatherLon(lon);

        if (p.avatar_url) setProfileImage(p.avatar_url);
      } else if (user.email) {
        setNickname(user.email.split('@')[0]);
      }

      await loadDashboardData(user.id, currentMonth, lat, lon);
      await loadMyMonthlyBadges(user.id);

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    loadDashboardData(userId, currentMonth, weatherLat, weatherLon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, userId, weatherLat, weatherLon]);

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const days: Date[] = [];
    const startWeekday = firstDay.getDay();

    for (let i = 0; i < startWeekday; i++) {
      days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - (startWeekday - i)));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }, [currentMonth]);

  const selectedDateSchedules = useMemo(() => {
    const list = schedules.filter((s) => s.schedule_date === selectedDate);
    return [...list].sort((a, b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));
  }, [schedules, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }, [selectedDate]);

  const selectedDateContract = useMemo(() => {
    const row = contractDays.find((x) => x.date === selectedDate);
    if (!row) return { total: 0, newCount: 0, c1: 0, c2: 0, c3: 0 };
    const total = row.newCount + row.c1 + row.c2 + row.c3;
    return { total, newCount: row.newCount, c1: row.c1, c2: row.c2, c3: row.c3 };
  }, [contractDays, selectedDate]);

  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const handleToggleTask = async (task: DailyTask) => {
    if (!userId) return;
    const nextDone = !task.done;

    setTodayTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)));

    const { error } = await supabase.from('daily_tasks').update({ done: nextDone }).eq('id', task.id).eq('user_id', userId);

    if (error) {
      setTodayTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      console.error('toggle daily_task error', error);
    }
  };

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

    const newContracts = (contractDays ?? []).reduce((acc, d) => acc + (d?.newCount ?? 0), 0);

    return { work, attend, etc, newContracts };
  }, [schedules, contractDays]);

  if (loading) {
    return (
      <div className="home-root">
        <div className="home-inner">
          <div className="home-loading">대시보드를 불러오는 중입니다...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const avatarInitial = nickname && nickname.length > 0 ? nickname.trim()[0]?.toUpperCase() : 'U';
  const careerCombined =
    grade && careerYears ? `${grade} · ${careerYears}` : grade ? grade : careerYears ? careerYears : '경력/직함 미설정';
  const orgCombined = [company, department, team].filter(Boolean).join(' / ') || '조직/팀 미설정';

  const avatarSrc = profileImage ? `${getAvatarSrc(profileImage)}?v=${Date.now()}` : '';

  return (
    <div className="home-root">
      <div className="home-inner">
        {/* 헤더 */}
        <header className="home-header">
          <div className="home-header-top">
            <div className="home-header-left">
              <div className="home-logo-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lolo.png" alt="UPLOG 로고" className="home-logo" />

                <div className="home-logo-text-wrap">
                  <div className="wave-text" aria-label="UPLOG">
                    {'UPLOG'.split('').map((ch, i) => (
                      <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                  <div className="home-logo-sub">오늘도 나를 UP시키다</div>
                </div>
              </div>

              <div className="home-date">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </div>
            </div>

            {/* 프로필 카드 */}
            <div className="home-header-profile">
              <div className="profile-box">
                <button type="button" className="profile-settings-btn" onClick={() => router.push('/settings')} aria-label="설정">
                  <span className="ps-gear">⚙</span>
                  <span className="ps-text">설정</span>
                </button>

                <button type="button" className="profile-click" onClick={() => setBadgeOpen(true)} aria-label="프로필 열기">
                  <div className="profile-main">
                    <div className="profile-avatar">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="프로필" />
                      ) : (
                        avatarInitial
                      )}
                    </div>

                    <div className="profile-main-text">
                      <div className="profile-name">{nickname}</div>
                      {email && <div className="profile-email">{email}</div>}
                    </div>
                  </div>

                  <div className="badge-icons" aria-label="내 배지 아이콘">
                    {(myBadges.length > 0
                      ? myBadges.slice(0, 6)
                      : [
                          { code: 'monthly_top', name: '월간 1등' },
                          { code: 'streak_month_king', name: '연속왕' },
                          { code: 'most_likes_month', name: '좋아요왕' },
                          { code: 'mvp_count_month', name: '실적건수 MVP' },
                          { code: 'mvp_amount_month', name: '실적금액 MVP' },
                          { code: 'attendance_month_mvp', name: '출석 MVP' },
                        ]
                    ).map((b, i) => (
                      <span key={`${b.code}-${i}`} className={`badge-icon badge-${(b.code || 'etc').toLowerCase()}`} title={b.name}>
                        {badgeIcon(b.code)}
                      </span>
                    ))}
                  </div>

                  <div className="profile-meta">
                    <span className="profile-pill">{industry ?? '업종 미설정'}</span>
                    <span className="profile-pill">{careerCombined}</span>
                    <span className="profile-pill">{orgCombined}</span>
                  </div>

                  <div className="profile-stats">
                    <span className="profile-stat-pill">
                      친구 <strong>{friends.length}명</strong>
                    </span>
                    <span className="profile-stat-pill">
                      새 피드백 <strong>{newRebuttalCount}건</strong>
                    </span>
                    <span className="profile-stat-pill">
                      오늘 스케줄 <strong>{newScheduleCountToday}건</strong>
                    </span>
                  </div>
                </button>

                {badgeOpen && (
                  <div className="mp-backdrop" onClick={() => setBadgeOpen(false)}>
                    <div className="mp-panel" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="mp-close" onClick={() => setBadgeOpen(false)}>
                        ✕
                      </button>

                      <div className="mp-title">내 배지</div>
                      <div className="mp-sub">이번 달 기준으로 보여드려요.</div>

                      {myBadges.length === 0 ? (
                        <div className="mp-empty">아직 이번 달 수상 배지가 없어요. 그래도 오늘의 기록이 쌓이면 바로 바뀝니다 ✨</div>
                      ) : (
                        <ul className="mp-list">
                          {myBadges.map((b, idx) => (
                            <li key={`${b.code}-${idx}`} className="mp-item">
                              <span className="mp-emoji">{badgeIcon(b.code)}</span>
                              <span className="mp-name">{b.name || b.code}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 말풍선 + 마스코트 */}
          <div className="home-header-bottom">
            <div className="coach-row">
              <div className="coach-bubble-panel" aria-live="polite">
                <div className="coach-pill">오늘의 U P 한마디</div>
                <div className="coach-text">{EMO_QUOTES[emotionIndex] ?? ''}</div>
              </div>

              <div className="coach-mascot-wrap" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="coach-mascot-img" src="/assets/upzzu1.png" alt="" />
                <span className="coach-sparkle s1">✨</span>
                <span className="coach-sparkle s2">✨</span>
              </div>
            </div>
          </div>
        </header>

        {/* ✅✅✅ 메뉴버튼: 문자도우미를 커뮤니티 앞으로 (스왑) */}
        <section className="home-quick-nav">
          <Link href="/my-up" className="quick-card">
            나의 U P 관리
          </Link>
          <Link href="/customers" className="quick-card">
            고객관리
          </Link>
          <Link href="/rebuttal" className="quick-card">
            반론 아카이브
          </Link>
          <Link href="/sms-helper" className="quick-card">
            문자 도우미
          </Link>
          <Link href="/community" className="quick-card">
            커뮤니티
          </Link>
        </section>

        {/* 날씨 */}
        <section className="weather-wide">
          <div className="weather-panel">
            <div className="weather-panel-header">
              <div>
                <div className="section-title">오늘 날씨</div>
                <div className="section-sub">{weatherLabel} · 외근/미팅 계획 세울 때 참고하세요.</div>
              </div>
            </div>

            <div className="weather-strip">
              {(Array.isArray(todayWeather) ? todayWeather : []).map((w, idx) => (
                <div key={idx} className="weather-slot">
                  <div className="weather-time">
                    {weatherEmoji(w.desc)} {w.time}
                  </div>
                  <div className="weather-temp">{w.temp}°C</div>
                  <div className="weather-desc">{w.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="home-main">
          {/* 상단 요약 */}
          <section className="home-top-summary">
            <div className="summary-card goals-card">
              <h3 className="summary-title">월 · 주 · 일 목표</h3>

              <div className="goal-inline">
                <span className="goal-tag">이번 달</span>
                <span className="goal-text">{latestGoals?.month_goal || '이달엔 30건 이상 계약하기'}</span>

                <span className="goal-divider">|</span>

                <span className="goal-tag">이번 주</span>
                <span className="goal-text">{latestGoals?.week_goal || '신규고객 3명 이상'}</span>

                <span className="goal-divider">|</span>

                <span className="goal-tag">오늘</span>
                <span className="goal-text-strong">{latestGoals?.day_goal || '가망고객 안부 문자인사하기'}</span>
              </div>

              <div className="goal-main">
                최종 목표 <span className="goal-main-strong">“{mainGoal || '1등 찍어보자'}”</span>
              </div>

              <div className="tiny-note fill-note">
                ※ 목표/체크 항목 입력은 <strong>나의 U P 관리</strong>에서만 합니다. 홈에서는 체크만 가능해요.
              </div>
            </div>

            <div className="summary-card todo-card">
              <h3 className="summary-title">오늘 할 일</h3>
              <p className="summary-desc">
                <strong>나의 U P 관리</strong>에서 입력한 체크항목을 여기에서 한 번에 체크할 수 있어요.
              </p>

              {todayTasks.length === 0 ? (
                <div className="todo-empty big">
                  <div className="todo-empty-title">아직 등록된 할 일이 없어요.</div>
                  <div className="todo-empty-sub">
                    오늘의 할 일은 <strong>나의 U P 관리</strong>에서 추가해 주세요.
                  </div>
                </div>
              ) : (
                <ul className="todo-list big">
                  {todayTasks.map((task) => (
                    <li key={task.id} className="todo-item big">
                      <button
                        type="button"
                        className={'todo-check ' + (task.done ? 'todo-check-done' : '')}
                        onClick={() => handleToggleTask(task)}
                        aria-label="체크"
                      >
                        {task.done ? '✓' : ''}
                      </button>
                      <span className={'todo-text ' + (task.done ? 'todo-text-done' : '')}>{task.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 달력 + 상세 + 친구 */}
          <section className="home-section calendar-section">
            <div className="section-header">
              <div>
                <div className="section-title">CALENDAR &amp; PERFORMANCE</div>
                <div className="section-sub">달력에서 스케줄/기분/실적을 한눈에 보고, 아래에서 상세를 확인해요.</div>
              </div>
              <div className="month-nav">
                <button type="button" className="nav-btn" onClick={() => moveMonth(-1)}>
                  ◀
                </button>
                <div className="month-label">{getMonthLabel(currentMonth)}</div>
                <button type="button" className="nav-btn" onClick={() => moveMonth(1)}>
                  ▶
                </button>
              </div>
            </div>

            <div className="calendar-legend" aria-label="달력 표시 가이드">
              <div className="legend-item">
                <span className="legend-dot dot-attend" />
                <span className="legend-label">
                  근태 <b className="legend-n">{monthLegendCounts.attend}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-work" />
                <span className="legend-label">
                  업무 <b className="legend-n">{monthLegendCounts.work}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-etc" />
                <span className="legend-label">
                  기타 <b className="legend-n">{monthLegendCounts.etc}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-new" />
                <span className="legend-label">
                  신규계약 <b className="legend-n">{monthLegendCounts.newContracts}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-pill">🙂 기분</span>
              </div>
              <div className="legend-item legend-hint">※ 달력 안 표시는 “이모지 + DOT + 개수”만 보여요</div>
            </div>

            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} className="calendar-weekday">
                  {w}
                </div>
              ))}

              {daysInMonth.map((d, index) => {
                const dStr = formatDate(d);
                const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                const isToday = dStr === todayStr;
                const isSelected = dStr === selectedDate;

                const schedulesForDay = schedules.filter((s) => s.schedule_date === dStr);
                const moodCode = moodByDate[dStr];

                const cd = contractDays.find((x) => x.date === dStr);
                const newPerf = cd ? cd.newCount : 0;

                let workN = 0;
                let attendN = 0;
                let etcN = 0;
                schedulesForDay.forEach((s) => {
                  const meta = getScheduleCategoryMeta(s.category);
                  if (meta.kind === 'attendance') attendN += 1;
                  else if (meta.kind === 'work') workN += 1;
                  else etcN += 1;
                });

                return (
                  <button
                    key={`${dStr}-${index}`}
                    type="button"
                    className={[
                      'calendar-day',
                      !isCurrentMonth ? 'calendar-day-out' : '',
                      isToday ? 'calendar-day-today' : '',
                      isSelected ? 'calendar-day-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDate(dStr)}
                  >
                    <div className="calendar-day-head">
                      <div className="calendar-day-number">{d.getDate()}</div>
                      {moodCode && <div className="calendar-day-mood">{getMoodEmoji(moodCode)}</div>}
                    </div>

                    {(attendN > 0 || workN > 0 || etcN > 0 || newPerf > 0) && (
                      <div className="calendar-dot-row" aria-label="카테고리별 개수">
                        {attendN > 0 && (
                          <span className="calendar-dot-item" title="근태">
                            <span className="calendar-dot dot-attend" />
                            <span className="calendar-dot-num">{attendN}</span>
                          </span>
                        )}
                        {workN > 0 && (
                          <span className="calendar-dot-item" title="업무">
                            <span className="calendar-dot dot-work" />
                            <span className="calendar-dot-num">{workN}</span>
                          </span>
                        )}
                        {etcN > 0 && (
                          <span className="calendar-dot-item" title="기타">
                            <span className="calendar-dot dot-etc" />
                            <span className="calendar-dot-num">{etcN}</span>
                          </span>
                        )}
                        {newPerf > 0 && (
                          <span className="calendar-dot-item" title="신규계약">
                            <span className="calendar-dot dot-new" />
                            <span className="calendar-dot-num">{newPerf}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="calendar-footer">
              <span>
                오늘은 <strong>{getKoreanWeekday(new Date())}</strong> 입니다.
              </span>
            </div>

            <div className="right-card calendar-selected-card">
              <div className="right-card-header">
                <div>
                  <div className="section-title">선택한 날짜 상세</div>
                  <div className="section-sub">
                    {selectedDateLabel} · 스케줄 {selectedDateSchedules.length}개 · 실적 {selectedDateContract.total}건
                  </div>
                </div>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 일정이 없어요.
                  <br />
                  스케줄 추가/수정은 <strong>나의 U P 관리 · 고객관리</strong>에서 할 수 있어요.
                </div>
              ) : (
                <ul className="schedule-list">
                  {selectedDateSchedules.map((s) => {
                    const meta = getScheduleCategoryMeta(s.category);
                    const timeText = s.schedule_time ? s.schedule_time.slice(0, 5) : '--:--';

                    return (
                      <li key={s.id} className="schedule-item">
                        <div className="schedule-time">{timeText}</div>
                        <div className="schedule-content">
                          <span className={'schedule-category ' + meta.badgeClass}>{meta.label}</span>
                          <span className="schedule-title">{s.title}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* ✅ 친구 목록 */}
            <div className="friends-card">
              <div className="friends-head">
                <div className="friends-title">
                  친구 목록 <span className="friends-hint">이름을 누르면 바로 1:1 채팅으로 이동해요</span>
                </div>

                <div className="friends-right">
                  <button type="button" className="uplog-chat-btn" onClick={() => router.push('/chats')}>
                    UPLOG채팅
                  </button>

                  <div className="friends-search-wrap">
                    <input
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      className="friends-search"
                      placeholder="닉네임 검색"
                      aria-label="친구 검색"
                    />
                  </div>
                </div>
              </div>

              <div className="friends-list">
                {filteredFriends.length === 0 ? (
                  <div className="friends-empty">검색 결과가 없어요.</div>
                ) : (
                  filteredFriends.map((f) => {
                    const cheerN = cheerCounts?.[f.user_id] ?? 0;
                    const pop = cheerPopKey === f.user_id;
                    const limitPop = cheerPopKey === `LIMIT_${f.user_id}`;

                    return (
                      <div key={f.user_id} className="friend-row">
                        <button type="button" className="friend-name-btn" onClick={() => goDirectChat(f.user_id)}>
                          <span className={'friend-dot ' + (f.online ? 'on' : 'off')} />
                          <span className="friend-nick">
                            {f.nickname}
                            {f.role ? <span className="friend-role">{f.role}</span> : null}
                          </span>
                          <span className="friend-sub">이름 클릭 = 1:1 채팅</span>
                        </button>

                        <div className="friend-actions">
                          <button type="button" className="fa-pill fa-profile" onClick={() => openFriendProfile(f.user_id)} title="프로필">
                            🙂 <span className="fa-txt">프로필</span>
                          </button>

                          <button type="button" className="fa-pill fa-chat" onClick={() => goDirectChat(f.user_id)} title="채팅">
                            💬 <span className="fa-txt">채팅</span>
                          </button>

                          <button
                            type="button"
                            className={'fa-pill fa-cheer ' + (limitPop ? 'fa-limit' : '')}
                            onClick={() => handleCheerRemote(f.user_id)}
                            title="응원"
                          >
                            <span className="fa-heart">❤️</span>
                            <span className="fa-txt">응원</span>
                            <span className="fa-cheer-n">{cheerN}</span>
                            {pop && <span className="fa-pop">팡!</span>}
                            {limitPop && <span className="fa-pop fa-pop-limit">오늘 3회</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ✅ 홈 전용 친구 프로필 모달 */}
              {fpOpen && (
                <div className="fp-backdrop" onClick={() => setFpOpen(false)}>
                  <div className="fp-panel" onClick={(e) => e.stopPropagation()}>
                    <button className="fp-close" type="button" onClick={() => setFpOpen(false)}>
                      ✕
                    </button>

                    <div className="fp-title">프로필</div>

                    {fpLoading && <div className="fp-loading">불러오는 중...</div>}
                    {!fpLoading && fpError && <div className="fp-error">{fpError}</div>}

                    {!fpLoading && !fpError && fpData && (
                      <div className="fp-body">
                        <div className="fp-top">
                          <div className="fp-avatar">
                            {fpData.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`${getAvatarSrc(fpData.avatar_url)}?v=${Date.now()}`} alt="프로필" />
                            ) : (
                              (fpData.nickname || fpData.name || 'U')[0]
                            )}
                          </div>
                          <div className="fp-main">
                            <div className="fp-name">{fpData.nickname || fpData.name || '익명 영업인'}</div>
                            <div className="fp-sub">
                              {(fpData.grade || '직함 미설정') + ' · ' + (getCareerLabel(fpData.career) || '경력 미설정')}
                            </div>
                            <div className="fp-sub">{[fpData.company, fpData.team].filter(Boolean).join(' / ') || '회사/팀 미설정'}</div>
                          </div>
                        </div>

                        <div className="fp-badges">
                          <div className="fp-sec-title">배지</div>
                          {fpData.badges.length === 0 ? (
                            <div className="fp-muted">이번 달 배지가 없어요.</div>
                          ) : (
                            <div className="fp-badge-row">
                              {fpData.badges.slice(0, 8).map((b, i) => (
                                <span key={`${b.code}-${i}`} className="fp-badge" title={b.name}>
                                  {badgeIcon(b.code)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="fp-counts">
                          <div className="fp-count-pill">
                            좋아요 <b>{fpData.counts.likes}</b>
                          </div>
                          <div className="fp-count-pill">
                            게시글 <b>{fpData.counts.posts}</b>
                          </div>
                          <div className="fp-count-pill">
                            피드백 <b>{fpData.counts.feedback}</b>
                          </div>
                        </div>

                        <div className="fp-actions">
                          <button type="button" className="fp-btn ghost" onClick={() => goDirectChat(fpData.user_id)}>
                            💬 채팅하기
                          </button>
                          <button type="button" className="fp-btn pink" onClick={() => handleCheerRemote(fpData.user_id)}>
                            ❤️ 응원하기
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ✅ 문의하기 실시간 채팅: 복구 */}
        <button type="button" onClick={() => router.push('/support')} className="floating-support-btn">
          <span>문의하기</span>
          <span>실시간 채팅</span>
        </button>

        <style jsx>{styles}</style>
      </div>
    </div>
  );
}

const styles = `
:global(:root) {
  --uplog-accent-pink: #f472b6;
  --uplog-accent-purple: #a855f7;
  --soft-ink: #201235;
  --soft-sub: #6f60b8;
  --soft-shadow: 0 14px 26px rgba(0,0,0,0.10);
}
:global(html), :global(body) { margin: 0; padding: 0; }
:global(a) { color: inherit; text-decoration: none; }
:global(a:hover) { text-decoration: none; }
:global(.sr-only){
  position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
@media (prefers-reduced-motion: reduce) {
  .wave-text span, .badge-icon, .coach-mascot-wrap, .coach-sparkle { animation: none !important; transition: none !important; }
}

/* Layout */
.home-root{
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background:
    radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(900px 560px at 82% 18%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 64%),
    linear-gradient(180deg, #fff3fb 0%, #f6f2ff 45%, #eef8ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--soft-ink);
}
.home-inner{ max-width: 1200px; margin: 0 auto; }
.section-title{ font-size: 18px; font-weight: 900; color: #5d3bdb; }
.section-sub{ font-size: 14px; margin-top: 4px; color: var(--soft-sub); }
.home-loading{ margin-top: 120px; text-align: center; font-size: 20px; }

/* Header */
.home-header{
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 26px 38px;
  border-radius: 26px;
  background:
    radial-gradient(900px 520px at 20% 20%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%),
    linear-gradient(135deg, rgba(236, 72, 153, 0.75), rgba(124, 58, 237, 0.72));
  box-shadow: 0 16px 28px rgba(0,0,0,0.18);
  margin-bottom: 16px;
  color: #ffffff;
  overflow: visible;
}
.home-header-top{
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 16px;
  align-items: start;
}
.home-header-profile{ display:flex; justify-content:flex-end; align-items:flex-start; }
.home-logo-row{ display:flex; align-items:center; gap: 12px; }
.home-logo{
  width: 70px; height: 70px;
  border-radius: 22px; padding: 8px;
  background: rgba(255,255,255,0.16);
  box-shadow: 0 10px 18px rgba(0,0,0,0.14);
}
.home-logo-text-wrap{ display:flex; flex-direction: column; gap: 4px; }
.wave-text{ display:inline-flex; gap: 2px; }
.wave-text span{
  display:inline-block;
  font-size: 36px;
  font-weight: 900;
  letter-spacing: 5px;
  color: rgba(255,255,255,0.96);
  animation: uplogBounce 2.2s ease-in-out infinite;
  transform-origin: center bottom;
  text-shadow: 0 2px 10px rgba(0,0,0,0.18);
}
@keyframes uplogBounce{
  0%,100%{ transform: translateY(0); }
  50%{ transform: translateY(-5px); }
}
.home-logo-sub{ font-size: 16px; font-weight: 900; color: rgba(255,255,255,0.92); text-shadow: 0 2px 8px rgba(0,0,0,0.18); }
.home-date{ font-size: 18px; font-weight: 900; margin-top: 10px; color: rgba(255,255,255,0.92); text-shadow: 0 2px 10px rgba(0,0,0,0.18); }

/* Profile */
.profile-box{
  width: 420px;
  min-width: 420px;
  height: 220px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.96);
  border-radius: 22px;
  padding: 12px 14px;
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  display:flex;
  flex-direction: column;
  gap: 6px;
  border: 2px solid rgba(227, 218, 251, 0.95);
  color: #211437;
  position: relative;
}
.profile-settings-btn{
  position: absolute;
  top: 10px;
  right: 10px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(217,204,255,0.75);
  background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,240,255,0.92));
  color: #3a1f62;
  font-weight: 950;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 8px 14px rgba(0,0,0,0.10);
}
.profile-click{ border: none; background: transparent; padding: 0; text-align: left; cursor: pointer; width: 100%; }
.profile-main{ display:flex; align-items:center; gap: 12px; padding-right: 86px; margin-top: 2px; }
.profile-avatar{
  width: 72px; height: 72px; border-radius: 999px;
  background: radial-gradient(circle at top left, rgba(244,114,182,0.85) 0, rgba(168,85,247,0.78) 60%);
  display:flex; align-items:center; justify-content:center;
  color: #fff; font-weight: 900; font-size: 22px;
  overflow:hidden; flex-shrink: 0;
  box-shadow: 0 8px 16px rgba(168,85,247,0.22);
}
.profile-avatar img{ width:100%; height:100%; object-fit: cover; }
.profile-name{ font-size: 18px; font-weight: 950; line-height: 1.15; }
.profile-email{ font-size: 13px; color: #7b6ac4; }

.badge-icons{ display:flex; gap: 8px; padding: 6px 0 2px; flex-wrap: wrap; }
.badge-icon{
  width: 34px; height: 34px; border-radius: 999px;
  display:inline-flex; align-items:center; justify-content:center;
  background:#fff;
  border: 2px solid rgba(180, 160, 255, 0.50);
  box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(168, 85, 247, 0.12);
}
.profile-meta{ display:flex; flex-wrap:wrap; gap: 8px; margin-top: 6px; font-size: 12px; }
.profile-pill{ font-size: 12px; padding: 4px 9px; border-radius: 999px; background: #f4f0ff; color: #352153; }
.profile-stats{ display:flex; gap: 8px; margin-top: 6px; font-size: 11px; overflow: hidden; }
.profile-stat-pill{
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #f7f2ff;
  color: #352153;
  border: 1px solid #e0d4ff;
  white-space: nowrap;
}
.profile-stat-pill strong{ color: #ff4f9f; }

/* Badge Modal */
.mp-backdrop{ position: fixed; inset: 0; background: rgba(15, 23, 42, 0.50); display:flex; align-items:center; justify-content:center; z-index: 60; }
.mp-panel{ width: 380px; max-width: 92vw; border-radius: 26px; background:#fff; box-shadow: 0 24px 54px rgba(15,23,42,0.38); padding: 18px 18px 16px; position: relative; border: 1px solid rgba(226,232,240,0.9); }
.mp-close{ position:absolute; top: 10px; right: 12px; width: 30px; height: 30px; border-radius: 999px; border:none; background:#f3f4ff; color:#4b2d7a; cursor:pointer; font-size: 14px; }
.mp-title{ font-size: 18px; font-weight: 950; color:#1b1030; }
.mp-sub{ margin-top: 4px; font-size: 13px; color:#7a69c4; }
.mp-empty{ margin-top: 12px; border-radius: 16px; padding: 12px; background:#faf7ff; border: 1px dashed rgba(165, 148, 230, 0.9); font-size: 14px; color:#7461be; line-height: 1.5; }
.mp-list{ list-style:none; margin: 12px 0 0; padding:0; display:flex; flex-direction: column; gap: 8px; }
.mp-item{ display:flex; align-items:center; gap: 10px; border-radius: 14px; padding: 10px; background:#faf7ff; border: 1px solid rgba(212, 200, 255, 0.9); }
.mp-emoji{ width: 34px; height: 34px; border-radius: 999px; display:flex; align-items:center; justify-content:center; background:#fff; border:1px solid #eadcff; }
.mp-name{ font-size: 15px; font-weight: 900; color:#2a1236; }

/* Coach */
.home-header-bottom{ margin-top: 6px; }
.coach-row{ display:flex; align-items: flex-end; justify-content: space-between; gap: 14px; }
.coach-bubble-panel{
  flex: 1;
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.26);
  border-radius: 22px;
  padding: 14px 16px;
  box-shadow: 0 14px 26px rgba(0,0,0,0.14);
  min-height: 148px;
  max-height: 148px;
  display:flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}
.coach-pill{
  display:inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.28);
  font-size: 13px;
  font-weight: 950;
  align-self: flex-start;
}
.coach-text{
  margin-top: 10px;
  font-size: 18px;
  font-weight: 950;
  line-height: 1.35;
  text-shadow: 0 2px 10px rgba(0,0,0,0.18);
  letter-spacing: -0.2px;
  min-height: 72px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
}
.coach-mascot-wrap{
  width: 180px;
  height: 180px;
  flex: 0 0 180px;
  position: relative;
  display:flex;
  align-items:flex-end;
  justify-content:flex-end;
  margin-bottom: -10px;
  animation: floaty 2.8s ease-in-out infinite;
}
@keyframes floaty{ 0%,100%{ transform: translateY(8px);} 50%{ transform: translateY(-2px);} }
.coach-mascot-img{ width: 180px; height: 180px; object-fit: contain; filter: drop-shadow(0 18px 22px rgba(0,0,0,0.22)); }
.coach-sparkle{ position:absolute; font-size: 18px; opacity: 0.9; }
.coach-sparkle.s1{ top: 18px; left: 18px; }
.coach-sparkle.s2{ top: 52px; left: 46px; }

/* Quick Nav */
.home-quick-nav{
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.quick-card{
  height: 44px;
  border-radius: 18px;
  padding: 0 10px;
  background: linear-gradient(135deg, rgba(249,115,184,0.88), rgba(168,85,247,0.86));
  box-shadow: 0 10px 16px rgba(0,0,0,0.12);
  border: 1px solid rgba(255,255,255,0.66);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 14px;
  font-weight: 900;
  color:#fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 860px){
  .home-header-top{ grid-template-columns: 1fr; }
  .home-header-profile{ justify-content:flex-start; }
  .profile-box{ width: 100%; min-width: 0; }
  .home-quick-nav{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 520px){
  .home-quick-nav{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Weather */
.weather-wide{ margin-bottom: 10px; }
.weather-panel{
  border-radius: 18px;
  background: rgba(255,255,255,0.96);
  padding: 10px 14px;
  box-shadow: var(--soft-shadow);
  border: 1px solid #e3dafb;
  color: #241336;
}
.weather-strip{ display:flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.weather-slot{ min-width: 100px; border-radius: 12px; background: #f7f3ff; padding: 6px; font-size: 13px; }
.weather-time{ font-weight: 800; margin-bottom: 2px; }
.weather-temp{ font-size: 20px; font-weight: 950; color: rgba(243,95,166,0.95); }
.weather-desc{ font-size: 13px; color: #7a68c4; }

.home-main{ display:flex; flex-direction: column; gap: 14px; }

/* Summary */
.home-top-summary{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 860px){
  .home-top-summary{ grid-template-columns: 1fr; }
}
.summary-card{
  border-radius: 20px;
  padding: 18px 18px;
  background: rgba(255,255,255,0.96);
  box-shadow: var(--soft-shadow);
  border: 1px solid #e5ddff;
  color:#211437;
  display:flex;
  flex-direction: column;
}
.summary-title{ font-size: 20px; font-weight: 950; margin-bottom: 10px; color:#5d3bdb; }
.summary-desc{ font-size: 15px; color:#7a69c4; margin: 0 0 10px; }
.tiny-note{ margin-top: 10px; font-size: 12px; color:#7a69c4; }
.fill-note{ margin-top: auto; padding-top: 12px; }

.goal-inline{ display:flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 6px; font-size: 17px; font-weight: 950; }
.goal-tag{ padding: 5px 11px; border-radius: 999px; background: #ede9ff; color: #5b21b6; font-size: 13px; }
.goal-text-strong{ font-size: 19px; color: #ec4899; }
.goal-text{ font-size: 17px; color: #372153; }
.goal-divider{ opacity: .35; font-weight: 900; }
.goal-main{ margin-top: 12px; font-size: 15px; color: #7e68c7; }
.goal-main-strong{ color: #f153aa; font-weight: 950; }

.todo-empty{ margin-top: 10px; border-radius: 16px; padding: 10px 12px; background:#faf7ff; border: 1px dashed rgba(165,148,230,0.9); font-size: 14px; color:#7461be; line-height: 1.5; }
.todo-empty.big{ margin-top: 12px; padding: 16px 14px; min-height: 110px; display:flex; flex-direction: column; justify-content: center; gap: 6px; }
.todo-empty-title{ font-size: 16px; font-weight: 950; color:#5b21b6; }
.todo-empty-sub{ font-size: 14px; color:#7a69c4; }

.todo-list{ margin: 10px 0 0; padding: 0; list-style: none; }
.todo-list.big{ margin-top: 12px; }
.todo-item{ display:flex; align-items:center; gap: 10px; padding: 4px 0; font-size: 15px; }
.todo-item.big{ padding: 6px 0; font-size: 16px; }
.todo-check{ width: 22px; height: 22px; border-radius: 8px; border: 1.5px solid rgba(241,83,170,0.85); background:#fff; font-size: 13px; font-weight: 950; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.todo-check-done{ background: linear-gradient(135deg, rgba(241,83,170,0.92), rgba(163,109,255,0.90)); box-shadow: 0 0 10px rgba(241,83,170,0.30); color:#fff; }
.todo-text-done{ color:#a39ad3; text-decoration: line-through; }

/* Calendar */
.home-section{
  border-radius: 22px;
  background: rgba(255,255,255,0.96);
  border: 1px solid #e5ddff;
  box-shadow: var(--soft-shadow);
  padding: 16px;
}
.section-header{
  display:flex;
  align-items:flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.month-nav{ display:flex; align-items:center; gap: 10px; }
.nav-btn{
  width: 38px; height: 38px; border-radius: 12px;
  border: 1px solid #e5ddff;
  background: #faf7ff;
  cursor: pointer;
  font-weight: 950;
  color: #4b2d7a;
}
.month-label{ font-weight: 950; color:#2a1236; }
.calendar-legend{ display:flex; flex-wrap: wrap; gap: 10px; align-items:center; margin: 8px 0 12px; }
.legend-item{ display:flex; align-items:center; gap: 8px; font-size: 13px; color:#4b2d7a; }
.legend-dot{ width: 10px; height: 10px; border-radius: 999px; display:inline-block; }
.dot-attend{ background: rgba(245,158,11,0.95); }
.dot-work{ background: rgba(16,185,129,0.95); }
.dot-etc{ background: rgba(99,102,241,0.95); }
.dot-new{ background: rgba(239,68,68,0.95); }
.legend-pill{ padding: 4px 10px; border-radius: 999px; background: #f4f0ff; }
.legend-n{ color:#ff4f9f; }
.legend-hint{ opacity: .75; }
.calendar-grid{ display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.calendar-weekday{ font-size: 12px; font-weight: 950; color:#6b4dd8; text-align:center; padding: 6px 0; }
.calendar-day{
  border-radius: 16px;
  padding: 10px 10px 12px;
  border: 1px solid #efe7ff;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  min-height: 76px;
}
.calendar-day-out{ opacity: .38; background: #fbfbff; }
.calendar-day-today{ border-color: rgba(244,114,182,0.75); box-shadow: 0 0 0 3px rgba(244,114,182,0.12); }
.calendar-day-selected{ border-color: rgba(168,85,247,0.85); box-shadow: 0 0 0 3px rgba(168,85,247,0.14); }
.calendar-day-head{ display:flex; align-items:center; justify-content: space-between; }
.calendar-day-number{ font-weight: 950; color:#2a1236; }
.calendar-day-mood{ font-size: 14px; }
.calendar-dot-row{ display:flex; gap: 8px; margin-top: 8px; align-items:center; flex-wrap: wrap; }
.calendar-dot-item{ display:inline-flex; align-items:center; gap: 6px; font-size: 12px; color:#3a1f62; }
.calendar-dot{ width: 8px; height: 8px; border-radius: 999px; display:inline-block; }
.calendar-dot-num{ font-weight: 950; }
.calendar-footer{ margin-top: 10px; font-size: 13px; color:#6f60b8; }

.right-card{ margin-top: 14px; border-radius: 18px; border: 1px solid #e5ddff; background: #fbf9ff; padding: 14px; }
.right-card-header{ display:flex; align-items:flex-end; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.empty-text{ padding: 14px; border-radius: 14px; background:#fff; border: 1px dashed rgba(165,148,230,0.7); color:#6f60b8; line-height: 1.45; font-weight: 700; }
.schedule-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction: column; gap: 10px; }
.schedule-item{ display:flex; gap: 10px; align-items:flex-start; padding: 10px; border-radius: 14px; background:#fff; border: 1px solid rgba(226,232,240,0.9); }
.schedule-time{ width: 52px; font-weight: 950; color:#4b2d7a; }
.schedule-content{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
.schedule-title{ font-weight: 900; color:#2a1236; }
.schedule-category{ font-size: 12px; font-weight: 950; padding: 5px 10px; border-radius: 999px; }
.schedule-cat-work{ background: rgba(16,185,129,0.14); color: rgba(5,150,105,1); border: 1px solid rgba(16,185,129,0.30); }
.schedule-cat-attend{ background: rgba(245,158,11,0.14); color: rgba(217,119,6,1); border: 1px solid rgba(245,158,11,0.30); }
.schedule-cat-edu{ background: rgba(59,130,246,0.14); color: rgba(37,99,235,1); border: 1px solid rgba(59,130,246,0.30); }
.schedule-cat-event{ background: rgba(236,72,153,0.14); color: rgba(219,39,119,1); border: 1px solid rgba(236,72,153,0.30); }
.schedule-cat-etc{ background: rgba(99,102,241,0.14); color: rgba(79,70,229,1); border: 1px solid rgba(99,102,241,0.30); }

/* Friends: 덩어리 느낌 + 네모 상자 제거 */
.friends-card{
  margin-top: 14px;
  border-radius: 22px;
  padding: 14px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(900px 220px at 12% 0%, rgba(244,114,182,0.22) 0%, rgba(244,114,182,0) 55%),
    radial-gradient(900px 240px at 82% 10%, rgba(168,85,247,0.20) 0%, rgba(168,85,247,0) 60%),
    rgba(255,255,255,0.94);
  border: 2px solid rgba(227, 218, 251, 0.95);
  box-shadow: 0 18px 40px rgba(0,0,0,0.10);
}
.friends-card:before{
  content:'';
  position:absolute;
  inset: -2px;
  background: linear-gradient(90deg, rgba(244,114,182,0.35), rgba(168,85,247,0.35), rgba(59,130,246,0.30));
  filter: blur(22px);
  opacity: .55;
  pointer-events:none;
}
.friends-head{
  position: relative;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 10px;
  border-radius: 16px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(226,232,240,0.92);
  box-shadow: 0 14px 28px rgba(0,0,0,0.06);
}
.friends-title{ font-weight: 950; color:#4b2d7a; font-size: 15px; }
.friends-hint{ margin-left: 8px; font-weight: 800; font-size: 12px; color:#7a69c4; }
.friends-right{ display:flex; align-items:center; gap: 10px; flex: 0 0 auto; }

.uplog-chat-btn{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
  color: #fff;
  background: linear-gradient(90deg,#ff4fa1,#a855f7);
  border: 2px solid rgba(255,255,255,0.85);
  box-shadow: 0 14px 28px rgba(168,85,247,0.22), 0 0 0 3px rgba(244,114,182,0.12);
  white-space: nowrap;
}
.uplog-chat-btn:hover{ filter: brightness(1.03); transform: translateY(-1px); transition: 180ms ease; }
.uplog-chat-btn:active{ transform: translateY(0); }

.friends-search{
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(214,200,255,0.95);
  background: rgba(255,255,255,0.86);
  padding: 0 12px;
  font-weight: 900;
  color:#2a1236;
  outline: none;
  width: 200px;
  box-shadow: inset 0 0 0 3px rgba(168,85,247,0.08);
}
.friends-search:focus{
  border-color: rgba(244,114,182,0.70);
  box-shadow: 0 0 0 4px rgba(244,114,182,0.14), inset 0 0 0 3px rgba(168,85,247,0.08);
}

.friends-list{ position: relative; display:flex; flex-direction: column; gap: 12px; }
.friends-empty{
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.86);
  border: 1px dashed rgba(165,148,230,0.7);
  color:#7a69c4;
  font-weight: 900;
}

.friend-row{
  position: relative;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(251,249,255,0.92));
  border: 1px solid rgba(226,232,240,0.92);
  box-shadow: 0 18px 34px rgba(0,0,0,0.06);
  overflow: hidden;
}
.friend-row:before{
  content:'';
  position:absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(244,114,182,0.12), rgba(168,85,247,0.12), rgba(59,130,246,0.10));
  opacity: 0;
  transition: 220ms ease;
  pointer-events:none;
}
.friend-row:hover{
  transform: translateY(-1px);
  transition: 220ms ease;
  box-shadow: 0 22px 42px rgba(0,0,0,0.10);
}
.friend-row:hover:before{ opacity: 1; }

.friend-name-btn{
  position: relative;
  border: none;
  background: transparent;
  cursor: pointer;
  display:flex;
  align-items:center;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 16px;
}
.friend-name-btn:hover{ background: rgba(244,114,182,0.08); }
.friend-dot{
  width: 10px; height: 10px; border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(15,23,42,0.06);
}
.friend-dot.on{ background: rgba(16,185,129,0.95); }
.friend-dot.off{ background: rgba(148,163,184,0.95); }
.friend-nick{
  font-weight: 950;
  color:#2a1236;
  font-size: 15px;
  display:flex;
  align-items:center;
  gap: 8px;
  white-space: nowrap;
}
.friend-role{
  font-size: 12px;
  font-weight: 950;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(244,114,182,0.12);
  border: 1px solid rgba(244,114,182,0.25);
  color:#c02675;
}
.friend-sub{
  margin-left: 8px;
  font-size: 12px;
  font-weight: 900;
  color:#7a69c4;
  white-space: nowrap;
  opacity: .9;
}
@media (max-width: 860px){
  .friend-sub{ display:none; }
}

.friend-actions{
  display:flex;
  align-items:center;
  gap: 10px;
  flex: 0 0 auto;
}
.fa-pill{
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(214,200,255,0.85);
  background: rgba(255,255,255,0.86);
  padding: 0 12px;
  cursor: pointer;
  display:inline-flex;
  align-items:center;
  gap: 8px;
  font-weight: 950;
  color:#2a1236;
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  min-width: 104px;
  justify-content: center;
}
.fa-pill:hover{ transform: translateY(-1px); transition: 160ms ease; box-shadow: 0 14px 24px rgba(0,0,0,0.08); }
.fa-pill:active{ transform: translateY(0); }
.fa-txt{ font-size: 13px; }
.fa-profile{ box-shadow: 0 10px 18px rgba(0,0,0,0.06), 0 0 0 3px rgba(168,85,247,0.08); }
.fa-chat{ box-shadow: 0 10px 18px rgba(0,0,0,0.06), 0 0 0 3px rgba(59,130,246,0.08); }

.fa-cheer{
  background: linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,240,249,0.90));
  border-color: rgba(244,114,182,0.45);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06), 0 0 0 3px rgba(244,114,182,0.10);
  min-width: 120px;
}
.fa-heart{ font-size: 14px; }
.fa-cheer-n{
  margin-left: 2px;
  min-width: 26px;
  text-align: right;
  font-size: 14px;
  font-weight: 950;
  color:#ec4899;
}
.fa-pop{
  position:absolute;
  margin-left: 10px;
  font-size: 12px;
  font-weight: 950;
  color:#ff4fa1;
  animation: popUp 520ms ease forwards;
}
@keyframes popUp{
  0%{ transform: translateY(6px); opacity: 0; }
  30%{ transform: translateY(-2px); opacity: 1; }
  100%{ transform: translateY(-12px); opacity: 0; }
}
.fa-pop-limit{ color:#7c3aed; }
.fa-limit{
  border-color: rgba(124,58,237,0.45);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06), 0 0 0 3px rgba(124,58,237,0.10);
}

/* Friend Profile Modal */
.fp-backdrop{ position: fixed; inset: 0; background: rgba(15, 23, 42, 0.52); display:flex; align-items:center; justify-content:center; z-index: 80; padding: 18px; }
.fp-panel{
  width: 560px;
  max-width: 96vw;
  border-radius: 26px;
  background:
    radial-gradient(700px 240px at 18% 8%, rgba(244,114,182,0.22) 0%, rgba(244,114,182,0) 60%),
    radial-gradient(700px 260px at 82% 10%, rgba(168,85,247,0.20) 0%, rgba(168,85,247,0) 62%),
    rgba(255,255,255,0.96);
  border: 1px solid rgba(226,232,240,0.92);
  box-shadow: 0 26px 60px rgba(15,23,42,0.42);
  position: relative;
  padding: 18px 18px 16px;
}
.fp-close{
  position:absolute;
  top: 10px;
  right: 12px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.86);
  color:#3a1f62;
  font-weight: 950;
  box-shadow: 0 10px 18px rgba(0,0,0,0.10);
}
.fp-title{ font-size: 18px; font-weight: 950; color:#1b1030; }
.fp-loading, .fp-error{
  margin-top: 12px;
  border-radius: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.86);
  border: 1px dashed rgba(165,148,230,0.7);
  font-weight: 900;
  color:#6f60b8;
}
.fp-body{ margin-top: 12px; }
.fp-top{ display:flex; gap: 12px; align-items:center; }
.fp-avatar{
  width: 84px; height: 84px; border-radius: 999px;
  background: radial-gradient(circle at top left, rgba(244,114,182,0.86) 0, rgba(168,85,247,0.78) 62%);
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-weight: 950; font-size: 24px;
  overflow:hidden; flex: 0 0 auto;
  box-shadow: 0 18px 32px rgba(168,85,247,0.22);
}
.fp-avatar img{ width:100%; height:100%; object-fit: cover; }
.fp-main{ min-width: 0; }
.fp-name{ font-size: 20px; font-weight: 950; color:#2a1236; }
.fp-sub{ margin-top: 4px; font-size: 14px; font-weight: 900; color:#7a69c4; }

.fp-sec-title{ font-size: 14px; font-weight: 950; color:#4b2d7a; margin-bottom: 8px; }
.fp-badges{
  margin-top: 14px;
  border-radius: 18px;
  padding: 12px;
  background: rgba(255,255,255,0.70);
  border: 1px solid rgba(226,232,240,0.92);
}
.fp-muted{ font-weight: 900; color:#7a69c4; }
.fp-badge-row{ display:flex; gap: 10px; flex-wrap: wrap; }
.fp-badge{
  width: 42px; height: 42px; border-radius: 999px;
  display:inline-flex; align-items:center; justify-content:center;
  background:#fff;
  border: 2px solid rgba(180,160,255,0.50);
  box-shadow: 0 12px 18px rgba(0,0,0,0.06), 0 0 14px rgba(168,85,247,0.12);
  font-size: 18px;
}

.fp-counts{ margin-top: 12px; display:flex; gap: 10px; flex-wrap: wrap; }
.fp-count-pill{
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(214,200,255,0.85);
  font-weight: 900;
  color:#2a1236;
}
.fp-count-pill b{ color:#ec4899; }

.fp-actions{ margin-top: 14px; display:flex; gap: 10px; }
.fp-btn{
  flex: 1;
  height: 44px;
  border-radius: 16px;
  border: 1px solid rgba(214,200,255,0.85);
  background: rgba(255,255,255,0.86);
  font-weight: 950;
  cursor:pointer;
  box-shadow: 0 14px 26px rgba(0,0,0,0.08);
}
.fp-btn.ghost:hover{ background: rgba(255,255,255,0.95); }
.fp-btn.pink{
  border: 2px solid rgba(255,255,255,0.86);
  background: linear-gradient(90deg,#ff4fa1,#a855f7);
  color:#fff;
}
.fp-btn.pink:hover{ filter: brightness(1.03); }

/* Floating support button */
.floating-support-btn{
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 90;
  border: none;
  cursor: pointer;
  border-radius: 18px;
  padding: 12px 14px;
  display:flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 950;
  color: #fff;
  background: linear-gradient(135deg, rgba(244,114,182,0.95), rgba(168,85,247,0.95));
  box-shadow: 0 18px 40px rgba(0,0,0,0.18);
}
.floating-support-btn:hover{ transform: translateY(-2px); transition: 160ms ease; }
.floating-support-btn:active{ transform: translateY(0); }
`;
