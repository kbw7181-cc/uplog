'use client';

type Cat =
  | '근태-출근' | '근태-지각' | '근태-조퇴' | '근태-외출' | '근태-결근' | '근태-출장' | '근태-퇴근'
  | '업무-상담' | '업무-방문' | '업무-클레임' | '업무-A/S' | '업무-사은품' | '업무-회의' | '업무-교육' | '업무-기타';

export type CalItem = {
  date: string;          // YYYY-MM-DD
  category: Cat;
  title?: string;
  contractCount?: number; // ✅ 계약 n
};

const CAT_COLOR: Record<string, string> = {
  // 근태 (노랑/주황)
  '근태-출근': '#FFD54A',
  '근태-지각': '#FFB020',
  '근태-조퇴': '#FF8A3D',
  '근태-외출': '#FFC36B',
  '근태-결근': '#FF6B3D',
  '근태-출장': '#FFB86B',
  '근태-퇴근': '#FFE08A',

  // 업무 (초록/파랑)
  '업무-상담': '#2ED3A4',
  '업무-방문': '#33B7FF',
  '업무-클레임': '#2F7DFF',
  '업무-A/S': '#4BD37B',
  '업무-사은품': '#7AE582',
  '업무-회의': '#4B7BFF',
  '업무-교육': '#27C2FF',
  '업무-기타': '#B16CFF', // 포인트(퍼플)
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function monthStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthEnd(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

export default function UplogMonthCalendar({
  month,
  items,
  onPickDate,
}: {
  month: Date;          // 원하는 달(예: new Date())
  items: CalItem[];
  onPickDate?: (iso: string) => void;
}) {
  const start = monthStart(month);
  const end = monthEnd(month);

  // 달력 첫 칸(일요일 시작)
  const first = new Date(start);
  first.setDate(first.getDate() - first.getDay());

  const cells: Date[] = [];
  for (let i=0; i<42; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    cells.push(d);
  }

  const byDate = new Map<string, CalItem[]>();
  items.forEach(it => {
    const arr = byDate.get(it.date) || [];
    arr.push(it);
    byDate.set(it.date, arr);
  });

  return (
    <section className="calCard">
      <div className="calTop">
        <div className="calTitle">월간 캘린더</div>
        <div className="calSub">{start.getFullYear()}년 {start.getMonth()+1}월</div>
      </div>

      <div className="calGrid">
        {['일','월','화','수','목','금','토'].map(w => (
          <div key={w} className="calW">{w}</div>
        ))}

        {cells.map(d => {
          const iso = toISO(d);
          const inMonth = d.getMonth() === month.getMonth();
          const list = byDate.get(iso) || [];
          const contractSum = list.reduce((s, x) => s + (x.contractCount || 0), 0);

          return (
            <button
              key={iso}
              className={`calCell ${inMonth ? '' : 'dim'}`}
              onClick={() => onPickDate?.(iso)}
              type="button"
            >
              <div className="calDay">{d.getDate()}</div>

              {/* ✅ 계약 n 표기 */}
              {contractSum > 0 && (
                <div className="calContract">계약 {contractSum}</div>
              )}

              {/* ✅ 카테고리 점 표시 */}
              <div className="calDots">
                {list.slice(0, 4).map((it, idx) => (
                  <span
                    key={idx}
                    className="dot"
                    style={{ background: CAT_COLOR[it.category] || '#c4b5fd' }}
                    title={it.category}
                  />
                ))}
                {list.length > 4 && <span className="more">+{list.length-4}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .calCard{
          background:rgba(255,255,255,0.92);
          border:1px solid rgba(60,20,90,0.14);
          border-radius:22px;
          box-shadow:0 18px 40px rgba(40,10,70,0.12);
          padding:16px;
        }
        .calTop{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:10px; }
        .calTitle{ font-size:18px; font-weight:950; color:#2a1236; letter-spacing:-0.4px; }
        .calSub{ font-size:12px; font-weight:900; opacity:0.75; color:#2a1236; }

        .calGrid{
          display:grid;
          grid-template-columns:repeat(7, minmax(0, 1fr));
          gap:8px;
        }
        .calW{
          text-align:center;
          font-size:12px;
          font-weight:950;
          opacity:0.7;
          color:#2a1236;
          padding:2px 0 6px;
        }
        .calCell{
          min-height:86px; /* ✅ 목표/표시 공간 늘림 */
          border-radius:16px;
          border:1px solid rgba(120,60,180,0.14);
          background:rgba(245,242,255,0.72);
          padding:10px 10px 8px;
          text-align:left;
          cursor:pointer;
        }
        .calCell:hover{
          transform:translateY(-1px);
          background:rgba(255,255,255,0.75);
        }
        .calCell.dim{
          opacity:0.45;
        }
        .calDay{
          font-size:14px;
          font-weight:950;
          color:#2a1236;
        }
        .calContract{
          margin-top:6px;
          display:inline-block;
          font-size:11px;
          font-weight:950;
          color:#fff;
          padding:4px 8px;
          border-radius:999px;
          background:linear-gradient(180deg, rgba(255,90,170,0.95), rgba(130,70,255,0.9));
          box-shadow:0 10px 16px rgba(160,60,255,0.18);
        }
        .calDots{
          margin-top:8px;
          display:flex;
          align-items:center;
          gap:6px;
          flex-wrap:wrap;
        }
        .dot{
          width:10px;
          height:10px;
          border-radius:999px;
          box-shadow:0 6px 12px rgba(20,10,40,0.12);
        }
        .more{
          font-size:11px;
          font-weight:950;
          opacity:0.7;
          color:#2a1236;
        }
      `}</style>
    </section>
  );
}
