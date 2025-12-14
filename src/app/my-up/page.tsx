// src/app/my-up/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import UpzzuHeaderCoach from '../components/UpzzuHeaderCoach';

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

// 스케줄 카테고리 (DB에 저장되는 상세 카테고리)
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
  | 'out' // 외출(외근 포함)
  | 'absent' // 결근
  | 'closing' // 마감
  | 'etc'; // 기타;

// 달력에 보여줄 "통합 카테고리"
type UnifiedScheduleCategory = 'attendance' | 'work' | 'meeting' | 'etc';

type GrowthDay = {
  date: string; // YYYY-MM-DD
  count: number; // 그 날짜에 기록/스케줄 개수
  mainCategory?: UnifiedScheduleCategory | null; // 그날 대표 통합 카테고리
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
// 기분 이모지 옵션 (힘든날 ~ 열정가득한날)
const moodOptions: MoodOption[] = [
  { code: 'hard', emoji: '🥵', label: '힘든 날' },
  { code: 'sad', emoji: '😢', label: '슬픈 날' },
  { code: 'happy', emoji: '😊', label: '기쁜 날' },
  { code: 'cheer', emoji: '💪', label: '힘이 나는 날' },
  { code: 'bright', emoji: '🤩', label: '행복한 날' },
  { code: 'thanks', emoji: '🙏', label: '감사한 날' },
  { code: 'passion', emoji: '🔥', label: '열정 가득한 날' },
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
  { id: 'out', label: '외출/외근' },
  { id: 'absent', label: '결근' },
  { id: 'closing', label: '마감' },
  { id: 'etc', label: '기타' },
];

const getScheduleCategoryMeta = (id: string | null | undefined) =>
  SCHEDULE_CATEGORY_META.find((c) => c.id === id);

// 상세 카테고리 → 통합 카테고리(근태/업무/회의·교육/기타) 매핑
const mapScheduleCategoryToUnified = (
  cat: ScheduleCategory
): UnifiedScheduleCategory => {
  switch (cat) {
    // 근태: 지각 / 조퇴 / 외출(외근) / 결근
    case 'late':
    case 'early':
    case 'out':
    case 'absent':
      return 'attendance';

    // 업무내용: 상담 / 방문 / 사은품 / 해피콜 / 배송 / 행사 / 마감 등
    case 'counsel':
    case 'visit':
    case 'gift':
    case 'happycall':
    case 'shipping':
    case 'event':
    case 'closing':
      return 'work';

    // 회의·교육
    case 'meeting':
    case 'edu':
      return 'meeting';

    // 나머지는 기타
    default:
      return 'etc';
  }
};

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

      // ✅ 프로필에서 닉네임(name) 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('profile load error', profileError);
      }

      if (profile && profile.name) {
        setNickname(profile.name);
      } else {
        setNickname('영업인');
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
    const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
    const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0);

    const from = formatDate(monthStart);
    const to = formatDate(monthEnd);

    const { data: logRows, error: logError } = await supabase
      .from('up_logs')
      .select('log_date, mood')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to);

    if (logError) console.error('up_logs monthly error', logError);

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from('schedules')
      .select('schedule_date, category')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to);

    if (scheduleError) console.error('schedules monthly error', scheduleError);

    type Meta = { count: number; mood: string | null; catCounts: Record<string, number> };
    const map: Record<string, Meta> = {};

    (logRows ?? []).forEach((row: any) => {
      const raw = row.log_date;
      const str = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
      if (!map[str]) map[str] = { count: 0, mood: row.mood ?? null, catCounts: {} };
      map[str].count += 1;
      if (!map[str].mood && row.mood) map[str].mood = row.mood;
    });

    (scheduleRows ?? []).forEach((row: any) => {
      const raw = row.schedule_date;
      const str = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
      if (!map[str]) map[str] = { count: 0, mood: null, catCounts: {} };
      map[str].count += 1;
      const cat: string = row.category ?? 'etc';
      if (!map[str].catCounts[cat]) map[str].catCounts[cat] = 0;
      map[str].catCounts[cat] += 1;
    });

    const days: GrowthDay[] = [];
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const cur = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      const str = formatDate(cur);
      const meta = map[str];

      let mainCategory: UnifiedScheduleCategory | null = null;

      if (meta && Object.keys(meta.catCounts).length > 0) {
        const groupCounts: Record<UnifiedScheduleCategory, number> = {
          attendance: 0,
          work: 0,
          meeting: 0,
          etc: 0,
        };

        Object.entries(meta.catCounts).forEach(([cat, cnt]) => {
          const unified = mapScheduleCategoryToUnified((cat as ScheduleCategory) || 'etc');
          groupCounts[unified] += cnt as number;
        });

        const sorted = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
        if (sorted[0][1] > 0) mainCategory = sorted[0][0] as UnifiedScheduleCategory;
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
      setHasCurrentLog(true);
      setLogRow(upRow as UpLogRow);
    } else {
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
      const { error: updateError } = await supabase
        .from('up_logs')
        .update(payload)
        .eq('user_id', userId)
        .eq('log_date', selectedDate);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('up_logs').insert(payload);
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

    if (error) {
      console.error('add task error', error);
      alert('할 일을 추가하는 중 오류가 발생했어요.');
      setSavingTasks(false);
      return;
    }

    setSavingTasks(false);

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
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, content: value } : t)));
  };

  const handleTaskBlur = async (task: DailyTask) => {
    if (!task.id) return;
    const { error } = await supabase.from('daily_tasks').update({ content: task.content }).eq('id', task.id);
    if (error) console.error('update task error', error);
  };

  const toggleTaskDone = async (task: DailyTask) => {
    if (!task.id) return;
    const nextDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)));
    const { error } = await supabase.from('daily_tasks').update({ done: nextDone }).eq('id', task.id);
    if (error) console.error('toggle task error', error);
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
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const days: Date[] = [];
    const startWeekday = firstDay.getDay();

    for (let i = 0; i < startWeekday; i++) {
      days.push(
        new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - (startWeekday - i))
      );
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

  // 월 통계
  const recordedDaysInMonth = useMemo(() => growthDays.filter((g) => g.count > 0).length, [growthDays]);
  const totalRecordsInMonth = useMemo(() => growthDays.reduce((acc, g) => acc + g.count, 0), [growthDays]);
  const completedTasks = tasks.filter((t) => t.done).length;

  const upzzuLine = `이번 달에 기록한 날 ${recordedDaysInMonth}일, 일정·기록 ${totalRecordsInMonth}개가 쌓였어요. 오늘 남긴 한 줄이 다음 달 계약 그래프를 바꿔요.`;

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

  const selectedGrowthMeta = growthDays.find((g) => g.date === selectedDate) ?? null;
  const selectedGrowth = selectedGrowthMeta?.count ?? 0;

  return (
    <div className="myup-root">
      <div className="myup-inner">
        {/* ===== 헤더 ===== */}
        <header className="myup-header">
          <div className="myup-header-inner">
            <div className="myup-header-text">
              <div className="myup-header-tag">UPLOG · MYUP</div>
              <h1 className="myup-header-title">나의 U P 관리</h1>
              
            </div>

            {/* ✅ 업쮸 코치 (말풍선 + 점프) */}
            <div className="myup-coach-line">
              <UpzzuHeaderCoach
                mascotSrc="/assets/upzzu6.png"
                text={upzzuLine}
                tag="오늘의 U P 한마디"
                sizePx={150}
              />
            </div>
          </div>
        </header>

        {/* ===== 이번 달 요약 카드 ===== */}
        <section className="myup-month-card">
          <div className="myup-month-left">
            <div className="myup-month-title">이번 달 요약</div>

          </div>
          <div className="myup-month-meta">
            <div className="myup-month-row">
              <div className="myup-month-label">이번 달 기록한 날</div>
              <div className="myup-month-value">{recordedDaysInMonth}일</div>
            </div>
            <div className="myup-month-row">
              <div className="myup-month-label">이번 달 일정·기록 개수</div>
              <div className="myup-month-value">{totalRecordsInMonth}개</div>
            </div>
            <div className="myup-month-row">
              <div className="myup-month-label">오늘 할 일 달성</div>
              <div className="myup-month-value">
                {completedTasks}/{tasks.length}개
              </div>
            </div>
          </div>
        </section>

        {/* ===== 오늘 할 일 + 기분 ===== */}
        <section className="myup-todo-section">
          <div className="todo-header">
            <h2 className="section-title">오늘 할 일 리스트</h2>
            <div className="todo-sub">
              <span>{prettyKoreanDate(selectedDate)}</span>
              <span className="todo-dot">•</span>
              <span>선택한 날짜 기준으로 매일 새로 관리돼요.</span>
            </div>
          </div>

          <div className="detail-row todo-mood-row">
            <div className="detail-label">오늘의 기분 이모지</div>
            <div className="mood-chips">
              {moodOptions.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  className={'mood-chip ' + (logRow.mood === m.code ? 'mood-chip-active' : '')}
                  onClick={() => handleChangeMood(m.code)}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="todo-card">
            {tasks.length === 0 && (
              <p className="todo-empty">
                아직 등록된 할 일이 없어요.
                <br />
                아래 <strong>할 일 추가</strong> 버튼을 눌러서 오늘의 체크항목을 만들어 주세요.
              </p>
            )}

            {tasks.length > 0 && (
              <ul className="todo-list">
                {tasks.map((t) => (
                  <li key={t.id} className="todo-item">
                    <button
                      type="button"
                      className={'todo-check-btn ' + (t.done ? 'todo-check-btn-on' : '')}
                      onClick={() => toggleTaskDone(t)}
                    >
                      {t.done ? '✓' : ''}
                    </button>
                    <input
                      className={'todo-input ' + (t.done ? 'todo-input-done' : '')}
                      value={t.content}
                      placeholder="오늘 꼭 지키고 싶은 일을 적어 보세요."
                      onChange={(e) => handleTaskContentChange(t.id as string, e.target.value)}
                      onBlur={() => handleTaskBlur(t)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <button type="button" className="todo-add-btn" onClick={handleAddTask} disabled={savingTasks}>
              + 할 일 추가
            </button>
          </div>
        </section>

        {/* ===== CALENDAR & PERFORMANCE + 스케줄 입력 ===== */}
        <section className="myup-calendar-section">
          <div className="calendar-header-row">
            <div>
              <h2 className="section-title">CALENDAR & PERFORMANCE</h2>
              <p className="calendar-caption">
                달력에서 기록과 스케줄 카테고리를 색상으로 보고,
                <strong> 선택한 날짜의 일정</strong>을 아래에서 입력·관리할 수 있어요.
              </p>
            </div>
            <div className="month-nav">
              <button type="button" className="nav-btn" onClick={() => moveMonth(-1)}>
                ◀
              </button>
              <div className="month-label">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </div>
              <button type="button" className="nav-btn" onClick={() => moveMonth(1)}>
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
              const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
              const isToday = dStr === todayStr;
              const isSelected = dStr === selectedDate;

              const meta = growthDays.find((g) => g.date === dStr) ?? null;
              const growth = meta?.count ?? 0;
              const hasRecord = growth > 0;

              const moodEmoji = meta?.mood ? moodOptions.find((m) => m.code === meta.mood)?.emoji : null;
              const unified = meta?.mainCategory ?? null;

              const classNames = [
                'calendar-day',
                !isCurrentMonth ? 'calendar-day-out' : '',
                isToday ? 'calendar-day-today' : '',
                isSelected ? 'calendar-day-selected' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button key={dStr} type="button" className={classNames} onClick={() => setSelectedDate(dStr)}>
                  <div className="calendar-day-number-row">
                    <div className="calendar-day-number">{d.getDate()}</div>
                    {moodEmoji && <div className="calendar-day-mood">{moodEmoji}</div>}
                  </div>

                  {unified && (
                    <div className={'calendar-day-cat-pill calendar-unified-' + unified}>
                      {unified === 'attendance'
                        ? '근태'
                        : unified === 'work'
                        ? '업무내용'
                        : unified === 'meeting'
                        ? '회의·교육'
                        : '기타'}
                    </div>
                  )}

                  {hasRecord && <div className="calendar-day-dot">일정/기록 {growth}개</div>}
                </button>
              );
            })}
          </div>

          <div className="schedule-card">
            <div className="schedule-header">
              <div>
                <div className="section-title">선택한 날짜의 스케줄</div>
                <div className="schedule-sub">
                  {prettyKoreanDate(selectedDate)} ·{' '}
                  {schedules.length === 0 ? '등록된 일정이 없습니다.' : `${schedules.length}개 일정`}
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
                onChange={(e) => setScheduleCategoryInput(e.target.value as ScheduleCategory)}
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

              <button type="button" className="schedule-save-btn" onClick={handleScheduleSave} disabled={savingSchedule}>
                {savingSchedule ? '저장 중…' : '일정 등록'}
              </button>
            </div>

            {schedules.length === 0 ? (
              <p className="schedule-empty">
                위에서 시간·카테고리·내용을 입력한 뒤 <strong>일정 등록</strong>을 눌러 주세요.
              </p>
            ) : (
              <ul className="schedule-list">
                {schedules.map((s) => {
                  const meta = getScheduleCategoryMeta(s.category);
                  return (
                    <li key={s.id} className="schedule-item">
                      <div className="schedule-time">{s.schedule_time ? s.schedule_time.slice(0, 5) : '시간 미정'}</div>
                      <div className="schedule-title">
                        {meta && <span className={'schedule-cat-pill schedule-cat-' + meta.id}>{meta.label}</span>}
                        <span>{s.title}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ===== 선택한 날짜의 상세 기록 ===== */}
        <section className="myup-detail-section">
          <h2 className="section-title">선택한 날짜의 기록</h2>
          <p className="detail-caption">
            기분, 목표, 오늘 잘한 점과 아쉬운 점, 스케줄까지 남겨두면 한 달 뒤에 “성장 로그”가 됩니다.
          </p>

          <div className="detail-card">
            <div className="detail-inner">
              <div className="detail-grid three">
                <div className="detail-field">
                  <div className="detail-label">오늘의 U P 목표</div>
                  <input
                    className="detail-input"
                    placeholder="오늘 꼭 달성하고 싶은 한 가지 목표를 적어 보세요."
                    value={logRow.day_goal ?? ''}
                    onChange={(e) => handleLogChange('day_goal', e.target.value)}
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">이번 주 목표</div>
                  <input
                    className="detail-input"
                    placeholder="이번 주에 꼭 이루고 싶은 목표를 적어 보세요."
                    value={logRow.week_goal ?? ''}
                    onChange={(e) => handleLogChange('week_goal', e.target.value)}
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">이번 달 목표</div>
                  <input
                    className="detail-input"
                    placeholder="이번 달의 최종 목표를 적어 보세요."
                    value={logRow.month_goal ?? ''}
                    onChange={(e) => handleLogChange('month_goal', e.target.value)}
                  />
                </div>
              </div>

              <div className="detail-grid two">
                <div className="detail-field">
                  <div className="detail-label">마인드 노트</div>
                  <textarea
                    className="detail-textarea"
                    placeholder="지치지 않고 한결같이 가기 위한 나만의 다짐을 적어 보세요."
                    rows={3}
                    value={logRow.mind_note ?? ''}
                    onChange={(e) => handleLogChange('mind_note', e.target.value)}
                  />
                </div>
                <div className="detail-field">
                  <div className="detail-label">오늘 잘한 점</div>
                  <textarea
                    className="detail-textarea"
                    placeholder="작은 것이라도 좋으니 칭찬할 점을 적어 주세요."
                    rows={3}
                    value={logRow.good_point ?? ''}
                    onChange={(e) => handleLogChange('good_point', e.target.value)}
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
                    onChange={(e) => handleLogChange('regret_point', e.target.value)}
                  />
                </div>
              </div>

              <div className="detail-save-row">
                <button type="button" className="detail-save-btn" onClick={handleSaveLog}>
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

/* ===== 헤더 ===== */

.myup-header {
  border-radius: 40px;
  background: radial-gradient(circle at top left, #ff8ac8 0, #a855f7 40%, #5b21ff 100%);
  box-shadow: 0 28px 60px rgba(0,0,0,0.45);
  color: #fff;
  padding: 48px 52px 56px;
  margin-bottom: 28px;
}

.myup-header-inner {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.myup-header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.myup-header-tag {
  font-size: 14px;
  letter-spacing: 0.18em;
  font-weight: 700;
}

.myup-header-title {
  font-size: 34px;
  font-weight: 900;
}

.myup-header-sub {
  margin-top: 8px;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.96;
}

.myup-header-date {
  margin-top: 10px;
  font-size: 15px;
  font-weight: 800;
}

/* ✅ 업쮸 코치 라인: 상단 여유로 화살표 안 잘리게 */
.myup-coach-line{
  margin-top: 10px;
  padding-top: 10px;   /* 화살표/점프 여유 */
  overflow: visible;
}

/* ===== 이번 달 요약 카드 ===== */

.myup-month-card {
  margin-top: 14px;
  margin-bottom: 24px;
  padding: 18px 22px;
  border-radius: 26px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.myup-month-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.myup-month-title {
  font-size: 22px;              /* ✅ 크게 */
  font-weight: 950;             /* ✅ 더 굵게 */
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff8ac8 0%, #a855f7 55%, #5b21ff 100%);
  box-shadow: 0 14px 26px rgba(0,0,0,0.18);
  letter-spacing: 0.02em;
}

/* 날짜 줄은 삭제했으니 스타일도 필요 없으면 지워도 됨 */
.myup-month-date { display: none; }


.myup-month-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.myup-month-row {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  font-size: 14px;
}

.myup-month-label {
  color: #433155;
}

.myup-month-value {
  font-weight: 800;
  color: #6b41ff;
}

/* 오늘 할 일 섹션 */

.myup-todo-section {
  margin-bottom: 24px;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}

.todo-sub {
  font-size: 14px;
  color: #7e6fd6;
  display: flex;
  align-items: center;
  gap: 6px;
}

.todo-dot {
  font-size: 8px;
}

/* 기분 이모지 행 */
.todo-mood-row {
  margin-bottom: 10px;
}

.todo-card {
  border-radius: 24px;
  padding: 18px 20px 16px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
}

.todo-empty {
  font-size: 14px;
  color: #7a69c4;
  line-height: 1.6;
}

.todo-list {
  list-style: none;
  margin: 0;
  margin-bottom: 12px;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
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
  padding: 8px 13px;
  font-size: 15px;
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
  padding: 9px 16px;
  font-size: 14px;
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
  margin-bottom: 12px;
}

.calendar-caption {
  margin-top: 4px;
  font-size: 14px;
  color: #7a69c4;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 10px;
  font-size: 12px;
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
  border-radius: 26px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #7f6bd5;
}

.calendar-day {
  border-radius: 16px;
  border: none;
  background: #faf7ff;
  padding: 9px 8px;
  min-height: 110px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  color: #241336;
}

.calendar-day-out { opacity: 0.35; }

.calendar-day-today { box-shadow: 0 0 0 2px #f153aa; }

.calendar-day-selected {
  box-shadow: 0 0 0 3px #a45bff;
  background: linear-gradient(135deg, #f5e6ff, #ffe1f1);
}

.calendar-day-number-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.calendar-day-number { font-size: 16px; font-weight: 800; }
.calendar-day-mood { font-size: 18px; }

.calendar-day-dot {
  margin-top: 6px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f153aa;
  color: #fff;
  font-weight: 700;
}

.calendar-day-cat-pill {
  margin-top: 6px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.calendar-unified-attendance { background: #fee2e2; color: #b91c1c; }
.calendar-unified-work { background: #fce7f3; color: #9d174d; }
.calendar-unified-meeting { background: #e0f2fe; color: #0369a1; }
.calendar-unified-etc { background: #e2e8f0; color: #475569; }

/* 스케줄 카드 */
.schedule-card {
  margin-top: 14px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  padding: 16px 18px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}

.schedule-sub { margin-top: 4px; font-size: 14px; color: #7e6fd6; }

.schedule-input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.schedule-time-wrap { display: flex; align-items: center; gap: 4px; }
.schedule-time-label { font-size: 13px; color: #4b335f; }

.schedule-time-input {
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 5px 8px;
  font-size: 13px;
  background: #f9f6ff;
  color: #241336;
}

.schedule-category-select {
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 7px 10px;
  font-size: 13px;
  background: #faf7ff;
  color: #241336;
}

.schedule-title-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid #c2b1ff;
  padding: 8px 12px;
  font-size: 14px;
  background: #faf7ff;
  color: #241336;
}

.schedule-title-input::placeholder { color: #a18ad2; }

.schedule-save-btn {
  border-radius: 999px;
  border: none;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(0,0,0,0.25);
}

.schedule-empty { font-size: 13px; color: #7a69c4; }

.schedule-list { list-style: none; margin: 6px 0 0; padding: 0; }

.schedule-item {
  display: grid;
  grid-template-columns: 70px minmax(0,1fr);
  gap: 6px;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px dashed #e0d4ff;
}
.schedule-item:last-child { border-bottom: none; }

.schedule-time { color: #f153aa; font-weight: 700; }
.schedule-title { color: #241336; }

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
.myup-detail-section { margin-top: 26px; margin-bottom: 40px; width: 100%; }

.detail-caption {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #7a69c4;
}

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

.detail-inner { width: 100%; max-width: 100%; margin: 0; padding: 4px 4px 10px; box-sizing: border-box; }
.detail-row { margin-bottom: 18px; }

.detail-row input,
.detail-row textarea { width: 100%; box-sizing: border-box; }

.detail-label {
  font-size: 15px;
  font-weight: 800;
  color: #5a3cb2;
  margin-bottom: 7px;
}

.mood-chips { display: flex; flex-wrap: wrap; gap: 8px; }

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

.mood-emoji { font-size: 18px; }
.mood-label { font-size: 13px; }

.detail-grid { display: grid; gap: 14px; margin-bottom: 14px; }
.detail-grid.three { grid-template-columns: repeat(3, minmax(0,1fr)); }
.detail-grid.two { grid-template-columns: repeat(2, minmax(0,1fr)); }
.detail-grid.one { grid-template-columns: minmax(0,1fr); }

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
.detail-textarea::placeholder { color: #aa97e0; }

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

.detail-save-row { margin-top: 12px; display: flex; justify-content: flex-end; }

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
  .myup-root { padding: 16px; }
  .myup-header { padding: 32px 24px 36px; }
  .myup-month-card { flex-direction: column; align-items: flex-start; }
  .calendar-grid { padding: 12px; }
  .detail-grid.three,
  .detail-grid.two { grid-template-columns: 1fr; }
}
`;
