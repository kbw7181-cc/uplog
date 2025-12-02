// src/components/CustomerQuickForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type CustomerFormState = {
  name: string;
  phone: string;
  birthdate: string;
  product: string;
  address: string;
  specialNote: string;
};

export default function CustomerQuickForm() {
  const [form, setForm] = useState<CustomerFormState>({
    name: '',
    phone: '',
    birthdate: '',
    product: '',
    address: '',
    specialNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onChange(key: keyof CustomerFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.name.trim()) {
      setMessage('고객 이름은 필수입니다.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        setMessage('로그인이 필요합니다.');
        return;
      }

      const { error: insertErr } = await supabase.from('customers').insert({
        user_id: user.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        birthdate: form.birthdate || null,
        product: form.product.trim() || null,
        address: form.address.trim() || null,
        special_note: form.specialNote.trim() || null, // 반론/특이사항 메모
      });

      if (insertErr) throw insertErr;

      setMessage('고객 정보가 저장되었습니다.');
      setForm({
        name: '',
        phone: '',
        birthdate: '',
        product: '',
        address: '',
        specialNote: '',
      });
    } catch (err: any) {
      console.error(err);
      setMessage(err.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 mb-6 space-y-4">
      <h2 className="text-sm font-semibold">고객 정보 등록</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* 1) 이름 */}
        <div className="space-y-1">
          <label className="block text-xs text-zinc-300">
            고객 이름<span className="text-pink-400"> *</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="예: 김OO"
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {/* 2) 연락처 */}
        <div className="space-y-1">
          <label className="block text-xs text-zinc-300">연락처</label>
          <input
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="예: 010-0000-0000"
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {/* 3) 생년월일 */}
        <div className="space-y-1">
          <label className="block text-xs text-zinc-300">생년월일</label>
          <input
            type="date"
            value={form.birthdate}
            onChange={(e) => onChange('birthdate', e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {/* 4) 상품 / 관심 상품 */}
        <div className="space-y-1">
          <label className="block text-xs text-zinc-300">상품 / 관심 상품</label>
          <input
            value={form.product}
            onChange={(e) => onChange('product', e.target.value)}
            placeholder="예: 종신보험, 교육상품 등"
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {/* 5) 주소 */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-zinc-300">주소</label>
          <input
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="예: 대전 서구 가장동 ..."
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {/* 6) 특이사항 / 메모 */}
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-zinc-300">특이사항 / 메모</label>
          <textarea
            value={form.specialNote}
            onChange={(e) => onChange('specialNote', e.target.value)}
            rows={3}
            placeholder="가족상황, 반론 메모, 통화 시 유의사항 등"
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500 resize-none"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-between">
          {message && <p className="text-xs text-zinc-300">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="ml-auto rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? '저장 중…' : '고객 정보 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}

