// src/app/my-up/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// ===== 타입 =====
type UpLogRow = {
  id?: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  mood: string | null;
  day_goal: string | null;
  week_goal: string | null;
  month_goal: string | null;
  mind_note: string | null;
  good_point: string | null;
  regret_point: string | null;
};

type DailyTask = {
  id?: string;
  user_id: string;
  task_date: string; // YYYY-MM-DD
  content: string;
  done: boolean;
};

// 스케줄 카테고리 (달력 색상용)
type ScheduleCategory =
  | 'counsel' // 상담
  | 'visit' // 방문
  | 'happycall' // 해피콜
  | 'gift' // 사은품/선물
  | 'shipping' // 배송
  | 'meeting' // 회의
  | 'edu' // 교육
  | 'event' // 행사/이벤트
  | 'late' // 지각
  | 'early' // 조퇴
  | 'out' // 외출
  | 'absent' // 결근
  | 'closing' // 마감
  | 'etc'; // 기타;

type GrowthDay = {
  date: string; // YYYY-MM-DD
  count: number; // 그 날짜에 기록/스케줄 개수
  mainCategory?: ScheduleCategory | null; // 그날 대표 카테고리
  mood?: string | null; // 그날 기분 코드
};

type ScheduleRow = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time: string | null;
  category: ScheduleCategory;
};

type MoodOption = {
  code: string;
  emoji: string;
  label: string;
};

// ===== 상수 =====
const moodOptions: MoodOption[] = [
  { code: 'hard', emoji: '🥵', label: '힘든 날' },
  { code: 'little-down', emoji: '😮‍💨', label: '살짝 다운' },
  { code: 'normal', emoji: '🙂', label: '보통' },
  { code: 'good', emoji: '😊', label: '나쁘지 않음' },
  { code: 'fire', emoji: '🔥', label: '불타는 날' },
];

const SCHEDULE_CATEGORY_META: { id: ScheduleCategory; label: string }[] = [
  { id: 'counsel', label: '상담' },
  { id: 'visit', label: '방문' },
  { id: 'happycall', label: '해피콜' },
  { id: 'gift', label: '사은품' },
  { id: 'shipping', label: '배송' },
  { id: 'meeting', label: '회의' },
  { id: 'edu', label: '교육' },
  { id: 'event', label: '행사/이벤트' },
  { id: 'late', label: '지각' },
  { id: 'early', label: '조퇴' },
  { id: 'out', label: '외출' },
  { id: 'absent', label: '결근' },
  { id: 'closing', label: '마감' },
  { id: 'etc', label: '기타' },
];

const getScheduleCategoryMeta = (id: string | null | undefined) =>
  SCHEDULE_CATEGORY_META.find((c) => c.id === id);

