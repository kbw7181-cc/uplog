// ✅✅✅ 전체복붙: src/app/components/ScheduleMonthlyCalendar.tsx
'use client';

import React, { useMemo } from 'react';

export type CalendarDot = {
  key: string;
  color: string;
  count: number;
  emoji?: string | null; // key==='mood' 일 때 사용
};

export type ScheduleMonthlyCalendarProps = {
  monthDate: Date;
  monthTitle?: string;
  selectedYMD?: string | null;
  onSelectDate?: (ymd: string) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  dotsByDate?: Record<string, CalendarDot[]>;
  weekStartsOn?: 0 | 1;
  allowOutOfMonthClick?: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
function sameYMD(a?: string | null, b?: string | null) {
  return !!a && !!b && a === b;
}

type Cell = {
  ymd: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  dots: CalendarDot[]; // mood 제외한 dots
  more: number;
  moodEmoji?: string | null;
};

export default function ScheduleMonthlyCalendar({
  monthDate,
  monthTitle,
  selectedYMD,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  dotsByDate = {},
  weekStartsOn = 0,
  allowOutOfMonthClick = true,
}: ScheduleMonthlyCalendarProps) {
  const todayYMD = useMemo(() => toYMD(new Date()), []);

  const { title, cells } = useMemo(() => {
    const base = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const year = base.getFullYear();
    const month = base.getMonth();

    const autoTitle = `${year}년 ${month + 1}월`;
    const startOfMonth = new Date(year, month, 1);

    const startDow = startOfMonth.getDay();
    const offset = weekStartsOn === 1 ? (startDow === 0 ? 6 : startDow - 1) : startDow;

    const firstCellDate = new Date(year, month, 1 - offset);
    const arr: Cell[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(firstCellDate);
      d.setDate(firstCellDate.getDate() + i);

      const ymd = toYMD(d);
      const inMonth = d.getMonth() === month;
      const day = d.getDate();
      const isToday = ymd === todayYMD;

      const rawDots = Array.isArray(dotsByDate[ymd]) ? dotsByDate[ymd] : [];

      const mood = rawDots.find(
        (x: any) => x?.key === 'mood' && typeof x?.emoji === 'string' && x.emoji.trim().length > 0
      );
      const moodEmoji = mood?.emoji ?? null;

      const filtered = rawDots.filter((x: any) => !(x?.key === 'mood' && typeof x?.emoji === 'string'));

      const clean = filtered.filter((x) => x && typeof x.count === 'number' && x.count > 0);

      // ✅ 셀 안에서 "줄"이 들쑥날쑥 안 나게: 2줄까지만(최대 4개) 보여주고 나머진 +N
      const showMax = 4;
      const show = clean.slice(0, showMax);
      const more = Math.max(0, clean.length - show.length);

      arr.push({ ymd, day, inMonth, isToday, dots: show, more, moodEmoji });
    }

    return { title: monthTitle ?? autoTitle, cells: arr };
  }, [monthDate, monthTitle, dotsByDate, todayYMD, weekStartsOn]);

  const weekLabels = useMemo(() => {
    const labelsSun = ['일', '월', '화', '수', '목', '금', '토'];
    if (weekStartsOn === 1) return ['월', '화', '수', '목', '금', '토', '일'];
    return labelsSun;
  }, [weekStartsOn]);

  return (
    <section className="cal-wrap" aria-label="월간 달력">
      <header className="cal-head">
        <button type="button" className="cal-nav" onClick={onPrevMonth} aria-label="이전 달">
          ‹
        </button>

        <div className="cal-title">{title}</div>

        <button type="button" className="cal-nav" onClick={onNextMonth} aria-label="다음 달">
          ›
        </button>
      </header>

      <div className="cal-week">
        {weekLabels.map((w) => (
          <div key={w} className="cal-week-item">
            {w}
          </div>
        ))}
      </div>

      <div className="cal-grid" role="grid">
        {cells.map((c) => {
          const isSelected = sameYMD(selectedYMD, c.ymd);
          const disabled = !c.inMonth && !allowOutOfMonthClick;

          return (
            <button
              key={c.ymd}
              type="button"
              role="gridcell"
              className={[
                'cal-cell',
                c.inMonth ? 'in' : 'out',
                c.isToday ? 'today' : '',
                isSelected ? 'sel' : '',
              ].join(' ')}
              onClick={() => {
                if (disabled) return;
                onSelectDate?.(c.ymd);
              }}
              disabled={disabled}
              aria-selected={isSelected}
            >
              {/* ✅ 상단 라인(고정 높이): 날짜 + 이모지를 한 줄로 "박제" */}
              <div className="cell-top" aria-hidden="true">
                <span className="day">{c.day}</span>
                <span className="emoji">{c.moodEmoji ?? ''}</span>
              </div>

              {/* ✅ DOT 영역(고정 높이): 2줄까지만 보이게 */}
              <div className="cell-dots" aria-hidden="true">
                {c.dots.map((d) => (
                  <span key={d.key} className="pill">
                    <span className="dot" style={{ background: d.color }} />
                    <span className="count">{d.count}</span>
                  </span>
                ))}
                {c.more > 0 && (
                  <span className="pill more">
                    <span className="moreTxt">+{c.more}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .cal-wrap {
          width: 100%;
          border-radius: 18px;
        }

        .cal-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 6px 0 10px;
        }

        .cal-title {
          font-size: 20px;
          font-weight: 900;
          color: #2a2451;
          letter-spacing: -0.2px;
          min-width: 140px;
          text-align: center;
        }

        .cal-nav {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(167, 139, 250, 0.35);
          background: rgba(255, 255, 255, 0.75);
          color: #6d28d9;
          font-size: 22px;
          font-weight: 900;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .cal-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
          padding: 6px 6px 10px;
        }

        .cal-week-item {
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          color: rgba(123, 97, 255, 0.9);
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          padding: 0 6px 6px;
        }

        .cal-cell {
          position: relative;
          height: 64px;
          border-radius: 16px;
          border: 1px solid rgba(167, 139, 250, 0.28);
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 10px 22px rgba(124, 58, 237, 0.08);

          padding: 10px 10px 8px;
          text-align: left;
          cursor: pointer;
          overflow: hidden;

          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cal-cell.out {
          opacity: 0.55;
        }

        .cal-cell.today {
          border-color: rgba(236, 72, 153, 0.45);
          box-shadow: 0 12px 26px rgba(236, 72, 153, 0.12);
        }

        .cal-cell.sel {
          border: 2px solid rgba(167, 139, 250, 0.9);
          box-shadow: 0 16px 30px rgba(124, 58, 237, 0.16);
        }

        /* ✅ 상단 라인 고정: 이 줄 때문에 "들쑥날쑥"이 사라짐 */
        .cell-top {
          height: 18px; /* 고정 */
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          padding-left: 2px;
        }

        .cell-top .day {
          font-size: 16px;
          font-weight: 900;
          color: #1f1747;
          line-height: 1;
          letter-spacing: -0.2px;
        }

        .cell-top .emoji {
          width: 18px; /* 고정 폭 */
          height: 18px;
          display: grid;
          place-items: center;
          font-size: 16px;
          line-height: 1;
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.08));
        }

        /* ✅ DOT 영역 고정(2줄) */
        .cell-dots {
          height: 44px; /* 18px*2 + gap 여유 */
          display: grid;
          grid-template-columns: max-content;
          grid-auto-rows: 18px;
          row-gap: 6px;
          align-content: start;
          justify-content: start;
          overflow: hidden;
        }

        .pill {
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          padding: 0 8px;
          width: fit-content;

          border: 1px solid rgba(167, 139, 250, 0.25);
          background: rgba(240, 244, 255, 0.95);
          box-shadow: 0 10px 18px rgba(59, 130, 246, 0.08);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: 0 0 8px;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
        }

        .count {
          font-size: 12px;
          font-weight: 900;
          color: #2a2451;
          line-height: 1;
        }

        .more {
          background: rgba(255, 255, 255, 0.78);
          border-style: dashed;
        }
        .moreTxt {
          font-size: 12px;
          font-weight: 900;
          color: #7c3aed;
          line-height: 1;
        }

        @media (max-width: 430px) {
          .cal-grid {
            gap: 10px;
          }
          .cal-cell {
            height: 62px;
          }
          .cal-title {
            font-size: 18px;
          }
          .cell-dots {
            height: 42px;
            row-gap: 6px;
          }
        }
      `}</style>
    </section>
  );
}
