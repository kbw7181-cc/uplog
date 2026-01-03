// ✅✅✅ 전체복붙: src/app/components/HomeMenuRow.tsx
'use client';

import Link from 'next/link';

export type HomeMenuItem = {
  label: string;
  href: string;
  emoji?: string; // ✅ 남겨도 렌더 안 함(호환용)
};

export default function HomeMenuRow({ items }: { items: HomeMenuItem[] }) {
  return (
    <section className="hm-wrap" aria-label="홈 메뉴">
      <div className="hm-row">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="hm-item" aria-label={it.label}>
            {/* ✅ 이모지 렌더링 완전 제거 */}
            <span className="hm-label">{it.label}</span>
            <span className="hm-glow" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <style jsx>{`
        .hm-wrap {
          margin: 12px 0 14px;
        }

        /* ✅ 1줄 고정 */
        .hm-row {
          display: flex;
          flex-wrap: nowrap;
          gap: 12px;
          width: 100%;
          overflow: hidden;
        }

        .hm-item {
          position: relative;
          flex: 1 1 0%;
          min-width: 0;

          height: 52px;
          border-radius: 999px; /* ✅ 라운드 */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;

          text-decoration: none;
          user-select: none;
          white-space: nowrap;

          /* ✅ 핑크-퍼플 */
          background: linear-gradient(
            90deg,
            rgba(236, 72, 153, 0.92),
            rgba(168, 85, 247, 0.92)
          );
          color: #fff;

          /* ✅ 라운드 테두리 + 은은한 네온 */
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
          transition: transform 160ms ease, box-shadow 180ms ease, filter 180ms ease,
            border-color 180ms ease;
          overflow: hidden;
          isolation: isolate;
        }

        /* ✅ 네온 불 들어오는 레이어 */
        .hm-glow {
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          background: radial-gradient(
              circle at 30% 20%,
              rgba(255, 255, 255, 0.35),
              transparent 55%
            ),
            radial-gradient(
              circle at 70% 80%,
              rgba(255, 255, 255, 0.25),
              transparent 55%
            );
          opacity: 0.25;
          z-index: -1;
          transition: opacity 180ms ease, filter 180ms ease;
          filter: blur(8px);
        }

        .hm-item:hover {
          transform: translateY(-1px);
          filter: saturate(1.08);
          border-color: rgba(255, 255, 255, 0.34);
          box-shadow: 0 14px 30px rgba(168, 85, 247, 0.22),
            0 10px 22px rgba(0, 0, 0, 0.18);
        }
        .hm-item:hover .hm-glow {
          opacity: 0.55; /* ✅ 네온 업 */
          filter: blur(10px);
        }

        .hm-item:active {
          transform: translateY(0px) scale(0.995);
        }

        .hm-label {
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.2px;
          text-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }

        @media (max-width: 720px) {
          .hm-row {
            gap: 10px;
          }
          .hm-item {
            height: 48px;
            padding: 0 10px;
          }
          .hm-label {
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
