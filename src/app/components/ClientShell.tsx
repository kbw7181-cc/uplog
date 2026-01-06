// ✅✅✅ 전체복붙: src/app/components/ClientShell.tsx
'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="cs">
      <AppHeader />

      {/* ✅ 페이지 내용은 무조건 이 컨테이너 안에서만 여백/폭 통일 */}
      <main className="csMain">
        <div className="csInner">{children}</div>
      </main>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        .cs {
          /* ✅ 모바일 주소창 변화에도 안정 */
          min-height: 100dvh;

          /* ✅ 전체 배경 통일 */
          background:
            radial-gradient(circle at 12% 12%, rgba(236, 72, 153, 0.16), transparent 58%),
            radial-gradient(circle at 88% 18%, rgba(168, 85, 247, 0.16), transparent 58%),
            radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.75), transparent 55%),
            linear-gradient(180deg, #ffffff 0%, #fff4fb 38%, #f6f2ff 100%);

          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);

          /* ✅ 오른쪽 치우침/가로 흔들림 방지 핵심 */
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }

        .csMain {
          width: 100%;
          max-width: 100%;

          /* ✅ “vw” 쓰는 요소가 섞여도 가운데가 안 밀리게 */
          padding-left: max(var(--app-pad-x), 14px);
          padding-right: max(var(--app-pad-x), 14px);
          padding-top: var(--app-pad-top);
          padding-bottom: var(--app-pad-bottom);

          /* ✅ iOS/모바일에서 가끔 생기는 미세 스크롤 흔들림 방지 */
          overflow-x: clip;
        }

        .csInner {
          width: 100%;
          max-width: var(--app-maxw);
          margin-left: auto;
          margin-right: auto;

          /* ✅ Inner가 스크롤바 폭(vw) 영향으로 밀리는 현상 방지 */
          transform: translateZ(0);
        }
      `}</style>
    </div>
  );
}
