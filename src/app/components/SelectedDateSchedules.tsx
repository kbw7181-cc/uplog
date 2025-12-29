'use client';

import { useMemo } from 'react';

export type SelectedScheduleItem = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null; // HH:mm
  category?: string | null;
  customer_id?: string | null; // 남아있어도 OK (안씀)
  customer_name?: string | null;
};

function pickTime(t?: string | null) {
  const v = (t || '').trim();
  if (!v) return '';
  if (v.length >= 5) return v.slice(0, 5);
  return v;
}

function catDotColor(cat?: string | null) {
  const c = (cat || '').trim();
  if (c.includes('근태')) return 'rgba(250,204,21,0.95)';
  if (c.includes('업무')) return 'rgba(59,130,246,0.95)';
  if (c.includes('포인트')) return 'rgba(244,114,182,0.95)';
  if (c.includes('상담')) return 'rgba(59,130,246,0.95)';
  if (c.includes('방문')) return 'rgba(16,185,129,0.95)';
  if (c.includes('회의')) return 'rgba(168,85,247,0.95)';
  if (c.includes('해피콜')) return 'rgba(244,114,182,0.95)';
  return 'rgba(148,163,184,0.95)';
}

export default function SelectedDateSchedules({
  items,
  emptyText = '선택한 날짜에 일정이 없어요.',
}: {
  items: SelectedScheduleItem[];
  emptyText?: string;
}) {
  const sorted = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => (pickTime(a.schedule_time) || '99:99').localeCompare(pickTime(b.schedule_time) || '99:99'));
    return arr;
  }, [items]);

  if (!sorted.length) {
    return (
      <div className="friends-empty" style={{ marginTop: 10 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((it) => {
        const time = pickTime(it.schedule_time);
        const dot = catDotColor(it.category);

        return (
          <div
            key={it.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 12px',
              borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(251,249,255,0.92))',
              border: '1px solid rgba(226,232,240,0.92)',
              boxShadow: '0 18px 34px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* 왼쪽 DOT + 시간/카테고리/타이틀 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: dot,
                  boxShadow: '0 0 0 4px rgba(15,23,42,0.06)',
                  flex: '0 0 auto',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ fontWeight: 950, color: '#2a1236', fontSize: 14, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                  {time ? `${time}` : '시간 없음'} {it.category ? `· ${it.category}` : ''}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontWeight: 900,
                    color: '#6f60b8',
                    fontSize: 13,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 520,
                  }}
                  title={it.title}
                >
                  {it.title}
                  {it.customer_name ? ` · ${it.customer_name}` : ''}
                </div>
              </div>
            </div>

            {/* ✅ 돋보기/상세보기 버튼 삭제 (요청대로 완전 제거) */}
          </div>
        );
      })}
    </div>
  );
}
