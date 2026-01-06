'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  userId: string;
  monthYMD?: string; // 'YYYY-MM-01' 같은 형태로 받아도 되고, 없으면 현재달
  onSelectDate?: (ymd: string) => void; // 'YYYY-MM-DD'
};

type ScheduleItem = {
  id: string;
  user_id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null;
  category?: string | null;
  customer_id?: string | null;
  created_at?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthKeyFrom(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}
function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getMonthEnd(d: Date) {
  // 다음달 1일 - 1일
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function ScheduleMonthlyCalendar({ userId, monthYMD, onSelectDate }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [picked, setPicked] = useState<string>(() => toYMD(new Date()));

  const baseMonthDate = useMemo(() => {
    if (monthYMD && /^\d{4}-\d{2}-\d{2}$/.test(monthYMD)) {
      const [y, m] = monthYMD.split('-').map((v) => Number(v));
      return new Date(y, (m || 1) - 1, 1);
    }
    return getMonthStart(new Date());
  }, [monthYMD]);

  const monthLabel = useMemo(() => monthKeyFrom(baseMonthDate), [baseMonthDate]);

  const range = useMemo(() => {
    const start = getMonthStart(baseMonthDate);
    const end = getMonthEnd(baseMonthDate);
    return { start, end };
  }, [baseMonthDate]);

  const daysGrid = useMemo(() => {
    // 달력 7열 그리드: 시작요일 맞추기
    const start = new Date(range.start);
    const end = new Date(range.end);

    const startDow = start.getDay(); // 0=일
    const firstCell = new Date(start);
    firstCell.setDate(firstCell.getDate() - startDow);

    const endDow = end.getDay();
    const lastCell = new Date(end);
    lastCell.setDate(lastCell.getDate() + (6 - endDow));

    const out: { ymd: string; inMonth: boolean }[] = [];
    const cur = new Date(firstCell);
    while (cur <= lastCell) {
      const ymd = toYMD(cur);
      const inMonth = cur.getMonth() === baseMonthDate.getMonth();
      out.push({ ymd, inMonth });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [range.start, range.end, baseMonthDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const it of items) {
      const key = it.schedule_date;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!userId) return;
      setLoading(true);

      try {
        const start = toYMD(range.start);
        const end = toYMD(range.end);

        const { data, error } = await supabase
          .from('schedules')
          .select('id,user_id,title,schedule_date,schedule_time,category,customer_id,created_at')
          .eq('user_id', userId)
          .gte('schedule_date', start)
          .lte('schedule_date', end)
          .order('schedule_date', { ascending: true })
          .order('schedule_time', { ascending: true });

        if (!alive) return;

        if (error) {
          setItems([]);
          return;
        }

        setItems((data as ScheduleItem[]) ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [userId, range.start, range.end]);

  function pickDate(ymd: string) {
    setPicked(ymd);
    onSelectDate?.(ymd);
  }

  return (
    <section className="smc" aria-label={`월간 달력 ${monthLabel}`}>
      <div className="smc-head">
        <div className="smc-title">{monthLabel}</div>
        {loading ? <div className="smc-sub">불러오는 중…</div> : <div className="smc-sub">일정 {items.length}개</div>}
      </div>

      <div className="smc-dow">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="smc-dow-cell">
            {d}
          </div>
        ))}
      </div>

      <div className="smc-grid">
        {daysGrid.map((cell) => {
          const list = byDate.get(cell.ymd) ?? [];
          const isPicked = picked === cell.ymd;

          return (
            <button
              key={cell.ymd}
              type="button"
              className={`smc-day ${cell.inMonth ? '' : 'dim'} ${isPicked ? 'picked' : ''}`}
              onClick={() => pickDate(cell.ymd)}
              aria-label={`${cell.ymd} 일정 ${list.length}개`}
            >
              <div className="smc-day-top">
                <span className="smc-day-num">{Number(cell.ymd.slice(8, 10))}</span>
                {list.length > 0 && <span className="smc-badge">{list.length}</span>}
              </div>

              {/* 점 표시(카테고리별 색은 기존 디자인 모르니, 안전하게 단색) */}
              {list.length > 0 && (
                <div className="smc-dots" aria-hidden="true">
                  {list.slice(0, 3).map((_, idx) => (
                    <span key={idx} className="smc-dot" />
                  ))}
                  {list.length > 3 && <span className="smc-dot more" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .smc {
          width: 100%;
        }

        .smc-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .smc-title {
          font-weight: 950;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.95);
        }
        .smc-sub {
          font-weight: 800;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }

        .smc-dow {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }
        .smc-dow-cell {
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.65);
        }

        .smc-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .smc-day {
          height: 64px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.92);
          cursor: pointer;
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .smc-day:hover {
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 10px 24px rgba(168, 85, 247, 0.14);
        }
        .smc-day.dim {
          opacity: 0.45;
        }
        .smc-day.picked {
          border-color: rgba(236, 72, 153, 0.7);
          box-shadow: 0 12px 26px rgba(236, 72, 153, 0.14);
          background: rgba(236, 72, 153, 0.12);
        }

        .smc-day-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .smc-day-num {
          font-weight: 950;
          font-size: 14px;
        }
        .smc-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          color: #fff;
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(168, 85, 247, 0.95));
        }

        .smc-dots {
          display: flex;
          gap: 4px;
          justify-content: flex-start;
        }
        .smc-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          opacity: 0.85;
        }
        .smc-dot.more {
          opacity: 0.45;
        }
      `}</style>
    </section>
  );
}
