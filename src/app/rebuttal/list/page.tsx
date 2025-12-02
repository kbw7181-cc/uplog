'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type RebuttalRow = {
  id: string;
  user_id: string;
  category: string;
  content: string;
  answer: string;
  created_at: string;
};

export default function RebuttalList() {
  const router = useRouter();
  const [rows, setRows] = useState<RebuttalRow[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        router.replace('/login');
        return;
      }

      const { data } = await supabase
        .from('rebuttals')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      setRows((data as RebuttalRow[]) || []);
    }
    load();
  }, [router]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.category && set.add(r.category));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    if (filterCategory === 'ALL') return rows;
    return rows.filter((r) => r.category === filterCategory);
  }, [rows, filterCategory]);

  return (
    <main
      style={{
        padding: 24,
        background: '#000',
        color: '#fff',
        minHeight: '100vh',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>반론 아카이브</h1>
        <button
          onClick={() => router.push('/rebuttal')}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: 'none',
            background: '#33dd88',
            color: '#000',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + 새 반론 기록
        </button>
      </header>

      {/* 카테고리 필터 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        <button
          onClick={() => setFilterCategory('ALL')}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #444',
            background: filterCategory === 'ALL' ? '#33dd88' : '#111',
            color: filterCategory === 'ALL' ? '#000' : '#fff',
            cursor: 'pointer',
          }}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #444',
              background: filterCategory === c ? '#33dd88' : '#111',
              color: filterCategory === c ? '#000' : '#fff',
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ opacity: 0.8, fontSize: 13 }}>
          아직 등록된 반론이 없습니다.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => router.push(`/rebuttal/${r.id}`)}
            style={{
              padding: 16,
              borderRadius: 12,
              background: '#111',
              border: '1px solid #333',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              <span>{r.category}</span>
              <span>
                {new Date(r.created_at).toLocaleDateString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.content}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                opacity: 0.7,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              대응: {r.answer}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