// 날짜 포맷
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function prettyKoreanDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// ===== 컴포넌트 =====
export default function MyUpPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('영업인');

  // 선택 날짜
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDate(new Date())
  );
  const todayStr = useMemo(() => formatDate(new Date()), []);

  // 상단 요약용 (이번 달)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [growthDays, setGrowthDays] = useState<GrowthDay[]>([]);

  // 선택 날짜의 U P 기록
  const [logRow, setLogRow] = useState<UpLogRow | null>(null);
  // 선택한 날짜에 이미 up_logs 행이 있는지 여부
  const [hasCurrentLog, setHasCurrentLog] = useState(false);

  // 선택 날짜의 오늘 할 일 리스트
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [savingTasks, setSavingTasks] = useState(false);

  // 선택 날짜의 스케줄
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scheduleTimeInput, setScheduleTimeInput] = useState('');
  const [scheduleTitleInput, setScheduleTitleInput] = useState('');
  const [scheduleCategoryInput, setScheduleCategoryInput] =
    useState<ScheduleCategory>('counsel');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // ===== 초기화 =====
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      if (user.email) {
        setNickname(user.email.split('@')[0]);
      }

      await Promise.all([
        loadMonthlyGrowth(user.id, currentMonth),
        loadDayData(user.id, selectedDate),
      ]);

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 월 변경되면 성장/달력 요약 다시
  useEffect(() => {
    if (!userId) return;
    loadMonthlyGrowth(userId, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentMonth]);

  // 날짜 선택 바뀌면 데이터 다시
  useEffect(() => {
    if (!userId) return;
    loadDayData(userId, selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  // ===== 데이터 로드 =====
  const loadMonthlyGrowth = async (uid: string, baseMonth: Date) => {
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

    const { data: logRows, error: logError } = await supabase
      .from('up_logs')
      .select('log_date, mood')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to);

    if (logError) {
      console.error('up_logs monthly error', logError);
    }

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedules')
      .select('schedule_date, category')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to);

    if (scheduleError) {
      console.error('schedules monthly error', scheduleError);
    }

    type Meta = {
      count: number;
      mood: string | null;
      catCounts: Record<string, number>;
    };

    const map: Record<string, Meta> = {};

    (logRows ?? []).forEach((row: any) => {
      const raw = row.log_date;
      const str =
        typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
      if (!map[str]) {
        map[str] = { count: 0, mood: row.mood ?? null, catCounts: {} };
      }
      map[str].count += 1;
      if (!map[str].mood && row.mood) {
        map[str].mood = row.mood;
      }
    });

    (scheduleRows ?? []).forEach((row: any) => {
      const raw = row.schedule_date;
      const str =
        typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
      if (!map[str]) {
        map[str] = { count: 0, mood: null, catCounts: {} };
      }
      map[str].count += 1;
      const cat: string = row.category ?? 'etc';
      if (!map[str].catCounts[cat]) map[str].catCounts[cat] = 0;
      map[str].catCounts[cat] += 1;
    });

    const days: GrowthDay[] = [];
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const cur = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        d
      );
      const str = formatDate(cur);
      const meta = map[str];

      let mainCategory: ScheduleCategory | null = null;
      if (meta && Object.keys(meta.catCounts).length > 0) {
        const [topCat] = Object.entries(meta.catCounts).sort(
          (a, b) => b[1] - a[1]
        )[0];
        mainCategory = (topCat as ScheduleCategory) ?? null;
      }

      days.push({
        date: str,
        count: meta?.count ?? 0,
        mainCategory,
        mood: meta?.mood ?? null,
      });
    }
    setGrowthDays(days);
  };

  const loadDayData = async (uid: string, dateStr: string) => {
    // ===== U P 기록 =====
    const { data: upRow, error: upError } = await supabase
      .from('up_logs')
      .select(
        'id, user_id, log_date, mood, day_goal, week_goal, month_goal, mind_note, good_point, regret_point'
      )
      .eq('user_id', uid)
      .eq('log_date', dateStr)
      .maybeSingle();

    if (upError && upError.code !== 'PGRST116') {
      console.error('up_logs day error', upError);
    }

    if (upRow) {
      // ▶ 해당 날짜에 이미 기록 있으면 그대로 사용
      setHasCurrentLog(true);
      setLogRow(upRow as UpLogRow);
    } else {
      // ▶ 기록 없으면, 이전 날짜 중 가장 최근 기록에서 "목표 3개 + 기분"만 가져오기
      const { data: prevRows, error: prevError } = await supabase
        .from('up_logs')
        .select('mood, day_goal, week_goal, month_goal')
        .eq('user_id', uid)
        .lt('log_date', dateStr)
        .order('log_date', { ascending: false })
        .limit(1);

      if (prevError && prevError.code !== 'PGRST116') {
        console.error('up_logs previous error', prevError);
      }

      if (prevRows && prevRows.length > 0) {
        const prev = prevRows[0] as {
          mood: string | null;
          day_goal: string | null;
          week_goal: string | null;
          month_goal: string | null;
        };

        // 이전 값에서 "목표/기분"만 복사, 나머지 노트는 새로 작성
        setLogRow({
          user_id: uid,
          log_date: dateStr,
          mood: prev.mood ?? null,
          day_goal: prev.day_goal ?? null,
          week_goal: prev.week_goal ?? null,
          month_goal: prev.month_goal ?? null,
          mind_note: null,
          good_point: null,
          regret_point: null,
        });
      } else {
        // 이전 기록도 없으면 완전 새로 시작
        setLogRow({
          user_id: uid,
          log_date: dateStr,
          mood: null,
          day_goal: null,
          week_goal: null,
          month_goal: null,
          mind_note: null,
          good_point: null,
          regret_point: null,
        });
      }

      setHasCurrentLog(false);
    }

    // ===== 오늘 할 일 리스트 =====
    const { data: taskRows, error: taskError } = await supabase
      .from('daily_tasks')
      .select('id, user_id, task_date, content, done')
      .eq('user_id', uid)
      .eq('task_date', dateStr)
      .order('id', { ascending: true });

    if (taskError) {
      console.error('daily_tasks error', taskError);
      setTasks([]);
    } else {
      setTasks(
        (taskRows ?? []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          task_date: t.task_date,
          content: t.content ?? '',
          done: !!t.done,
        }))
      );
    }

    // ===== 스케줄 =====
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, title, schedule_date, schedule_time, category')
      .eq('user_id', uid)
      .eq('schedule_date', dateStr)
      .order('id', { ascending: true });

    if (scheduleError) {
      console.error('schedules error', scheduleError);
      setSchedules([]);
    } else {
      setSchedules(
        (scheduleRows ?? []).map((s: any) => ({
          id: s.id,
          title: s.title,
          schedule_date: s.schedule_date,
          schedule_time: s.schedule_time,
          category: (s.category ?? 'etc') as ScheduleCategory,
        }))
      );
    }
  };

  // ===== 이벤트 핸들러 =====
  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const handleChangeMood = (code: string) => {
    if (!logRow) return;
    setLogRow({ ...logRow, mood: code });
  };

  const handleLogChange = (field: keyof UpLogRow, value: string) => {
    if (!logRow) return;
    setLogRow({ ...logRow, [field]: value });
  };

  const handleSaveLog = async () => {
    if (!logRow || !userId) return;

    // id는 빼고, 해당 날짜용 payload만 구성
    const payload = {
      user_id: userId,
      log_date: selectedDate,
      mood: logRow.mood,
      day_goal: logRow.day_goal,
      week_goal: logRow.week_goal,
      month_goal: logRow.month_goal,
      mind_note: logRow.mind_note,
      good_point: logRow.good_point,
      regret_point: logRow.regret_point,
    };

    let error = null;

    if (hasCurrentLog) {
      // ▶ 이미 해당 날짜에 기록이 있으면 UPDATE
      const { error: updateError } = await supabase
        .from('up_logs')
        .update(payload)
        .eq('user_id', userId)
        .eq('log_date', selectedDate);
      error = updateError;
    } else {
      // ▶ 처음 기록하는 날짜면 INSERT
      const { error: insertError } = await supabase
        .from('up_logs')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error('up_logs save error', error);
      alert('기록 저장 중 오류가 발생했어요.\n잠시 후 다시 시도해 주세요.');
      return;
    }

    setHasCurrentLog(true);
    await loadMonthlyGrowth(userId, currentMonth);
    await loadDayData(userId, selectedDate);

    alert('선택한 날짜의 기록이 저장되었습니다.');
  };

  const handleAddTask = async () => {
    if (!userId) return;
    setSavingTasks(true);
    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: userId,
        task_date: selectedDate,
        content: '',
        done: false,
      })
      .select('id, user_id, task_date, content, done')
      .single();

    setSavingTasks(false);

    if (error) {
      console.error('add task error', error);
      alert('할 일을 추가하는 중 오류가 발생했어요.');
      return;
    }

    setTasks((prev) => [
      ...prev,
      {
        id: data.id,
        user_id: data.user_id,
        task_date: data.task_date,
        content: data.content ?? '',
        done: !!data.done,
      },
    ]);
  };

  const handleTaskContentChange = (id: string | undefined, value: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content: value } : t))
    );
  };

  const handleTaskBlur = async (task: DailyTask) => {
    if (!task.id) return;
    const { error } = await supabase
      .from('daily_tasks')
      .update({ content: task.content })
      .eq('id', task.id);
    if (error) {
      console.error('update task error', error);
    }
  };

  const toggleTaskDone = async (task: DailyTask) => {
    if (!task.id) return;
    const nextDone = !task.done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t))
    );
    const { error } = await supabase
      .from('daily_tasks')
      .update({ done: nextDone })
      .eq('id', task.id);
    if (error) {
      console.error('toggle task error', error);
    }
  };

  const handleScheduleSave = async () => {
    if (!userId) return;
    if (!scheduleTitleInput.trim()) {
      alert('일정 내용을 입력해 주세요.');
      return;
    }

    setSavingSchedule(true);
    const { error } = await supabase.from('schedules').insert({
      user_id: userId,
      schedule_date: selectedDate,
      schedule_time: scheduleTimeInput || null,
      title: scheduleTitleInput.trim(),
      category: scheduleCategoryInput,
    });
    setSavingSchedule(false);

    if (error) {
      console.error('insert schedule error', error);
      alert('일정 저장 중 오류가 발생했어요.');
      return;
    }

    setScheduleTimeInput('');
    setScheduleTitleInput('');
    setScheduleCategoryInput('counsel');

    await loadDayData(userId, selectedDate);
    await loadMonthlyGrowth(userId, currentMonth);
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

  if (loading || !logRow) {
    return (
      <div className="myup-root">
        <div className="myup-inner">
          <div className="myup-loading">나의 U P 기록장을 불러오는 중입니다…</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const selectedGrowthMeta =
    growthDays.find((g) => g.date === selectedDate) ?? null;
  const selectedGrowth = selectedGrowthMeta?.count ?? 0;
  const completedTasks = tasks.filter((t) => t.done).length;

  return (
    <div className="myup-root">
      <div className="myup-inner">
        {/* 상단 히어로 */}
        <section className="myup-hero">
          <div className="myup-hero-left">
            <div className="myup-tag">UPLOG · MYUP</div>
            <h1 className="myup-title">나의 U P 관리</h1>
            <p className="myup-sub">
              오늘의 컨디션, 목표, 실적과 마음을 한 번에 정리하는
              <br />
              {nickname}님만의 기록장이에요.
            </p>
            <p className="myup-date-line">
              선택한 날짜 · <strong>{prettyKoreanDate(selectedDate)}</strong>
            </p>
          </div>

          <div className="myup-summary-card">
            <div className="myup-summary-title">오늘 요약</div>
            <div className="myup-summary-date">{selectedDate}</div>
            <div className="myup-summary-row">
              <span>기분 이모지</span>
              <strong>
                {moodOptions.find((m) => m.code === logRow.mood)?.emoji ??
                  '미선택'}
              </strong>
            </div>
            <div className="myup-summary-row">
              <span>오늘 할 일 달성</span>
              <strong>
                {completedTasks}/{tasks.length}개
              </strong>
            </div>
            <div className="myup-summary-row">
              <span>기록 여부</span>
              <strong>{selectedGrowth > 0 ? '기록 있음' : '기록 없음'}</strong>
            </div>
          </div>
        </section>

        {/* 실적 요약 · AI 한 마디 */}
        <section className="myup-ai-section">
          <h2 className="section-title">실적 요약 · AI 한 마디</h2>
          <p className="ai-caption">
            고객 수와 계약 건수는 나중에 연동될 예정이에요. 지금은 “멘탈 기록
            연습”에 집중해 볼까요?
          </p>
          <div className="ai-grid">
            <div className="ai-block">
              <div className="ai-label">오늘의 조언</div>
              <p className="ai-text">
                오늘 하루의 컨디션과 목표를 가볍게 적어두면, 나중에 대표님의
                성장 기록이 됩니다.
              </p>
            </div>
            <div className="ai-block">
              <div className="ai-label">영업 루틴 자동 추천</div>
              <p className="ai-text">
                오전엔 가망 고객 콜, 오후엔 기존 고객 케어, 저녁엔 오늘 잘한 점
                1줄 남기기. 작은 루틴이 큰 변화를 만듭니다.
              </p>
            </div>
            <div className="ai-block">
              <div className="ai-label">오늘의 응원 메시지</div>
              <p className="ai-text">
                오늘도 여기까지 온 나를 칭찬해 주세요. 대표님이 쌓는 하루하루가
                결국 원하는 곳으로 데려다 줄 거예요.
              </p>
            </div>
          </div>
        </section>

        {/* 오늘 할 일 리스트 */}
        <section className="myup-todo-section">
          <div className="todo-header">
            <h2 className="section-title">오늘 할 일 리스트</h2>
            <div className="todo-sub">
              <span>{prettyKoreanDate(selectedDate)}</span>
              <span className="todo-dot">•</span>
              <span>선택한 날짜 기준으로 매일 새로 관리돼요.</span>
            </div>
          </div>

          <div className="todo-card">
            {tasks.length === 0 && (
              <p className="todo-empty">
                아직 등록된 할 일이 없어요.
                <br />
                아래 <strong>할 일 추가</strong> 버튼을 눌러서 오늘의 체크항목을
                만들어 주세요.
              </p>
            )}

            {tasks.length > 0 && (
              <ul className="todo-list">
                {tasks.map((t) => (
                  <li key={t.id} className="todo-item">
                    <button
                      type="button"
                      className={
                        'todo-check-btn ' +
                        (t.done ? 'todo-check-btn-on' : '')
                      }
                      onClick={() => toggleTaskDone(t)}
                    >
                      {t.done ? '✓' : ''}
                    </button>
                    <input
                      className={
                        'todo-input ' + (t.done ? 'todo-input-done' : '')
                      }
                      value={t.content}
                      placeholder="오늘 꼭 지키고 싶은 일을 적어 보세요."
                      onChange={(e) =>
                        handleTaskContentChange(t.id as string, e.target.value)
                      }
                      onBlur={() => handleTaskBlur(t)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="todo-add-btn"
              onClick={handleAddTask}
              disabled={savingTasks}
            >
              + 할 일 추가
            </button>
          </div>
        </section>

        {/* CALENDAR & PERFORMANCE + 스케줄 입력 */}
        <section className="myup-calendar-section">
          <div className="calendar-header-row">
            <div>
              <h2 className="section-title">CALENDAR & PERFORMANCE</h2>
              <p className="calendar-caption">
                달력에서 기록과 스케줄 카테고리를 색상으로 보고,
                <strong> 선택한 날짜의 일정</strong>을 아래에서 입력·관리할 수
                있어요.
              </p>
            </div>
            <div className="month-nav">
              <button
                type="button"
                className="nav-btn"
                onClick={() => moveMonth(-1)}
              >
                ◀
              </button>
              <div className="month-label">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </div>
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

            {daysInMonth.map((d) => {
              const dStr = formatDate(d);
              const isCurrentMonth =
                d.getMonth() === currentMonth.getMonth();
              const isToday = dStr === todayStr;
              const isSelected = dStr === selectedDate;

              const meta = growthDays.find((g) => g.date === dStr) ?? null;
              const growth = meta?.count ?? 0;
              const hasRecord = growth > 0;

              const moodEmoji = meta?.mood
                ? moodOptions.find((m) => m.code === meta.mood)?.emoji
                : null;

              const catMeta = meta?.mainCategory
                ? getScheduleCategoryMeta(meta.mainCategory)
                : null;

              const isOtherMonth = !isCurrentMonth;

              const classNames = [
                'calendar-day',
                isOtherMonth ? 'calendar-day-out' : '',
                isToday ? 'calendar-day-today' : '',
                isSelected ? 'calendar-day-selected' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={dStr}
                  type="button"
                  className={classNames}
                  onClick={() => setSelectedDate(dStr)}
                >
                  <div className="calendar-day-number-row">
                    <div className="calendar-day-number">{d.getDate()}</div>
                    {moodEmoji && (
                      <div className="calendar-day-mood">{moodEmoji}</div>
                    )}
                  </div>
                  {catMeta && (
                    <div
                      className={
                        'calendar-day-cat-pill calendar-day-cat-' +
                        meta!.mainCategory
                      }
                    >
                      {catMeta.label}
                    </div>
                  )}
                  {!catMeta && hasRecord && (
                    <div className="calendar-day-dot">기록 {growth}개</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 스케줄 입력 + 목록 */}
          <div className="schedule-card">
            <div className="schedule-header">
              <div>
                <div className="section-title">선택한 날짜의 스케줄</div>
                <div className="schedule-sub">
                  {prettyKoreanDate(selectedDate)} ·{' '}
                  {schedules.length === 0
                    ? '등록된 일정이 없습니다.'
                    : `${schedules.length}개 일정`}
                </div>
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
              <select
                className="schedule-category-select"
                value={scheduleCategoryInput}
                onChange={(e) =>
                  setScheduleCategoryInput(e.target.value as ScheduleCategory)
                }
              >
                {SCHEDULE_CATEGORY_META.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="일정 내용 (예: 00고객 상담, 교육, 회의 등)"
                value={scheduleTitleInput}
                onChange={(e) => setScheduleTitleInput(e.target.value)}
                className="schedule-title-input"
              />
              <button
                type="button"
                className="schedule-save-btn"
                onClick={handleScheduleSave}
                disabled={savingSchedule}
              >
                {savingSchedule ? '저장 중…' : '일정 등록'}
              </button>
            </div>

            {schedules.length === 0 ? (
              <p className="schedule-empty">
                위에서 시간·카테고리·내용을 입력한 뒤{' '}
                <strong>일정 등록</strong>을 눌러 주세요.
              </p>
            ) : (
              <ul className="schedule-list">
                {schedules.map((s) => {
                  const meta = getScheduleCategoryMeta(s.category);
                  return (
                    <li key={s.id} className="schedule-item">
                      <div className="schedule-time">
                        {s.schedule_time
                          ? s.schedule_time.slice(0, 5)
                          : '시간 미정'}
                      </div>
                      <div className="schedule-title">
                        {meta && (
                          <span
                            className={
                              'schedule-cat-pill schedule-cat-' + meta.id
                            }
                          >
                            {meta.label}
                          </span>
                        )}
                        <span>{s.title}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* 선택한 날짜의 상세 기록 */}
        <section className="myup-detail-section">
          <h2 className="section-title">선택한 날짜의 기록</h2>
          <p className="detail-caption">
            기분, 목표, 오늘 잘한 점과 아쉬운 점, 스케줄까지 남겨두면 한 달 뒤에
            “성장 로그”가 됩니다.
          </p>

          <div className="detail-card">
            <div className="detail-inner">
              {/* 기분 이모지 */}
              <div className="detail-row">
                <div className="detail-label">오늘의 기분 이모지</div>
                <div className="mood-chips">
                  {moodOptions.map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      className={
                        'mood-chip ' +
                        (logRow.mood === m.code ? 'mood-chip-active' : '')
                      }
                      onClick={() => handleChangeMood(m.code)}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 목표들 */}
              <div className="detail-grid three">
                <div className="detail-field">
                  <div className="detail-label">오늘의 U P 목표</div>
                  <input
                    className="detail-input"
                    placeholder="오늘 꼭 달성하고 싶은 한 가지 목표를 적어 보세요."
                    value={logRow.day_goal ?? ''}
                    onChange={(e) =>
                      handleLogChange('day_goal', e.target.value)
                    }
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">이번 주 목표</div>
                  <input
                    className="detail-input"
                    placeholder="이번 주에 꼭 이루고 싶은 목표를 적어 보세요."
                    value={logRow.week_goal ?? ''}
                    onChange={(e) =>
                      handleLogChange('week_goal', e.target.value)
                    }
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">이번 달 목표</div>
                  <input
                    className="detail-input"
                    placeholder="이번 달의 최종 목표를 적어 보세요."
                    value={logRow.month_goal ?? ''}
                    onChange={(e) =>
                      handleLogChange('month_goal', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* 노트 영역 */}
              <div className="detail-grid two">
                <div className="detail-field">
                  <div className="detail-label">마인드 노트</div>
                  <textarea
                    className="detail-textarea"
                    placeholder="지치지 않고 한결같이 가기 위한 나만의 다짐을 적어 보세요."
                    rows={3}
                    value={logRow.mind_note ?? ''}
                    onChange={(e) =>
                      handleLogChange('mind_note', e.target.value)
                    }
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">오늘 잘한 점</div>
                  <textarea
                    className="detail-textarea"
                    placeholder="작은 것이라도 좋으니 칭찬할 점을 적어 주세요."
                    rows={3}
                    value={logRow.good_point ?? ''}
                    onChange={(e) =>
                      handleLogChange('good_point', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="detail-grid one">
                <div className="detail-field">
                  <div className="detail-label">오늘 아쉬운 점</div>
                  <textarea
                    className="detail-textarea"
                    placeholder="내일은 이렇게 해보고 싶다는 점을 적어 주세요."
                    rows={3}
                    value={logRow.regret_point ?? ''}
                    onChange={(e) =>
                      handleLogChange('regret_point', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="detail-save-row">
                <button
                  type="button"
                  className="detail-save-btn"
                  onClick={handleSaveLog}
                >
                  오늘 기록 저장하기
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.myup-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.myup-inner {
  max-width: 1160px;
  margin: 0 auto 80px;
}

/* 공통 타이틀 */
.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #6b41ff;
}

.myup-loading {
  margin-top: 120px;
  text-align: center;
  font-size: 18px;
}

/* 상단 히어로 */
.myup-hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 20px;
  padding: 24px 24px;
  border-radius: 32px;
  background: radial-gradient(circle at top left, #ffb3dd 0, #a45bff 45%, #5f2b9f 100%);
  color: #fff;
  box-shadow: 0 26px 50px rgba(0,0,0,0.28);
  margin-bottom: 24px;
}

.myup-hero-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.myup-tag {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.9;
}

.myup-title {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.myup-sub {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.96;
}

.myup-date-line {
  margin-top: 12px;
  font-size: 14px;
  color: #fefcff;
}

.myup-summary-card {
  width: 240px;
  padding: 14px 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  color: #2a1440;
  box-shadow: 0 22px 40px rgba(0,0,0,0.32);
  backdrop-filter: blur(14px);
  align-self: center;
  margin-right: 12px;
}

.myup-summary-title {
  font-size: 14px;
  font-weight: 800;
  color: #6b41ff;
}

.myup-summary-date {
  margin-top: 4px;
  font-size: 12px;
  color: #a24cff;
}

.myup-summary-row {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.myup-summary-row strong {
  font-weight: 800;
}

/* AI 섹션 */
.myup-ai-section {
  margin-top: 18px;
  padding: 20px 22px;
  border-radius: 26px;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  border: 1px solid #e5ddff;
  margin-bottom: 22px;
}

.ai-caption {
  margin-top: 6px;
  font-size: 13px;
  color: #7a69c4;
}

.ai-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 14px;
}

.ai-block {
  padding: 12px 14px;
  border-radius: 18px;
  background: #faf7ff;
  border: 1px solid rgba(190, 173, 250, 0.7);
}

.ai-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b41ff;
  margin-bottom: 4px;
}

.ai-text {
  font-size: 13px;
  color: #3c294f;
  line-height: 1.5;
}

/* 오늘 할 일 섹션 */
.myup-todo-section {
  margin-bottom: 24px;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
}

.todo-sub {
  font-size: 13px;
  color: #7e6fd6;
  display: flex;
  align-items: center;
  gap: 6px;
}

.todo-dot {
  font-size: 6px;
}

.todo-card {
  border-radius: 24px;
  padding: 16px 18px 14px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
}

.todo-empty {
  font-size: 13px;
  color: #7a69c4;
  line-height: 1.6;
}

.todo-list {
  list-style: none;
  margin: 0;
  margin-bottom: 10px;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.todo-check-btn {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid #f153aa;
  background: #fff;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.todo-check-btn-on {
  background: linear-gradient(135deg, #f153aa, #a36dff);
  box-shadow: 0 0 12px rgba(228, 116, 214, 0.7);
}

.todo-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid #d6c7ff;
  padding: 7px 12px;
  font-size: 14px;
  background: #faf7ff;
  color: #241336;
}

.todo-input::placeholder {
  color: #aa97e0;
}

.todo-input-done {
  text-decoration: line-through;
  color: #a9a0d8;
  background: #f2ecff;
}

.todo-add-btn {
  border-radius: 999px;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(0,0,0,0.25);
}

/* 캘린더 & 스케줄 */
.myup-calendar-section {
  margin-bottom: 26px;
}

.calendar-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}

.calendar-caption {
  margin-top: 4px;
  font-size: 13px;
  color: #7a69c4;
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
  background: #f0e8ff;
  color: #5a3cb2;
  cursor: pointer;
}

.month-label {
  font-size: 14px;
  font-weight: 700;
  color: #372153;
}

.calendar-grid {
  border-radius: 22px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
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
  padding: 6px 5px;
  min-height: 60px;
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

.calendar-day-number-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.calendar-day-number {
  font-weight: 700;
}

.calendar-day-mood {
  font-size: 14px;
}

.calendar-day-dot {
  margin-top: 4px;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 999px;
  background: #f153aa;
  color: #fff;
}

/* 날짜별 카테고리 뱃지 */
.calendar-day-cat-pill {
  margin-top: 4px;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 999px;
  font-weight: 600;
}

.calendar-day-cat-counsel { background: #fee2e2; color: #b91c1c; }
.calendar-day-cat-visit { background: #dbeafe; color: #1d4ed8; }
.calendar-day-cat-happycall { background: #fef3c7; color: #92400e; }
.calendar-day-cat-gift { background: #f5e1ff; color: #7e22ce; }
.calendar-day-cat-shipping { background: #dcfce7; color: #15803d; }
.calendar-day-cat-meeting { background: #e0f2fe; color: #0369a1; }
.calendar-day-cat-edu { background: #fef9c3; color: #854d0e; }
.calendar-day-cat-event { background: #ffe4e6; color: #be123c; }
.calendar-day-cat-late { background: #fee2e2; color: #b91c1c; }
.calendar-day-cat-early { background: #e0f2fe; color: #0369a1; }
.calendar-day-cat-out { background: #f1f5f9; color: #0f172a; }
.calendar-day-cat-absent { background: #fee2e2; color: #7f1d1d; }
.calendar-day-cat-closing { background: #ede9fe; color: #4c1d95; }
.calendar-day-cat-etc { background: #f1f5f9; color: #475569; }

/* 스케줄 카드 */
.schedule-card {
  margin-top: 12px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  padding: 14px 16px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
}

.schedule-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #7e6fd6;
}

.schedule-input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.schedule-time-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.schedule-time-label {
  font-size: 12px;
  color: #4b335f;
}

.schedule-time-input {
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 4px 8px;
  font-size: 12px;
  background: #f9f6ff;
  color: #241336;
}

.schedule-category-select {
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 6px 10px;
  font-size: 12px;
  background: #faf7ff;
  color: #241336;
}

.schedule-title-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 7px 10px;
  font-size: 13px;
  background: #faf7ff;
  color: #241336;
}

.schedule-title-input::placeholder {
  color: #a18ad2;
}

.schedule-save-btn {
  border-radius: 999px;
  border: none;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(0,0,0,0.25);
}

.schedule-empty {
  font-size: 12px;
  color: #7a69c4;
}

.schedule-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.schedule-item {
  display: grid;
  grid-template-columns: 70px minmax(0,1fr);
  gap: 6px;
  font-size: 12px;
  padding: 4px 0;
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

.schedule-cat-pill {
  display: inline-flex;
  align-items: center;
  margin-right: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.schedule-cat-counsel { background: #fee2e2; color: #b91c1c; }
.schedule-cat-visit { background: #dbeafe; color: #1d4ed8; }
.schedule-cat-happycall { background: #fef3c7; color: #92400e; }
.schedule-cat-gift { background: #f5e1ff; color: #7e22ce; }
.schedule-cat-shipping { background: #dcfce7; color: #15803d; }
.schedule-cat-meeting { background: #e0f2fe; color: #0369a1; }
.schedule-cat-edu { background: #fef9c3; color: #854d0e; }
.schedule-cat-event { background: #ffe4e6; color: #be123c; }
.schedule-cat-late { background: #fee2e2; color: #b91c1c; }
.schedule-cat-early { background: #e0f2fe; color: #0369a1; }
.schedule-cat-out { background: #f1f5f9; color: #0f172a; }
.schedule-cat-absent { background: #fee2e2; color: #7f1d1d; }
.schedule-cat-closing { background: #ede9fe; color: #4c1d95; }
.schedule-cat-etc { background: #f1f5f9; color: #475569; }

/* 상세 기록 섹션 */
.myup-detail-section {
  margin-top: 26px;
  margin-bottom: 40px;
  width: 100%;
}

.detail-caption {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #7a69c4;
}

/* 상세 카드: 위 섹션들과 같은 폭으로 100% */
.detail-card {
  margin-top: 12px;
  width: 100%;
  border-radius: 26px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  padding: 18px 20px 20px;
  box-sizing: border-box;
}

/* 안쪽 내용 */
.detail-inner {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 4px 4px 10px;
  box-sizing: border-box;
}

/* 행 간격 */
.detail-row {
  margin-bottom: 18px;
}

/* 인풋/텍스트영역 공통 */
.detail-row input,
.detail-row textarea {
  width: 100%;
  box-sizing: border-box;
}

.detail-label {
  font-size: 15px;
  font-weight: 800;
  color: #5a3cb2;
  margin-bottom: 7px;
}

.mood-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mood-chip {
  border-radius: 999px;
  border: 1px solid #e1d5ff;
  padding: 7px 12px;
  background: #faf7ff;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #2b143f;
}

.mood-chip-active {
  background: linear-gradient(135deg, #ff9ed8, #a36dff);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 10px 20px rgba(0,0,0,0.25);
}

.mood-emoji {
  font-size: 18px;
}

.mood-label {
  font-size: 13px;
}

/* 그리드 */
.detail-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.detail-grid.three {
  grid-template-columns: repeat(3, minmax(0,1fr));
}

.detail-grid.two {
  grid-template-columns: repeat(2, minmax(0,1fr));
}

.detail-grid.one {
  grid-template-columns: minmax(0,1fr);
}

.detail-input {
  width: 100%;
  border-radius: 999px;
  border: 1px solid #d6c7ff;
  padding: 9px 14px;
  font-size: 15px;
  font-weight: 500;
  background: #faf7ff;
  color: #241336;
  box-sizing: border-box;
}

.detail-input::placeholder,
.detail-textarea::placeholder {
  color: #aa97e0;
}

.detail-textarea {
  width: 100%;
  border-radius: 18px;
  border: 1px solid #d6c7ff;
  padding: 10px 12px;
  font-size: 15px;
  font-weight: 500;
  resize: vertical;
  background: #faf7ff;
  color: #241336;
  line-height: 1.7;
  box-sizing: border-box;
}

.detail-save-row {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.detail-save-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 22px;
  font-size: 14px;
  font-weight: 800;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a35dff 70%);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 16px 30px rgba(0,0,0,0.32);
}

/* 반응형 */
@media (max-width: 960px) {
  .myup-root {
    padding: 16px;
  }
  .myup-hero {
    flex-direction: column;
  }
  .myup-summary-card {
    width: 100%;
    margin-right: 0;
  }
  .ai-grid {
    grid-template-columns: 1fr;
  }
  .detail-grid.three {
    grid-template-columns: 1fr;
  }
  .detail-grid.two {
    grid-template-columns: 1fr;
  }
}
`;
