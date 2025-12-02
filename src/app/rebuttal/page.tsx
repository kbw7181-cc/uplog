// src/app/rebuttal/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type RebuttalListItem = {
  id: string;
  category: string | null;
  short_phrase: string | null;
  final_content: string | null;
  script_full: string | null;
  status: string | null;
  created_at: string | null;
};

export default function RebuttalListPage() {
  const router = useRouter();
  const [items, setItems] = useState<RebuttalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ready' | 'draft'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('rebuttals')
          .select(
            'id, category, short_phrase, final_content, script_full, status, created_at',
          )
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!cancelled && data) setItems(data as any);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'ready') list = list.filter((i) => i.status === 'ready');
    if (filter === 'draft') list = list.filter((i) => i.status !== 'ready');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => {
        const txt =
          (i.category ?? '') +
          ' ' +
          (i.short_phrase ?? '') +
          ' ' +
          (i.final_content ?? '') +
          ' ' +
          (i.script_full ?? '');
        return txt.toLowerCase().includes(q);
      });
    }
    return list;
  }, [items, filter, search]);

  return (
    <div className="min-h-screen bg-[#050509] text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">반론 아카이브</h1>
          <span className="text-xs text-zinc-400">
            최근 반론 · AI/관리자 피드백 · 내 스크립트를 한 번에
          </span>
        </header>

        {/* 필터 / 검색 */}
        <section className="flex flex-col md:flex-row md:items-center gap-2 text-xs">
          <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full ${
                filter === 'all'
                  ? 'bg-pink-600 text-white'
                  : 'text-zinc-300'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFilter('ready')}
              className={`px-3 py-1 rounded-full ${
                filter === 'ready'
                  ? 'bg-pink-600 text-white'
                  : 'text-zinc-300'
              }`}
            >
              최종본 완료
            </button>
            <button
              type="button"
              onClick={() => setFilter('draft')}
              className={`px-3 py-1 rounded-full ${
                filter === 'draft'
                  ? 'bg-pink-600 text-white'
                  : 'text-zinc-300'
              }`}
            >
              수정 예정
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="반론 문장, 상품, 키워드로 검색"
            className="flex-1 rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-xs outline-none focus:border-pink-500"
          />
        </section>

        {/* 목록 */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 text-xs">
          {loading && (
            <p className="text-xs text-zinc-400">
              반론을 불러오는 중입니다…
            </p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-xs text-zinc-400">
              아직 저장된 반론이 없거나, 검색 결과가 없습니다.
            </p>
          )}

          {!loading &&
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(`/rebuttal/${r.id}`)}
                className="w-full text-left rounded-xl border border-zinc-700 bg-black/40 px-3 py-2 hover:border-pink-400"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] text-pink-200">
                      {r.category || '일반 반론'}
                    </span>
                    {r.status === 'ready' && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                        최종본
                      </span>
                    )}
                  </div>
                  {r.created_at && (
                    <span className="text-[10px] text-zinc-500">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-[13px] font-semibold">
                  {r.short_phrase || '제목 없는 반론'}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                  {r.final_content || r.script_full || ''}
                </div>
              </button>
            ))}
        </section>
      </div>
    </div>
  );
}
