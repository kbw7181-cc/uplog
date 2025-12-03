'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const categories = ['가격 반론', '시간/약속 미루기', '신뢰/경험 부족', '관심 없음', '기타'];

export default function NewRebuttalPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [script, setScript] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !customer.trim() || !script.trim()) {
      alert('제목 / 고객 반론 / 스크립트를 모두 입력해주세요.');
      return;
    }

    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;

    const payload: any = {
      title,
      customer_rebuttal: customer,
      content: script,
      category,
    };
    if (uid) payload.user_id = uid;

    const { error } = await supabase.from('rebuttals').insert(payload);

    setSaving(false);

    if (error) {
      console.error('rebuttals insert error', error);
      alert('저장 중 오류: ' + error.message);
      return;
    }

    router.push('/rebuttal');
  }

  const inputClass =
    'w-full rounded-2xl bg-[#14052c]/90 px-4 py-3 text-base text-white ' +
    'border border-[#f9a8d4]/60 placeholder:text-sm placeholder:text-[#d4c5ff] ' +
    'focus:outline-none focus:border-[#fb9ad0] focus:ring-2 focus:ring-[#fb9ad0]/60';

  const textareaClass =
    'w-full min-h-[220px] rounded-2xl bg-[#14052c]/90 px-4 py-3 text-base text-white ' +
    'border border-[#f9a8d4]/60 placeholder:text-sm placeholder:text-[#d4c5ff] ' +
    'focus:outline-none focus:border-[#fb9ad0] focus:ring-2 focus:ring-[#fb9ad0]/60';

  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 상단 타이틀 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              새 반론 등록
            </h1>
            <p className="text-sm opacity-80">
              들었던 거절을 하나씩 정리해서, 대표님만의 영업 스크립트 자산으로 만들어 봐요.
            </p>
          </div>
          <button
            onClick={() => router.push('/rebuttal')}
            className="mt-1 text-xs px-4 py-2 rounded-2xl border border-[#ffffff33] bg-[#1b0a3a]/80 hover:bg-[#2a1057] transition"
          >
            목록으로
          </button>
        </div>

        {/* 01. 제목 */}
        <section className="rounded-3xl bg-gradient-to-r from-[#20063d]/90 to-[#120321]/90 border border-[#f9a8d4]/30 p-5 space-y-3">
          <div className="text-[11px] tracking-[0.3em] text-[#f9a8d4] font-semibold">
            01 · 제목
          </div>
          <p className="text-xs opacity-80 mb-1">
            나중에 리스트에서 한 눈에 알아볼 수 있도록, 반론의 제목을 크게 적어주세요.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder='예: "가격이 비싸다"는 말에 대한 나의 답변'
          />
        </section>

        {/* 02. 고객 반론 */}
        <section className="rounded-3xl bg-gradient-to-r from-[#20063d]/90 to-[#120321]/90 border border-[#f9a8d4]/30 p-5 space-y-3">
          <div className="text-[11px] tracking-[0.3em] text-[#f9a8d4] font-semibold">
            02 · 고객 반론
          </div>
          <p className="text-xs opacity-80 mb-1">
            실제로 고객이 했던 말을 그대로 적어두면, 나중에 상황별로 다시 보기 좋습니다.
          </p>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className={inputClass}
            placeholder='예: "지금은 여유가 없어요"'
          />
        </section>

        {/* 03. 카테고리 */}
        <section className="rounded-3xl bg-gradient-to-r from-[#20063d]/90 to-[#120321]/90 border border-[#f9a8d4]/30 p-5 space-y-3">
          <div className="text-[11px] tracking-[0.3em] text-[#f9a8d4] font-semibold">
            03 · 카테고리
          </div>
          <p className="text-xs opacity-80 mb-2">
            나중에 검색할 때 편하도록, 반론의 성격을 한 가지로 묶어주세요.
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm transition ${
                  category === c
                    ? 'bg-gradient-to-r from-[#f472b6] to-[#a855f7] text-white shadow-[0_0_14px_rgba(244,114,182,0.8)]'
                    : 'bg-[#241046] text-[#e5e7eb] hover:bg-[#341966]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* 04. 나의 스크립트 */}
        <section className="rounded-3xl bg-gradient-to-r from-[#20063d]/90 to-[#120321]/90 border border-[#f9a8d4]/30 p-5 space-y-3">
          <div className="text-[11px] tracking-[0.3em] text-[#f9a8d4] font-semibold">
            04 · 나의 스크립트
          </div>
          <p className="text-xs opacity-80 mb-1">
            고객이 이렇게 말했을 때, 대표님은 어떻게 답했는지 스토리처럼 적어주세요.
          </p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className={textareaClass}
            placeholder={
              '고객이 이렇게 말했을 때,\n나는 이렇게 답했다…\n대화 흐름과 표현을 최대한 그대로 기록해 주세요.'
            }
          />
        </section>

        {/* 저장 버튼 */}
        <div className="pt-2 pb-6">
          <button
            disabled={saving}
            onClick={handleSave}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#f472b6] to-[#a855f7]
                       text-sm sm:text-base font-semibold
                       shadow-[0_0_28px_rgba(244,114,182,0.9)]
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중…' : '반론 저장하기'}
          </button>
        </div>
      </div>
    </main>
  );
}
