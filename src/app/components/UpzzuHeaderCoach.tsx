// src/app/components/UpzzuHeaderCoach.tsx
'use client';

import { useMemo, useState } from 'react';

export default function UpzzuHeaderCoach({
  mascotSrc,
  text,
  tag = '오늘의 U P 한마디',
  sizePx = 150,
}: {
  mascotSrc: string;
  text: string;
  tag?: string;
  sizePx?: number;
}) {
  const [imgOk, setImgOk] = useState(true);

  const safeText = useMemo(() => (text || '').trim(), [text]);

  return (
    <div className="coachWrap">
      {/* ✅ 말풍선: 왼쪽 */}
      <div className="bubble">
        <div className="tagPill">
          <span className="spark">✨</span>
          {tag}
        </div>

        <div className="bubbleText">{safeText}</div>

        {/* 꼬리 */}
        <div className="tail" />
      </div>

      {/* ✅ 마스코트: 오른쪽 둥둥 */}
      <div className="mascotSlot" style={{ width: sizePx, height: sizePx }}>
        {imgOk ? (
          <img
            src={mascotSrc}
            alt="upzzu"
            className="mascot"
            style={{ width: sizePx, height: sizePx }}
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="mascotFallback" style={{ width: sizePx, height: sizePx }}>
            UP
          </div>
        )}
      </div>

      <style jsx>{`
        .coachWrap{
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          overflow: visible;
        }

        .bubble{
          position: relative;
          flex: 1;
          min-width: 0;
          padding: 14px 16px 16px;
          border-radius: 22px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 18px 36px rgba(0,0,0,0.22);
          backdrop-filter: blur(10px);
        }

        /* ✅ ‘오늘의 U P 한마디’ 핑크 라운드 효과 */
        .tagPill{
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: -0.01em;
          color: #ffffff;
          background: linear-gradient(135deg, rgba(255,120,196,0.95), rgba(164,88,255,0.95));
          box-shadow:
            0 10px 18px rgba(0,0,0,0.22),
            0 0 0 1px rgba(255,255,255,0.12) inset;
        }
        .spark{ filter: drop-shadow(0 6px 10px rgba(0,0,0,0.25)); }

        .bubbleText{
          margin-top: 10px;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.45;
          color: #ffffff;
          text-shadow: 0 8px 16px rgba(0,0,0,0.22);
          word-break: keep-all;
        }

        /* 말풍선 꼬리: 왼쪽 아래 */
        .tail{
          position: absolute;
          left: 18px;
          bottom: -10px;
          width: 18px;
          height: 18px;
          background: rgba(255,255,255,0.14);
          border-left: 1px solid rgba(255,255,255,0.22);
          border-bottom: 1px solid rgba(255,255,255,0.22);
          transform: rotate(45deg);
          border-radius: 4px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }

        .mascotSlot{
          position: relative;
          display: grid;
          place-items: end;
          flex: 0 0 auto;
          overflow: visible;
        }

        .mascot{
          object-fit: contain;
          transform-origin: 50% 100%;
          animation: floaty 2.8s ease-in-out infinite;
          filter: drop-shadow(0 18px 22px rgba(0,0,0,0.35));
          will-change: transform;
        }

        .mascotFallback{
          display: grid;
          place-items: center;
          border-radius: 26px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff;
          font-weight: 900;
          box-shadow: 0 18px 36px rgba(0,0,0,0.22);
        }

        @keyframes floaty{
          0%{ transform: translateY(0px) rotate(-1deg) scale(1); }
          50%{ transform: translateY(-10px) rotate(1deg) scale(1.01); }
          100%{ transform: translateY(0px) rotate(-1deg) scale(1); }
        }

        @media (max-width: 700px){
          .coachWrap{ align-items: flex-start; }
          .bubbleText{ font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
