'use client';

import React, { useMemo } from 'react';

/* =========================
   Types
========================= */

export type HomeMenuItem = { label: string; href: string };

export type WeatherSlot = {
  time: string; // "09:00"
  temp: number; // 12.3
  desc: string; // "맑음"
};

export type ScheduleRow = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null;
  category?: string | null;
  customer_id?: string | null;
};

export type DaySummary = { date: string; count: number };

export type LatestGoals = {
  day_goal: string | null;
  week_goal: string | null;
  month_goal: string | null;
};

export type DailyTask = {
  id: string;
  date: string;
  title: string;
  done: boolean;
};

export type ContractDay = {
  date: string;
  newCount: number;
  contract1: number;
  contract2: number;
  contract3: number;
};

/* =========================
   Utils
========================= */

export function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function getMonthLabel(base: Date) {
  const y = base.getFullYear();
  const m = base.getMonth() + 1;
  return `${y}년 ${m}월`;
}

export function getMoodEmoji(mood: string) {
  const s = String(mood || '').trim();
  if (!s) return '🙂';
  if (s.includes('최고') || s.includes('행복') || s.includes('굿')) return '😄';
  if (s.includes('좋아') || s.includes('괜찮')) return '🙂';
  if (s.includes('피곤') || s.includes('힘')) return '😮‍💨';
  if (s.includes('짜증') || s.includes('화')) return '😠';
  if (s.includes('우울') || s.includes('슬')) return '😢';
  return '🙂';
}

export function getScheduleCategoryMeta(catRaw?: string | null) {
  const c = String(catRaw || '').toLowerCase();
  if (c.includes('계약')) return { label: '계약', dot: '#ff3b6b' };
  if (c.includes('상담')) return { label: '상담', dot: '#7b3bbf' };
  if (c.includes('방문')) return { label: '방문', dot: '#3b82f6' };
  if (c.includes('회의')) return { label: '회의', dot: '#10b981' };
  if (c.includes('클레임') || c.includes('as')) return { label: '대응', dot: '#f59e0b' };
  return { label: catRaw || '일정', dot: '#9ca3af' };
}

/* =========================
   Small UI atoms
========================= */

function Card({
  children,
  title,
  right,
}: {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className="hpCard">
      {(title || right) && (
        <div className="hpCardHead">
          <div className="hpCardTitle">{title}</div>
          <div className="hpCardRight">{right}</div>
        </div>
      )}
      <div className="hpCardBody">{children}</div>

      <style jsx>{`
        .hpCard {
          border-radius: 18px;
          border: 1px solid rgba(120, 60, 190, 0.14);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .hpCardHead {
          padding: 12px 14px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .hpCardTitle {
          font-weight: 950;
          color: #2a0f3a;
          letter-spacing: -0.2px;
        }
        .hpCardBody {
          padding: 12px 14px;
        }
      `}</style>
    </section>
  );
}

/* =========================
   Components
========================= */

