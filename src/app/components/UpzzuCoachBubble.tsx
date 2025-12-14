'use client';

import { usePathname } from 'next/navigation';
import UpzzuMascot from './UpzzuMascot';

type UpzzuMood = 'happy' | 'cheer' | 'thinking' | 'sad' | 'wink' | 'crown';

export default function UpzzuCoachBubble({
  tag = '오늘의 U P 한마디',
  text,
}: {
  tag?: string;
  text: string;
}) {
  const pathname = usePathname();

  const mood: UpzzuMood =
    pathname.startsWith('/rebuttal') ? 'thinking' :
    pathname.startsWith('/my-up') ? 'crown' :
    pathname.startsWith('/customers') ? 'cheer' :
    pathname.startsWith('/sms-helper') ? 'wink' :
    pathname.startsWith('/community') ? 'happy' :
    'happy';

  return (
    <div className="row">
      <div className="bubble">
        <span className="tag">{tag}</span>
        <p className="text">{text}</p>
        {/* ✅ 꼬리: 항상 오른쪽(마스코트쪽) */}
        <span className="tail" />
      </div>

      <UpzzuMascot mood={mood} size={70} />

      <style jsx>{`
        .row{
          width: 100%;
          display:flex;
          align-items:center;
          gap:14px;
          margin-top: 16px;
        }

        .bubble{
          position: relative;
          flex: 1;
          background: rgba(255,255,255,0.97);
          border-radius: 18px;
          padding: 14px 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          border: 1px solid rgba(223, 202, 255, 0.9);
          min-height: 62px;
          display:flex;
          flex-direction:column;
          justify-content:center;
        }

        .tag{
          display:inline-flex;
          align-self:flex-start;
          font-size:11px;
          font-weight:900;
          color:#ff4fa3;
          background:#ffe6f3;
          padding:3px 10px;
          border-radius:999px;
          margin-bottom:6px;
        }

        .text{
          margin:0;
          font-size:15px;
          font-weight:700;
          color:#3b1d5a;
          line-height:1.55;
          word-break:break-word;
        }

        /* ✅ 꼬리: 오른쪽 고정 */
        .tail{
          position:absolute;
          top:50%;
          right:-7px;
          width:14px;
          height:14px;
          background: rgba(255,255,255,0.97);
          transform: translateY(-50%) rotate(45deg);
          border-right: 1px solid rgba(223, 202, 255, 0.9);
          border-bottom: 1px solid rgba(223, 202, 255, 0.9);
        }

        @media (max-width: 640px){
          .row{ gap:10px; }
          .bubble{ padding: 12px 14px; }
          .text{ font-size:14px; }
        }
      `}</style>
    </div>
  );
}
