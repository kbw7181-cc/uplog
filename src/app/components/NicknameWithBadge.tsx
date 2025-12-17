'use client';

import { useMemo } from 'react';

type Props = {
  nickname: string | null | undefined;
  badges?: string[]; // 여러개 뱃지
  motto?: string | null | undefined;
  className?: string;
};

export default function NicknameWithBadge({
  nickname,
  badges,
  motto,
  className,
}: Props) {
  const safeNick = useMemo(() => (nickname ?? '').trim(), [nickname]);
  const safeMotto = useMemo(() => (motto ?? '').trim(), [motto]);

  const list = badges?.filter(Boolean) ?? ['👑 월간1등', '🔥 출석MVP', '💗 좋아요부자'];

  return (
    <div className={`wrap ${className ?? ''}`}>
      {/* ✅ 닉네임 */}
      {safeNick ? <div className="nick">{safeNick}</div> : null}

      {/* ✅ 배지: 닉네임 바로 아래 */}
      <div className="badges" aria-label="badges">
        {list.map((b, i) => (
          <span key={`${b}-${i}`} className="badge">
            {b}
          </span>
        ))}
      </div>

      {/* ✅ 다짐/문구 */}
      {safeMotto ? <div className="motto">“{safeMotto}”</div> : null}

      <style jsx>{`
        .wrap {
          display: flex;
          flex-direction: column;
          gap: 6px; /* 위아래 여백 정리 핵심 */
          min-width: 0;
        }

        .nick {
          font-size: 44px; /* 🔥 크게 */
          font-weight: 1000; /* 🔥 진하게 */
          line-height: 1.02; /* 🔥 줄간격 타이트 */
          letter-spacing: -1.2px;
          margin: 0; /* ✅ 위아래 잡여백 제거 */

          background: linear-gradient(90deg, #ff2fb0 0%, #b44cff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;

          text-shadow: 0 4px 18px rgba(180, 76, 255, 0.55),
            0 2px 6px rgba(0, 0, 0, 0.22);
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px; /* ✅ 닉네임 바로 아래 붙이기 */
        }

        .badge {
          font-size: 14px;
          font-weight: 950;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(180, 76, 255, 0.25);
          color: #5a189a;
        }

        .motto {
          font-size: 15px;
          font-weight: 900;
          color: rgba(80, 16, 120, 0.85);
          margin-top: 2px;
        }

        /* ✅ 3) 모바일 자동 축소 처리 */
        @media (max-width: 520px) {
          .nick {
            font-size: 30px;
            letter-spacing: -0.8px;
          }
          .badge {
            font-size: 12px;
            padding: 4px 8px;
          }
          .motto {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
