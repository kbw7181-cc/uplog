// src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type GrowthDay = {
  date: string;         // YYYY-MM-DD
  rate: number;         // 0~1 (기록 여부)
  prospectCount: number; // (지금은 그래프에서 안 쓰지만 타입은 유지)
  contractCount: number; // 계약 고객 수
};

type Friend = {
  id: string;
  name: string;
  role: string | null;
  online: boolean;
  industry: string;
  career: string;
  company: string;
  team: string;
  dayGoal: string;
  weekGoal: string;
  monthGoal: string;
  mainGoal: string;
  cheerCount: number;
  avatarUrl?: string | null;
  mood?: string | null; // 기분 코드(tired/smile...) 또는 이모지
};

type WeatherSlot = {
  time: string;
  temp: number;
  desc: string;
};

type ScheduleRow = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null;
};

type DaySummary = {
  date: string;
  count: number;
};

type LatestGoals = {
  day_goal: string | null;
  week_goal: string | null;
  month_goal: string | null;
};

type RebuttalSummary = {
  id: string;
  category: string | null;
  content: string | null;
};

type DailyTask = {
  id: string;
  content: string;
  done: boolean;
  task_date: string;
};

const EMO_SLIDES = [
  {
    title1: '나를 U P 시키고 싶다면,',
    title2: '“관리가 성장률의 차이”라는 말 하나만 믿어보세요.',
    body: [
      '흩어져 있던 몇 년의 세일즈 노하우를,',
      '가망고객부터 계약까지 한 곳에서 관리하면,',
      '노력의 기록이 곧 성장률의 그래프가 됩니다.',
      'UPLOG와 함께라면, “언젠가”가 아니라 “곧” 세일즈킹이라고 불릴 수 있어요.',
    ],
    oneLine:
      '관리의 차이가 성장률의 차이입니다. 함께 기록하면, 함께 세일즈킹이 됩니다.',
  },
  {
    title1: '지치지 않도록,',
    title2: '거절 사이의 숨을 챙겨 줄게요.',
    body: [
      '나의 목표, 감정, 피드백을 한 곳에서 관리하면서',
      '어제보다 단 한 통 더, 올라가는 나를 기록해요.',
    ],
    oneLine: '거절은 숫자일 뿐, 마음은 숫자가 아닙니다.',
  },
  {
    title1: '거절이 쌓일수록,',
    title2: '계약에 더 가까워지고 있어요.',
    body: [
      '열 번의 거절 뒤에 한 번의 “좋아요”가 기다립니다.',
      '숫자는 많아도, 마음은 단단해집니다.',
    ],
    oneLine: '거절은 내 실력을 단단하게 만드는 연습문제입니다.',
  },
  {
    title1: '오늘의 한 통이,',
    title2: '다음 달의 보너스를 만듭니다.',
    body: [
      '조금 부족해도 괜찮아요. 대신 멈지만 않으면 돼요.',
      '한 통, 한 걸음씩 쌓이는 게 결국 성과가 됩니다.',
    ],
    oneLine: '완벽함보다, 계속하는 사람이 이깁니다.',
  },
  {
    title1: '마음이 흔들릴수록,',
    title2: '기록이 당신을 잡아 줄 거예요.',
    body: [
      '오늘의 기분, 오늘의 목표, 오늘의 잘한 점을 적어보세요.',
      '기록은 언젠가 대표님의 자서전 첫 페이지가 됩니다.',
    ],
    oneLine: '흔들려도, 포기하지 않는 게 진짜 멘탈입니다.',
  },
  {
    title1: '고객이 나를 잊기 전에,',
    title2: '내가 먼저 안부를 전해보세요.',
    body: [
      '짧은 한 줄 문자, 따뜻한 안부 한마디가',
      '대표님만의 영업 색깔을 만들어 줍니다.',
    ],
    oneLine: '작은 관심이, 오래 가는 관계를 만듭니다.',
  },
  {
    title1: '오늘이 가기 전에,',
    title2: '나를 한 번 더 칭찬해 주세요.',
    body: [
      '잘 안 된 날에도 버틴 나를,',
      '전화를 걸었다는 사실만으로도 충분히 잘했어요.',
    ],
    oneLine: '중요한 건 빈 날을 줄여가는 것입니다.',
  },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
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

function getScheduleDotClassAndLabel(title: string): {
  className: string;
  label: string;
} {
  const t = title || '';
  if (t.includes('상담')) return { className: 'calendar-dot-consult', label: '상담' };
  if (t.includes('방문')) return { className: 'calendar-dot-visit', label: '방문' };
  if (t.includes('해피콜')) return { className: 'calendar-dot-happy', label: '해피콜' };
  if (t.includes('배송') || t.includes('택배'))
    return { className: 'calendar-dot-delivery', label: '배송' };
  return { className: 'calendar-dot-etc', label: '기타' };
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
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDate(new Date())
  );

  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [todayWeather, setTodayWeather] = useState<WeatherSlot[]>([]);
  const [latestGoals, setLatestGoals] = useState<LatestGoals | null>(null);
  const [recentRebuttals, setRecentRebuttals] = useState<RebuttalSummary[]>([]);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);

  const [growthDays, setGrowthDays] = useState<GrowthDay[]>([]);
  const [currentMonthLabel, setCurrentMonthLabel] = useState<string>('');
  const [moodByDate, setMoodByDate] = useState<Record<string, string>>({});

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // 감성 배너: 기본은 0번(대표님 버전)으로 고정
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // 친구 프로필 모달
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const friends: Friend[] = [
    {
      id: 'f1',
      name: '김영업',
      role: '팀장',
      online: true,
      industry: '뷰티 · TM 영업',
      career: '6~9년',
      company: 'UPLOG 뷰티본부',
      team: '1팀',
      dayGoal: '상담 5건',
      weekGoal: '계약 3건',
      monthGoal: '매출 1,000만',
      mainGoal: '이번 분기 “영업왕” 타이틀 따기',
      cheerCount: 28,
      avatarUrl: null,
      mood: 'fire',
    },
    {
      id: 'f2',
      name: '박성장',
      role: '사원',
      online: true,
      industry: '보험 · 설계',
      career: '2년',
      company: 'UPLIFE 금융센터',
      team: 'A조',
      dayGoal: '콜 20통',
      weekGoal: '미팅 5건',
      monthGoal: '계약 10건',
      mainGoal: '올해 안에 팀장 승진',
      cheerCount: 15,
      avatarUrl: null,
      mood: '🙂',
    },
    {
      id: 'f3',
      name: '이멘탈',
      role: '대리',
      online: false,
      industry: '교육 · 컨설팅',
      career: '4~5년',
      company: 'UPCLASS 아카데미',
      team: '컨설팅팀',
      dayGoal: '후속콜 10통',
      weekGoal: '설명회 2회',
      monthGoal: '수강등록 20명',
      mainGoal: '수강 후기 100개 모으기',
      cheerCount: 9,
      avatarUrl: null,
      mood: 'down',
    },
  ];

  const currentSlide = EMO_SLIDES[quoteIndex];

  const newScheduleCountToday = useMemo(
    () => schedules.filter((s) => s.schedule_date === todayStr).length,
    [schedules, todayStr]
  );
  const newRebuttalCount = useMemo(
    () => recentRebuttals.length,
    [recentRebuttals]
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
        .select(
          'name, nickname, industry, grade, career, company, department, team, avatar_url, main_goal'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        const anyProfile = profile as any;

        if (anyProfile.nickname) {
          setNickname(anyProfile.nickname);
        } else if (anyProfile.name) {
          setNickname(anyProfile.name);
        } else if (user.email) {
          setNickname(user.email.split('@')[0]);
        }

        if (anyProfile.avatar_url) setProfileImage(anyProfile.avatar_url);
        if (anyProfile.industry) setIndustry(anyProfile.industry);
        if (anyProfile.grade) setGrade(anyProfile.grade);
        if (anyProfile.career)
          setCareerYears(getCareerLabel(anyProfile.career));
        if (anyProfile.company) setCompany(anyProfile.company);
        if (anyProfile.department) setDepartment(anyProfile.department);
        if (anyProfile.team) setTeam(anyProfile.team);
        if (anyProfile.main_goal) setMainGoal(anyProfile.main_goal);
      } else if (user.email) {
        setNickname(user.email.split('@')[0]);
      }

      await loadDashboardData(user.id, currentMonth);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    loadDashboardData(userId, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, userId]);

  const loadDashboardData = async (uid: string, baseMonth: Date) => {
    const monthStart = new Date(
      baseMonth.getFullYear(),
      baseMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      baseMonth.getFullYear(),
      baseMonth.getMonth() + 1,
      0
    );

    const from = formatDate(monthStart);
    const to = formatDate(monthEnd);

    setCurrentMonthLabel(
      `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`
    );

    // 성장/기분/가망/계약 집계용 맵
    const loggedSet = new Set<string>();
    const moodMap: Record<string, string> = {};
    const prospectByDate: Record<string, number> = {};
    const contractByDate: Record<string, number> = {};

    // schedules
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, title, schedule_date, schedule_time')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to)
      .order('schedule_date', { ascending: true });

    if (scheduleError) {
      console.error('schedules error', scheduleError);
    }

    const safeSchedules = (scheduleRows ?? []) as ScheduleRow[];
    setSchedules(safeSchedules);

    const summaryMap: Record<string, number> = {};
    safeSchedules.forEach((row) => {
      if (!summaryMap[row.schedule_date]) summaryMap[row.schedule_date] = 0;
      summaryMap[row.schedule_date] += 1;
    });

    const summaries: DaySummary[] = Object.entries(summaryMap).map(
      ([date, count]) => ({ date, count })
    );
    setDaySummaries(summaries);

    // up_logs: 오늘/주/월 목표 + 기분 + 기록 있는 날
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
        const str =
          typeof raw === 'string'
            ? raw.slice(0, 10)
            : formatDate(new Date(raw));
        loggedSet.add(str);
        if (row.mood) {
          moodMap[str] = row.mood as string;
        }
      });
    } else {
      setLatestGoals(null);
      if (upError) console.error('up_logs error', upError);
    }

    // customers: 계약(계약1/2/3 등)만 날짜별 집계
    try {
      const { data: customerRows, error: customerError } = await supabase
        .from('customers')
        .select('id, status, created_at')
        .eq('user_id', uid)
        .gte('created_at', from)
        .lte('created_at', to);

      if (!customerError && customerRows) {
        (customerRows as any[]).forEach((row) => {
          const raw = (row as any).created_at;
          if (!raw) return;

          const dateStr =
            typeof raw === 'string'
              ? raw.slice(0, 10)
              : formatDate(new Date(raw));
          const status: string = ((row as any).status ?? '') as string;

          if (!status) return;

          // "계약1, 계약2, 계약3..." 만 카운트
          if (status.includes('계약')) {
            contractByDate[dateStr] = (contractByDate[dateStr] ?? 0) + 1;
          } else if (status.includes('가망')) {
            // 가망은 지금 그래프엔 안 쓰지만, 타입 유지 위해 집계만
            prospectByDate[dateStr] = (prospectByDate[dateStr] ?? 0) + 1;
          }
        });
      } else if (customerError) {
        console.error('customers error', customerError);
      }
    } catch (err) {
      console.error('customers fatal error', err);
    }

    // 성장 그래프 데이터 생성 (기록 + 계약)
    const daysInThisMonth = monthEnd.getDate();
    const growth: GrowthDay[] = [];
    for (let d = 1; d <= daysInThisMonth; d++) {
      const cur = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        d
      );
      const dateStr = formatDate(cur);
      growth.push({
        date: dateStr,
        rate: loggedSet.has(dateStr) ? 1 : 0,
        prospectCount: prospectByDate[dateStr] || 0,
        contractCount: contractByDate[dateStr] || 0,
      });
    }
    setGrowthDays(growth);
    setMoodByDate(moodMap);

    // rebuttals
    const { data: rebutRows, error: rebutError } = await supabase
      .from('rebuttals')
      .select('id, category, content')
      .eq('user_id', uid)
      .order('id', { ascending: false })
      .limit(3);

    if (!rebutError && rebutRows) {
      setRecentRebuttals(rebutRows as RebuttalSummary[]);
    } else {
      setRecentRebuttals([]);
      if (rebutError) console.error('rebuttals error', rebutError);
    }

    // 오늘 할 일
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

    // 날씨 (mock)
    const now = new Date();
    const mockWeather: WeatherSlot[] = [];
    for (let i = 0; i < 6; i++) {
      const h = now.getHours() + i * 3;
      mockWeather.push({
        time: `${(h % 24).toString().padStart(2, '0')}:00`,
        temp: 22 + i,
        desc: i < 2 ? '맑음' : i < 4 ? '구름조금' : '흐림',
      });
    }
    setTodayWeather(mockWeather);
  };

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const lastDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const days: Date[] = [];
    const startWeekday = firstDay.getDay();

    for (let i = 0; i < startWeekday; i++) {
      days.push(
        new Date(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          firstDay.getDate() - (startWeekday - i)
        )
      );
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
      );
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(
        new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
      );
    }

    return days;
  }, [currentMonth]);

  const selectedDateSchedules = useMemo(
    () => schedules.filter((s) => s.schedule_date === selectedDate),
    [schedules, selectedDate]
  );

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }, [selectedDate]);

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

    setTodayTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t))
    );

    const { error } = await supabase
      .from('daily_tasks')
      .update({ done: nextDone })
      .eq('id', task.id)
      .eq('user_id', userId);

    if (error) {
      setTodayTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
      console.error('toggle daily_task error', error);
      alert('오늘 할 일 상태 저장 중 오류가 발생했어요.');
    }
  };

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

  const avatarInitial =
    nickname && nickname.length > 0 ? nickname.trim()[0]?.toUpperCase() : 'U';

  const careerCombined =
    grade && careerYears
      ? `${grade} · ${careerYears}`
      : grade
      ? grade
      : careerYears
      ? careerYears
      : '경력/직함 미설정';

  const orgCombined =
    [company, department, team].filter(Boolean).join(' / ') || '조직/팀 미설정';

  return (
    <div className="home-root">
      <div className="home-inner">
        {/* 헤더 */}
        <header className="home-header">
          <div className="home-header-left">
            <div className="home-logo-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="UPLOG 로고" className="home-logo" />
              <div className="home-logo-text-wrap">
                <div className="home-logo-text">UPLOG</div>
                <div className="home-logo-sub">오늘도 나를 UP시키다</div>
              </div>
            </div>
            <div className="home-welcome">
              <span className="welcome-name">{nickname}</span>
              <span> 님, 환영합니다~</span>
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

          <div className="home-header-right">
            <div className="profile-box">
              <div className="profile-main">
                <div className="profile-avatar">
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImage} alt="프로필" />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <div>
                  <div className="profile-name">{nickname}</div>
                  {email && <div className="profile-email">{email}</div>}
                </div>
              </div>

              <div className="profile-meta">
                <span className="profile-pill">
                  {industry ?? '업종 미설정'}
                </span>
                <span className="profile-pill">{careerCombined}</span>
                <span className="profile-pill">{orgCombined}</span>
              </div>

              <div className="profile-stats">
                <span className="profile-stat-pill">
                  새 채팅 <strong>0건</strong>
                </span>
                <span className="profile-stat-pill">
                  새 피드백 <strong>{newRebuttalCount}건</strong>
                </span>
                <span className="profile-stat-pill">
                  오늘 등록 스케줄 <strong>{newScheduleCountToday}건</strong>
                </span>
              </div>

              <div className="profile-links">
                <Link href="/profile">프로필 설정</Link>
                <Link href="/support">문의하기</Link>
              </div>
            </div>
          </div>
        </header>

        {/* 오늘의 U P 감성 슬라이드 */}
        <section className="emo-banner">
          <div className="emo-pill">오늘의 U P 감성</div>
          <h2 className="emo-title">
            {currentSlide.title1}
            <br />
            <span>{currentSlide.title2}</span>
          </h2>
          <div className="emo-body">
            {currentSlide.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="emo-footer">
            오늘의 한 마디 · “{currentSlide.oneLine}”
          </div>
          <div className="emo-dots">
            {EMO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={
                  'emo-dot' + (idx === quoteIndex ? ' emo-dot-active' : '')
                }
                onClick={() => setQuoteIndex(idx)}
              />
            ))}
          </div>
        </section>

        {/* 퀵 메뉴 */}
        <section className="home-quick-nav">
          <Link href="/my-up" className="quick-card">
            <div className="quick-title">나의 U P 관리</div>
            <div className="quick-desc">목표 · 마음 · 실적 · 스케줄</div>
          </Link>

          <Link href="/customers" className="quick-card">
            <div className="quick-title">고객관리</div>
            <div className="quick-desc">상담 · 방문 · 해피콜 기록</div>
          </Link>

          <Link href="/rebuttal" className="quick-card">
            <div className="quick-title">반론 아카이브</div>
            <div className="quick-desc">거절 멘트와 나의 답변 정리</div>
          </Link>

          <Link href="/community" className="quick-card">
            <div className="quick-title">커뮤니티</div>
            <div className="quick-desc">영업인끼리 노하우와 멘탈 공유</div>
          </Link>

          <Link href="/sms-helper" className="quick-card">
            <div className="quick-title">문자 도우미</div>
            <div className="quick-desc">캘리 · 문장 조합으로 메시지 발송</div>
          </Link>
        </section>

        {/* 날씨 */}
        <section className="weather-wide">
          <div className="weather-panel">
            <div className="weather-panel-header">
              <div>
                <div className="section-title">오늘 날씨</div>
                <div className="section-sub">
                  외근/미팅 계획 세울 때 참고하세요.
                </div>
              </div>
            </div>
            <div className="weather-strip">
              {todayWeather.map((w, idx) => (
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

        {/* 메인 컨텐츠 */}
        <main className="home-main">
          {/* 상단 요약 */}
          <section className="home-top-summary">
            {/* 일 · 주 · 월 목표 */}
            <div className="summary-card goals-card">
              <h3 className="summary-title">일 · 주 · 월 목표 요약</h3>

              <div className="goals-list">
                <div className="goal-card goal-card-today">
                  <div className="goal-label">오늘 목표</div>
                  <div className="goal-text">
                    {latestGoals?.day_goal || '가망고객 안부 문자인사하기'}
                  </div>
                </div>

                <div className="goal-card">
                  <div className="goal-label">이번 주 목표</div>
                  <div className="goal-text">
                    {latestGoals?.week_goal || '신규고객 3명 이상'}
                  </div>
                </div>

                <div className="goal-card">
                  <div className="goal-label">이번 달 목표</div>
                  <div className="goal-text">
                    {latestGoals?.month_goal || '이달엔 30건 이상 계약하기'}
                  </div>
                </div>
              </div>

              <div className="goal-main">
                나의 최종 목표{' '}
                <span className="goal-main-strong">
                  “{mainGoal || '1등 찍어보자'}”
                </span>
              </div>
            </div>

            {/* 오늘 할 일 */}
            <div className="summary-card todo-card">
              <h3 className="summary-title">오늘 할 일</h3>
              <p className="summary-desc">
                <strong>나의 U P 관리</strong>에서 입력한 오늘의 체크항목을
                여기에서 한 번에 체크할 수 있어요.
              </p>

              {todayTasks.length === 0 ? (
                <div className="todo-empty">
                  아직 등록된 할 일이 없어요.
                  <br />
                  <span className="todo-empty-sub">
                    오늘의 할 일은 <strong>나의 U P 관리</strong>에서 추가해 주세요.
                  </span>
                </div>
              ) : (
                <ul className="todo-list">
                  {todayTasks.map((task) => (
                    <li key={task.id} className="todo-item">
                      <button
                        type="button"
                        className={
                          'todo-check ' +
                          (task.done ? 'todo-check-done' : '')
                        }
                        onClick={() => handleToggleTask(task)}
                      >
                        {task.done ? '✓' : ''}
                      </button>
                      <span
                        className={
                          'todo-text ' + (task.done ? 'todo-text-done' : '')
                        }
                      >
                        {task.content}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

     {/* 성장 그래프 */}
<div className="summary-card growth-card">
  <div className="growth-header">
    <h3 className="summary-title">성장 그래프</h3>
    <span className="growth-month">{currentMonthLabel}</span>
  </div>

  <p className="growth-caption">
    체크 입력이 많을수록 핑크 막대가 높아지고,
    계약 입력이 많을수록 골드 막대가 높아집니다.
  </p>

  <div className="growth-graph-wrap">
    <div className="growth-graph">

      {growthDays.map((g) => {
        const day = Number(g.date.split('-')[2]);

        const checkCount = g.rate;            // 체크 입력개수
        const contractCount = g.contractCount; // 계약 입력개수

        // 최소 높이 보이도록 설정
        const checkHeight = Math.max(checkCount * 12, 8);
        const contractHeight = Math.max(contractCount * 14, 8);

        return (
          <div key={g.date} className="growth-col">

            {/* 계약 막대 */}
            <div
              className="bar contract-bar"
              style={{ height: `${contractHeight}px` }}
            />

            {/* 체크 막대 */}
            <div
              className="bar check-bar"
              style={{ height: `${checkHeight}px` }}
            />

            {/* 날짜 */}
            <div className="growth-day-label">{day}</div>
          </div>
        );
      })}

    </div>
  </div>
</div>



          </section>

          {/* 달력 + 친구 카드 */}
          <section className="home-section calendar-section">
            <div className="section-header">
              <div>
                <div className="section-title">스케줄 달력</div>
                <div className="section-sub">
                  나의 U P 관리 · 고객관리에서 등록한 스케줄을 한눈에 볼 수 있어요.
                </div>
              </div>
              <div className="month-nav">
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => moveMonth(-1)}
                >
                  ◀
                </button>
                <div className="month-label">{getMonthLabel(currentMonth)}</div>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => moveMonth(1)}
                >
                  ▶
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} className="calendar-weekday">
                  {w}
                </div>
              ))}

              {daysInMonth.map((d, index) => {
                const dStr = formatDate(d);
                const isCurrentMonth =
                  d.getMonth() === currentMonth.getMonth();
                const isToday = dStr === todayStr;
                const isSelected = dStr === selectedDate;

                const schedulesForDay = schedules.filter(
                  (s) => s.schedule_date === dStr
                );

                const moodCode = moodByDate[dStr];

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
                      {moodCode && (
                        <div className="calendar-day-mood">
                          {getMoodEmoji(moodCode)}
                        </div>
                      )}
                    </div>

                    <div className="calendar-day-dots">
                      {schedulesForDay.slice(0, 2).map((s) => {
                        const info = getScheduleDotClassAndLabel(s.title);
                        const shortTitle =
                          s.title.length > 9
                            ? s.title.slice(0, 9) + '…'
                            : s.title;

                        return (
                          <div
                            key={s.id}
                            className={
                              'calendar-day-dot ' + info.className
                            }
                          >
                            <span className="calendar-dot-label">
                              {info.label}
                            </span>
                            <span className="calendar-dot-title">
                              {shortTitle}
                            </span>
                          </div>
                        );
                      })}

                      {schedulesForDay.length > 2 && (
                        <div className="calendar-day-dot calendar-dot-more">
                          +{schedulesForDay.length - 2}개
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="calendar-footer">
              <span>
                오늘은 <strong>{getKoreanWeekday(new Date())}</strong>
                입니다.
              </span>
            </div>

            {/* 선택한 날짜 일정 */}
            <div className="right-card calendar-selected-card">
              <div className="right-card-header">
                <div>
                  <div className="section-title">선택한 날짜의 일정</div>
                  <div className="section-sub">{selectedDateLabel}</div>
                </div>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 일정이 없어요.
                  <br />
                  스케줄 추가/수정은{' '}
                  <strong>나의 U P 관리 · 고객관리</strong>에서 할 수 있어요.
                </div>
              ) : (
                <ul className="schedule-list">
                  {selectedDateSchedules.map((s) => (
                    <li key={s.id} className="schedule-item">
                      <div className="schedule-time">
                        {s.schedule_time
                          ? s.schedule_time.slice(0, 5)
                          : '시간 미정'}
                      </div>
                      <div className="schedule-title">{s.title}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 친구 목록 카드 */}
            <div className="right-card friend-card">
              <div className="friend-card-header">
                <div>
                  <div className="section-title friend-title">
                    친구 목록 · U P 채팅
                  </div>
                  <div className="section-sub friend-sub">
                    함께 올라가는 동료들의 상태와 프로필을 확인해요.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/memo-chat')}
                  className="friend-chat-banner big"
                >
                  U P 채팅방 열기
                </button>
              </div>

              {friends.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 친구가 없어요.
                  <br />
                  나중에 함께 U P 해봐요. ✨
                </div>
              ) : (
                <ul className="friends-list">
                  {friends.map((friend) => (
                    <li
                      key={friend.id}
                      className="friend-item"
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <div className="friend-main-row">
                        <span
                          className={
                            'friend-dot ' +
                            (friend.online ? 'friend-dot-on' : 'friend-dot-off')
                          }
                        />

                        <div className="friend-avatar-small">
                          {friend.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.avatarUrl} alt={friend.name} />
                          ) : (
                            friend.name[0]
                          )}
                        </div>

                        <span className="friend-name-wrap">
                          <span className="friend-name">{friend.name}</span>
                          {friend.role && (
                            <span className="friend-role-pill">
                              {friend.role}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="friend-meta-row">
                        <span>{friend.industry}</span>
                        <span>경력 {friend.career}</span>
                        <span>
                          {friend.company} · {friend.team}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        {/* 친구 프로필 모달 */}
        {selectedFriend && (
          <div
            className="friend-modal-backdrop"
            onClick={() => setSelectedFriend(null)}
          >
            <div
              className="friend-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="friend-modal-close"
                onClick={() => setSelectedFriend(null)}
              >
                ✕
              </button>

              <div className="friend-modal-header">
                <div className="friend-modal-avatar">
                  {selectedFriend.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedFriend.avatarUrl}
                      alt={selectedFriend.name}
                    />
                  ) : (
                    selectedFriend.name[0]
                  )}
                </div>

                <div className="friend-modal-title">
                  <div className="friend-modal-name-row">
                    <span className="friend-modal-name">
                      {selectedFriend.name}
                    </span>
                    {selectedFriend.role && (
                      <span className="friend-modal-role">
                        {selectedFriend.role}
                      </span>
                    )}
                    {selectedFriend.mood && (
                      <span className="friend-modal-mood">
                        {getMoodEmoji(selectedFriend.mood)}
                      </span>
                    )}
                  </div>

                  <div className="friend-modal-sub">
                    {selectedFriend.industry} · 경력 {selectedFriend.career}
                  </div>
                  <div className="friend-modal-sub">
                    {selectedFriend.company} · {selectedFriend.team}
                  </div>
                </div>
              </div>

              <div className="friend-modal-body">
                <div className="friend-modal-section">
                  <div className="friend-modal-label">메인 목표</div>
                  <div className="friend-modal-main-goal">
                    “{selectedFriend.mainGoal}”
                  </div>
                </div>

                <div className="friend-modal-section">
                  <div className="friend-modal-label">오늘 · 주 · 월 목표</div>
                  <ul className="friend-modal-goals">
                    <li>
                      <span>오늘</span>
                      <span>{selectedFriend.dayGoal}</span>
                    </li>
                    <li>
                      <span>이번 주</span>
                      <span>{selectedFriend.weekGoal}</span>
                    </li>
                    <li>
                      <span>이번 달</span>
                      <span>{selectedFriend.monthGoal}</span>
                    </li>
                  </ul>
                </div>

                <div className="friend-modal-section cheer-row">
                  <div>
                    <div className="friend-modal-label">응원 받은 지수</div>
                    <div className="friend-modal-cheer">
                      💜 {selectedFriend.cheerCount}개
                    </div>
                  </div>
                </div>

                <div className="friend-modal-actions">
                  <button className="friend-modal-btn primary">
                    U P 채팅하기
                  </button>
                  <button className="friend-modal-btn">친구 추가</button>
                  <button className="friend-modal-btn">응원 보내기 💜</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 문의하기 플로팅 버튼 */}
        <button
          type="button"
          onClick={() => router.push('/support')}
          className="floating-support-btn"
        >
          <span>문의하기</span>
          <span>실시간 채팅</span>
        </button>

        <style jsx>{styles}</style>
      </div>
    </div>
  );
}

const styles = `
.home-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.home-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 공통 */

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #6b41ff;
}

.section-sub {
  font-size: 14px;
  margin-top: 4px;
  color: #8c7ad9;
}

.home-loading {
  margin-top: 120px;
  text-align: center;
  font-size: 20px;
}

/* 헤더 */

.home-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 26px;
  background: linear-gradient(135deg, #ff89bd, #a45bff);
  box-shadow: 0 18px 34px rgba(0,0,0,0.25);
  margin-bottom: 16px;
  color: #fffdfd;
}

.home-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-logo-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-logo {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  object-fit: cover;
  background: rgba(255,255,255,0.25);
  padding: 7px;
}

.home-logo-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.home-logo-text {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #ffffff, #ffe9ff);
  -webkit-background-clip: text;
  color: transparent;
}

.home-logo-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.9);
}

.home-welcome {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff, #ffe4ff);
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 0 16px rgba(255,255,255,0.4);
}

.welcome-name {
  color: inherit;
}

.home-date {
  font-size: 15px;
  margin-top: 2px;
  color: #fffdfd;
}

/* 헤더 오른쪽 */

.home-header-right {
  min-width: 360px;
  display: flex;
  justify-content: flex-end;
}

.profile-box {
  background: #ffffff;
  border-radius: 22px;
  padding: 14px 16px;
  box-shadow: 0 16px 30px rgba(0,0,0,0.16);
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e3dafb;
  color: #211437;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9bd6 0, #8f5bff 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 22px;
  overflow: hidden;
  box-shadow: 0 0 14px rgba(193, 126, 255, 0.7);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: 17px;
  font-weight: 800;
  color: #211437;
}

.profile-email {
  font-size: 13px;
  color: #8b7bd4;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-pill {
  font-size: 13px;
  padding: 4px 9px;
  border-radius: 999px;
  background: #f3efff;
  color: #352153;
}

.profile-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-stat-pill {
  font-size: 13px;
  padding: 4px 11px;
  border-radius: 999px;
  background: #f7f2ff;
  color: #352153;
  border: 1px solid #e0d4ff;
}

.profile-stat-pill strong {
  color: #ff4f9f;
}

.profile-links {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  font-size: 14px;
}

.profile-links a {
  color: #a24cff;
  text-decoration: none;
}

/* 오늘의 U P 감성 */

.emo-banner {
  margin-bottom: 12px;
  padding: 18px 22px 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, #8e7dff, #ff8fd2);
  box-shadow: 0 16px 32px rgba(107, 71, 183, 0.28);
  position: relative;
  overflow: hidden;
  color: #fffdfd;
}

.emo-pill {
  display: inline-flex;
  padding: 5px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.9);
  font-size: 13px;
  margin-bottom: 10px;
  background: rgba(0,0,0,0.12);
}

.emo-title {
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 10px;
}

.emo-title span {
  color: #ffe98f;
}

.emo-body p {
  font-size: 15px;
  margin: 1px 0;
}

.emo-footer {
  margin-top: 10px;
  font-size: 15px;
  color: #fff4ff;
}

.emo-dots {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}

.emo-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: rgba(255,255,255,0.55);
  cursor: pointer;
}

.emo-dot-active {
  width: 18px;
  background: #ffffff;
}

/* 퀵 메뉴 */

.home-quick-nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.quick-card {
  border-radius: 16px;
  padding: 10px 12px;
  background: radial-gradient(circle at top left, #ffffff 0, #f8ecff 55%, #f0f7ff 100%);
  box-shadow: 0 12px 22px rgba(0,0,0,0.16);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border 0.14s ease;
  border: 1px solid rgba(166, 143, 255, 0.4);
  color: #241336;
}

.quick-card:hover {
  transform: translateY(-1px);
  background: radial-gradient(circle at top left, #ffffff 0, #ffe8f8 40%, #edf3ff 100%);
  box-shadow: 0 16px 26px rgba(0,0,0,0.2);
  border-color: rgba(125, 97, 255, 0.8);
}

.quick-title {
  font-size: 17px;
  font-weight: 800;
  color: #402064;
}

.quick-desc {
  font-size: 14px;
  color: #7c6ac2;
}

/* 날씨 */

.weather-wide {
  margin-bottom: 10px;
}

.weather-panel {
  border-radius: 18px;
  background: #ffffff;
  padding: 10px 14px 10px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  border: 1px solid #e3dafb;
  color: #241336;
}

.weather-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.weather-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.weather-slot {
  min-width: 100px;
  border-radius: 12px;
  background: #f7f3ff;
  padding: 6px;
  font-size: 13px;
}

.weather-time {
  font-weight: 600;
  margin-bottom: 2px;
}

.weather-temp {
  font-size: 20px;
  font-weight: 800;
  color: #f35fa6;
}

.weather-desc {
  font-size: 13px;
  color: #7a68c4;
}

/* 메인 레이아웃 */

.home-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.home-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 12px;
}

.calendar-section {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.home-top-summary {
  margin-top: 2px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border-radius: 20px;
  padding: 14px 16px;
  background: #ffffff;
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  border: 1px solid #e5ddff;
  color: #211437;
}

.summary-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 8px;
  color: #6b41ff;
}

.summary-desc {
  font-size: 14px;
  color: #7a69c4;
}

/* 목표 카드 */

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.goal-card {
  border-radius: 16px;
  padding: 8px 10px;
  background: #faf7ff;
  border: 1px solid rgba(194, 179, 255, 0.6);
}

.goal-card-today {
  background: linear-gradient(135deg, #ffb5df, #ff8cc7);
  box-shadow: 0 0 12px rgba(255, 128, 205, 0.6);
  color: #2b1131;
}

.goal-label {
  font-size: 14px;
  color: #694292;
}

.goal-text {
  margin-top: 3px;
  font-size: 16px;
  font-weight: 600;
}

.goal-main {
  margin-top: 10px;
  font-size: 14px;
  color: #7e68c7;
}

.goal-main-strong {
  color: #f153aa;
  font-weight: 800;
}

/* 오늘 할 일 */

.todo-card {
  position: relative;
}

.todo-empty {
  margin-top: 10px;
  border-radius: 16px;
  padding: 10px 12px;
  background: #faf7ff;
  border: 1px dashed rgba(165, 148, 230, 0.9);
  font-size: 14px;
  color: #7461be;
  line-height: 1.5;
}

.todo-empty-sub {
  font-size: 13px;
}

.todo-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 15px;
}

.todo-check {
  width: 20px;
  height: 20px;
  border-radius: 8px;
  border: 1.5px solid #f153aa;
  box-sizing: border-box;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
}

.todo-check-done {
  background: linear-gradient(135deg, #f153aa, #a36dff);
  box-shadow: 0 0 10px rgba(241, 83, 170, 0.6);
}

.todo-text {
  color: #241336;
}

.todo-text-done {
  color: #a39ad3;
  text-decoration: line-through;
}

/* 전체 글씨 선명하게 키움 */
.growth-card, 
.growth-caption,
.growth-day-label {
  font-size: 15px;
  font-weight: 600;
  color: #7a62d2;
}

.growth-graph-wrap {
  margin-top: 10px;
  padding: 16px;
  border-radius: 18px;
  background: radial-gradient(circle at top, #ffe7fd 0%, #f5e9ff 40%, #ffffff 100%);
  border: 1px solid rgba(200, 180, 255, 0.6);
}

.growth-graph {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 180px;
}

.growth-col {
  flex: 1;
  min-width: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 막대 공통 */
.bar {
  width: 16px;
  border-radius: 8px;
  margin-bottom: 4px;
}

/* 체크(핑크) */
.check-bar {
  background: linear-gradient(180deg, #ff8ad8, #ff5fbd);
  box-shadow: 0 2px 6px rgba(255, 90, 180, 0.45);
}

/* 계약(골드) */
.contract-bar {
  background: linear-gradient(180deg, #fde68a, #facc15, #fb923c);
  box-shadow: 0 2px 6px rgba(255, 170, 60, 0.45);
}

.growth-day-label {
  margin-top: 6px;
  font-size: 14px;
  color: #8d7acd;
}



/* 공통 카드 */

.right-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 12px 14px;
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  border: 1px solid #d9ccff;
  color: #211437;
}

.right-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 6px;
}

.empty-text {
  font-size: 13px;
  color: #7a69c4;
  line-height: 1.5;
}

/* 달력 */

.section-header {
  margin-bottom: 6px;
  grid-column: 1 / -1;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn {
  border-radius: 999px;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  background: #f0e8ff;
  color: #5a3cb2;
  cursor: pointer;
}

.month-label {
  font-size: 15px;
  font-weight: 700;
  color: #372153;
}

.calendar-grid {
  background: #ffffff;
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  grid-column: 1 / -1;
  border: 1px solid #e5ddff;
}

.calendar-weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #7f6bd5;
}

.calendar-day {
  border-radius: 14px;
  border: none;
  background: #faf7ff;
  padding: 5px 4px;
  min-height: 64px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  cursor: pointer;
  color: #241336;
  transition: all 0.12s ease;
}

.calendar-day-out {
  opacity: 0.35;
}

.calendar-day-today {
  box-shadow: 0 0 0 1px #f153aa;
}

.calendar-day-selected {
  box-shadow: 0 0 0 2px #a45bff;
  background: linear-gradient(135deg, #f5e6ff, #ffe1f1);
}

.calendar-day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-day-number {
  font-weight: 700;
  font-size: 13px;
}

.calendar-day-mood {
  font-size: 14px;
}

.calendar-day-dots {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.calendar-day-dot {
  font-size: 11px;
  padding: 3px 5px;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.calendar-dot-label {
  font-weight: 600;
}

.calendar-dot-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 카테고리 색상 */

.calendar-dot-consult {
  background: linear-gradient(135deg, #ff8bb3, #ff5a95);
}

.calendar-dot-visit {
  background: linear-gradient(135deg, #7dd3fc, #2563eb);
}

.calendar-dot-happy {
  background: linear-gradient(135deg, #facc15, #fb923c);
}

.calendar-dot-delivery {
  background: linear-gradient(135deg, #a3e635, #22c55e);
}

.calendar-dot-etc {
  background: linear-gradient(135deg, #e5e7eb, #9ca3af);
  color: #111827;
}

.calendar-dot-more {
  background: #f3efff;
  color: #5b43b1;
}

.calendar-footer {
  grid-column: 1 / -1;
  margin-top: 4px;
  font-size: 14px;
  color: #7e6fd6;
}

/* 선택 날짜 카드 */

.calendar-selected-card {
  grid-column: 1 / -1;
  margin-top: 8px;
}

.schedule-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
}

.schedule-item {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 8px;
  font-size: 14px;
  padding: 4px 0;
  border-bottom: 1px dashed #e0d4ff;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-time {
  color: #f153aa;
  font-weight: 600;
}

.schedule-title {
  color: #241336;
}

/* 친구 카드 */

.friend-card {
  margin-top: 24px;
  padding: 16px 20px 20px;
  border-radius: 26px;
  border: 4px solid rgba(162, 125, 255, 0.95);
  background: #ffffff;
  box-shadow:
    0 20px 40px rgba(0,0,0,0.18),
    0 0 0 1px rgba(255,255,255,0.7);
  overflow: hidden;
}

.friend-card-header {
  padding: 16px 20px 12px;
  border-radius: 20px;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.friend-title {
  color: #ffffff;
}

.friend-sub {
  color: #fee2f2;
}

.friend-chat-banner {
  border-radius: 999px;
  border: none;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  background: #f9fafb;
  color: #7c3aed;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.18);
}

.friend-chat-banner.big {
  min-width: 140px;
  text-align: center;
}

.friends-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 4px 4px 0 4px;
  max-height: 320px;
  overflow-y: auto;
}

.friend-item {
  padding: 14px 16px;
  border-radius: 20px;
  margin-bottom: 12px;
  background: #fbf8ff;
  border: 1px solid rgba(211,196,255,0.9);
  cursor: pointer;
  transition: all 0.16s ease;
}

.friend-item:last-child {
  margin-bottom: 0;
}

.friend-item:hover {
  background: #f4eeff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.friend-main-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-avatar-small {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 0 10px rgba(185, 129, 255, 0.8);
}

/* 온라인/오프라인 점 + 이름 · 역할 */

.friend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.friend-dot-on {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.9);
}

.friend-dot-off {
  background: #9ca3af;
  opacity: 0.8;
}

.friend-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.friend-name {
  font-size: 15px;
  font-weight: 800;
  color: #1f1333;
}

.friend-role-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #7c3aed;
  border: 1px solid rgba(167, 139, 250, 0.9);
}

.friend-meta-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #7a69c4;
}

/* 친구 프로필 모달 */

.friend-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.friend-modal {
  width: 360px;
  max-width: 90vw;
  border-radius: 26px;
  background: #ffffff;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.45),
    0 0 0 1px rgba(226, 232, 240, 0.9);
  padding: 18px 18px 16px;
  position: relative;
}

.friend-modal-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: none;
  background: #f3f4ff;
  color: #4b2d7a;
  cursor: pointer;
  font-size: 14px;
}

.friend-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}

.friend-modal-avatar {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 22px;
  overflow: hidden;
}

.friend-modal-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-modal-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.friend-modal-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.friend-modal-name {
  font-size: 18px;
  font-weight: 900;
  color: #1e1034;
}

.friend-modal-role {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3e8ff;
  color: #7c3aed;
}

.friend-modal-mood {
  font-size: 18px;
}

.friend-modal-sub {
  font-size: 13px;
  color: #7a69c4;
}

.friend-modal-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.friend-modal-section {
  padding: 8px 10px;
  border-radius: 14px;
  background: #faf7ff;
  border: 1px solid rgba(212, 200, 255, 0.9);
}

.friend-modal-label {
  font-size: 12px;
  font-weight: 700;
  color: #7c6acd;
  margin-bottom: 4px;
}

.friend-modal-main-goal {
  font-size: 15px;
  font-weight: 700;
  color: #f153aa;
}

.friend-modal-goals {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.friend-modal-goals li {
  display: flex;
  justify-content: space-between;
}

.friend-modal-cheer {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #7c3aed;
}

.friend-modal-actions {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.friend-modal-btn {
  flex: 1;
  min-width: 90px;
  border-radius: 999px;
  border: 1px solid #e0d4ff;
  background: #f9f5ff;
  color: #7c3aed;
  font-size: 13px;
  padding: 7px 10px;
  cursor: pointer;
}

.friend-modal-btn.primary {
  background: linear-gradient(135deg, #f153aa, #a855f7);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 10px 20px rgba(148, 60, 180, 0.45);
}

/* 플로팅 문의하기 버튼 */

.floating-support-btn {
  position: fixed;
  right: 26px;
  bottom: 26px;
  border-radius: 999px;
  border: none;
  padding: 10px 18px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  box-shadow:
    0 14px 30px rgba(124, 58, 237, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  z-index: 30;
}

/* 링크 리셋 */

a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

/* 반응형 */

@media (max-width: 1024px) {
  .home-root {
    padding: 16px;
  }

  .home-header {
    flex-direction: column;
  }

  .home-quick-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-top-summary {
    grid-template-columns: 1fr;
  }

  .calendar-grid {
    font-size: 11px;
  }

  .friend-card {
    margin-top: 16px;
  }
}

@media (max-width: 640px) {
  .home-inner {
    max-width: 100%;
  }

  .home-header {
    padding: 14px 12px;
  }

  .home-quick-nav {
    grid-template-columns: 1fr 1fr;
  }

  .weather-slot {
    min-width: 88px;
  }

  .floating-support-btn {
    right: 16px;
    bottom: 16px;
  }
}
`;

export {};
