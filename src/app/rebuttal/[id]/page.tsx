'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type DetailRow = {
  id: string;
  title: string;
  customerRebuttal: string;
  content: string;
  category: string;
  created_at: string;
};

function ShareModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[90%] max-w-md rounded-3xl p-6 bg-gradient-to-br from-[#1a0235] to-[#050013]
                      border border-[#ffffff20] shadow-[0_0_40px_rgba(168,85,247,0.6)] space-y-6 text-white">
        <h2 className="text-xl font-bold">공유하기</h2>

        <p className="text-sm opacity-80">
          나중에 커뮤니티 / 친구 공유 기능을 붙일 수 있도록 자리를 마련해 둔 상태입니다.
        </p>

        <div className="space-y-3">
          <button
            className="w-full py-3 rounded-xl bg-[#291046] border border-[#ffffff30] hover:bg-[#3a155f] transition text-sm"
            onClick={() => alert('친구에게 공유 기능은 추후 연동 예정입니다.')}
          >
            친구에게 공유하기
          </button>
          <button
            className="w-full py-3 rounded-xl bg-[#291046] border border-[#ffffff30] hover:bg-[#3a155f] transition text-sm"
            onClick={() => alert('커뮤니티 공유 기능은 추후 연동 예정입니다.')}
          >
            커뮤니티에 공유하기
          </button>
        </div>

        <button
          onClick={props.onClose}
          className="w-full py-3 rounded-xl bg-[#f472b6] bg-opacity-90 hover:bg-opacity-100 transition text-sm font-semibold"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default function RebuttalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [row, setRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadDetail() {
    setLoading(true);

    const { data, error } = await supabase
      .from('rebuttals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setRow(null);
      setLoading(false);
      return;
    }

    const anyData: any = data;

    setRow({
      id: anyData.id,
      title: anyData.title || '제목 없음',
      customerRebuttal:
        anyData.customer_rebuttal ||
        anyData.customer_name ||
        anyData.category ||
        '고객 반론 없음',
      content: anyData.content || '',
      category: anyData.category || '기타',
      created_at: anyData.created_at || new Date().toISOString(),
    });

    setLoading(false);
  }

  if (loading) {
    return <div className="p-10 text-white">불러오는 중…</div>;
  }

  if (!row) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="max-w-xl mx-auto space-y-4">
          <h1 className="text-xl font-semibold">반론을 찾을 수 없습니다.</h1>
          <button
            onClick={() => router.push('/rebuttal')}
            className="mt-4 rounded-2xl px-4 py-2 text-xs bg-purple-600"
          >
            목록으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const dateStr = new Date(row.created_at).toLocaleString();

  return (
    <>
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="text-xs px-3 py-2 rounded-2xl border border-[#ffffff33] bg-[#1b0a3a]/70 hover:bg-[#2a1057] transition"
            >
              ← 목록으로
            </button>
            <span className="text-[11px] opacity-70">{dateStr}</span>
          </div>

          <section
            className="rounded-3xl border border-[#ffffff25] bg-gradient-to-r
                       from-[#1a0235] via-[#0b021b] to-[#050013]
                       p-6 sm:p-8 shadow-[0_0_50px_rgba(168,85,247,0.7)] space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="px-3 py-1 text-[10px] tracking-[0.2em] border border-[#ffffff40] rounded-full">
                {row.category.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
              {row.title}
            </h1>

            <p className="text-sm opacity-80">
              고객 반론 :{' '}
              <span className="font-semibold">“{row.customerRebuttal}”</span>
            </p>

            <div className="rounded-2xl px-4 py-4 bg-[#0b021b]/70 border border-[#ffffff10] text-sm leading-relaxed whitespace-pre-line">
              {row.content}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShareOpen(true)}
                className="mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#a855f7]
                           shadow-[0_0_25px_rgba(244,114,182,0.8)] text-xs font-semibold"
              >
                공유하기
              </button>
            </div>
          </section>
        </div>
      </main>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={row.title}
        content={row.content}
      />
    </>
  );
}
