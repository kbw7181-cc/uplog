// src/app/community/layout.tsx
import type { ReactNode } from "react";

type CommunityLayoutProps = {
  children: ReactNode;
};

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  // 커뮤니티 전체를 밝은 배경으로 감싸는 레이아웃
  return (
    <div className="min-h-screen w-full bg-[#f6f3ff] text-gray-900">
      {children}
    </div>
  );
}
