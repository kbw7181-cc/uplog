// src/components/GrowthGraph.tsx
'use client';

import React from 'react';

export type GrowthDay = {
  date: string; // YYYY-MM-DD
  rate: number; // 0 ~ 1 (0 = 기록 없음, 1 = 기록 있음)
};

type Props = {
  monthLabel: string;
  days: GrowthDay[];
};

export default function GrowthGraph({ monthLabel, days }: Props) {
  if (!days || days.length === 0) {
    return null;
  }

  return (
    <div className="gg-root">
      <div className="gg-header">
        <div className="gg-title">성장 그래프</div>
        <div className="gg-month">{monthLabel}</div>
      </div>
      <div className="gg-sub">중요한 건 빈 날을 줄여가는 것입니다.</div>

      <div className="gg-legend">
        <span className="gg-dot gg-dot-full" /> 기록 있음
        <span className="gg-dot gg-dot-empty" /> 빈 날
      </div>

      <div className="gg-grid">
        {days.map((d) => {
          const dateObj = new Date(d.date);
          const dayNum = dateObj.getDate();
          const cls =
            d.rate >= 1
              ? 'gg-cell gg-cell-full'
              : d.rate > 0
              ? 'gg-cell gg-cell-half'
              : 'gg-cell gg-cell-empty';

          return (
            <div key={d.date} className={cls}>
              {dayNum}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .gg-root {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          color: #f6ecff;
        }

        .gg-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .gg-title {
          font-weight: 700;
          font-size: 12px;
        }

        .gg-month {
          font-size: 11px;
          color: #c5b7ff;
        }

        .gg-sub {
          font-size: 11px;
          color: #d8cfff;
        }

        .gg-legend {
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          color: #b9a9ff;
        }

        .gg-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }
        .gg-dot-full {
          background: linear-gradient(135deg, #ff9ed8, #ff73b5);
        }
        .gg-dot-empty {
          background: #2c193f;
        }

        .gg-grid {
          margin-top: 4px;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 4px;
        }

        .gg-cell {
          height: 22px;
          border-radius: 8px;
          text-align: center;
          line-height: 22px;
          font-size: 11px;
          font-weight: 600;
        }

        .gg-cell-empty {
          background: #1d0f30;
          color: #5f4f86;
        }

        .gg-cell-half {
          background: linear-gradient(135deg, #5f4f86, #8b6bff);
          color: #fef5ff;
        }

        .gg-cell-full {
          background: linear-gradient(135deg, #ff9ed8, #ff73b5);
          color: #ffffff;
          box-shadow: 0 0 8px rgba(255, 132, 209, 0.7);
        }

        @media (max-width: 640px) {
          .gg-root {
            font-size: 10px;
          }
          .gg-cell {
            height: 20px;
            line-height: 20px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
