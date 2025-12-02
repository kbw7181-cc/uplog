// src/app/templates/page.tsx
'use client';

const TEMPLATES: { category: string; title: string; body: string }[] = [
  {
    category: '첫 인사',
    title: '첫 상담 후 감사 문자',
    body:
      '안녕하세요, 오늘 상담 도와드린 ○○○입니다 :)\n' +
      '바쁘신 와중에 시간 내어주셔서 진심으로 감사드립니다.\n' +
      '궁금하신 점 떠오르시면 언제든 편하게 말씀 주세요.',
  },
  {
    category: '가격 반론',
    title: '가격이 비싸다는 고객님께',
    body:
      '말씀 주신 비용 부분 충분히 공감됩니다.\n' +
      '그래서 저는 같은 금액이라도, ○○님께 남는 “보장과 혜택”이 더 많도록 설계해 드리고 있습니다.\n' +
      '잠깐만 더 여유 되실 때, 실제 보장 내용을 비교해서 보여드려도 괜찮으실까요?',
  },
  {
    category: '재상담 요청',
    title: '다시 한 번 이야기 나누고 싶을 때',
    body:
      '안녕하세요, ○○님 :) 지난번에 잠깐 상담 도와드렸던 ○○○입니다.\n' +
      '그 후로도 계속 ○○님께 더 도움이 될만한 방향을 생각해보고 있는데요,\n' +
      '짧게 10분 정도만 더 여쭤보고, 조건을 한 번 더 다듬어봐도 괜찮으실까요?',
  },
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-[#050509] text-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">문자 도우미</h1>
          <span className="text-xs text-zinc-400">
            자주 쓰는 멘트들을 복사해서 바로 사용하세요.
          </span>
        </header>

        <section className="space-y-3">
          {TEMPLATES.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm space-y-1"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[11px] text-pink-200">
                  {t.category}
                </span>
                <span className="text-[11px] text-zinc-500">
                  복사해서 문자/카톡에 붙여넣기
                </span>
              </div>
              <div className="font-semibold text-[14px]">{t.title}</div>
              <pre className="mt-1 whitespace-pre-wrap text-[13px] text-zinc-300">
                {t.body}
              </pre>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
