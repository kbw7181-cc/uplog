// src/app/home/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

type WeatherSlot = {
  time: string;
  temp: number;
  desc: string;
};

type RecentLog = {
  id: string;
  log_date: string | null;
  customer_name: string | null;
  product_name: string | null;
  status: string | null;
  amount: number | null;
};

type DailySummary = {
  date: string;
  count: number;
  amount: number;
};

type RecentRebuttal = {
  id: string;
  category: string;
  content: string;
  created_at: string;
};

type DailyTask = {
  id: string;
  content: string;
  done: boolean;
  task_date: string;
};

type MoodLevel = 1 | 2 | 3 | 4 | 5;

type SlideItem = {
  id: string;
  tag: string;       // 예: 마인드, 회복, 문자
  title: string;
  body: string;
};

const emotionSlides: SlideItem[] = [
  {
    id: 'mind-1',
    tag: '마인드',
    title: '오늘도 나를 UP 시키다',
    body: '거절은 줄이고, 경험은 쌓이고, 실력은 쌓입니다. 오늘 한 걸음이 내일의 계약을 만듭니다.',
  },
  {
    id: 'mind-2',
    tag: '마인드',
    title: '지금 이 순간이 제일 중요해요',
    body: '지나간 상담은 돌아오지 않지만, 지금 이 전화 한 통이 인생 계약이 될 수 있어요.',
  },
  {
    id: 'recovery-1',
    tag: '거절 회복',
    title: '거절은 실패가 아니라 힌트입니다',
    body: '고객이 남긴 말 한마디가 내 스크립트를 더 단단하게 만들어 줍니다. 오늘의 거절은 내일의 성공을 준비하는 중이에요.',
  },
  {
    id: 'recovery-2',
    tag: '거절 회복',
    title: '마음이 무거운 날엔',
    body: '조금 쉬어가도 괜찮아요. 다만 완전히 멈지만 않으면 됩니다. 대표님은 이미 충분히 잘하고 있어요.',
  },
  {
    id: 'sms-1',
    tag: '문자 예시',
    title: '안부 문자 예시',
    body: '안녕하세요, OO님 😊 오늘도 편안한 하루 보내고 계신가요? 예전에 말씀 나눴던 내용이 생각나서 인사 겸 문자 드립니다.',
  },
  {
    id: 'sms-2',
    tag: '문자 예시',
    title: '상담 후 케어 문자',
    body: '오늘 상담 시간 내주셔서 감사합니다, OO님. 혹시 더 궁금하신 점이 있으시면 언제든 편하게 말씀 주세요. 끝까지 잘 챙겨드릴게요. 🙏',
  },
  {
    id: 'sms-3',
    tag: '문자 예시',
    title: '거절 후 마무리 문자',
    body: '이번에는 인연이 닿지 않았지만, 진심으로 고민해주셔서 감사했습니다. 앞으로 더 좋은 선택만 가득하시길 응원할게요. 언제든 필요하시면 편하게 연락 주세요 😊',
  },
];

function getMoodMessage(m: MoodLevel | null): string {
  if (!m) {
    return '오늘 기분은 어떤가요? 솔직하게 체크해주면, UPLOG가 대표님 마음에 맞는 문장을 골라 드릴게요.';
  }
  if (m <= 2) {
    return '오늘은 마음이 조금 무거운 날이네요. 괜찮아요, 누구에게나 그런 날이 있습니다. 오늘은 “한 건 성사”보다 “나를 챙기는 하루”에 집중해도 됩니다.';
  }
  if (m === 3) {
    return '살짝 애매한 기분, 그렇지만 여기까지 온 것만으로도 이미 멋집니다. 작은 목표 하나만 정해서, 그거 하나만 완성해도 충분해요.';
  }
  if (m === 4) {
    return '괜찮은 흐름이에요. 오늘의 이 느낌을 살려서, 전화 한 통, 메시지 한 통만 더 해보면 어때요? 오늘의 성장이 내일의 자산이 됩니다.';
  }
  return '좋은 에너지가 느껴져요 🔥 지금 이 텐션이라면, 평소에 미뤄두었던 “조금 어려운 고객”에게도 도전해볼 수 있는 날입니다. UP 올라가는 하루 만들어 봅시다!';
}

