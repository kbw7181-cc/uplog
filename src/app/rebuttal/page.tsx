// src/app/rebuttal/page.tsx
'use client';

import { useState } from 'react';

export default function RebuttalPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [rejectionText, setRejectionText] = useState('');
  const [memo, setMemo] = useState('');

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#ffe6f7] via-[#f5f4ff] to-[#e7f7ff]">
      <div className="mx-auto max-w-6xl px-4 py-10 text-slate-900">
        {/* 상단 큰 카드 (MYUP 스타일) */}
        <section className="rounded-3xl border border-white/70 bg-gradient-to-br from-[#ffe6f7] via-[#f8f4ff] to-[#e7f7ff] p-8 md:p-10 shadow-[0_24px_60px_rgba(148,163,255,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9f8bff]">
                UPLOG · REBUTTAL
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                반론 아카이브
              </h1>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-slate-700">
                오늘 받은 거절 멘트와 상황을 기록하고, AI가 만들어주는 공감 멘트와
                스토리텔링 반론을 한 번에 정리하는 공간이에요.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-white/80 bg-gradient-to-br from-white via-[#f9f5ff] to-[#eaf6ff] p-4 shadow-[0_18px_40px_rgba(129,140,248,0.4)] text-[13px]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">
                오늘 요약
              </p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600">선택한 날짜</span>
                <span className="font-bold text-slate-900">{today}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600">기록한 거절</span>
                <span className="font-bold text-[#6366f1]">0건</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI 반론 초안</span>
                <span className="font-bold text-[#ec4899]">0개</span>
              </div>
            </div>
          </div>
        </section>

        {/* TODAY INPUT 카드 */}
        <section className="mt-14 rounded-3xl border border-white/70 bg-white/95 p-8 md:p-10 shadow-[0_20px_50px_rgba(148,163,255,0.32)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">
            TODAY INPUT
          </p>
          <h2 className="mt-3 text-2xl md:text-[26px] font-extrabold text-slate-900">
            오늘 받은 거절 멘트를 그대로 적어주세요.
          </h2>
          <p className="mt-2 text-[14px] md:text-[15px] text-slate-700">
            이 문장을 기준으로 AI가 공감 멘트와 스토리텔링 반론을 만들어줘요.
          </p>

          <div className="mt-6 space-y-5">
            {/* 거절 멘트 */}
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-slate-900">
                거절 멘트
              </label>
              <textarea
                className="h-28 w-full resize-none rounded-2xl border border-[#d8daf5] bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-[0_14px_30px_rgba(148,163,255,0.2)] outline-none focus:border-[#a855f7] focus:shadow-[0_16px_40px_rgba(168,85,247,0.35)]"
                placeholder="예) 지금은 생각이 없어요. 나중에 필요하면 제가 연락드릴게요."
                value={rejectionText}
                onChange={(e) => setRejectionText(e.target.value)}
              />
            </div>

            {/* 상황 메모 */}
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-slate-900">
                상황 메모 (선택)
              </label>
              <textarea
                className="h-20 w-full resize-none rounded-2xl border border-[#d8daf5] bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-[0_14px_30px_rgba(148,163,255,0.18)] outline-none focus:border-[#a855f7] focus:shadow-[0_16px_40px_rgba(168,85,247,0.3)]"
                placeholder="예) 기존 고객 / 가격 부담 / 전화 상담 중 등"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {/* 버튼 */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fb7185] via-[#f973b8] to-[#a855f7] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,72,153,0.6)] transition hover:scale-[1.02] active:scale-[0.97]"
              >
                AI 피드백 받기
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-[#e5e7eb] bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_12px_26px_rgba(148,163,255,0.25)] hover:bg-[#f4f4ff]"
              >
                임시 저장
              </button>
            </div>
          </div>
        </section>

        {/* AI REBUTTAL 결과 영역 */}
        <section className="mt-14 rounded-3xl border border-white/70 bg-gradient-to-br from-white via-[#fdf2ff] to-[#e7f7ff] p-8 md:p-10 shadow-[0_24px_60px_rgba(148,163,255,0.33)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">
            AI REBUTTAL
          </p>
          <h2 className="mt-3 text-2xl md:text-[26px] font-extrabold text-slate-900">
            공감 멘트 + 스토리텔링 반론
          </h2>
          <p className="mt-2 text-[14px] md:text-[15px] text-slate-700">
            AI 피드백을 받으면 아래 공간에 자동으로 채워질 거예요.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white/90 p-6 shadow-[0_16px_36px_rgba(148,163,255,0.28)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ec4899]">
                1단계 · 공감 멘트
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-900">
                (AI 생성 전)
              </p>
            </div>

            <div className="rounded-2xl bg-white/90 p-6 shadow-[0_16px_36px_rgba(148,163,255,0.28)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6366f1]">
                2단계 · 스토리텔링 반론
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-900">
                (AI 생성 전)
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
