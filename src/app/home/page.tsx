// src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

type GrowthDay = {
  date: string; // YYYY-MM-DD
  rate: number; // 0~1
};

type Friend = {
  id: string;
  name: string;
  role: string | null;
  online: boolean;
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

  const todayStr = useMemo(() => formatDate(new Date()), []);

  const [quoteIndex, setQuoteIndex] = useState<number>(() => {
    return new Date().getDate() % EMO_SLIDES.length;
  });

  const friends: Friend[] = [
    { id: 'f1', name: '김영업 팀장', role: '팀장', online: true },
    { id: 'f2', name: '박성장 사원', role: '사원', online: true },
    { id: 'f3', name: '이멘탈 대리', role: '대리', online: false },
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

    // 1) schedules
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

    // 2) up_logs (목표 + 기록 여부)
    const loggedSet = new Set<string>();

    const { data: upRows, error: upError } = await supabase
      .from('up_logs')
      .select('id, day_goal, week_goal, month_goal, log_date')
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
      });
    } else {
      setLatestGoals(null);
      if (upError) console.error('up_logs error', upError);
    }

    // 3) 최근 반론 (상단 통계용)
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

    // 4) 한 달치 daily_tasks
    const today = formatDate(new Date());
    const { data: monthTaskRows, error: monthTaskError } = await supabase
      .from('daily_tasks')
      .select('id, task_date, content, done')
      .eq('user_id', uid)
      .gte('task_date', from)
      .lte('task_date', to)
      .order('task_date', { ascending: true });

    const taskSummary: Record<
      string,
      { total: number; done: number }
    > = {};
    const todayList: DailyTask[] = [];

    if (!monthTaskError && monthTaskRows) {
      (monthTaskRows as any[]).forEach((t) => {
        const dateStr: string = t.task_date;
        if (!dateStr) return;

        if (!taskSummary[dateStr]) {
          taskSummary[dateStr] = { total: 0, done: 0 };
        }
        taskSummary[dateStr].total += 1;
        if (t.done) taskSummary[dateStr].done += 1;

        if (dateStr === today) {
          todayList.push({
            id: String(t.id),
            task_date: dateStr,
            content: t.content ?? '',
            done: !!t.done,
          });
        }
      });

      setTodayTasks(todayList);
    } else {
      setTodayTasks([]);
      if (monthTaskError)
        console.error('daily_tasks month error', monthTaskError);
    }

    // 5) 성장 그래프용 데이터
    const daysInThisMonth = monthEnd.getDate();
    const growth: GrowthDay[] = [];

    for (let d = 1; d <= daysInThisMonth; d++) {
      const cur = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        d
      );
      const dateStr = formatDate(cur);
      const taskInfo = taskSummary[dateStr];

      let rate = 0;

      if (taskInfo && taskInfo.total > 0) {
        // 오늘 할 일 달성률
        rate = taskInfo.done / taskInfo.total;
      } else if (loggedSet.has(dateStr)) {
        // 할 일은 없지만 up_logs 기록만 있는 날
        rate = 0.4;
      } else {
        rate = 0;
      }

      growth.push({
        date: dateStr,
        rate,
      });
    }

    setGrowthDays(growth);

    // 6) 날씨 (mock)
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

  // 성장 그래프용 SVG 포인트 (한 달 구성 꺾은선 그래프)
  const graphPoints = useMemo(() => {
    if (!growthDays.length) return '';
    const lastIndex = Math.max(growthDays.length - 1, 1);

    return growthDays
      .map((g, idx) => {
        const x = (idx / lastIndex) * 100; // 0 ~ 100
        const rate = g.rate < 0 ? 0 : g.rate > 1 ? 1 : g.rate;
        const y = 35 - rate * 30; // 0~1 -> 35~5
        return `${x},${y}`;
      })
      .join(' ');
  }, [growthDays]);

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
                <span className="profile-pill">{industry ?? '업종 미설정'}</span>
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
                  오늘 등록 고객 <strong>{newScheduleCountToday}명</strong>
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

        {/* 퀵 메뉴 버튼들 */}
        <section className="home-quick-nav">
          <Link href="/my-up" className="quick-card">
            <div className="quick-title">나의 U P 관리</div>
            <div className="quick-desc">목표 · 마음 · 피드백 정리하기</div>
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
              <div className="section-title-wrap">
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
          {/* ====== 일 · 주 · 월 목표 / 오늘 할 일 / 성장 그래프 ====== */}
          <section className="home-top-summary">
            {/* 일 · 주 · 월 목표 요약 */}
            <div className="summary-card goals-card">
              <h3 className="summary-title">일 · 주 · 월 목표 요약</h3>

              <div className="goals-list">
                <div className="goal-card goal-card-today">
                  <div className="goal-label">오늘 목표</div>
                  <div className="goal-text">
                    가망고객 12월 안부 문자인사하기
                  </div>
                </div>

                <div className="goal-card">
                  <div className="goal-label">이번 주 목표</div>
                  <div className="goal-text">신규고객 3명 이상</div>
                </div>

                <div className="goal-card">
                  <div className="goal-label">이번 달 목표</div>
                  <div className="goal-text">이달엔 30건 이상 계약하기</div>
                </div>
              </div>

              <div className="goal-main">
                나의 최종 목표{' '}
                <span className="goal-main-strong">“1등 찍어보자”</span>
              </div>
            </div>

            {/* 오늘 할 일 */}
            <div className="summary-card todo-card">
              <h3 className="summary-title">오늘 할 일</h3>
              <p className="summary-desc">
                나의 U P 관리에서 등록한
                <br />
                오늘의 체크항목만 크게 한눈에 보여줘요.
              </p>

              {todayTasks.length === 0 ? (
                <div className="todo-empty">
                  아직 등록된 할 일이 없어요.
                  <br />
                  <span className="todo-empty-sub">
                    오늘의 할 일은 <strong>나의 U P 관리</strong>에서만 추가/수정할
                    수 있어요.
                  </span>
                </div>
              ) : (
                <ul className="todo-list">
                  {todayTasks.map((task) => (
                    <li key={task.id} className="todo-item">
                      <span
                        className={
                          'todo-check ' +
                          (task.done ? 'todo-check-done' : '')
                        }
                      />
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
                <span className="growth-month">
                  {currentMonthLabel || '2025년 12월'}
                </span>
              </div>
              <p className="growth-caption">
                중요한 건 <span>빈 날을 줄여가는 것</span>입니다.
                <br />
                오늘 할 일 달성률을 한 달 꺾은선 그래프로 보여줘요.
              </p>

              <div className="growth-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot-zero" />
                  기록 없음
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-mid" />
                  일부 달성
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-full" />
                  완전 달성
                </span>
              </div>

              <div className="growth-chart-wrapper">
                <div className="growth-y-labels">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
                <div className="growth-svg-area">
                  <svg
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    className="growth-svg"
                  >
                    {/* 배경 라인 */}
                    <line
                      x1="0"
                      y1="35"
                      x2="100"
                      y2="35"
                      className="growth-axis-line"
                    />
                    <line
                      x1="0"
                      y1="20"
                      x2="100"
                      y2="20"
                      className="growth-grid-line"
                    />
                    <line
                      x1="0"
                      y1="5"
                      x2="100"
                      y2="5"
                      className="growth-grid-line"
                    />
                    {graphPoints && (
                      <>
                        <polyline
                          points={graphPoints}
                          className="growth-polyline"
                        />
                        {growthDays.map((g, idx) => {
                          const lastIndex = Math.max(
                            growthDays.length - 1,
                            1
                          );
                          const x = (idx / lastIndex) * 100;
                          const rate =
                            g.rate < 0 ? 0 : g.rate > 1 ? 1 : g.rate;
                          const y = 35 - rate * 30;

                          let dotClass = 'growth-dot-zero';
                          if (rate === 0) {
                            dotClass = 'growth-dot-zero';
                          } else if (rate < 0.5) {
                            dotClass = 'growth-dot-low';
                          } else if (rate < 1) {
                            dotClass = 'growth-dot-mid';
                          } else {
                            dotClass = 'growth-dot-full';
                          }

                          return (
                            <circle
                              key={g.date}
                              cx={x}
                              cy={y}
                              r={1.4}
                              className={dotClass}
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                  <div className="growth-x-labels">
                    <span>1일</span>
                    <span>5일</span>
                    <span>10일</span>
                    <span>15일</span>
                    <span>20일</span>
                    <span>25일</span>
                    <span>말일</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 아래쪽: 스케줄 달력 / 친구 목록 */}
          <section className="home-section calendar-section">
            <div className="section-header">
              <div>
                <div className="section-title">스케줄 달력</div>
                <div className="section-sub">
                  날짜마다 등록된 스케줄만 한눈에 확인해요.
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
                const summary = daySummaries.find((s) => s.date === dStr);
                const hasSchedule = !!summary;

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
                    <div className="calendar-day-number">{d.getDate()}</div>
                    {hasSchedule && (
                      <div className="calendar-day-dot">
                        {summary?.count ?? 0}개
                      </div>
                    )}
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

            {/* 선택한 날짜 일정 (읽기 전용) */}
            <div className="right-card calendar-selected-card">
              <div className="right-card-header">
                <div>
                  <div className="section-title">선택한 날짜의 일정</div>
                  <div className="section-sub">{selectedDateLabel}</div>
                </div>
              </div>

              <p className="schedule-help">
                일정 <strong>추가·수정</strong>은{' '}
                <strong>나의 U P 관리</strong> 또는 <strong>고객관리</strong>에서만
                할 수 있어요.
              </p>

              {selectedDateSchedules.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 일정이 없어요.
                  <br />
                  나의 U P 관리 또는 고객관리에서 일정을 등록해 보세요.
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

            {/* 친구 목록 카드 (그라데이션 색상 적용) */}
            <div className="right-card friends-card">
              <div className="right-card-header friends-header">
                <div>
                  <div className="section-title friends-title">친구 목록</div>
                  <div className="section-sub friends-sub">
                    팀원들과 함께 U P 채팅을 이어가요.
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
                <div className="empty-text friends-empty">
                  아직 등록된 친구가 없어요.
                  <br />
                  먼저 나의 U P를 채우고, 나중에 함께 U P해봐요 ✨
                </div>
              ) : (
                <ul className="friends-list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="friend-item">
                      <span
                        className={
                          'friend-dot ' +
                          (friend.online ? 'friend-dot-on' : 'friend-dot-off')
                        }
                      />
                      <span className="friend-name">{friend.name}</span>
                      {friend.role && (
                        <span className="friend-role">{friend.role}</span>
                      )}
                      <span className="friend-status">
                        {friend.online ? '온라인' : '오프라인'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* 오른쪽 하단 문의 버튼 */}
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
  font-size: 15px;
  line-height: 1.6;
}

.home-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 공통 */

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: #6b41ff;
}

.section-sub {
  font-size: 13px;
  margin-top: 4px;
  color: #8c7ad9;
}

/* 로딩 */

.home-loading {
  margin-top: 120px;
  text-align: center;
  font-size: 18px;
}

/* 헤더 */

.home-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff89bd, #a45bff);
  box-shadow: 0 22px 44px rgba(0,0,0,0.25);
  margin-bottom: 20px;
  color: #fffdfd;
}

.home-header-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-logo-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-logo {
  width: 56px;
  height: 56px;
  border-radius: 20px;
  object-fit: cover;
  background: rgba(255,255,255,0.25);
  padding: 8px;
}

.home-logo-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.home-logo-text {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 5px;
  background: linear-gradient(135deg, #ffffff, #ffe9ff);
  -webkit-background-clip: text;
  color: transparent;
}

.home-logo-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
}

.home-welcome {
  margin-top: 10px;
  font-size: 19px;
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
  font-size: 14px;
  margin-top: 4px;
  color: #fffdfd;
}

/* 헤더 오른쪽 카드 */

.home-header-right {
  min-width: 380px;
  display: flex;
  justify-content: flex-end;
}

.profile-box {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px 18px;
  box-shadow: 0 18px 34px rgba(0,0,0,0.16);
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #e3dafb;
  color: #211437;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9bd6 0, #8f5bff 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 24px;
  overflow: hidden;
  box-shadow: 0 0 14px rgba(193, 126, 255, 0.7);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: 16px;
  font-weight: 700;
  color: #211437;
}

.profile-email {
  font-size: 12px;
  color: #8b7bd4;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-pill {
  font-size: 12px;
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
  font-size: 12px;
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
  font-size: 13px;
}

.profile-links a {
  color: #a24cff;
  text-decoration: none;
}

/* 오늘의 U P 감성 배너 */

.emo-banner {
  margin-bottom: 20px;
  padding: 22px 26px 24px;
  border-radius: 26px;
  background: linear-gradient(135deg, #8e7dff, #ff8fd2);
  box-shadow: 0 20px 40px rgba(107, 71, 183, 0.3);
  position: relative;
  overflow: hidden;
  color: #fffdfd;
}

.emo-pill {
  display: inline-flex;
  padding: 6px 20px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.9);
  font-size: 12px;
  margin-bottom: 14px;
  background: rgba(0,0,0,0.12);
}

.emo-title {
  font-size: 24px;
  line-height: 1.7;
  margin-bottom: 12px;
  font-weight: 800;
}

.emo-title span {
  color: #ffe98f;
}

.emo-body p {
  font-size: 14px;
  margin: 2px 0;
}

.emo-footer {
  margin-top: 12px;
  font-size: 14px;
  color: #fff4ff;
}

.emo-dots {
  margin-top: 12px;
  display: flex;
  gap: 6px;
}

.emo-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: none;
  background: rgba(255,255,255,0.55);
  cursor: pointer;
}

.emo-dot-active {
  width: 22px;
  background: #ffffff;
}

/* 퀵 메뉴 - 밝은 버튼 */

.home-quick-nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.quick-card {
  border-radius: 18px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #ffffff, #ffe9f7);
  box-shadow: 0 14px 26px rgba(212, 170, 245, 0.45);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border 0.14s ease;
  border: 1px solid rgba(241, 153, 214, 0.8);
  color: #2b1037;
}

.quick-card:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #ffe9f7, #f2e8ff);
  box-shadow: 0 18px 32px rgba(199, 149, 255, 0.7);
  border-color: rgba(241, 83, 170, 0.9);
}

.quick-title {
  font-size: 15px;
  font-weight: 800;
  color: #f153aa;
}

.quick-desc {
  font-size: 13px;
  color: #5b456e;
}

/* 날씨 */

.weather-wide {
  margin-bottom: 16px;
}

.weather-panel {
  border-radius: 20px;
  background: #ffffff;
  padding: 14px 18px 12px;
  box-shadow: 0 14px 30px rgba(0,0,0,0.12);
  border: 1px solid #e3dafb;
  color: #241336;
}

.weather-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.weather-strip {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.weather-slot {
  min-width: 130px;
  border-radius: 14px;
  background: #f7f3ff;
  padding: 9px;
  font-size: 12px;
}

.weather-time {
  font-weight: 600;
  margin-bottom: 4px;
}

.weather-temp {
  font-size: 18px;
  font-weight: 800;
  color: #f35fa6;
}

.weather-desc {
  font-size: 12px;
  color: #7a68c4;
}

/* 메인 레이아웃 */

.home-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.home-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 12px;
}

.calendar-section {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 상단 요약 카드 */

.home-top-summary {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 24px;
  padding: 20px 22px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  border: 1px solid #e5ddff;
  color: #211437;
}

.summary-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 10px;
  color: #6b41ff;
}

/* 목표 카드 */

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.goal-card {
  border-radius: 18px;
  padding: 10px 12px;
  background: #faf7ff;
  border: 1px solid rgba(194, 179, 255, 0.6);
}

.goal-card-today {
  background: linear-gradient(135deg, #ffb5df, #ff8cc7);
  box-shadow: 0 0 14px rgba(255, 128, 205, 0.6);
  color: #2b1131;
}

.goal-label {
  font-size: 13px;
  color: #694292;
  font-weight: 600;
}

.goal-text {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
}

.goal-main {
  margin-top: 12px;
  font-size: 14px;
  color: #7e68c7;
}

.goal-main-strong {
  color: #f153aa;
  font-weight: 700;
}

/* 오늘 할 일 */

.todo-card {
  position: relative;
}

.summary-desc {
  font-size: 13px;
  color: #7a69c4;
}

.todo-empty {
  margin-top: 12px;
  border-radius: 18px;
  padding: 12px 14px;
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
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
}

.todo-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #f153aa;
  box-sizing: border-box;
}

.todo-check-done {
  background: linear-gradient(135deg, #f153aa, #a36dff);
}

.todo-text {
  color: #241336;
}

.todo-text-done {
  color: #a39ad3;
  text-decoration: line-through;
}

/* 성장 그래프 카드 */

.growth-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.growth-month {
  font-size: 13px;
  color: #7e6fd6;
}

.growth-caption {
  margin-top: 4px;
  font-size: 13px;
  color: #7c6acd;
}

.growth-caption span {
  color: #f153aa;
  font-weight: 600;
}

.growth-legend {
  margin-top: 10px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7e6fd6;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
}

.legend-dot-zero {
  background: #e3dafb;
}

.legend-dot-mid {
  background: linear-gradient(135deg, #f9a8d4, #fb923c);
}

.legend-dot-full {
  background: linear-gradient(135deg, #ff9ed8, #ff73b5);
  box-shadow: 0 0 10px rgba(255, 115, 181, 0.7);
}

/* 꺾은선 그래프 영역 */

.growth-chart-wrapper {
  margin-top: 14px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: stretch;
}

.growth-y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  color: #7e6fd6;
  padding: 4px 0;
}

.growth-svg-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.growth-svg {
  width: 100%;
  height: 120px;
}

.growth-axis-line {
  stroke: #c7bdf4;
  stroke-width: 0.6;
}

.growth-grid-line {
  stroke: #e3dafb;
  stroke-width: 0.4;
  stroke-dasharray: 1.5 2;
}

.growth-polyline {
  fill: none;
  stroke: url(#growthGradient);
  stroke-width: 1.2;
}

/* 점 색상 */
.growth-dot-zero {
  fill: #d4c9ff;
}
.growth-dot-low {
  fill: #fca5a5;
}
.growth-dot-mid {
  fill: #fb923c;
}
.growth-dot-full {
  fill: #ff73b5;
}

/* X축 라벨 */

.growth-x-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #a093e4;
}

/* 공통 카드 (달력/친구) */

.right-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 14px 16px;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  border: 1px solid #e5ddff;
  color: #211437;
}

.right-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
}

.small-link {
  font-size: 12px;
  color: #a24cff;
  text-decoration: none;
}

.empty-text {
  font-size: 13px;
  color: #7a69c4;
  line-height: 1.5;
}

/* 달력 */

.section-header {
  margin-bottom: 10px;
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
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 600;
  background: #f0e8ff;
  color: #5a3cb2;
  cursor: pointer;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  color: #372153;
}

.calendar-grid {
  background: #ffffff;
  border-radius: 18px;
  padding: 10px;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  grid-column: 1 / -1;
  border: 1px solid #e5ddff;
}

.calendar-weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #7f6bd5;
}

.calendar-day {
  border-radius: 14px;
  border: none;
  background: #faf7ff;
  padding: 6px 4px;
  min-height: 58px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  color: #241336;
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

.calendar-day-number {
  font-weight: 700;
}

.calendar-day-dot {
  margin-top: 2px;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 999px;
  background: #f153aa;
  color: #fff;
}

.calendar-footer {
  grid-column: 1 / -1;
  margin-top: 8px;
  font-size: 13px;
  color: #7e6fd6;
}

/* 선택 날짜 - 읽기전용 안내 */

.calendar-selected-card {
  grid-column: 1 / -1;
}

.schedule-help {
  font-size: 13px;
  margin-bottom: 8px;
  color: #5d4b9d;
}

/* 스케줄 목록 */

.schedule-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
}

.schedule-item {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 8px;
  font-size: 13px;
  padding: 5px 0;
  border-bottom: 1px dashed #e0d4ff;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-time {
  color: #f153aa;
  font-weight: 700;
}

.schedule-title {
  color: #241336;
}

/* 친구 카드 - 감성 그라데이션 */

.friends-card {
  background: linear-gradient(135deg, #8e7dff, #ff8fd2);
  border-color: rgba(255,255,255,0.6);
  color: #fffdfd;
}

.friends-header {
  align-items: center;
}

.friends-title {
  color: #ffe9ff;
}

.friends-sub {
  color: #ffe4ff;
}

.friends-empty {
  color: #fdf2ff;
}

/* 친구 */

.friend-chat-banner {
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  background: radial-gradient(circle at top left, #ffe3fb 0, #ffb1e3 45%, #ff99d6 80%);
  color: #4b1840;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(163, 110, 255, 0.55);
}

.friend-chat-banner.big {
  padding: 10px 26px;
  font-size: 14px;
}

.friends-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 5px 0;
}

.friend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #999;
}

.friend-dot-on {
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.7);
}

.friend-dot-off {
  background: #e5e7eb;
}

.friend-name {
  font-weight: 600;
}

.friend-role {
  font-size: 12px;
  color: #fde68a;
}

.friend-status {
  margin-left: auto;
  font-size: 12px;
  color: #e5e7eb;
}

/* 플로팅 버튼 */

.floating-support-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 70px;
  height: 70px;
  border-radius: 999px;
  border: none;
  background: radial-gradient(circle at top left, #ffb0e3 0, #b26bff 70%);
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 반응형 */

@media (max-width: 960px) {
  .home-root {
    padding: 14px;
  }
  .home-header {
    flex-direction: column;
  }
  .home-header-right {
    min-width: 100%;
  }
  .home-quick-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-section {
    grid-template-columns: 1fr;
  }
  .calendar-section {
    grid-template-columns: 1fr;
  }
  .home-top-summary {
    grid-template-columns: 1fr;
  }
}
`;
