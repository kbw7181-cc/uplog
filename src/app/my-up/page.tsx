// src/app/my-up/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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

type MoodOption = {
  code: string;
  emoji: string;
  label: string;
  desc: string;
};

const MOOD_OPTIONS: MoodOption[] = [
  { code: 'very-bad', emoji: '🥵', label: '힘든 날', desc: '체력도 마음도 많이 지친 날' },
  { code: 'bad', emoji: '😞', label: '살짝 다운', desc: '컨디션이 좀 떨어지는 날' },
  { code: 'neutral', emoji: '🙂', label: '보통', desc: '평균적인 컨디션의 날' },
  { code: 'good', emoji: '😊', label: '나쁘지 않음', desc: '조금은 가벼운 발걸음' },
  { code: 'very-good', emoji: '🔥', label: '불타는 날', desc: '집중도, 의욕 둘 다 좋은 날' },
];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

function buildAdvice(moodCode: string | null): string {
  switch (moodCode) {
    case 'very-bad':
      return '오늘은 스스로를 조금 더 챙겨줘야 하는 날이에요. 고객보다는 나를 회복하는 데 비중을 둬도 괜찮아요.';
    case 'bad':
      return '컨디션이 살짝 내려간 날이에요. 가벼운 콜/문자 위주로 루틴을 유지하는 것만으로도 충분해요.';
    case 'neutral':
      return '평균적인 컨디션의 날이에요. “가망 고객 + 기존 고객 케어”를 균형 있게 섞어보면 좋아요.';
    case 'good':
      return '컨디션이 나쁘지 않은 날이에요. 가망 고객에게 한 걸음 더 적극적으로 다가가 볼까요?';
    case 'very-good':
      return '에너지가 좋은 날이에요. 미뤄둔 도전적인 고객에게 연락해 보기 좋은 타이밍이에요.';
    default:
      return '오늘 하루의 컨디션과 목표를 가볍게 적어두면, 나중에 대표님의 성장 기록이 됩니다.';
  }
}

function buildRoutine(moodCode: string | null) {
  switch (moodCode) {
    case 'very-bad':
      return '오전: 기존 고객 케어 · 오후: 나의 정리/휴식 · 저녁: 오늘 나를 칭찬할 점 1개 쓰기';
    case 'bad':
      return '오전: 기존 고객 안부 문자 · 오후: 가볍게 콜 3~5통 · 저녁: 오늘 배운 점 1개 정리';
    case 'neutral':
      return '오전: 가망 고객 콜/문자 · 오후: 기존 고객 케어 · 저녁: 오늘 잘한 점/아쉬운 점 1개씩 정리';
    case 'good':
      return '오전: 가망 고객 콜 집중 · 오후: 상담/방문 예약 정리 · 저녁: 내일 우선순위 3개 적기';
    case 'very-good':
      return '오전: 고난도/중요 고객 콜 · 오후: 미팅/상담 진행 · 저녁: 오늘 성과/배움을 노트에 기록';
    default:
      return '오전: 가벼운 콜/문자 · 오후: 기존 고객 케어 · 저녁: 오늘 느낀 점 1줄 남기기';
  }
}

function buildCheer(moodCode: string | null) {
  switch (moodCode) {
    case 'very-bad':
      return '오늘 같은 날도 있어요. 중요한 건 “완벽한 하루”가 아니라, 포기하지 않은 나 자신이에요.';
    case 'bad':
      return '조금 힘든 날엔, 속도를 줄이되 멈추지만 않으면 됩니다. 오늘도 한 걸음은 나아가고 있어요.';
    case 'neutral':
      return '커다란 것은 없어도 이런 평범한 하루들이 대표님의 실력을 만들어 줍니다.';
    case 'good':
      return '조금 기분이 좋은 날, 이 에너지로 한 통만 더 도전해 보면 어때요? 분명 의미 있는 하루가 될 거예요.';
    case 'very-good':
      return '오늘의 불타는 에너지를 마음껏 활용해 보세요. 이 리듬이 대표님의 “성장의 속도”를 끌어올립니다.';
    default:
      return '오늘도 여기까지 온 나를 칭찬해 주세요. 대표님이 쌓는 하루하루가 결국 원하는 곳으로 데려다 줄 거예요.';
  }
}

