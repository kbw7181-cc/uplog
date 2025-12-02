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

  const [scheduleTimeInput, setScheduleTimeInput] = useState('');
  const [scheduleTitleInput, setScheduleTitleInput] = useState('');

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

    // up_logs for goals + growth graph
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

      const loggedSet = new Set<string>();
      (upRows as any[]).forEach((row) => {
        if (!row.log_date) return;
        const raw = row.log_date;
        const str =
          typeof raw === 'string'
            ? raw.slice(0, 10)
            : formatDate(new Date(raw));
        loggedSet.add(str);
      });

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
        });
      }
      setGrowthDays(growth);
    } else {
      setLatestGoals(null);
      setGrowthDays([]);
      if (upError) console.error('up_logs error', upError);
    }

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

  const handleScheduleSave = async () => {
    if (!userId) return;

    if (!scheduleTitleInput.trim()) {
      alert('일정 내용을 입력해 주세요.');
      return;
    }

    const { error } = await supabase.from('schedules').insert({
      user_id: userId,
      schedule_date: selectedDate,
      schedule_time: scheduleTimeInput || null,
      title: scheduleTitleInput.trim(),
    });

    if (error) {
      console.error('insert schedule error', error);
      alert(
        '일정 저장 중 오류가 발생했어요.\nSupabase의 schedules 테이블 컬럼/권한을 다시 확인해 주세요.'
      );
      return;
    }

    setScheduleTimeInput('');
    setScheduleTitleInput('');
    await loadDashboardData(userId, currentMonth);
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
              <div className="section-title">오늘 날씨</div>
              <div className="section-sub">
                외근/미팅 계획 세울 때 참고하세요.
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
                나의 U P 관리에서 등록한<br />
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
              </p>

              <div className="growth-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot-on" />
                  기록 있음
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-off" />
                  빈 날
                </span>
              </div>

              <div className="growth-grid">
                {Array.from(
                  { length: growthDays.length || 31 },
                  (_, idx) => {
                    const day = idx + 1;
                    const found =
                      growthDays.find((g) =>
                        g.date.endsWith(`-${day.toString().padStart(2, '0')}`)
                      ) ?? null;
                    const hasRecord = !!found && found.rate > 0;

                    return (
                      <div
                        key={day}
                        className={
                          'growth-day ' +
                          (hasRecord ? 'growth-day-on' : 'growth-day-off')
                        }
                      >
                        {day}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* 아래쪽: 스케줄 달력 / 친구 / 반론 아카이브 */}
          <section className="home-section calendar-section">
            <div className="section-header">
              <div>
                <div className="section-title">스케줄 달력</div>
                <div className="section-sub">
                  날짜마다 약속과 할 일을 한눈에 확인해요.
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

            {/* 선택한 날짜 일정 + 등록 */}
            <div className="right-card calendar-selected-card">
              <div className="right-card-header">
                <div>
                  <div className="section-title">선택한 날짜의 일정</div>
                  <div className="section-sub">{selectedDateLabel}</div>
                </div>
              </div>

              <div className="schedule-input-row">
                <div className="schedule-time-wrap">
                  <span className="schedule-time-label">시간</span>
                  <input
                    type="time"
                    value={scheduleTimeInput}
                    onChange={(e) => setScheduleTimeInput(e.target.value)}
                    className="schedule-time-input"
                  />
                </div>
                <input
                  type="text"
                  placeholder="일정 내용 (예: 00고객 상담)"
                  value={scheduleTitleInput}
                  onChange={(e) => setScheduleTitleInput(e.target.value)}
                  className="schedule-title-input"
                />
                <button
                  type="button"
                  className="schedule-save-btn"
                  onClick={handleScheduleSave}
                >
                  일정 등록
                </button>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 일정이 없어요.
                  <br />
                  위에서 시간과 내용을 적고 일정 등록을 눌러 주세요.
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

            {/* 친구 목록 */}
            <div className="right-card">
              <div className="right-card-header">
                <div>
                  <div className="section-title">친구 목록</div>
                  <div className="section-sub">
                    팀원들의 상태를 한눈에 볼 수 있어요.
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

            {/* 최근 반론 아카이브 */}
            <div className="right-card">
              <div className="right-card-header">
                <div className="section-title">최근 반론 아카이브</div>
                <Link href="/rebuttal" className="small-link">
                  전체 보기
                </Link>
              </div>
              {recentRebuttals.length === 0 ? (
                <div className="empty-text">
                  아직 등록된 반론이 없어요.
                  <br />
                  고객의 거절 멘트와 나의 답변을 저장해 보세요.
                </div>
              ) : (
                <ul className="rebuttal-list">
                  {recentRebuttals.map((r) => (
                    <li key={r.id} className="rebuttal-item">
                      <div className="rebuttal-category">
                        {r.category || '카테고리 미설정'}
                      </div>
                      <div className="rebuttal-content">
                        {r.content || ''}
                      </div>
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
  background: radial-gradient(circle at top left, #f9e0ff 0, #422061 40%, #12061c 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f8f4ff;
}

.home-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 공통 */

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffe9ff;
  text-shadow: 0 0 10px rgba(255, 147, 255, 0.6);
}

.section-sub {
  font-size: 12px;
  margin-top: 4px;
  color: #b9a6ff;
}

/* 로딩 */

.home-loading {
  margin-top: 120px;
  text-align: center;
  font-size: 16px;
}

/* 헤더 */

.home-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 26px;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff87ba, #a455ff);
  box-shadow: 0 22px 44px rgba(0,0,0,0.48);
  margin-bottom: 18px;
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
  width: 50px;
  height: 50px;
  border-radius: 18px;
  object-fit: cover;
  background: rgba(255,255,255,0.3);
  padding: 7px;
}

.home-logo-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.home-logo-text {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #ffffff, #ffe0ff);
  -webkit-background-clip: text;
  color: transparent;
}

.home-logo-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.9);
}

.home-welcome {
  margin-top: 8px;
  font-size: 17px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff, #ffe4ff);
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 0 16px rgba(255,255,255,0.5);
}

.welcome-name {
  color: inherit;
}

.home-date {
  font-size: 13px;
  margin-top: 4px;
  color: rgba(255,255,255,0.95);
}

.home-header-right {
  min-width: 360px;
  display: flex;
  justify-content: flex-end;
}

.profile-box {
  background: rgba(12, 2, 28, 0.96);
  border-radius: 24px;
  padding: 14px 16px;
  box-shadow: 0 18px 34px rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(255, 163, 255, 0.3);
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  width: 50px;
  height: 50px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9bd6 0, #8f5bff 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 22px;
  overflow: hidden;
  box-shadow: 0 0 18px rgba(255, 144, 244, 0.7);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: 15px;
  font-weight: 700;
}

.profile-email {
  font-size: 11px;
  color: #c6b7ff;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-pill {
  font-size: 11px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(100, 75, 190, 0.8);
  color: #fef5ff;
}

.profile-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-stat-pill {
  font-size: 11px;
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(35, 20, 80, 0.95);
  color: #fef5ff;
  border: 1px solid rgba(255, 168, 255, 0.35);
}

.profile-stat-pill strong {
  color: #ffb5df;
}

.profile-links {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  font-size: 12px;
}

.profile-links a {
  color: #ffbff0;
  text-decoration: none;
}

/* 오늘의 U P 감성 */

.emo-banner {
  margin-bottom: 18px;
  padding: 20px 24px 22px;
  border-radius: 26px;
  background: linear-gradient(135deg, #5a2dfd, #ff6fbd);
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  position: relative;
  overflow: hidden;
}

.emo-pill {
  display: inline-flex;
  padding: 5px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.8);
  font-size: 11px;
  margin-bottom: 12px;
  background: rgba(0,0,0,0.18);
}

.emo-title {
  font-size: 22px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.emo-title span {
  color: #ffe98f;
}

.emo-body p {
  font-size: 13px;
  margin: 2px 0;
}

.emo-footer {
  margin-top: 12px;
  font-size: 13px;
  color: #ffe7ff;
}

.emo-dots {
  margin-top: 12px;
  display: flex;
  gap: 6px;
}

.emo-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: rgba(255,255,255,0.35);
  cursor: pointer;
}

.emo-dot-active {
  width: 20px;
  background: #fff;
}

/* 퀵 메뉴 */

.home-quick-nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.quick-card {
  border-radius: 18px;
  padding: 12px 14px;
  background: radial-gradient(circle at top left, #2a102f 0, #110719 60%);
  box-shadow: 0 14px 30px rgba(0,0,0,0.7);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border 0.14s ease;
  border: 1px solid rgba(255, 135, 230, 0.15);
}

.quick-card:hover {
  transform: translateY(-2px);
  background: radial-gradient(circle at top left, #3b1745 0, #1b0926 60%);
  box-shadow: 0 18px 36px rgba(0,0,0,0.9);
  border-color: rgba(255, 180, 255, 0.6);
}

.quick-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffeafe;
  text-shadow: 0 0 10px rgba(255, 152, 255, 0.5);
}

.quick-desc {
  font-size: 11px;
  color: #d6c2ff;
}

/* 날씨 */

.weather-wide {
  margin-bottom: 14px;
}

.weather-panel {
  border-radius: 20px;
  background: radial-gradient(circle at top left, #2b123a 0, #12041f 70%);
  padding: 12px 16px 10px;
  box-shadow: 0 16px 34px rgba(0,0,0,0.7);
}

.weather-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.weather-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.weather-slot {
  min-width: 120px;
  border-radius: 14px;
  background: rgba(39, 19, 70, 0.95);
  padding: 8px;
  font-size: 11px;
}

.weather-time {
  font-weight: 600;
  margin-bottom: 4px;
}

.weather-temp {
  font-size: 16px;
  font-weight: 700;
  color: #ffb7f4;
}

.weather-desc {
  font-size: 11px;
  color: #d9c8ff;
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

/* 상단 요약 카드 (목표 / 오늘 할 일 / 성장 그래프) */

.home-top-summary {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 24px;
  padding: 18px 20px;
  background: radial-gradient(circle at top left, #1e0d33 0, #0a0213 70%);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 185, 255, 0.18);
}

.summary-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #ffe9ff;
  text-shadow: 0 0 8px rgba(255, 150, 255, 0.6);
}

.summary-desc {
  font-size: 13px;
  color: #e6dcff;
  line-height: 1.5;
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
  background: #211033;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.goal-card-today {
  background: linear-gradient(135deg, #ff8fd7, #ff6fb5);
  box-shadow: 0 0 18px rgba(255, 140, 220, 0.7);
}

.goal-label {
  font-size: 12px;
  color: #ffe9ff;
  opacity: 0.9;
}

.goal-text {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.goal-main {
  margin-top: 12px;
  font-size: 13px;
  color: #b9a9ff;
}

.goal-main-strong {
  color: #ffcaf8;
  font-weight: 700;
}

/* 오늘 할 일 */

.todo-card {
  position: relative;
}

.todo-empty {
  margin-top: 12px;
  border-radius: 18px;
  padding: 12px 14px;
  background: #1a0c2b;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  font-size: 13px;
  color: #b9a9ff;
  line-height: 1.5;
}

.todo-empty-sub {
  font-size: 12px;
  opacity: 0.9;
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
  padding: 4px 0;
  font-size: 13px;
}

.todo-check {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid #ff9fdc;
  box-sizing: border-box;
}

.todo-check-done {
  background: linear-gradient(135deg, #ff9fdc, #a36dff);
}

.todo-text {
  color: #f3eaff;
}

.todo-text-done {
  color: #8e83c5;
  text-decoration: line-through;
}

/* 성장 그래프 카드 */

.growth-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.growth-month {
  font-size: 12px;
  color: #c5b7ff;
}

.growth-caption {
  margin-top: 4px;
  font-size: 12px;
  color: #d8cfff;
}

.growth-caption span {
  color: #ffcaf8;
  font-weight: 600;
}

.growth-legend {
  margin-top: 10px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #b9a9ff;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot-on {
  background: linear-gradient(135deg, #ff9ed8, #ff73b5);
  box-shadow: 0 0 10px rgba(255, 140, 220, 0.7);
}

.legend-dot-off {
  background: #2c193f;
}

.growth-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.growth-day {
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.16s ease;
}

.growth-day-on {
  background: linear-gradient(135deg, #ff9ed8, #ff73b5);
  color: #ffffff;
  box-shadow: 0 0 14px rgba(255, 140, 220, 0.8);
}

.growth-day-off {
  background: #1d0f30;
  color: #5f4f86;
}

.growth-day-off:hover {
  background: #26113c;
  color: #e6dcff;
}

/* 카드 공통 (아래쪽) */

.right-card {
  background: radial-gradient(circle at top left, #251136 0, #0b0313 70%);
  border-radius: 20px;
  padding: 12px 14px;
  box-shadow: 0 16px 34px rgba(0,0,0,0.8);
}

.right-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 6px;
}

.small-link {
  font-size: 11px;
  color: #ffbff0;
  text-decoration: none;
}

.empty-text {
  font-size: 11px;
  color: #bcb0ff;
  line-height: 1.5;
}

/* 달력 */

.section-header {
  margin-bottom: 8px;
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
  font-size: 11px;
  background: rgba(73, 46, 150, 0.9);
  color: #ffe3ff;
  cursor: pointer;
}

.month-label {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.calendar-grid {
  background: radial-gradient(circle at top left, #1e0e2c 0, #09020f 80%);
  border-radius: 18px;
  padding: 8px;
  box-shadow: 0 16px 30px rgba(0,0,0,0.8);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  grid-column: 1 / -1;
}

.calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #fef1ff;
}

.calendar-day {
  border-radius: 14px;
  border: none;
  background: #1a0c27;
  padding: 6px 4px;
  min-height: 56px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  color: #fef7ff;
}

.calendar-day-out {
  opacity: 0.34;
}

.calendar-day-today {
  box-shadow: 0 0 0 1px #ffb7f4;
}

.calendar-day-selected {
  box-shadow: 0 0 0 2px #ff8bdc;
  background: linear-gradient(135deg, #ff8bdc, #8345ff);
}

.calendar-day-number {
  font-weight: 600;
}

.calendar-day-dot {
  margin-top: 2px;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 999px;
  background: #ffb7f4;
  color: #3c0930;
}

.calendar-footer {
  grid-column: 1 / -1;
  margin-top: 6px;
  font-size: 12px;
  color: #d2c4ff;
}

/* 선택 날짜 */

.calendar-selected-card {
  grid-column: 1 / -1;
}

.schedule-input-row {
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.schedule-time-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.schedule-time-label {
  font-size: 11px;
  color: #f7e9ff;
}

.schedule-time-input {
  border-radius: 999px;
  border: 1px solid #b485ff;
  padding: 4px 8px;
  font-size: 12px;
  background: #13081d;
  color: #f5eaff;
}

.schedule-time-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

.schedule-title-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid #b485ff;
  padding: 6px 10px;
  font-size: 12px;
  background: #13081d;
  color: #f5eaff;
}

.schedule-title-input::placeholder {
  color: #a18ad2;
}

.schedule-save-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0,0,0,0.75);
}

/* 스케줄 목록 */

.schedule-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.schedule-item {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 6px;
  font-size: 11px;
  padding: 4px 0;
  border-bottom: 1px dashed #3c285e;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-time {
  color: #ffb7f4;
  font-weight: 600;
}

.schedule-title {
  color: #f9efff;
}

/* 친구 */

.friend-chat-banner {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0,0,0,0.8);
}

.friend-chat-banner.big {
  padding: 9px 24px;
  font-size: 13px;
}

.friends-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 4px 0;
}

.friend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #999;
}

.friend-dot-on {
  background: #46d46f;
}

.friend-dot-off {
  background: #777;
}

.friend-name {
  font-weight: 600;
}

.friend-role {
  font-size: 10px;
  color: #c7b5ff;
}

.friend-status {
  margin-left: auto;
  font-size: 10px;
  color: #a89ae0;
}

/* 반론 */

.rebuttal-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  max-height: 150px;
  overflow-y: auto;
}

.rebuttal-item {
  padding: 5px 0;
  border-bottom: 1px dashed #3c285e;
  font-size: 11px;
}

.rebuttal-item:last-child {
  border-bottom: none;
}

.rebuttal-category {
  font-weight: 600;
  color: #ffb7f4;
  margin-bottom: 2px;
}

.rebuttal-content {
  color: #f9efff;
}

/* 플로팅 버튼 */

.floating-support-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  border: none;
  background: radial-gradient(circle at top left, #ff9dd1 0, #a15dff 70%);
  box-shadow: 0 20px 40px rgba(0,0,0,0.95);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
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

