'use client';

type DayPoint = {
  date: string;          // 'YYYY-MM-DD'
  contractCount: number; // 계약 건수
  amount?: number;       // 금액(선택)
};

function dLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  return day;
}

export default function MonthlyBarGraph({
  title = '월간 실적 그래프',
  data,
}: {
  title?: string;
  data: DayPoint[];
}) {
  const max = Math.max(1, ...data.map(v => v.contractCount || 0));

  return (
    <section className="mgCard">
      <div className="mgTop">
        <div className="mgTitle">{title}</div>
        <div className="mgHint">가로 스크롤로 한 달 전체를 한눈에</div>
      </div>

      <div className="mgScroll">
        {data.map((v) => {
          const h = Math.round((Math.max(0, v.contractCount) / max) * 110);
          return (
            <div key={v.date} className="mgCol">
              <div className="mgBarWrap">
                <div className="mgBar" style={{ height: `${h}px` }} />
              </div>
              <div className="mgNum">{v.contractCount || 0}</div>
              <div className="mgDay">{dLabel(v.date)}</div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .mgCard{
          background:rgba(255,255,255,0.92);
          border:1px solid rgba(60,20,90,0.14);
          border-radius:22px;
          box-shadow:0 18px 40px rgba(40,10,70,0.12);
          padding:16px 16px 12px;
        }
        .mgTop{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
        .mgTitle{ font-size:18px; font-weight:950; letter-spacing:-0.4px; color:#2a1236; }
        .mgHint{ font-size:12px; font-weight:800; opacity:0.7; color:#2a1236; }

        .mgScroll{
          margin-top:12px;
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:10px 6px 4px;
        }
        .mgCol{ min-width:34px; display:flex; flex-direction:column; align-items:center; }
        .mgBarWrap{
          width:22px;
          height:120px;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          background:rgba(240,235,255,0.7);
          border:1px solid rgba(130,70,180,0.18);
          border-radius:14px;
          padding:6px 0;
        }
        .mgBar{
          width:14px;
          border-radius:12px;
          background:linear-gradient(180deg, rgba(255,90,170,0.95), rgba(130,70,255,0.9));
          box-shadow:0 10px 18px rgba(160,60,255,0.22);
        }
        .mgNum{ margin-top:6px; font-size:12px; font-weight:950; color:#2a1236; }
        .mgDay{ margin-top:2px; font-size:11px; font-weight:900; opacity:0.7; color:#2a1236; }
      `}</style>
    </section>
  );
}
