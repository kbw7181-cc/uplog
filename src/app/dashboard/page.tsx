// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // 현재 로그인한 사용자 가져오기
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login");
      } else {
        setEmail(user.email ?? null);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p className="opacity-80 text-sm">로그인 상태 확인 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">업로그 대시보드</h1>
            <p className="text-sm opacity-70 mt-1">
              대표님의 영업 기록과 거절 아카이브를 한 곳에서 관리합니다.
            </p>
          </div>
          <div className="text-right text-xs opacity-70">
            <div>{email ?? "알 수 없는 사용자"}</div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="mt-2 inline-block px-3 py-1 rounded-full border border-slate-600 text-xs hover:bg-slate-800"
            >
              로그아웃
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs opacity-60 mb-1">오늘 영업 기록</div>
            <div className="text-3xl font-bold">0건</div>
            <div className="text-xs opacity-60 mt-2">
              나중에 오늘 등록한 기록 수를 표시할 자리
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs opacity-60 mb-1">오늘 거절</div>
            <div className="text-3xl font-bold">0건</div>
            <div className="text-xs opacity-60 mt-2">
              거절도 자산입니다. 나중에 분석용으로 사용할 예정.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs opacity-60 mb-1">누적 기록</div>
            <div className="text-3xl font-bold">0건</div>
            <div className="text-xs opacity-60 mt-2">
              Supabase 테이블과 연결해서 총 기록 수를 보여줄 자리.
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold mb-3">오늘의 한 줄</h2>
          <p className="opacity-80 text-sm">
            거절은 방향을 알려주는 표지판일 뿐, 대표님 실력의 평가가 아닙니다.
            오늘도 한 걸음만 더 가볼까요?
          </p>
        </section>
      </div>
    </main>
  );
}
