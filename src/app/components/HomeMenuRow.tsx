// ✅✅✅ 전체복붙: src/app/components/HomeMenuRow.tsx
'use client';

import Link from 'next/link';

export type HomeMenuItem = {
  label: string;
  href: string;
};

export default function HomeMenuRow({ items }: { items: HomeMenuItem[] }) {
  return (
    <section className="hm-wrap" aria-label="홈 메뉴">
      <div className="hm-row">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="hm-item" aria-label={it.label}>
            <span className="hm-label">{it.label}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .hm-wrap {
          width: 100%;
          margin: 14px auto 10px;
          padding: 0 14px;
        }

        /* ✅ “갇힌 느낌” 제거: 바깥 여백 + 가로 스크롤 허용(작은 화면 안전) */
        .hm-row {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr; /* ✅ 전부 동일 폭 */
          gap: 12px;
          align-items: center;

          overflow-x: auto;
          padding: 10px 6px;
          scroll-snap-type: x mandatory;

          /* 스크롤바 예쁘게 */
          scrollbar-width: none;
        }
        .hm-row::-webkit-scrollbar {
          display: none;
        }

        /* ✅ 모든 버튼 폭을 “반론 아카이브” 기준으로 동일하게 */
        .hm-item {
          scroll-snap-align: start;
          display: flex;
          align-items: center;
          justify-content: center;

          height: 52px;
          padding: 0 16px;

          border-radius: 999px;

          /* 버튼이 “떠있는” 느낌 */
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);

          border: 1.6px solid rgba(255, 255, 255, 0.46);
          box-shadow:
            0 10px 26px rgba(0, 0, 0, 0.16),
            inset 0 0 0 1px rgba(255, 255, 255, 0.16);

          text-decoration: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;

          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease,
            background 140ms ease;
        }

        .hm-item:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.22);
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.2),
            0 0 0 3px rgba(236, 72, 153, 0.18),
            inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }

        .hm-item:active {
          transform: translateY(0px) scale(0.99);
        }

        .hm-label {
          font-weight: 800;
          letter-spacing: -0.2px;
          font-size: 16px; /* ✅ 길이 긴 “반론 아카이브”도 한 줄 유지 */
          color: rgba(255, 255, 255, 0.96);
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.22);

          white-space: nowrap; /* ✅ 줄바꿈 금지 */
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ✅ 화면이 더 좁으면 버튼 높이/글자만 살짝 줄여서 한 줄 유지 */
        @media (max-width: 520px) {
          .hm-item {
            height: 48px;
            padding: 0 14px;
          }
          .hm-label {
            font-size: 15px;
          }
        }
      `}</style>
    </section>
  );
}
