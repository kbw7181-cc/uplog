// ✅ 파일: src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';
import { fetchLiveWeatherSlots, resolveRegionFromProfile, type WeatherSlot } from '@/lib/weatherClient';

// 마스코트 감성 슬라이드 문구
const EMO_QUOTES: string[] = [
  '반가워요, 저는 업쮸예요. 오늘도 대표님의 하루를 같이 기록할게요 ✨',
  '관리의 차이가 성장률의 차이입니다.',
  '중요한 건 빈 날을 줄여가는 것이에요.',
  '거절은 숫자일 뿐, 대표님의 실력은 계속 쌓이고 있어요.',
  '오늘 1건의 계약도 내일 10건의 씨앗이 됩니다.',
];

type Friend = {
  // ✅ 핵심: 채팅 open에 쓰는 값은 user_id(UUID)
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

// ✅ 고객관리 계약 그래프/달력 표시용 (신규/계약1/계약2/계약3)
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

// ========================
// 카테고리 메타 정보 (리스트 공용)
//  - ✅ 달력칸에는 "텍스트 뱃지" 절대 렌더링하지 않음
// ========================
type ScheduleCategoryKind = 'work' | 'attendance' | 'etc';
type ScheduleCategoryMeta = { label: string; badgeClass: string; kind: ScheduleCategoryKind };

function getScheduleCategoryMeta(category: string | null | undefined): ScheduleCategoryMeta {
  const c = (category ?? '').toLowerCase();

  // 업무
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

  // 근태
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

// ✅ customers.status 값을 “신규/계약1/계약2/계약3”로 표준화해서 집계
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
  const [todayWeather, setTodayWeather] = useState<WeatherSlot[]>([]);
  const [latestGoals, setLatestGoals] = useState<LatestGoals | null>(null);
  const [recentRebuttals, setRecentRebuttals] = useState<RebuttalSummary[]>([]);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);

  // ✅ 고객관리 계약(신규/계약1/2/3) 월간 집계 (달력 실적 n 표시용)
  const [contractDays, setContractDays] = useState<ContractDay[]>([]);
  const [moodByDate, setMoodByDate] = useState<Record<string, string>>({});

  // ✅ 날씨 지역(설정값 기반)
  const [weatherLabel, setWeatherLabel] = useState<string>('서울');
  const [weatherLat, setWeatherLat] = useState<number>(37.5665);
  const [weatherLon, setWeatherLon] = useState<number>(126.978);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // ✅ 배지 패널 (월간배지)
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [myBadges, setMyBadges] = useState<{ code: string; name: string }[]>([]);

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
          .map((r) => ({
            code: String(r.badge_code ?? ''),
            name: String(r.badge_name ?? ''),
          }))
          .filter((x) => x.code || x.name)
      );
    } catch (e) {
      console.error('loadMyMonthlyBadges fatal', e);
      setMyBadges([]);
    }
  };

  // ✅ 감성 문구 자동 슬라이드
  const [emotionIndex, setEmotionIndex] = useState(0);
  useEffect(() => {
    if (EMO_QUOTES.length === 0) return;
    const timer = setInterval(() => setEmotionIndex((prev) => (prev + 1) % EMO_QUOTES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // ✅ 친구(목업 + 검색 필터)
  const [friendQuery, setFriendQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // ✅ 응원 카운트(새로고침 유지)
  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [cheerPopKey, setCheerPopKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('uplog_cheer_counts');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') setCheerCounts(obj);
      }
    } catch {
      // ignore
    }
  }, []);

  const persistCheerCounts = (next: Record<string, number>) => {
    setCheerCounts(next);
    try {
      localStorage.setItem('uplog_cheer_counts', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleCheer = (f: Friend) => {
    const key = f.user_id;
    const next = { ...(cheerCounts ?? {}) };
    next[key] = (next[key] ?? 0) + 1;
    persistCheerCounts(next);

    setCheerPopKey(key);
    window.setTimeout(() => {
      setCheerPopKey((cur) => (cur === key ? null : cur));
    }, 520);
  };

  // ✅ 목업: 실제 연동 시 friends를 DB로 교체하면 됨.
  //    지금은 “필드명(user_id)”만 맞춰서 /chats/open 안정화 목적.
  const friends: Friend[] = [
    { user_id: '00000000-0000-0000-0000-000000000001', nickname: '김영업', online: true, role: '팀장' },
    { user_id: '00000000-0000-0000-0000-000000000002', nickname: '박성장', online: true, role: '사원' },
    { user_id: '00000000-0000-0000-0000-000000000003', nickname: '이멘탈', online: false, role: '대리' },
  ];

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.nickname.toLowerCase().includes(q));
  }, [friendQuery]);

  // ✅ 홈 상단 카운트
  const newRebuttalCount = useMemo(() => recentRebuttals.length, [recentRebuttals]);
  const newScheduleCountToday = useMemo(
    () => schedules.filter((s) => s.schedule_date === todayStr).length,
    [schedules, todayStr]
  );

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

      if (!profileError && profile) {
        const p: any = profile;

        if (p.nickname) setNickname(p.nickname);
        else if (p.name) setNickname(p.name);
        else if (user.email) setNickname(user.email.split('@')[0]);

        if (p.avatar_url) setProfileImage(p.avatar_url);
        if (p.industry) setIndustry(p.industry);
        if (p.grade) setGrade(p.grade);
        if (p.career) setCareerYears(getCareerLabel(p.career));
        if (p.company) setCompany(p.company);
        if (p.department) setDepartment(p.department);
        if (p.team) setTeam(p.team);
        if (p.main_goal) setMainGoal(p.main_goal);

        // ✅ 날씨 지역(설정값 기반): lat/lon 우선, 없으면 address_text 매핑
        const region = resolveRegionFromProfile(p);
        setWeatherLabel(region.label);
        setWeatherLat(region.lat);
        setWeatherLon(region.lon);

        // ✅ 프로필 이미지 src 정리(스토리지 경로면 public url로 변환)
        if (p.avatar_url) setProfileImage(getAvatarSrc(p.avatar_url));
      } else if (user.email) {
        setNickname(user.email.split('@')[0]);
      }

      await loadDashboardData(user.id, currentMonth);
      await loadMyMonthlyBadges(user.id);

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    loadDashboardData(userId, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, userId, weatherLat, weatherLon]);

  const loadDashboardData = async (uid: string, baseMonth: Date) => {
    const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0, 23, 59, 59);

    const from = formatDate(monthStart);
    const to = formatDate(monthEnd);

    const fromISO = monthStart.toISOString();
    const toISO = monthEnd.toISOString();

    const moodMap: Record<string, string> = {};
    const contractByDate: Record<string, { newCount: number; c1: number; c2: number; c3: number }> = {};

    // schedules
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

    // up_logs (목표/기분)
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

    // ✅ customers -> 달력 “신규계약 n”
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

    // 월 전체 날짜 채우기
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

    // rebuttals
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

    // daily_tasks (홈에서는 체크만)
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

    // ✅✅✅ 날씨 실데이터(설정 지역 기반) + ✅ 배열 가드
    try {
      const live = await fetchLiveWeatherSlots(weatherLat, weatherLon);
      const safe = Array.isArray(live) ? (live as WeatherSlot[]) : [];
      setTodayWeather(safe);
    } catch (e) {
      console.error('weather live error', e);
      const now = new Date();
      const mock: WeatherSlot[] = [];
      for (let i = 0; i < 6; i++) {
        const h = now.getHours() + i * 3;
        mock.push({
          time: `${(h % 24).toString().padStart(2, '0')}:00`,
          temp: 0,
          desc: '날씨 불러오기 실패',
        });
      }
      setTodayWeather(mock);
    }
  };

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

  // ✅ 선택 날짜 실적(고객관리 계약 단계 합)
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
      alert('오늘 할 일 상태 저장 중 오류가 발생했어요.');
    }
  };

  // ✅ (추가) 달력 상단 “카테고리별 총합” 표시용
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

  // ✅ 여기 핵심: Storage 경로든 URL이든 안전 변환 + 캐시 버스트
  const avatarSrc = profileImage ? `${getAvatarSrc(profileImage)}?v=${Date.now()}` : '';

  return (
    <div className="home-root">
      <div className="home-inner">
        {/* ★ 헤더 */}
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

            {/* ✅ 프로필 카드 */}
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

          {/* ✅ 말풍선 + 마스코트 */}
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

        {/* ✅ 메뉴 버튼 5개 (절대 제거 금지) */}
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
          <Link href="/community" className="quick-card">
            커뮤니티
          </Link>
          <Link href="/sms-helper" className="quick-card">
            문자 도우미
          </Link>
        </section>

        {/* ✅ 날씨 (유지) */}
        <section className="weather-wide">
          <div className="weather-panel">
            <div className="weather-panel-header">
              <div>
                <div className="section-title">오늘 날씨</div>
                <div className="section-sub">
                  {weatherLabel} · 외근/미팅 계획 세울 때 참고하세요.
                </div>
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

            {/* ✅ 친구 카드 */}
<div className="right-card friend-card">
  <div className="friend-card-header">
    <div>
      <div className="section-title friend-title">친구 목록 · U P 채팅</div>
      <div className="section-sub friend-sub">이름 누르면 바로 채팅방 이동, 아이콘으로 프로필/채팅/응원까지!</div>
    </div>

    <button type="button" onClick={() => router.push('/chats')} className="friend-chat-banner big">
      U P 채팅방 열기
    </button>
  </div>

  <div className="friend-tools">
    <input
      value={friendQuery}
      onChange={(e) => setFriendQuery(e.target.value)}
      placeholder="친구 검색 (닉네임)"
      className="friend-search"
    />
  </div>

  {filteredFriends.length === 0 ? (
    <div className="empty-text">
      검색 결과가 없어요.
      <br />
      닉네임을 다시 확인해 주세요.
    </div>
  ) : (
    <ul className="friends-list">
      {filteredFriends.map((friend) => {
        const key = friend.user_id;
        const count = cheerCounts[key] ?? 0;
        const popping = cheerPopKey === key;

        return (
          <li key={friend.user_id} className="friend-item-row">
            {/* ✅ 왼쪽: 온라인 + 아바타 + 이름(누르면 바로 채팅 이동) */}
            <button
              type="button"
              className="friend-row-left"
              onClick={() => {
                if (!friend.user_id) return alert('친구 user_id(UID)가 없습니다.');
                router.push(`/chats/open?to=${friend.user_id}`);
              }}
              aria-label={`${friend.nickname} 채팅 이동`}
            >
              <span className={'friend-dot ' + (friend.online ? 'friend-dot-on' : 'friend-dot-off')} />
              <div className="friend-avatar-small">{friend.avatarUrl ? '🙂' : friend.nickname[0]}</div>

              <div className="friend-name-wrap">
                <div className="friend-name-line">
                  <span className="friend-name">{friend.nickname}</span>
                  {friend.role && <span className="friend-role-pill">{friend.role}</span>}
                </div>
                <div className="friend-mini-hint">터치하면 바로 채팅으로 이동</div>
              </div>
            </button>

            {/* ✅ 오른쪽: 아이콘 액션 3개 */}
            <div className="friend-row-actions">
              <button
                type="button"
                className="friend-icon-btn"
                onClick={() => {
                  // ✅ 프로필 보기 (모달 쓰고 있으면 여기서 열면 됨)
                  // FriendProfileModal을 유지 중이면: setSelectedFriendProfile(friend.user_id) 같은 식으로 연결
                  alert('프로필 보기(연결 예정)');
                }}
                aria-label="프로필 보기"
                title="프로필 보기"
              >
                🙂<span className="sr-only">프로필</span>
              </button>

              <button
                type="button"
                className="friend-icon-btn"
                onClick={() => {
                  if (!friend.user_id) return alert('친구 user_id(UID)가 없습니다.');
                  router.push(`/chats/open?to=${friend.user_id}`);
                }}
                aria-label="채팅하기"
                title="채팅하기"
              >
                💬<span className="sr-only">채팅</span>
              </button>

              <button
                type="button"
                className={'friend-icon-btn cheer ' + (popping ? 'pop' : '')}
                onClick={() => handleCheer(friend)}
                aria-label="응원하기"
                title="응원하기"
              >
                ❤️ <span className="cheer-count">x {count}</span>
                <span className="cheer-pop">팡!</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  )}
</div>


            
          </section>
        </main>

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

  --soft-purple: rgba(168, 85, 247, 0.18);
  --soft-pink: rgba(244, 114, 182, 0.16);
  --soft-ink: #201235;
  --soft-sub: #6f60b8;
  --soft-card-border: rgba(211,196,255,0.75);
  --soft-shadow: 0 14px 26px rgba(0,0,0,0.10);
}

:global(html),
:global(body) { margin: 0; padding: 0; }

:global(a) { color: inherit; text-decoration: none; }
:global(a:hover) { text-decoration: none; }

@media (prefers-reduced-motion: reduce) {
  .wave-text span, .badge-icon, .coach-mascot-wrap, .coach-sparkle { animation: none !important; transition: none !important; }
}

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

/* 헤더 */
.home-header{
  position: relative;
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

/* 프로필 카드 */
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

/* 설정 버튼 */
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
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 8px 14px rgba(0,0,0,0.10);
}
.ps-gear{ font-size: 13px; }
.ps-text{ letter-spacing: -0.2px; }

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
  animation: badgeGlow 4.6s ease-in-out infinite;
}
@keyframes badgeGlow{ 0%{ filter: brightness(1);} 50%{ filter: brightness(1.06);} 100%{ filter: brightness(1);} }

/* ✅ 핵심: 선택자 수정(점 붙이기) */
.badge-icon.badge-monthly_top,.badge-icon.badge-weekly_top{ border-color: rgba(245,158,11,0.85); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(245,158,11,0.18); }
.badge-icon.badge-streak_month_king,.badge-icon.badge-streak_week_king,.badge-icon.badge-streak{ border-color: rgba(244,63,94,0.85); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(244,63,94,0.16); }
.badge-icon.badge-most_likes_month,.badge-icon.badge-most_likes_week,.badge-icon.badge-likes{ border-color: rgba(236,72,153,0.85); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(236,72,153,0.18); }
.badge-icon.badge-mvp_count_month,.badge-icon.badge-mvp_count_week,.badge-icon.badge-mvp{ border-color: rgba(168,85,247,0.85); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(168,85,247,0.18); }
.badge-icon.badge-mvp_amount_month,.badge-icon.badge-mvp_amount_week,.badge-icon.badge-amount{ border-color: rgba(59,130,246,0.80); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(59,130,246,0.14); }
.badge-icon.badge-attendance_month_mvp,.badge-icon.badge-attendance_week_mvp,.badge-icon.badge-attendance{ border-color: rgba(34,197,94,0.80); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(34,197,94,0.12); }
.badge-icon.badge-most_posts_month,.badge-icon.badge-most_posts_week,.badge-icon.badge-posts{ border-color: rgba(249,115,22,0.80); box-shadow: 0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(249,115,22,0.12); }

.profile-meta{ display:flex; flex-wrap:wrap; gap: 8px; margin-top: 6px; font-size: 12px; }
.profile-pill{ font-size: 12px; padding: 4px 9px; border-radius: 999px; background: #f4f0ff; color: #352153; }

.profile-stats{
  display:flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  overflow: hidden;
}
.profile-stat-pill{
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #f7f2ff;
  color: #352153;
  border: 1px solid #e0d4ff;
  white-space: nowrap;
  flex: 0 0 auto;
}
.profile-stat-pill strong{ color: #ff4f9f; }

/* 배지 패널 */
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

/* 코치 */
.home-header-bottom{ margin-top: 6px; }
.coach-row{ display:flex; align-items: flex-end; justify-content: space-between; gap: 14px; }

.coach-bubble-panel{
  flex: 1;
  width: 100%;
  box-sizing: border-box;
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

/* 마스코트 */
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
.coach-sparkle.s1{ top: 18px; left: 18px; animation: tw 1.6s ease-in-out infinite; }
.coach-sparkle.s2{ top: 52px; left: 46px; animation: tw 1.8s ease-in-out infinite; }
@keyframes tw{ 0%,100%{ transform: scale(1); opacity: .85;} 50%{ transform: scale(1.25); opacity: 1;} }

/* 메뉴 버튼 */
.home-quick-nav{ display:flex; gap: 8px; margin-bottom: 14px; flex-wrap: nowrap; }
.quick-card{
  flex: 1;
  height: 44px;
  border-radius: 999px;
  padding: 0 14px;
  background: linear-gradient(135deg, rgba(249,115,184,0.88), rgba(168,85,247,0.86));
  box-shadow: 0 10px 16px rgba(0,0,0,0.12);
  border: 1px solid rgba(255,255,255,0.66);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 15px;
  font-weight: 900;
  color:#fff;
  white-space: nowrap;
}

/* 날씨 */
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

/* 목표/할일 카드 */
.home-top-summary{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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

.goals-card{ min-height: 190px; }
.todo-card{ min-height: 190px; }

.goal-inline{
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
  font-size: 17px;
  font-weight: 950;
}
.goal-tag{
  padding: 5px 11px;
  border-radius: 999px;
  background: #ede9ff;
  color: #5b21b6;
  font-size: 13px;
}
.goal-text-strong{ font-size: 19px; color: #ec4899; }
.goal-text{ font-size: 17px; color: #372153; }
.goal-divider{ opacity: .35; font-weight: 900; }
.goal-main{ margin-top: 12px; font-size: 15px; color: #7e68c7; }
.goal-main-strong{ color: #f153aa; font-weight: 950; }

.todo-empty{
  margin-top: 10px;
  border-radius: 16px;
  padding: 10px 12px;
  background:#faf7ff;
  border: 1px dashed rgba(165,148,230,0.9);
  font-size: 14px;
  color:#7461be;
  line-height: 1.5;
}
.todo-empty.big{
  margin-top: 12px;
  padding: 16px 14px;
  min-height: 110px;
  display:flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.todo-empty-title{ font-size: 16px; font-weight: 950; color:#5b21b6; }
.todo-empty-sub{ font-size: 14px; color:#7a69c4; }

.todo-list{ margin: 10px 0 0; padding: 0; list-style: none; }
.todo-list.big{ margin-top: 12px; }
.todo-item{ display:flex; align-items:center; gap: 10px; padding: 4px 0; font-size: 15px; }
.todo-item.big{ padding: 6px 0; font-size: 16px; }
.todo-check{ width: 22px; height: 22px; border-radius: 8px; border: 1.5px solid rgba(241,83,170,0.85); background:#fff; font-size: 13px; font-weight: 950; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.todo-check-done{ background: linear-gradient(135deg, rgba(241,83,170,0.92), rgba(163,109,255,0.90)); box-shadow: 0 0 10px rgba(241,83,170,0.30); color:#fff; }
.todo-text-done{ color:#a39ad3; text-decoration: line-through; }

/* 달력 */
.home-section{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
.calendar-section{ grid-template-columns: repeat(1, minmax(0, 1fr)); }
.section-header{ margin-bottom: 6px; grid-column: 1 / -1; display:flex; justify-content: space-between; align-items:flex-end; gap: 10px; }
.month-nav{ display:flex; align-items:center; gap: 6px; }
.nav-btn{ border-radius: 999px; border:none; padding: 6px 10px; font-size: 13px; background: rgba(240,232,255,0.85); color:#5a3cb2; cursor:pointer; font-weight: 900; }
.month-label{ font-size: 15px; font-weight: 900; color:#372153; }

/* 달력 가이드 */
.calendar-legend{
  grid-column: 1 / -1;
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items:center;
  justify-content:flex-start;
  margin: 2px 0 8px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(229,221,255,0.75);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
}
.legend-item{ display:flex; align-items:center; gap: 8px; font-size: 12px; font-weight: 950; color:#372153; }
.legend-dot{ width: 10px; height: 10px; border-radius: 999px; display:inline-block; }
.dot-attend{ background: linear-gradient(135deg, rgba(251,113,133,0.95), rgba(249,115,22,0.95)); }
.dot-work{ background: linear-gradient(135deg, rgba(244,114,182,0.95), rgba(232,121,249,0.95)); }
.dot-etc{ background: rgba(148,163,184,0.95); }
.dot-new{ background: linear-gradient(135deg, rgba(34,211,238,0.95), rgba(59,130,246,0.92)); }

.legend-pill{
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(243,244,255,0.92);
  border: 1px solid rgba(217,204,255,0.75);
}
.legend-label{ display:inline-flex; align-items: baseline; gap: 6px; }
.legend-n{ font-size: 13px; color:#ff4f9f; letter-spacing: -0.2px; }
.legend-hint{
  margin-left: auto;
  opacity: .85;
  font-weight: 900;
  color:#6f60b8;
}

.calendar-grid{
  background: rgba(255,255,255,0.96);
  border-radius: 16px;
  padding: 6px;
  box-shadow: var(--soft-shadow);
  display:grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  grid-column: 1 / -1;
  border: 1px solid rgba(229,221,255,0.85);
}
.calendar-weekday{ text-align:center; font-size: 13px; font-weight: 900; color:#7f6bd5; }
.calendar-day{
  border-radius: 14px;
  border: 1px solid rgba(229,221,255,0.65);
  background: rgba(250,247,255,0.92);
  padding: 7px 5px;
  min-height: 92px;
  font-size: 12px;
  display:flex;
  flex-direction: column;
  align-items: stretch;
  cursor: pointer;
  color:#241336;
  transition: all 0.12s ease;
}
.calendar-day-out{ opacity: .35; }
.calendar-day-today{ box-shadow: 0 0 0 1px rgba(241,83,170,0.85); }
.calendar-day-selected{ box-shadow: 0 0 0 2px rgba(164,91,255,0.85); background: linear-gradient(135deg, rgba(245,230,255,0.85), rgba(255,225,241,0.82)); }
.calendar-day-head{ display:flex; justify-content: space-between; align-items:center; }
.calendar-day-number{ font-weight: 950; font-size: 13px; }
.calendar-day-mood{ font-size: 14px; }

.calendar-dot-row{
  margin-top: 10px;
  display:flex;
  gap: 8px;
  align-items:center;
  flex-wrap: wrap;
  padding: 2px 2px 0;
}
.calendar-dot-item{
  display:inline-flex;
  align-items:center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.70);
  border: 1px solid rgba(229,221,255,0.65);
}
.calendar-dot{ width: 10px; height: 10px; border-radius: 999px; display:inline-block; }
.calendar-dot-num{ font-size: 11px; font-weight: 950; color:#372153; line-height: 1; }

.calendar-footer{ grid-column: 1 / -1; margin-top: 4px; font-size: 14px; color:#7e6fd6; font-weight: 900; }

.right-card{ background: rgba(255,255,255,0.96); border-radius: 20px; padding: 12px 14px; box-shadow: var(--soft-shadow); border: 1px solid rgba(217,204,255,0.85); color:#211437; }
.calendar-selected-card{ grid-column: 1 / -1; margin-top: 8px; }
.right-card-header{ display:flex; justify-content: space-between; align-items:flex-end; margin-bottom: 6px; }
.empty-text{ font-size: 13px; color:#7a69c4; line-height: 1.5; }

.schedule-list{ list-style:none; margin: 8px 0 0; padding: 0; }
.schedule-item{ display:grid; grid-template-columns: 70px minmax(0, 1fr); gap: 10px; font-size: 14px; padding: 6px 0; border-bottom: 1px dashed rgba(224,212,255,0.75); }
.schedule-item:last-child{ border-bottom: none; }
.schedule-time{ color: rgba(241,83,170,0.95); font-weight: 950; font-size: 14px; }
.schedule-content{ display:flex; align-items:center; gap: 10px; }
.schedule-category{ border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 950; line-height: 1; border: 1px solid transparent; white-space: nowrap; }
.schedule-cat-work{ background: rgba(254,242,255,0.90); color:#db2777; border-color: rgba(244,114,182,0.30); }
.schedule-cat-edu{ background: rgba(254,249,195,0.92); color:#a16207; border-color: rgba(250,204,21,0.35); }
.schedule-cat-event{ background: rgba(254,226,226,0.90); color:#dc2626; border-color: rgba(248,113,113,0.38); }
.schedule-cat-attend{ background: rgba(224,242,254,0.90); color:#1d4ed8; border-color: rgba(59,130,246,0.38); }
.schedule-cat-etc{ background: rgba(243,244,255,0.92); color:#4b5563; border-color: rgba(148,163,184,0.38); }
.schedule-title{ color:#241336; font-size: 14px; }

/* 친구 */
.friend-card{ grid-column: 1 / -1; margin-top: 14px; padding: 16px 20px 20px; border-radius: 26px; border: 2px solid rgba(162, 125, 255, 0.55); }
.friend-card-header{ display:flex; justify-content: space-between; align-items:flex-end; gap: 12px; }
.friend-chat-banner{
  border: none;
  cursor: pointer;
  border-radius: 16px;
  padding: 10px 14px;
  font-weight: 950;
  color: #fff;
  background: linear-gradient(135deg, rgba(244,114,182,0.92), rgba(168,85,247,0.90));
  box-shadow: 0 14px 22px rgba(0,0,0,0.12);
}
.friend-chat-banner.big{ font-size: 14px; }

.friend-tools{
  margin-top: 12px;
  display:flex;
  justify-content:flex-start;
}
.friend-search{
  width: 360px;
  max-width: 100%;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(217,204,255,0.85);
  background: #fff;
  padding: 0 12px;
  font-size: 16px;
  font-weight: 800;
  outline: none;
}

.friends-list{ list-style:none; padding: 0; margin: 12px 0 0; display:flex; flex-direction: column; gap: 8px; }
.friend-item{ padding: 10px 12px; border-radius: 16px; background:#faf7ff; border: 1px solid rgba(217,204,255,0.65); cursor: pointer; }
.friend-main-row{ display:flex; align-items:center; gap: 10px; }
.friend-dot{ width: 10px; height: 10px; border-radius: 999px; }
.friend-dot-on{ background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }
.friend-dot-off{ background: #94a3b8; }
.friend-avatar-small{ width: 32px; height: 32px; border-radius: 999px; display:flex; align-items:center; justify-content:center; background: rgba(168,85,247,0.14); font-weight: 950; }
.friend-name{ font-weight: 950; }
.friend-role-pill{ margin-left: 8px; font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 999px; background: rgba(244,114,182,0.14); color:#a21caf; border: 1px solid rgba(244,114,182,0.26); }

/* ✅ 하단 고정 액션바(친구 선택 시) */
/* ✅ 친구 row: 액션을 줄 안으로 */
.friend-item-row{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background:#faf7ff;
  border: 1px solid rgba(217,204,255,0.65);
}

.friend-row-left{
  flex: 1;
  min-width: 0;
  display:flex;
  align-items:center;
  gap: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.friend-name-wrap{ min-width: 0; display:flex; flex-direction: column; gap: 2px; }
.friend-name-line{ display:flex; align-items:center; gap: 8px; min-width: 0; }
.friend-mini-hint{ font-size: 12px; color:#7a69c4; font-weight: 800; opacity: .85; }

.friend-row-actions{
  display:flex;
  align-items:center;
  gap: 8px;
  flex: 0 0 auto;
}

.friend-icon-btn{
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(217,204,255,0.85);
  background: #fff;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
  color:#2a1236;
  box-shadow: 0 10px 16px rgba(0,0,0,0.06);
  position: relative;
  white-space: nowrap;
}

.friend-icon-btn:hover{
  transform: translateY(-1px);
}

.friend-icon-btn.cheer{
  background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,240,248,0.92));
}

.cheer-count{
  font-weight: 950;
  color: rgba(241,83,170,0.95);
}

.friend-icon-btn .cheer-pop{
  position:absolute;
  top: -12px;
  right: 8px;
  font-size: 12px;
  font-weight: 950;
  opacity: 0;
  transform: translateY(6px) scale(0.9);
  transition: all 0.18s ease;
  color: rgba(241,83,170,0.95);
}

.friend-icon-btn.cheer.pop .cheer-pop{
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 접근성 숨김 */
.sr-only{
  position:absolute;
  width:1px; height:1px;
  padding:0; margin:-1px;
  overflow:hidden;
  clip: rect(0,0,0,0);
  white-space:nowrap;
  border:0;
}

.friend-actionbar{
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(980px, calc(100vw - 24px));
  border-radius: 22px;
  background: rgba(255,255,255,0.96);
  border: 2px solid rgba(162, 125, 255, 0.55);
  box-shadow: 0 24px 48px rgba(0,0,0,0.18);
  padding: 12px 14px;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12px;
  z-index: 80;
}
.fab-left{ display:flex; flex-direction: column; gap: 4px; min-width: 0; }
.fab-name{ font-size: 16px; font-weight: 950; color:#241336; display:flex; align-items:center; gap: 6px; flex-wrap: wrap; }
.fab-sub{ font-size: 13px; font-weight: 900; color:#7a69c4; }

.fab-right{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; justify-content:flex-end; }
.fab-btn{
  border: 1px solid rgba(217,204,255,0.85);
  background: #fff;
  color:#2a1236;
  border-radius: 16px;
  height: 42px;
  padding: 0 14px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 18px rgba(0,0,0,0.08);
  position: relative;
  overflow: hidden;
}
.fab-btn.primary{
  border: none;
  color:#fff;
  background: linear-gradient(135deg, rgba(244,114,182,0.92), rgba(168,85,247,0.90));
}
.fab-btn.cheer{
  background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(250,245,255,0.96));
}
.fab-count{ color:#ff4f9f; }
.cheer-pop{
  position:absolute;
  right: 10px;
  top: 8px;
  font-size: 12px;
  font-weight: 950;
  color:#ec4899;
  opacity: 0;
  transform: translateY(6px) scale(0.9);
  pointer-events: none;
}
.fab-btn.cheer.pop{
  animation: popPulse .52s ease-in-out;
}
.fab-btn.cheer.pop .cheer-pop{
  opacity: 1;
  animation: popText .52s ease-in-out;
}
@keyframes popPulse{
  0%{ transform: scale(1); }
  45%{ transform: scale(1.06); }
  100%{ transform: scale(1); }
}
@keyframes popText{
  0%{ opacity: 0; transform: translateY(6px) scale(0.9); }
  55%{ opacity: 1; transform: translateY(0px) scale(1.08); }
  100%{ opacity: 0; transform: translateY(-6px) scale(1); }
}

/* 문의하기 플로팅 */
.floating-support-btn{
  position: fixed;
  right: 18px;
  bottom: 18px;
  border: none;
  cursor: pointer;
  border-radius: 18px;
  padding: 12px 14px;
  font-weight: 950;
  color:#fff;
  background: linear-gradient(135deg, rgba(244,114,182,0.92), rgba(168,85,247,0.90));
  box-shadow: 0 18px 28px rgba(0,0,0,0.18);
  display:flex;
  flex-direction: column;
  gap: 2px;
  z-index: 90;
}
`;