export default function MyUpPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDate(new Date())
  );

  // up_logs 입력 상태
  const [mood, setMood] = useState<string | null>(null);
  const [dayGoal, setDayGoal] = useState<string>('');
  const [weekGoal, setWeekGoal] = useState<string>('');
  const [monthGoal, setMonthGoal] = useState<string>('');
  const [mindNote, setMindNote] = useState<string>('');
  const [goodPoint, setGoodPoint] = useState<string>('');
  const [regretPoint, setRegretPoint] = useState<string>('');

  // 오늘 할 일
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [saving, setSaving] = useState(false);

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, [selectedDate]);

  const monthLabel = useMemo(
    () => getMonthLabel(currentMonth),
    [currentMonth]
  );

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

    // 앞쪽 비우기
    for (let i = 0; i < startWeekday; i++) {
      days.push(
        new Date(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          firstDay.getDate() - (startWeekday - i)
        )
      );
    }

    // 현재 달
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }

    // 뒷쪽 채우기
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(
        new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
      );
    }

    return days;
  }, [currentMonth]);

  // 최소 5개 행 + 추가 가능
  const editableTasks = useMemo(() => {
    const base = [...tasks];
    while (base.length < 5) {
      base.push({
        user_id: userId || '',
        task_date: selectedDate,
        content: '',
        done: false,
      });
    }
    return base;
  }, [tasks, selectedDate, userId]);

  // 로그인 / 초기 로드
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
      await loadForDate(user.id, selectedDate);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 날짜 바뀔 때마다 해당 날짜 기록/할일 불러오기
  useEffect(() => {
    if (!userId) return;
    loadForDate(userId, selectedDate);
  }, [selectedDate, userId]);

  const loadForDate = async (uid: string, dateStr: string) => {
    // up_logs
    const { data: upRow, error: upErr } = await supabase
      .from('up_logs')
      .select(
        'id, log_date, mood, day_goal, week_goal, month_goal, mind_note, good_point, regret_point'
      )
      .eq('user_id', uid)
      .eq('log_date', dateStr)
      .maybeSingle();

    if (!upErr && upRow) {
      setMood(upRow.mood ?? null);
      setDayGoal(upRow.day_goal ?? '');
      setWeekGoal(upRow.week_goal ?? '');
      setMonthGoal(upRow.month_goal ?? '');
      setMindNote(upRow.mind_note ?? '');
      setGoodPoint(upRow.good_point ?? '');
      setRegretPoint(upRow.regret_point ?? '');
    } else {
      // 해당 날짜 기록 없으면 초기화
      setMood(null);
      setDayGoal('');
      setWeekGoal('');
      setMonthGoal('');
      setMindNote('');
      setGoodPoint('');
      setRegretPoint('');
    }

    // daily_tasks
    const { data: taskRows, error: taskErr } = await supabase
      .from('daily_tasks')
      .select('id, task_date, content, done')
      .eq('user_id', uid)
      .eq('task_date', dateStr)
      .order('id', { ascending: true });

    if (!taskErr && taskRows) {
      setTasks(
        taskRows.map((t) => ({
          id: t.id,
          user_id: uid,
          task_date: t.task_date,
          content: t.content ?? '',
          done: t.done ?? false,
        }))
      );
    } else {
      setTasks([]);
    }
  };

  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const uid = userId;

      // ---------- 1) up_logs: 기존 row 있으면 update, 없으면 insert ----------
      const basePayload = {
        mood,
        day_goal: dayGoal || null,
        week_goal: weekGoal || null,
        month_goal: monthGoal || null,
        mind_note: mindNote || null,
        good_point: goodPoint || null,
        regret_point: regretPoint || null,
      };

      const { data: existingUp, error: existErr } = await supabase
        .from('up_logs')
        .select('id')
        .eq('user_id', uid)
        .eq('log_date', selectedDate)
        .maybeSingle();

      if (existErr) {
        console.error('up_logs select error', existErr);
      }

      if (existingUp?.id) {
        const { error: upUpdateErr } = await supabase
          .from('up_logs')
          .update(basePayload)
          .eq('id', existingUp.id);

        if (upUpdateErr) {
          console.error('up_logs update error', upUpdateErr);
        }
      } else {
        const insertPayload: UpLogRow = {
          user_id: uid,
          log_date: selectedDate,
          ...basePayload,
        };
        const { error: upInsertErr } = await supabase
          .from('up_logs')
          .insert(insertPayload);

        if (upInsertErr) {
          console.error('up_logs insert error', upInsertErr);
        }
      }

      // ---------- 2) daily_tasks: 선택 날짜 전체 삭제 후 다시 insert ----------
      const { error: delErr } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('user_id', uid)
        .eq('task_date', selectedDate);

      if (delErr) {
        console.error('daily_tasks delete error', delErr);
      }

      const toInsert = editableTasks
        .filter((t) => t.content.trim().length > 0)
        .map((t) => ({
          user_id: uid,
          task_date: selectedDate,
          content: t.content.trim(),
          done: t.done ?? false,
        }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('daily_tasks')
          .insert(toInsert);

        if (insErr) {
          console.error('daily_tasks insert error', insErr);
        }
      }

      await loadForDate(uid, selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const handleTaskChange = (index: number, field: 'content' | 'done', value: any) => {
    setTasks((prev) => {
      const base = [...editableTasks]; // 최소 5개 보장된 배열 기준으로 수정
      if (!base[index]) return prev;
      const updated = base.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      );
      // 실제 tasks 상태에는 빈 행은 저장하지 않음
      return updated.filter((t) => t.content.trim().length > 0 || t.done);
    });
  };

  const addTaskRow = () => {
    setTasks((prev) => [
      ...prev,
      {
        user_id: userId || '',
        task_date: selectedDate,
        content: '',
        done: false,
      },
    ]);
  };

  const selectedMood = MOOD_OPTIONS.find((m) => m.code === mood) || null;

  // 예시용: 아직 고객/계약/피드백 집계 안 붙였으니 0으로 표시
  const customerCount = 0;
  const contractCount = 0;
  const feedbackCount = 0;

  if (loading) {
    return (
      <div className="myup-root">
        <div className="myup-inner">
          <div className="myup-loading">나의 U P 관리 화면을 불러오는 중입니다...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="myup-root">
      <div className="myup-inner">
        {/* 상단 헤더 / 요약 */}
        <section className="myup-header-card">
          <div className="myup-header-left">
            <div className="myup-eyebrow">UPLOG · MYUP</div>
            <h1 className="myup-title">나의 U P 관리</h1>
            <div className="myup-date">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
            <p className="myup-sub">
              오늘의 컨디션, 목표, 실적과 마음을 한 번에 정리하는 나만의 기록장이에요.
            </p>
          </div>
          <div className="myup-header-right">
            <div className="summary-card">
              <div className="summary-title">오늘 요약</div>
              <div className="summary-row">
                <span className="summary-label">선택한 날짜</span>
                <span className="summary-value">{selectedDate}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">고객</span>
                <span className="summary-value">{customerCount}명</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">계약</span>
                <span className="summary-value">{contractCount}건</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">기분 이모지</span>
                <span className="summary-value">
                  {selectedMood ? (
                    <>
                      {selectedMood.emoji} {selectedMood.label}
                    </>
                  ) : (
                    '미선택'
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 실적 요약 · AI 한 마디 + 오늘의 U P 목표 */}
        <section className="myup-top-section">
          <div className="ai-card">
            <div className="ai-header">
              <div className="ai-title-left">
                <div className="ai-eyebrow">실적 요약 · AI 한 마디</div>
                <div className="ai-small">
                  고객 {customerCount}명 · 계약 {contractCount}건 · 피드백 {feedbackCount}개
                </div>
              </div>
            </div>

            <div className="ai-block">
              <div className="ai-block-title">오늘의 조언</div>
              <p className="ai-text">{buildAdvice(mood)}</p>
            </div>

            <div className="ai-block">
              <div className="ai-block-title">영업 루틴 자동 추천</div>
              <p className="ai-text">{buildRoutine(mood)}</p>
            </div>

            <div className="ai-block">
              <div className="ai-block-title">오늘의 응원 메시지</div>
              <p className="ai-text">{buildCheer(mood)}</p>
            </div>
          </div>

          <div className="goal-card">
            <div className="goal-card-title">오늘의 U P 목표</div>
            <ul className="goal-help-list">
              <li>일일 목표를 입력해 주세요.</li>
              <li>이번 주 목표를 입력해 주세요.</li>
              <li>이번 달 목표를 입력해 주세요.</li>
              <li>팀/조직 목표를 입력해 주세요.</li>
              <li>마인드 노트에는 오늘의 다짐/마음을 한 줄로 남겨주세요.</li>
            </ul>
          </div>
        </section>

        {/* 달력 + 입력폼 */}
        <section className="myup-main-section">
          <div className="calendar-panel">
            <div className="calendar-header">
              <div className="calendar-eyebrow">CALENDAR & PERFORMANCE</div>
              <div className="calendar-title">달력 · 실적 한눈에 보기</div>
            </div>
            <div className="calendar-top-row">
              <button
                type="button"
                className="month-nav-btn"
                onClick={() => moveMonth(-1)}
              >
                ◀
              </button>
              <div className="month-label">{monthLabel}</div>
              <button
                type="button"
                className="month-nav-btn"
                onClick={() => moveMonth(1)}
              >
                ▶
              </button>
            </div>

            <div className="calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} className="calendar-weekday">
                  {w}
                </div>
              ))}

              {daysInMonth.map((d, idx) => {
                const dStr = formatDate(d);
                const isCurrentMonth =
                  d.getMonth() === currentMonth.getMonth();
                const isSelected = dStr === selectedDate;
                const isToday = dStr === todayStr;

                return (
                  <button
                    key={`${dStr}-${idx}`}
                    type="button"
                    className={[
                      'calendar-day',
                      !isCurrentMonth ? 'calendar-day-out' : '',
                      isSelected ? 'calendar-day-selected' : '',
                      isToday ? 'calendar-day-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDate(dStr)}
                  >
                    <div className="calendar-day-number">{d.getDate()}</div>
                    <div className="calendar-day-caption">기록 없음</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 오른쪽: 선택 날짜 입력폼 */}
          <div className="form-panel">
            <div className="form-header">
              <div className="form-title">선택한 날짜의 기록</div>
              <div className="form-date">{selectedDateLabel}</div>
            </div>

            {/* 기분 선택 */}
            <div className="form-block">
              <div className="form-block-title">오늘의 기분 이모지</div>
              <div className="mood-row">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    className={[
                      'mood-pill',
                      mood === m.code ? 'mood-pill-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setMood(m.code)}
                  >
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label">{m.label}</span>
                  </button>
                ))}
              </div>
              {selectedMood && (
                <div className="mood-desc">
                  {selectedMood.emoji} {selectedMood.desc}
                </div>
              )}
            </div>

            {/* 목표 */}
            <div className="form-block">
              <div className="form-block-title">오늘의 U P 목표</div>
              <div className="goal-input-grid">
                <div className="goal-input-item">
                  <label>일일 목표</label>
                  <input
                    value={dayGoal}
                    onChange={(e) => setDayGoal(e.target.value)}
                    placeholder="예) 콜 20통 / 상담 2건"
                  />
                </div>
                <div className="goal-input-item">
                  <label>이번 주 목표</label>
                  <input
                    value={weekGoal}
                    onChange={(e) => setWeekGoal(e.target.value)}
                    placeholder="예) 신규 계약 3건"
                  />
                </div>
                <div className="goal-input-item">
                  <label>이번 달 목표</label>
                  <input
                    value={monthGoal}
                    onChange={(e) => setMonthGoal(e.target.value)}
                    placeholder="예) 팀 매출 ○○달성"
                  />
                </div>
              </div>
            </div>

            {/* 마음 / 잘한 점 / 아쉬운 점 */}
            <div className="form-block">
              <div className="form-block-title">마인드 노트</div>
              <textarea
                value={mindNote}
                onChange={(e) => setMindNote(e.target.value)}
                placeholder="오늘의 다짐/마음을 한 줄로 적어 보세요."
              />
            </div>

            <div className="form-block two-col">
              <div className="half-block">
                <div className="form-block-title">오늘 잘한 점</div>
                <textarea
                  value={goodPoint}
                  onChange={(e) => setGoodPoint(e.target.value)}
                  placeholder="작은 것이라도 좋으니 칭찬할 점을 적어 주세요."
                />
              </div>
              <div className="half-block">
                <div className="form-block-title">오늘 아쉬운 점</div>
                <textarea
                  value={regretPoint}
                  onChange={(e) => setRegretPoint(e.target.value)}
                  placeholder="내일은 이렇게 해보고 싶다는 점을 적어 주세요."
                />
              </div>
            </div>

            {/* 오늘 할 일 리스트 (체크박스) */}
            <div className="form-block">
              <div className="form-block-title">오늘 할 일 리스트</div>
              <p className="helper-text">
                최소 5개 기본 줄이 있고, 필요하면 “할 일 추가” 버튼으로 더 늘릴 수 있어요.
              </p>
              <ul className="todo-list">
                {editableTasks.map((t, idx) => (
                  <li key={idx} className="todo-item">
                    <label className="todo-row">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) =>
                          handleTaskChange(idx, 'done', e.target.checked)
                        }
                      />
                      <input
                        type="text"
                        className="todo-input"
                        value={t.content}
                        onChange={(e) =>
                          handleTaskChange(idx, 'content', e.target.value)
                        }
                        placeholder={`오늘 할 일 ${idx + 1}`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="add-todo-btn"
                onClick={addTaskRow}
              >
                + 할 일 추가
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '기록 저장하기'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = /* css */ `
.myup-root {
  min-height: 100vh;
  background: linear-gradient(180deg, #fce7f3 0%, #f5f3ff 40%, #ffffff 100%);
}

.myup-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 18px 60px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
    'Segoe UI', sans-serif;
  font-size: 14px; /* 기본 글씨 조금 키움 */
}

.myup-loading {
  margin-top: 80px;
  text-align: center;
  font-size: 14px;
  color: #4b5563;
}

/* 상단 헤더 */

.myup-header-card {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-radius: 26px;
  background: radial-gradient(circle at top left, #f5d0fe 0, #e0f2fe 40%, #ffffff 100%);
  box-shadow: 0 18px 40px rgba(168, 85, 247, 0.25);
  border: 1px solid rgba(221, 214, 254, 0.9);
  margin-bottom: 20px;
}

.myup-header-left {
  flex: 1.5;
}

.myup-eyebrow {
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #a855f7;
  margin-bottom: 4px;
}

.myup-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 6px 0;
  color: #111827;
}

.myup-date {
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 4px;
}

.myup-sub {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.myup-header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.summary-card {
  min-width: 230px;
  padding: 14px 16px;
  border-radius: 20px;
  background: linear-gradient(145deg, #eef2ff, #f5f3ff);
  border: 1px solid rgba(191, 219, 254, 0.9);
  box-shadow: 0 14px 32px rgba(129, 140, 248, 0.35);
  font-size: 13px;
}

.summary-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #4338ca;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.summary-label {
  color: #6b7280;
}

.summary-value {
  font-weight: 600;
  color: #111827;
}

/* 실적 요약 섹션 */

.myup-top-section {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.ai-card,
.goal-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 16px 40px rgba(148, 163, 184, 0.35);
  padding: 16px 18px;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ai-eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: #6b21a8;
  margin-bottom: 4px;
}

.ai-small {
  font-size: 12px;
  color: #6b7280;
}

.ai-block {
  margin-bottom: 10px;
}

.ai-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 4px;
}

.ai-text {
  font-size: 13px;
  color: #4b5563;
  margin: 0;
}

.goal-card-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #4338ca;
}

.goal-help-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #4b5563;
}

/* 메인 섹션 */

.myup-main-section {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.6fr);
  gap: 18px;
}

/* 달력 패널 */

.calendar-panel {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 16px 40px rgba(148, 163, 184, 0.35);
  padding: 16px 18px 18px;
}

.calendar-header {
  margin-bottom: 8px;
}

.calendar-eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: #9f1239;
}

.calendar-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.calendar-top-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.month-nav-btn {
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  width: 28px;
  height: 28px;
  font-size: 13px;
  cursor: pointer;
  color: #4b5563;
}
.month-nav-btn:hover {
  background: #e5e7eb;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
}

/* 달력 그리드 */

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  font-size: 13px;
}

.calendar-weekday {
  text-align: center;
  padding: 4px 0;
  font-weight: 600;
  color: #6b7280;
}

.calendar-day {
  border: none;
  border-radius: 15px;
  padding: 8px 6px;
  background: #f9fafb;
  cursor: pointer;
  text-align: left;
  min-height: 64px;
  transition: all 0.13s ease;
  box-shadow: 0 6px 14px rgba(148, 163, 184, 0.25);
}

.calendar-day-number {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.calendar-day-caption {
  font-size: 12px;
  color: #9ca3af;
}

.calendar-day-out {
  opacity: 0.45;
}

.calendar-day-today {
  border: 1px solid rgba(34, 197, 94, 0.6);
}

.calendar-day-selected {
  background: linear-gradient(145deg, #a855f7, #ec4899);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(168, 85, 247, 0.6);
}
.calendar-day-selected .calendar-day-caption {
  color: #e5e7eb;
}

.calendar-day:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.35);
}

/* 폼 패널 */

.form-panel {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 16px 40px rgba(148, 163, 184, 0.35);
  padding: 16px 18px 18px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.form-title {
  font-size: 15px;
  font-weight: 700;
}

.form-date {
  font-size: 13px;
  color: #6b7280;
}

.form-block {
  margin-bottom: 12px;
}

.form-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 4px;
}

/* 기분 */

.mood-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mood-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  font-size: 12px;
}
.mood-pill-active {
  border-color: #a855f7;
  background: radial-gradient(circle at top left, #f9a8d4, #c4b5fd);
  color: #111827;
}
.mood-emoji {
  font-size: 16px;
}
.mood-label {
  font-size: 12px;
}
.mood-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

/* 목표 인풋 */

.goal-input-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.goal-input-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.goal-input-item label {
  color: #6b7280;
}

.goal-input-item input {
  border-radius: 999px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  padding: 7px 11px;
  font-size: 13px;
  outline: none;
}
.goal-input-item input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.35);
}

/* 텍스트 영역 */

textarea {
  width: 100%;
  min-height: 60px;
  border-radius: 12px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  padding: 7px 10px;
  resize: vertical;
  font-size: 13px;
  outline: none;
}
textarea:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.35);
}

.form-block.two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.half-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 오늘 할 일 */

.helper-text {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-item {
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid rgba(229, 231, 235, 0.9);
  padding: 4px 6px;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.todo-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.add-todo-btn {
  margin-top: 4px;
  border: none;
  background: none;
  font-size: 12px;
  color: #6d28d9;
  cursor: pointer;
}
.add-todo-btn:hover {
  text-decoration: underline;
}

/* 저장 버튼 */

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-btn {
  min-width: 150px;
  border-radius: 999px;
  border: none;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(168, 85, 247, 0.45);
}
.save-btn:disabled {
  opacity: 0.7;
  cursor: default;
  box-shadow: none;
}

/* 반응형 */

@media (max-width: 980px) {
  .myup-main-section,
  .myup-top-section {
    grid-template-columns: minmax(0, 1fr);
  }
  .myup-header-card {
    flex-direction: column;
  }
  .goal-input-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .form-block.two-col {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;