export function AdminEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ marginTop: 10 }}>
      <button className="hpAdminBtn" type="button" onClick={onClick}>
        관리자
      </button>

      <style jsx>{`
        .hpAdminBtn {
          width: 100%;
          padding: 11px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 80, 170, 0.32);
          background: linear-gradient(135deg, rgba(255, 80, 170, 0.14), rgba(123, 59, 191, 0.12));
          font-weight: 950;
          color: #5b1a5b;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/** ✅ 메뉴: 모바일 3열 2행 고정 지원 */
export function HomeMenuRow({
  items,
  onGo,
  rows = 2,
  cols = 3,
}: {
  items: HomeMenuItem[];
  onGo: (href: string) => void;
  rows?: number;
  cols?: number;
}) {
  const gridCols = Math.max(1, cols);

  return (
    <div className="hpMenuWrap">
      <div className="hpMenuGrid" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <button key={it.href} type="button" className="hpMenuBtn" onClick={() => onGo(it.href)}>
            {it.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        .hpMenuWrap {
          margin-top: 12px;
        }
        .hpMenuGrid {
          display: grid;
          gap: 10px;
        }
        .hpMenuBtn {
          padding: 12px 10px;
          border-radius: 16px;
          border: 1px solid rgba(123, 59, 191, 0.18);
          background: rgba(255, 255, 255, 0.85);
          font-weight: 950;
          color: #2a0f3a;
          cursor: pointer;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

/** ✅ 헤더블록: (page.tsx에서 내려주는 props 그대로 받기) */
export function HeaderBlock({
  loading,
  nickname,
  email,
  avatarSrc,
  badgeOpen,
  setBadgeOpen,
  myBadges,
  badgeIcon,
  bubbleLines,
  moodEmoji,
  todayLabel,
}: {
  loading: boolean;
  nickname: string;
  email: string | null;
  avatarSrc: string;
  badgeOpen: boolean;
  setBadgeOpen: (v: boolean) => void;
  myBadges: { code: string; name: string }[];
  badgeIcon: (code: string) => string;
  bubbleLines: string[];
  moodEmoji: string;
  todayLabel: string;
}) {
  return (
    <div className="hpHeader">
      <div className="hpProfileCard">
        <div className="hpMeRow">
          <div className="hpAvatar">
            <img
              src={avatarSrc || '/gogo.png'}
              alt=""
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.onerror = null;
                img.src = '/gogo.png';
              }}
            />
          </div>

          <div className="hpMeInfo">
            <div className="hpMeName">
              {nickname} <span className="hpMood">{moodEmoji}</span>
            </div>
            <div className="hpMeSub">{email ? email : '오늘도 기록으로 정리해봐요'}</div>
          </div>

          <button type="button" className="hpBadgeBtn" onClick={() => setBadgeOpen(!badgeOpen)}>
            배지
          </button>
        </div>

        {badgeOpen && (
          <div className="hpBadges">
            {myBadges.length ? (
              myBadges.map((b, idx) => (
                <div key={`${b.code}-${idx}`} className="hpBadgeChip">
                  <span className="hpBadgeIcon">{badgeIcon(b.code)}</span>
                  <span className="hpBadgeName">{b.name || b.code}</span>
                </div>
              ))
            ) : (
              <div className="hpBadgeEmpty">이번 달 수상 배지가 없어요</div>
            )}
          </div>
        )}
      </div>

      <div className="hpHeroRow">
        <div className="hpBubble">
          <div className="hpBubbleTitle">{todayLabel} 업쮸의 한마디</div>
          <div className="hpBubbleBody">
            {loading ? (
              <div className="hpBubbleLoading">불러오는 중…</div>
            ) : (
              bubbleLines.map((ln, i) => (
                <div key={i} className="hpLine">
                  {ln}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hpMascot" aria-hidden="true">
          <img src="/upzzu1.png" alt="" />
        </div>
      </div>

      <style jsx>{`
        .hpHeader {
          display: grid;
          gap: 12px;
        }
        .hpProfileCard {
          border-radius: 18px;
          border: 2px solid rgba(255, 80, 170, 0.16);
          background: linear-gradient(135deg, rgba(255, 80, 170, 0.14), rgba(123, 59, 191, 0.12));
          padding: 12px;
        }
        .hpMeRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hpAvatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          overflow: hidden;
          flex: 0 0 auto;
          border: 1px solid rgba(123, 59, 191, 0.22);
          background: rgba(255, 255, 255, 0.9);
        }
        .hpAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hpMeInfo {
          min-width: 0;
          flex: 1;
        }
        .hpMeName {
          font-weight: 950;
          color: #2a0f3a;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hpMood {
          font-size: 18px;
        }
        .hpMeSub {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(42, 15, 58, 0.72);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hpBadgeBtn {
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(123, 59, 191, 0.25);
          background: rgba(255, 255, 255, 0.8);
          font-weight: 950;
          color: #5b1a5b;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .hpBadges {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hpBadgeChip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(60, 30, 90, 0.14);
          background: rgba(255, 255, 255, 0.72);
          font-weight: 900;
          color: #2a0f3a;
          font-size: 12px;
        }
        .hpBadgeEmpty {
          font-size: 12px;
          font-weight: 850;
          color: rgba(42, 15, 58, 0.72);
        }

        .hpHeroRow {
          display: grid;
          grid-template-columns: 1fr 190px;
          gap: 12px;
          align-items: stretch;
        }
        .hpBubble {
          border-radius: 18px;
          border: 1px solid rgba(123, 59, 191, 0.14);
          background: rgba(255, 255, 255, 0.82);
          padding: 12px 12px;
          min-height: 150px;
        }
        .hpBubbleTitle {
          font-weight: 950;
          color: #5b1a5b;
          margin-bottom: 8px;
          letter-spacing: -0.2px;
        }
        .hpBubbleBody {
          font-weight: 900;
          color: #2a0f3a;
          line-height: 1.35;
          word-break: keep-all;
        }
        .hpLine {
          margin: 2px 0;
        }
        .hpBubbleLoading {
          font-size: 13px;
          opacity: 0.75;
        }
        .hpMascot {
          border-radius: 18px;
          border: 1px solid rgba(123, 59, 191, 0.14);
          background: rgba(255, 255, 255, 0.65);
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .hpMascot img {
          width: 170px;
          height: auto;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        @media (max-width: 720px) {
          .hpHeroRow {
            grid-template-columns: 1fr;
          }
          .hpMascot {
            height: 210px;
          }
        }
      `}</style>
    </div>
  );
}

/** ✅ 날씨: props 이름 label/slots 로 고정 */
export function WeatherSection({ label, slots }: { label: string; slots: WeatherSlot[] }) {
  return (
    <Card title="오늘 날씨" right={<span style={{ fontWeight: 900, color: '#6b1140' }}>{label}</span>}>
      {slots.length ? (
        <div className="hpWeather">
          {slots.map((s, idx) => (
            <div key={idx} className="hpWItem">
              <div className="hpWTime">{s.time}</div>
              <div className="hpWTemp">{Math.round(s.temp)}°</div>
              <div className="hpWDesc">{s.desc}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hpEmpty">날씨 정보를 불러오지 못했어요</div>
      )}

      <style jsx>{`
        .hpWeather {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }
        .hpWItem {
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 8px;
          text-align: center;
        }
        .hpWTime {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.75;
        }
        .hpWTemp {
          margin-top: 4px;
          font-size: 16px;
          font-weight: 950;
          color: #2a0f3a;
        }
        .hpWDesc {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 850;
          opacity: 0.75;
        }
        .hpEmpty {
          font-weight: 850;
          opacity: 0.7;
        }

        @media (max-width: 720px) {
          .hpWeather {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </Card>
  );
}

/** ✅ 요약: page.tsx에서 넘기는 props 이름 그대로 */
export function SummarySection({
  latestGoals,
  todayTasks,
  selectedDate,
}: {
  latestGoals: LatestGoals | null;
  todayTasks: DailyTask[];
  selectedDate: string;
}) {
  return (
    <Card title="오늘 요약">
      <div className="hpSumGrid">
        <div className="hpSumBox">
          <div className="hpSumLabel">선택 날짜</div>
          <div className="hpSumValue">{selectedDate}</div>
        </div>

        <div className="hpSumBox">
          <div className="hpSumLabel">오늘 목표</div>
          <div className="hpSumValue">{latestGoals?.day_goal || '—'}</div>
        </div>

        <div className="hpSumBox">
          <div className="hpSumLabel">이번 주 목표</div>
          <div className="hpSumValue">{latestGoals?.week_goal || '—'}</div>
        </div>

        <div className="hpSumBox">
          <div className="hpSumLabel">이번 달 목표</div>
          <div className="hpSumValue">{latestGoals?.month_goal || '—'}</div>
        </div>
      </div>

      <div className="hpTasks">
        <div className="hpTasksTitle">오늘 할 일</div>
        {todayTasks.length ? (
          <ul className="hpTaskList">
            {todayTasks.slice(0, 6).map((t) => (
              <li key={t.id} className="hpTaskItem">
                <span className="hpChk">{t.done ? '✅' : '⬜'}</span>
                <span className="hpTaskTxt">{t.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="hpEmpty">오늘 할 일이 아직 없어요</div>
        )}
      </div>

      <style jsx>{`
        .hpSumGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .hpSumBox {
          border-radius: 16px;
          border: 1px solid rgba(60, 30, 90, 0.12);
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 10px;
        }
        .hpSumLabel {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.7;
        }
        .hpSumValue {
          margin-top: 6px;
          font-weight: 950;
          color: #2a0f3a;
          letter-spacing: -0.2px;
          word-break: keep-all;
        }
        .hpTasks {
          margin-top: 12px;
        }
        .hpTasksTitle {
          font-weight: 950;
          color: #2a0f3a;
          margin-bottom: 8px;
        }
        .hpTaskList {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 6px;
        }
        .hpTaskItem {
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 10px;
        }
        .hpChk {
          flex: 0 0 auto;
        }
        .hpTaskTxt {
          min-width: 0;
          flex: 1;
          font-weight: 900;
          color: #2a0f3a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hpEmpty {
          font-weight: 850;
          opacity: 0.7;
        }

        @media (max-width: 720px) {
          .hpSumGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Card>
  );
}

/** ✅ 달력: page.tsx props 이름 그대로(여기가 빨간줄의 핵심) */
export function CalendarSection({
  month,
  monthLabel,
  onPrev,
  onNext,
  selectedDate,
  onSelectDate,
  scheduleCountByDate,
  contractByDate,
  schedules,
  getScheduleCategoryMeta,
  formatDate,
}: {
  month: Date;
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  scheduleCountByDate: Record<string, number>;
  contractByDate: Record<string, ContractDay>;
  schedules: ScheduleRow[];
  getScheduleCategoryMeta: (cat?: string | null) => { label: string; dot: string };
  formatDate: (d: Date) => string;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();

  const days = useMemo(() => {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startDow = first.getDay(); // 0-6
    const total = last.getDate();

    const arr: Array<{ key: string; ymd: string | null; day: number | null }> = [];
    for (let i = 0; i < startDow; i++) arr.push({ key: `e-${i}`, ymd: null, day: null });
    for (let d = 1; d <= total; d++) {
      const ymd = formatDate(new Date(y, m, d));
      arr.push({ key: ymd, ymd, day: d });
    }
    while (arr.length % 7 !== 0) arr.push({ key: `t-${arr.length}`, ymd: null, day: null });
    return arr;
  }, [y, m, formatDate]);

  return (
    <Card
      title="달력"
      right={
        <div className="hpCalNav">
          <button type="button" className="hpCalBtn" onClick={onPrev}>
            ◀
          </button>
          <div className="hpCalLabel">{monthLabel}</div>
          <button type="button" className="hpCalBtn" onClick={onNext}>
            ▶
          </button>
        </div>
      }
    >
      <div className="hpCalGrid">
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <div key={w} className="hpDow">
            {w}
          </div>
        ))}

        {days.map((d) => {
          const isSel = d.ymd && d.ymd === selectedDate;
          const sc = d.ymd ? Number(scheduleCountByDate[d.ymd] || 0) : 0;
          const cd = d.ymd ? contractByDate[d.ymd] : undefined;

          const hasContract =
            !!cd && (cd.newCount + cd.contract1 + cd.contract2 + cd.contract3 > 0);

          return (
            <button
              key={d.key}
              type="button"
              className={`hpDay ${isSel ? 'sel' : ''} ${d.ymd ? '' : 'empty'}`}
              onClick={() => d.ymd && onSelectDate(d.ymd)}
              disabled={!d.ymd}
            >
              <div className="hpDayTop">
                <span className="hpDayNum">{d.day ?? ''}</span>

                {/* ✅ 스케줄 숫자 pill (오른쪽 튐 방지: 고정 폭) */}
                {d.ymd && sc > 0 ? <span className="hpPill">{sc}</span> : <span className="hpPill ghost" />}
              </div>

              {/* ✅ 계약 DOT/숫자 (테두리/링 없이, 밀림 방지) */}
              {d.ymd && hasContract ? (
                <div className="hpContracts">
                  {cd?.newCount ? <span className="c new">{cd.newCount}</span> : null}
                  {cd?.contract1 ? <span className="c c1">{cd.contract1}</span> : null}
                  {cd?.contract2 ? <span className="c c2">{cd.contract2}</span> : null}
                  {cd?.contract3 ? <span className="c c3">{cd.contract3}</span> : null}
                </div>
              ) : (
                <div className="hpContracts" />
              )}

              {/* ✅ 아주 작은 DOT(카테고리) */}
              {d.ymd && sc > 0 ? (
                <div className="hpDots" aria-hidden="true">
                  {schedules
                    .filter((x) => x.schedule_date === d.ymd)
                    .slice(0, 4)
                    .map((x) => {
                      const meta = getScheduleCategoryMeta(x.category);
                      return <span key={x.id} className="dot" style={{ background: meta.dot }} />;
                    })}
                </div>
              ) : (
                <div className="hpDots" />
              )}
            </button>
          );
        })}
      </div>

      {/* ✅ 선택일 스케줄 리스트 */}
      <div className="hpSel">
        <div className="hpSelTitle">선택한 날짜 일정</div>
        {schedules.length ? (
          <div className="hpSelList">
            {schedules.slice(0, 12).map((s) => {
              const meta = getScheduleCategoryMeta(s.category);
              return (
                <div key={s.id} className="hpSelItem">
                  <span className="hpSelDot" style={{ background: meta.dot }} />
                  <div className="hpSelMain">
                    <div className="hpSelTop">
                      <span className="hpSelCat">{meta.label}</span>
                      <span className="hpSelTime">{s.schedule_time || ''}</span>
                    </div>
                    <div className="hpSelTitle2">{s.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hpEmpty">선택한 날짜에 일정이 없어요</div>
        )}
      </div>

      <style jsx>{`
        .hpCalNav {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hpCalBtn {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(60, 30, 90, 0.12);
          background: rgba(255, 255, 255, 0.8);
          font-weight: 950;
          cursor: pointer;
        }
        .hpCalLabel {
          font-weight: 950;
          color: #2a0f3a;
          letter-spacing: -0.2px;
          min-width: 120px;
          text-align: center;
        }

        .hpCalGrid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }
        .hpDow {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.7;
          text-align: center;
        }
        .hpDay {
          border-radius: 16px;
          border: 1px solid rgba(60, 30, 90, 0.12);
          background: rgba(255, 255, 255, 0.72);
          padding: 8px 8px 10px;
          min-height: 74px;
          text-align: left;
          cursor: pointer;
        }
        .hpDay.sel {
          border-color: rgba(255, 80, 170, 0.36);
          box-shadow: 0 14px 26px rgba(255, 80, 170, 0.12);
        }
        .hpDay.empty {
          opacity: 0.35;
          cursor: default;
        }

        .hpDayTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .hpDayNum {
          font-weight: 950;
          color: #2a0f3a;
        }
        .hpPill {
          width: 26px; /* ✅ 오른쪽 튐 방지 핵심 */
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(60, 30, 90, 0.14);
          background: rgba(255, 255, 255, 0.8);
          font-weight: 950;
          font-size: 12px;
          color: #2a0f3a;
          flex: 0 0 auto;
        }
        .hpPill.ghost {
          border-color: transparent;
          background: transparent;
        }

        .hpContracts {
          margin-top: 6px;
          display: flex;
          gap: 6px;
          min-height: 18px;
        }
        .c {
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 950;
          color: #2a0f3a;
          background: rgba(0, 0, 0, 0.06);
        }
        .c.new {
          background: rgba(255, 80, 170, 0.18);
        }
        .c.c1 {
          background: rgba(239, 68, 68, 0.18);
        }
        .c.c2 {
          background: rgba(245, 158, 11, 0.18);
        }
        .c.c3 {
          background: rgba(34, 197, 94, 0.18);
        }

        .hpDots {
          margin-top: 6px;
          display: flex;
          gap: 5px;
          min-height: 10px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
        }

        .hpSel {
          margin-top: 14px;
        }
        .hpSelTitle {
          font-weight: 950;
          color: #2a0f3a;
          margin-bottom: 8px;
        }
        .hpSelList {
          display: grid;
          gap: 8px;
        }
        .hpSelItem {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 10px;
        }
        .hpSelDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          margin-top: 4px;
          flex: 0 0 auto;
        }
        .hpSelMain {
          min-width: 0;
          flex: 1;
        }
        .hpSelTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .hpSelCat {
          font-size: 12px;
          font-weight: 950;
          opacity: 0.8;
        }
        .hpSelTime {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.7;
          flex: 0 0 auto;
        }
        .hpSelTitle2 {
          margin-top: 4px;
          font-weight: 900;
          color: #2a0f3a;
          word-break: keep-all;
        }
      `}</style>
    </Card>
  );
}
