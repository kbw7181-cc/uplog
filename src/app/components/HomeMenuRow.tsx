// ✅✅✅ 전체복붙: src/app/components/HomeMenuRow.tsx
'use client';

import Link from 'next/link';

export type HomeMenuItem = {
  label: string;
  href: string;
  emoji?: string; // ✅ 이모지 없어도 동작
};

export default function HomeMenuRow({ items }: { items: HomeMenuItem[] }) {
  return (
    <section className="hm-wrap" aria-label="홈 메뉴">
      <div className="hm-row">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="hm-item" aria-label={it.label}>
            {/* ✅ 이모지 완전 제거 (렌더링 안 함) */}
            <span className="hm-label">{it.label}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .hm-wrap {
          margin: 10px 0 12px;
        }

        /* ✅ 무조건 1줄: overflow + no-wrap + min-width 분배 */
        .hm-row {
          display: flex;
          flex-wrap: nowrap; /* ✅ 줄바꿈 금지 */
          gap: 10px;
          width: 100%;
          overflow: hidden; /* ✅ 2줄로 내려가는 상황 차단 */
        }

        .hm-item {
          flex: 1 1 0%;
          min-width: 0; /* ✅ 텍스트가 있어도 줄바꿈 대신 ellipsis */
          height: 52px; /* ✅ 작게 */
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
          color: #2a1236;
          text-decoration: none;
          user-select: none;
          white-space: nowrap; /* ✅ 줄바꿈 금지 */
        }

        .hm-item:hover {
          transform: translateY(-1px);
          transition: 160ms ease;
          box-shadow: 0 16px 28px rgba(0, 0, 0, 0.10);
        }

        .hm-label {
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap; /* ✅ 줄바꿈 금지 */
        }

        /* ✅ 화면이 좁아질 때도 “1줄 유지”가 우선 */
        @media (max-width: 720px) {
          .hm-item {
            height: 48px;
            border-radius: 16px;
            padding: 0 8px;
          }
          .hm-label {
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
