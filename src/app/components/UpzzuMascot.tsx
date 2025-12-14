'use client';

import { useMemo } from 'react';

type UpzzuMood = 'happy' | 'cheer' | 'thinking' | 'sad' | 'wink' | 'crown';

export default function UpzzuMascot({
  mood = 'happy',
  size = 70,
  motion = 'float', // float | bounce | nod
}: {
  mood?: UpzzuMood;
  size?: number;
  motion?: 'float' | 'bounce' | 'nod';
}) {
  const src = useMemo(() => {
    const map: Record<UpzzuMood, string> = {
      happy: '/assets/upzzu/happy.png',
      cheer: '/assets/upzzu/cheer.png',
      thinking: '/assets/upzzu/thinking.png',
      sad: '/assets/upzzu/sad.png',
      wink: '/assets/upzzu/wink.png',
      crown: '/assets/upzzu/crown.png',
    };
    return map[mood] || map.happy;
  }, [mood]);

  return (
    <div className={`upzzuRing ${motion}`} style={{ width: size, height: size }}>
      <img className="upzzuImg" src={src} alt="업쮸" />

      {/* 반짝이 */}
      <span className="spark s1" />
      <span className="spark s2" />
      <span className="spark s3" />

      <style jsx>{`
        .upzzuRing {
          position: relative;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.95);
          border: 3px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
          flex-shrink: 0;
          transform-origin: 50% 60%;
        }

        .upzzuImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform-origin: 50% 70%;
        }

        /* ✅ 모션 3종 */
        .float {
          animation: ringFloat 2.6s ease-in-out infinite;
        }
        .float .upzzuImg {
          animation: imgTilt 2.6s ease-in-out infinite;
        }

        .bounce {
          animation: ringBounce 1.35s ease-in-out infinite;
        }
        .bounce .upzzuImg {
          animation: imgPop 1.35s ease-in-out infinite;
        }

        .nod {
          animation: ringNod 2.0s ease-in-out infinite;
        }
        .nod .upzzuImg {
          animation: imgNod 2.0s ease-in-out infinite;
        }

        @keyframes ringFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        @keyframes imgTilt {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(-1.2deg) scale(1.015); }
          100% { transform: rotate(0deg) scale(1); }
        }

        @keyframes ringBounce {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes imgPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.03) rotate(0.8deg); }
          100% { transform: scale(1); }
        }

        @keyframes ringNod {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0px); }
        }
        @keyframes imgNod {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-1.4deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(1.4deg); }
          100% { transform: rotate(0deg); }
        }

        /* 반짝이 */
        .spark {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff 0, #ffd6ff 40%, rgba(255, 255, 255, 0) 70%);
          opacity: 0.9;
          animation: twinkle 1.8s ease-in-out infinite;
          pointer-events: none;
          filter: blur(0.1px);
        }
        .s1 { top: 10%; left: 12%; animation-delay: 0.1s; }
        .s2 { top: 16%; right: 10%; animation-delay: 0.7s; width: 12px; height: 12px; }
        .s3 { bottom: 14%; left: 16%; animation-delay: 1.1s; width: 8px; height: 8px; }

        @keyframes twinkle {
          0% { transform: scale(0.85); opacity: 0.55; }
          50% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
