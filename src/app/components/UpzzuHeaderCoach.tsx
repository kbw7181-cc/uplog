'use client';

type Props = {
  mascotSrc: string;
  text: string;
  tag?: string;
  sizePx?: number; // home에서 150~170 추천
};

export default function UpzzuHeaderCoach({
  mascotSrc,
  text,
  tag = '오늘의 U P 한마디',
  sizePx = 150,
}: Props) {
  // ✅ 너무 커지면 자동 상한/하한 (화면 밖 탈출 방지)
  const safeSize = Math.max(110, Math.min(sizePx, 170));

  return (
    <div className="upzzu-wrap" style={{ ['--upzzuSize' as any]: `${safeSize}px` }}>
      {/* 말풍선 */}
      <div className="upzzu-bubble">
        <div className="upzzu-tag">{tag}</div>
        <div className="upzzu-text">{text}</div>

        {/* ❌ 꼬리 완전 제거 (대표님 요청) */}
        {/* <div className="upzzu-tail" /> */}
      </div>

      {/* ✅ 마스코트: 박스는 고정 / 이미지만 점프 */}
      <div className="upzzu-mascotBox" aria-label="업쮸 마스코트">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="upzzu-mascotImg" src={mascotSrc} alt="업쮸" />
      </div>

      <style jsx>{`
        .upzzu-wrap {
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          overflow: visible;
          position: relative;
        }

        .upzzu-bubble {
          position: relative;
          flex: 1;
          z-index: 5;
          background: rgba(255, 255, 255, 0.98);
          border-radius: 20px;
          padding: 14px 16px;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.75);
          min-height: 92px;
          overflow: visible;
        }

        .upzzu-tag {
          display: inline-block;
          margin-bottom: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 900;
          border-radius: 999px;
          color: #ffffff;
          background: linear-gradient(135deg, #f472b6, #a855f7);
          box-shadow: 0 8px 18px rgba(168, 85, 247, 0.25);
        }

        .upzzu-text {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.48;
          color: #2b164f;
          letter-spacing: -0.2px;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: keep-all;
        }

        /* ❌ 꼬리 CSS도 같이 무력화 (혹시 남아있어도 안 보이게) */
        .upzzu-tail {
          display: none !important;
        }

        .upzzu-mascotBox {
          flex-shrink: 0;
          width: var(--upzzuSize);
          height: var(--upzzuSize);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
          z-index: 3;
          overflow: visible;
          padding-top: 18px;
          max-width: 42vw;
          max-height: 42vw;
        }

        .upzzu-mascotImg {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
          animation: upzzuJump 1.25s ease-in-out infinite;
          will-change: transform;
          backface-visibility: hidden;
          transform: translateY(0) scale(1);
        }

        @keyframes upzzuJump {
          0% {
            transform: translateY(0) scale(1);
          }
          18% {
            transform: translateY(-14px) scale(1.01);
          }
          36% {
            transform: translateY(0) scale(1);
          }
          60% {
            transform: translateY(-8px) scale(1.005);
          }
          80% {
            transform: translateY(0) scale(1);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .upzzu-wrap {
            flex-direction: column;
            align-items: flex-end;
          }
          .upzzu-bubble {
            width: 100%;
          }
          .upzzu-text {
            font-size: 15px;
          }
          .upzzu-mascotBox {
            width: min(var(--upzzuSize), 150px);
            height: min(var(--upzzuSize), 150px);
          }
        }
      `}</style>
    </div>
  );
}
