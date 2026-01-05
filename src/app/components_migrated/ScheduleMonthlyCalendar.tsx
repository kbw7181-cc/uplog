// src/components/ScheduleMonthlyCalendar.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type ScheduleItem = {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  type: string;   // work / meeting / personal
  status: string; // pending / progress / done
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ScheduleMonthlyCalendar() {
  const [current, setCurrent] = useState(() => new Date());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth(); // 0~11

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const cells = useMemo(() => {
    const arr: Date[] = [];

    // 달력 시작: 해당 월의 1일이 속한 주의 월요일부터
    const start = new Date(firstDay);
    const day = start.getDay(); // 0(일)~6(토)
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + diffToMonday);

    // 6주 * 7일 = 42칸
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [firstDay]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const startStr = formatDate(new Date(year, month, 1));
        const endStr = formatDate(new Date(year, month + 1, 0));

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setItems([]);
          return;
        }

        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr);

        if (error) throw error;
        if (!cancelled && data) {
          setItems(data as any);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  function moveMonth(offset: number) {
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function getDayItems(date: Date): ScheduleItem[] {
    const key = formatDate(date);
    return items.filter((i) => i.date === key);
  }

  function statusDotClass(status: string): string {
    switch (status) {
      case 'done':
        return 'bg-emerald-500';
      case 'progress':
        return 'bg-yellow-400';
      case 'pending':
      default:
        return 'bg-sky-500';
    }
  }

  function typeLabel(type: string): string {
    switch (type) {
      case 'meeting':
        return '회의/미팅';
      case 'personal':
        return '개인';
      case 'work':
      default:
        return '업무';
    }
  }

  function typeBadgeClass(type: string): string {
    switch (type) {
      case 'meeting':
        return 'bg-purple-500/20 text-purple-200 border-purple-400/60';
      case 'personal':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/60';
      case 'work':
      default:
        return 'bg-pink-500/20 text-pink-200 border-pink-400/60';
    }
  }

  const monthLabel = `${year}년 ${month + 1}월`;

  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-full border border-zinc-600 px-2 py-1 text-xs text-zinc-200"
          >
            ←
          </button>
          <div className="text-sm font-semibold">{monthLabel}</div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-full border border-zinc-600 px-2 py-1 text-xs text-zinc-200"
          >
            →
          </button>
        </div>
        <span className="text-[11px] text-zinc-400">
          미팅/회의 · 업무 · 개인 일정과 완료/진행/대기를 색으로 구분
        </span>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] text-zinc-400 mb-1">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth() === month;
          const dayItems = getDayItems(d);
          const isToday = formatDate(d) === formatDate(new Date());

          return (
            <div
              key={idx}
              className={`min-h-[72px] rounded-xl border px-1.5 py-1 flex flex-col gap-1 ${
                inMonth ? 'border-zinc-700 bg-black/40' : 'border-zinc-800 bg-black/20 text-zinc-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] ${
                    isToday ? 'text-pink-300 font-semibold' : ''
                  }`}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <div className="flex gap-0.5">
                    {dayItems.slice(0, 3).map((it) => (
                      <span
                        key={it.id}
                        className={`h-1.5 w-1.5 rounded-full ${statusDotClass(
                          it.status,
                        )}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {dayItems.slice(0, 2).map((it) => (
                <div
                  key={it.id}
                  className={`truncate rounded-md border px-1 py-0.5 text-[10px] ${typeBadgeClass(
                    it.type,
                  )}`}
                >
                  {typeLabel(it.type)} · {it.title}
                </div>
              ))}

              {dayItems.length > 2 && (
                <span className="text-[9px] text-zinc-500 mt-auto">
                  +{dayItems.length - 2}개 더 있음
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> 대기
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> 진행중
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 완료
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-md border border-pink-400 bg-pink-500/20" /> 업무
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-md border border-purple-400 bg-purple-500/20" /> 회의/미팅
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-md border border-blue-400 bg-blue-500/20" /> 개인
        </div>
      </div>

      {loading && (
        <p className="text-[11px] text-zinc-400 mt-1">일정을 불러오는 중입니다…</p>
      )}
    </section>
  );
}