function getRebuttalBadge(r: RecentRebuttal) {
  const cat = (r.category || '').toLowerCase();
  if (cat.includes('가격')) {
    return { emoji: '💰', label: '가격 반론' };
  }
  if (cat.includes('시간') || cat.includes('여유')) {
    return { emoji: '⏰', label: '시간/여유' };
  }
  if (cat.includes('기존') || cat.includes('상품')) {
    return { emoji: '📦', label: '기존 상품' };
  }
  return { emoji: '💬', label: '일반 반론' };
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('영업인');
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [salesCategory, setSalesCategory] = useState<string | null>(null);
  const [salesType, setSalesType] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [careerText, setCareerText] = useState<string>('');

  const [mainGoal, setMainGoal] = useState<string>('');
  const [monthGoalText, setMonthGoalText] = useState<string>('');
  const [todayMind, setTodayMind] = useState<string>('');

  const [targetCount, setTargetCount] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [achievedCount, setAchievedCount] = useState<number>(0);
  const [achievedAmount, setAchievedAmount] = useState<number>(0);

  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [recentRebuts, setRecentRebuts] = useState<RecentRebuttal[]>([]);

  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [newTaskContent, setNewTaskContent] = useState<string>('');
  const [todayDateStr, setTodayDateStr] = useState<string>('');

  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [nowLabel, setNowLabel] = useState<string>('');

  const weatherNow = 18;
  const weatherSlots: WeatherSlot[] = [
    { time: '08시', temp: 16, desc: '맑음' },
    { time: '12시', temp: 20, desc: '구름' },
    { time: '15시', temp: 22, desc: '맑음' },
    { time: '18시', temp: 19, desc: '부분 흐림' },
  ];

  useEffect(() => {
    function updateNow() {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      };
      const text = now
        .toLocaleString('ko-KR', options)
        .replace(',', '')
        .replace(' ', ' ');
      setNowLabel(text);
    }
    updateNow();
    const timer = setInterval(updateNow, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData.user;
      if (!u) {
        router.replace('/login');
        return;
      }

      setUserId(u.id);
      setEmail(u.email ?? null);

      const today = new Date();
      const tStr = today.toISOString().slice(0, 10);
      setTodayDateStr(tStr);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      if (profile) {
        const baseNickname =
          profile.name ?? (u.email?.split('@')[0] ?? '영업인');
        setNickname(baseNickname);
        setAvatarUrl(profile.profile_image ?? null);

        setSalesCategory(profile.sales_category ?? null);
        setSalesType(profile.sales_type ?? '');

        setCompanyName(profile.company_name ?? '');
        const ct =
          profile.career_text ??
          profile.career_years_text ??
          (profile.career_years != null ? `${profile.career_years}년차` : '');
        setCareerText(ct || '');

        setMainGoal(profile.main_goal ?? '');
        setMonthGoalText(profile.month_goal ?? '');
        setTodayMind(profile.today_mind ?? '');
      } else {
        setNickname(u.email?.split('@')[0] ?? '영업인');
      }

      const { data: goalRow } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();

      if (goalRow) {
        setTargetCount(goalRow.month_goal_count ?? 0);
        setTargetAmount(goalRow.month_goal_amount ?? 0);
        setAchievedCount(goalRow.current_count ?? 0);
        setAchievedAmount(goalRow.current_amount ?? 0);
      }

      const { data: logsData } = await supabase
        .from('sales_logs')
        .select('id, log_date, customer_name, product_name, status, amount, created_at')
        .eq('user_id', u.id)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      const rows = (logsData as RecentLog[]) || [];
      setRecentLogs(rows.slice(0, 5));

      const monthMap: Record<string, { count: number; amount: number }> = {};
      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();

      for (const r of rows) {
        if (!r.log_date) continue;
        const d = new Date(r.log_date);
        if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;
        if (r.status !== '성공') continue;

        const key = r.log_date;
        if (!monthMap[key]) {
          monthMap[key] = { count: 0, amount: 0 };
        }
        monthMap[key].count += 1;
        monthMap[key].amount += r.amount ?? 0;
      }

      const dailyArr: DailySummary[] = Object.entries(monthMap)
        .map(([date, v]) => ({ date, count: v.count, amount: v.amount }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));

      setDailySummary(dailyArr.slice(-7));

      const { data: rebutData } = await supabase
        .from('rebuttals')
        .select('id, category, content, created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentRebuts((rebutData as RecentRebuttal[]) || []);

      const { data: todayTaskRows, error: todayErr } = await supabase
        .from('daily_tasks')
        .select('id, content, done, task_date')
        .eq('user_id', u.id)
        .eq('task_date', tStr)
        .order('created_at', { ascending: true });

      if (todayErr) console.error(todayErr);
      setTodayTasks((todayTaskRows as DailyTask[]) || []);

      setLoading(false);
    }

    load();
  }, [router]);

  // 감성 슬라이드 자동 넘기기
  useEffect(() => {
    if (emotionSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % emotionSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const remainingCount = Math.max(targetCount - achievedCount, 0);
  const remainingAmount = Math.max(targetAmount - achievedAmount, 0);

  const progressRate =
    targetCount && targetCount > 0
      ? Math.min(100, Math.round((achievedCount / targetCount) * 100))
      : 0;

  const todayAchieved = achievedCount > 0 ? 1 : 0;

  const displayName = (() => {
    const base = nickname || '영업인';
    if (salesType && salesType.trim() !== '') {
      return `(${salesType}/${base})`;
    }
    if (salesCategory && salesCategory.trim() !== '') {
      return `(${salesCategory}/${base})`;
    }
    return base;
  })();

  async function handleAddTodayTask() {
    if (!userId || !todayDateStr || !newTaskContent.trim()) return;
    const content = newTaskContent.trim();
    setNewTaskContent('');

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: userId,
        content,
        task_date: todayDateStr,
      })
      .select('id, content, done, task_date')
      .single();

    if (error) {
      console.error(error);
      return;
    }
    setTodayTasks((prev) => [...prev, data as DailyTask]);
  }

  async function handleToggleTodayTask(id: string, current: boolean) {
    const next = !current;
    setTodayTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: next } : t))
    );
    try {
      await supabase
        .from('daily_tasks')
        .update({ done: next })
        .eq('id', id);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#f5f5f5',
        }}
      >
        로딩 중...
      </main>
    );
  }

  const maxDailyAmount =
    dailySummary.length > 0
      ? dailySummary.reduce(
          (m, d) => (d.amount > m ? d.amount : m),
          dailySummary[0].amount
        )
      : 0;

  const currentSlide = emotionSlides[slideIndex] ?? emotionSlides[0];

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#050505',
        color: '#f5f5f5',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 상단 프로필 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              border: '2px solid #ffb74d',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div>
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>
              오늘도 나를 UP 시키다
            </p>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                marginBottom: 4,
              }}
            >
              안녕하세요, {displayName}님 👋
            </h1>
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>
              {email ?? '로그인 이메일 미표시'}
            </p>
            <p
              style={{
                fontSize: 11,
                opacity: 0.8,
                margin: 0,
              }}
            >
              업종:{' '}
              {salesType ||
                salesCategory ||
                '업종 미설정'}{' '}
              · 회사:{' '}
              {companyName || '회사명 미입력'}{' '}
              · 경력:{' '}
              {careerText || '경력 입력 전'}
            </p>
            {nowLabel && (
              <p
                style={{
                  fontSize: 11,
                  opacity: 0.75,
                  marginTop: 4,
                }}
              >
                오늘 시각: {nowLabel}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/profile')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #555',
              background: 'transparent',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            프로필
          </button>
          <button
            onClick={() => router.push('/community')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #555',
              background: 'transparent',
              color: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            커뮤니티
          </button>
        </div>
      </header>

      {/* 감성 배너 + 오늘의 기분 체크 */}
      <section
        style={{
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1.3fr)',
          gap: 16,
        }}
      >
        {/* 감성 배너 슬라이드 (확대 + 이미지 영역) */}
        <div
          style={{
            borderRadius: 24,
            padding: 20,
            border: '1px solid #444',
            background:
              'linear-gradient(130deg, rgba(255,183,77,0.2), rgba(96,125,139,0.25), rgba(5,5,5,0.95))',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 150,
          }}
        >
          <div
            style={{
              fontSize: 11,
              opacity: 0.8,
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>오늘의 감성 베너</span>
            <span
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.35)',
              }}
            >
              {currentSlide.tag}
            </span>
          </div>
          <h2
            style={{
              fontSize: 20,
              margin: 0,
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            {currentSlide.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              margin: 0,
              opacity: 0.9,
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              maxWidth: '70%',
            }}
          >
            {currentSlide.body}
          </p>

          {/* 오른쪽 하단 이미지/장식 영역 */}
          <div
            style={{
              position: 'absolute',
              right: -20,
              bottom: -20,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.25), rgba(5,5,5,0.95))',
              overflow: 'hidden',
              opacity: 0.55,
            }}
          >
            {/* 나중에 /public/assets/images/uplog-banner.jpg 넣으면 자동 적용됨 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/uplog-banner.jpg"
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                mixBlendMode: 'screen',
              }}
              onError={(e) => {
                // 이미지 없을 때는 그냥 그라데이션만 보이게
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* 슬라이드 인덱스 점 */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 18,
              display: 'flex',
              gap: 4,
            }}
          >
            {emotionSlides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSlideIndex(idx)}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background:
                    idx === slideIndex
                      ? '#ffb74d'
                      : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        </div>

        {/* 오늘의 기분 체크 + 코칭 문구 */}
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            border: '1px solid #333',
            background: '#111',
          }}
        >
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>오늘의 기분 체크</h2>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setMood(level as MoodLevel)}
                style={{
                  flex: 1,
                  minWidth: 40,
                  padding: '6px 0',
                  borderRadius: 999,
                  border:
                    mood === level
                      ? '1px solid #ffb74d'
                      : '1px solid #444',
                  background:
                    mood === level ? '#ffb74d' : 'rgba(24,24,24,0.95)',
                  color: mood === level ? '#111' : '#f5f5f5',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {level === 1 && '😞'}
                {level === 2 && '🙁'}
                {level === 3 && '😐'}
                {level === 4 && '🙂'}
                {level === 5 && '😄'}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: 11,
              opacity: 0.85,
              lineHeight: 1.6,
            }}
          >
            {getMoodMessage(mood)}
          </p>
        </div>
      </section>

      {/* 나의 목표 & 성장 + 오늘의 날씨 */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.1fr) minmax(0, 1.4fr)',
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* 나의 목표 & 성장 (합쳐진 카드) */}
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: '1px solid #444',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>나의 목표 & 성장</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.4fr)',
              gap: 12,
            }}
          >
            {/* 왼쪽: 목표/각오 텍스트 */}
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ opacity: 0.7, marginBottom: 2 }}>나의 목표</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {mainGoal || '프로필에서 나의 목표를 설정해 보세요.'}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7, marginBottom: 2 }}>이번 달 목표</div>
                <div>
                  {monthGoalText ||
                    (targetCount || targetAmount
                      ? `목표 ${targetCount}건 / ${targetAmount}만 원`
                      : '이번 달 목표를 아직 설정하지 않았어요.')}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7, marginBottom: 2 }}>오늘의 각오</div>
                <div>{todayMind || '오늘의 각오를 한 줄 남겨 보세요.'}</div>
              </div>
            </div>

            {/* 오른쪽: 숫자 요약 + 그래프 */}
            <div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <div style={{ opacity: 0.7, marginBottom: 2 }}>이번 달 실적 요약</div>
                <div>
                  달성 {achievedCount}건 / {achievedAmount}만 원 · 남은{' '}
                  {remainingCount}건 / {remainingAmount}만 원
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <span>달성률</span>
                  <span>{progressRate}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 10,
                    borderRadius: 999,
                    background: '#222',
                    overflow: 'hidden',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${progressRate}%`,
                      height: '100%',
                      background:
                        'linear-gradient(90deg, #63ff8f, #f9ff6a, #ffb74d)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    opacity: 0.8,
                  }}
                >
                  <span>🌱 씨앗</span>
                  <span>🌳 나무</span>
                </div>
              </div>

              {/* 이번 달 실적 흐름 (막대 그래프) */}
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  <span>이번 달 실적 흐름</span>
                  <span style={{ opacity: 0.8, fontSize: 11 }}>
                    최근 {dailySummary.length}일
                  </span>
                </div>

                {dailySummary.length === 0 || maxDailyAmount === 0 ? (
                  <p style={{ fontSize: 11, opacity: 0.8 }}>
                    이번 달 성공 실적이 아직 없습니다. 오늘 한 건부터 채워볼까요?
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 6,
                      height: 110,
                      padding: '4px 0',
                    }}
                  >
                    {dailySummary.map((d) => {
                      const ratio = d.amount / maxDailyAmount;
                      const h = 30 + ratio * 70;
                      const dateLabel = d.date.slice(5);
                      return (
                        <div
                          key={d.date}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10,
                          }}
                        >
                          <div
                            style={{
                              height: h,
                              width: '70%',
                              borderRadius: 999,
                              background:
                                'linear-gradient(180deg, #63ff8f, #24c868)',
                            }}
                          />
                          <div style={{ opacity: 0.8 }}>{dateLabel}</div>
                          <div style={{ opacity: 0.8 }}>{d.count}건</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 오늘의 날씨 */}
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: '1px solid #333',
            background:
              'radial-gradient(circle at top, #333 0, #111 55%, #050505 100%)',
          }}
        >
          <h2 style={{ fontSize: 15, marginBottom: 4 }}>오늘의 날씨</h2>
          <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
            영업 나가기 전, 바깥 공기도 한 번 체크해 볼까요?
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 700 }}>{weatherNow}°C</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>체감상 선선한 하루</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 4,
              fontSize: 11,
            }}
          >
            {weatherSlots.map((slot) => (
              <div
                key={slot.time}
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 10,
                  background: '#181818',
                  textAlign: 'center',
                }}
              >
                <div style={{ opacity: 0.7 }}>{slot.time}</div>
                <div style={{ fontWeight: 600 }}>{slot.temp}°</div>
                <div style={{ opacity: 0.7 }}>{slot.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 오늘의 할 일 (가망고객 이벤트 알림 제거 후 단독) */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>오늘의 할 일</h2>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <input
            type="text"
            placeholder="예: 신규 상담 1명 전화하기"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 999,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleAddTodayTask}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #24c868',
              background: '#24c868',
              color: '#050505',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <>
            <p
              style={{
                fontSize: 11,
                opacity: 0.75,
                marginBottom: 6,
              }}
            >
              아직 오늘의 할 일을 등록하지 않았습니다. 아래 예시는 기본 예시이며,
              직접 입력해서 대표님만의 체크리스트를 만들어 주세요.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                opacity: 0.6,
              }}
            >
              <li>▢ 신규 상담 1건 이상 만들기</li>
              <li>▢ 반론 상황 1건 기록하기</li>
              <li>▢ 고객 1명에게 안부 연락하기</li>
              <li>▢ 오늘 받은 거절, 내일을 위한 힌트로 정리하기</li>
            </ul>
          </>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {todayTasks.map((task) => (
              <li
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggleTodayTask(task.id, task.done)}
                  style={{ cursor: 'pointer' }}
                />
                <span
                  style={{
                    textDecoration: task.done ? 'line-through' : 'none',
                    opacity: task.done ? 0.6 : 1,
                  }}
                >
                  {task.content}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 오늘의 축하 */}
      {todayAchieved > 0 && (
        <section
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #444',
            background:
              'linear-gradient(120deg, rgba(98,255,171,0.18), rgba(255,255,255,0.02))',
          }}
        >
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>🎉 오늘의 축하</h2>
          <p style={{ fontSize: 13, marginBottom: 4 }}>
            오늘 1건 완료! 너무 잘하고 있어요 🙌
          </p>
          <p style={{ fontSize: 11, opacity: 0.8 }}>
            작은 한 건이 모여 대표님의 커리어를 완성합니다. 오늘의 기록은
            내일의 자신감을 위한 선물이에요.
          </p>
        </section>
      )}

      {/* 최근 실적 5개 요약 */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>최근 실적 한눈에</h2>
        {recentLogs.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            아직 등록된 실적이 없습니다. 고객관리 화면에서 오늘의 첫 실적을
            기록해 보세요.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.9fr 1.1fr 1.2fr 0.8fr 0.8fr',
              gap: 6,
              fontSize: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ opacity: 0.7 }}>날짜</div>
            <div style={{ opacity: 0.7 }}>고객</div>
            <div style={{ opacity: 0.7 }}>상품</div>
            <div style={{ opacity: 0.7 }}>결과</div>
            <div style={{ opacity: 0.7, textAlign: 'right' }}>금액(만)</div>

            {recentLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'contents',
                }}
              >
                <div>{log.log_date ?? ''}</div>
                <div>{log.customer_name || '-'}</div>
                <div>{log.product_name || '-'}</div>
                <div>{log.status || '-'}</div>
                <div style={{ textAlign: 'right' }}>
                  {log.amount ? log.amount.toLocaleString() : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 반론 3개 요약 (강조 + 이모지 피드백 뱃지) */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #555',
          background:
            'linear-gradient(135deg, rgba(77,182,172,0.12), rgba(5,5,5,0.98))',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>🧠 최근 반론 아카이브</h2>
        <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>
          이 칸에는 대표님이 실제로 들은 반론과, 그에 대한 나만의 스크립트가
          쌓입니다. 나중에 AI/관리자 피드백 기능과도 연결할 수 있어요.
        </p>
        {recentRebuts.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            아직 반론 기록이 없습니다. 반론 아카이브에서 첫 기록을 남겨보세요.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
            }}
          >
            {recentRebuts.map((r) => {
              const badge = getRebuttalBadge(r);
              const created = new Date(r.created_at).toLocaleDateString(
                'ko-KR',
                {
                  month: '2-digit',
                  day: '2-digit',
                }
              );
              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/rebuttal/${r.id}`)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: '#181818',
                    border: '1px solid #333',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                        }}
                      >
                        {badge.emoji}
                      </span>
                      <span>{r.category}</span>
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.8,
                          padding: '2px 6px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.18)',
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span
                      style={{
                        opacity: 0.7,
                        fontSize: 11,
                      }}
                    >
                      {created}
                    </span>
                  </div>
                  <div
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: 0.9,
                      marginBottom: 4,
                    }}
                  >
                    {r.content}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    📝 피드백: 나중에 이 반론에 대한 스크립트/AI/관리자 피드백을
                    쌓아갈 수 있어요.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 바로가기 */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>바로가기</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 8,
            fontSize: 12,
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/records')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            고객관리
          </button>
          <button
            type="button"
            onClick={() => router.push('/rebuttal/list')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            반론 아카이브
          </button>
          <button
            type="button"
            onClick={() => router.push('/community')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            커뮤니티
          </button>
          <button
            type="button"
            onClick={() => router.push('/goals')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            목표 관리
          </button>
          <button
            type="button"
            onClick={() => router.push('/messages')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            문자 관리
          </button>
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px solid #444',
              background: '#181818',
              color: '#f5f5f5',
              cursor: 'pointer',
            }}
          >
            스케줄 캘린더
          </button>
        </div>
      </section>
    </main>
  );
}
