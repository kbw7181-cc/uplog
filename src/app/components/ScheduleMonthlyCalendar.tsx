'use client';

import { useMemo } from 'react';

/* =========================================================
   타입
========================================================= */
export type ScheduleRow = {
  id: string;
  schedule_date: string; // YYYY-MM-DD
  category?: string | null;
};

export type ScheduleMonthlyCalendarProps = {
  year: number;
  month: number; // 1~12
  schedules: ScheduleRow[];
  moodByDate?: Record<string, string | null>; // YYYY-MM-DD -> moodCode
};

/* =========================================================
   유틸
========================================================= */
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMoodEmoji(code?: string | null) {
  if (!code) return '';
  const map: Record<string, string> = {
    tired: '😴',
    down: '😕',
    normal: '🙂',
    good: '😊',
    happy: '😁',
    fire: '🔥',
  };
  return map[code] ?? '';
}

function getScheduleCategoryMeta(category?: string | null) {
  if (!category) return { kind: 'etc' as const };

  if (['출근', '지각', '조퇴', '외출', '결근', '출장', '퇴근'].includes(category))
    return { kind: 'attendance' as const };

  if (['상담', '방문', '클레임', 'A/S', '사은품', '회의', '교육', '기타'].includes(category))
    return { kind: 'work' as const };

  return { kind: 'etc' as const };
}

/* =========================================================
   컴포넌트
========================================================= */
export default function ScheduleMonthlyCalendar({
  year,
  month,
  schedules,
  moodByDate = {},
}: ScheduleMonthlyCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay()); // 일요일 시작

  const days = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]); // ✅ start는 year/month로 결정되므로 OK

  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    schedules.forEach((s) => {
      if (!map[s.schedule_date]) map[s.schedule_date] = [];
      map[s.schedule_date].push(s);
    });
    return map;
  }, [schedules]);

  return (
    <section className="cal-wrap">
      <div className="cal-grid">
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month - 1;
          const schedulesForDay = schedulesByDate[key] ?? [];
          const moodCode = moodByDate[key];

          return (
            <div key={key} className={`cal-cell ${inMonth ? '' : 'dim'}`}>
              {/* ================= 상단 고정 ================= */}
              <div className="cell-top">
                <div className="cell-head">
                  <span className="cell-date">{d.getDate()}</span>

                  {/* ✅✅✅ 달력에서는 기분 이모지 숨김(나의UP관리와 동일) */}
                  <span className="cell-mood" aria-hidden="true">
                    {moodCode ? getMoodEmoji(moodCode) : ''}
                  </span>
                </div>

                {schedulesForDay.length > 0 && (
                  <div className="cell-dots">
                    {schedulesForDay.slice(0, 10).map((s, i) => {
                      const meta = getScheduleCategoryMeta(s.category);
                      const dotClass =
                        meta.kind === 'attendance'
                          ? 'dot-attend'
                          : meta.kind === 'work'
                          ? 'dot-work'
                          : 'dot-etc';

                      return <span key={`${s.id}-${i}`} className={`cell-dot-mini ${dotClass}`} />;
                    })}

                    {schedulesForDay.length > 10 && (
                      <span className="cell-dot-more">+{schedulesForDay.length - 10}</span>
                    )}
                  </div>
                )}
              </div>

              {/* ================= 하단 영역(유지) ================= */}
              <div className="cell-bottom" />
            </div>
          );
        })}
      </div>

      {/* ================= 스타일 ================= */}
      <style jsx>{`
        .cal-wrap {
          width: 100%;
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .cal-cell {
          position: relative;
          height: 78px;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 8px 22px rgba(140, 120, 255, 0.12);
          overflow: hidden;
        }

        .cal-cell.dim {
          opacity: 0.45;
        }

        /* ===== 상단 고정 ===== */
        .cell-top {
          position: relative;
          width: 100%;
          min-height: 46px;
        }

        .cell-head {
          position: absolute;
          top: 8px;
          left: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          z-index: 2;
        }

        .cell-date {
          font-size: 14px;
          font-weight: 950;
          line-height: 1;
        }

        /* ✅✅✅ 핵심: 달력에서는 이모지 완전 숨김 */
        .cell-mood {
          display: none !important;
        }

        .cell-dots {
          position: absolute;
          top: 28px;
          left: 8px;
          right: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
          pointer-events: none;
        }

        .cell-dot-mini {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .dot-attend {
          background: #fbbf24;
        }

        .dot-work {
          background: #22c55e;
        }

        .dot-etc {
          background: #a855f7;
        }

        .cell-dot-more {
          font-size: 10px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(212, 200, 255, 0.85);
          color: #7a69c4;
          line-height: 1.1;
        }

        /* ===== 하단(기존 유지용) ===== */
        .cell-bottom {
          position: absolute;
          bottom: 6px;
          left: 6px;
          right: 6px;
          min-height: 18px;
        }
      `}</style>
    </section>
  );
}
