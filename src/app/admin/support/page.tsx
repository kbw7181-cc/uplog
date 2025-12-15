// ✅ 파일: src/app/admin/support/page.tsx
// (대표님이 올린 코드 그대로 쓰되, 2가지만 꼭 추가)
// 1) 첫 진입 시 자동 fetchList()
// 2) URL ?tab=unread 같은거 읽어서 초기 탭 설정

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type SupportRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  created_at: string;
  last_message_at: string | null;
  is_read_admin: boolean | null;
};

export default function AdminSupportsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'open' | 'unread'>('unread');

  const fetchList = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('supports')
      .select('id,user_id,title,status,created_at,last_message_at,is_read_admin')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      console.error('❌ supports fetch error', error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as SupportRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const urlTab = (sp.get('tab') ?? '').toLowerCase();
    if (urlTab === 'unread' || urlTab === 'open' || urlTab === 'all') setTab(urlTab as any);
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (tab === 'open') list = list.filter((r) => (r.status ?? 'open') === 'open');
    if (tab === 'unread') list = list.filter((r) => !(r.is_read_admin ?? false));

    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((r) => {
      const t = (r.title ?? '').toLowerCase();
      const uid = (r.user_id ?? '').toLowerCase();
      return t.includes(s) || uid.includes(s);
    });
  }, [rows, q, tab]);

  if (loading) return null;

  return (
    <div className="bg-white/70 rounded-3xl border border-white shadow p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-3xl font-black text-[#6B2EFF]">문의 관리</div>
          <div className="text-base font-bold text-[#2C154B]/70 mt-1">
            미열람부터 처리하면 속도가 붙어요.
          </div>
        </div>

        <button
          onClick={fetchList}
          className="rounded-2xl px-4 py-3 bg-white shadow border border-[#E8DAFF] hover:border-[#CDB5FF] text-[#6B2EFF] font-extrabold"
        >
          새로고침
        </button>
      </div>

      <div className="mt-5 bg-white rounded-3xl shadow p-4 border border-white">
        <div className="flex gap-2 flex-wrap items-center">
          <TabButton active={tab === 'unread'} onClick={() => setTab('unread')} tone="pink">
            미열람
          </TabButton>
          <TabButton active={tab === 'open'} onClick={() => setTab('open')} tone="sky">
            진행중
          </TabButton>
          <TabButton active={tab === 'all'} onClick={() => setTab('all')} tone="purple">
            전체
          </TabButton>

          <div className="flex-1" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목 / UID 검색"
            className="min-w-[280px] rounded-2xl px-4 py-3 bg-[#FAF7FF] border border-[#E8DAFF] outline-none text-base"
          />
        </div>

        <div className="mt-4 grid gap-3">
          {filtered.map((r) => {
            const unread = !(r.is_read_admin ?? false);
            const status = (r.status ?? 'open') as string;

            return (
              <button
                key={r.id}
                onClick={() => router.push(`/admin/supports/${r.id}`)}
                className={[
                  'text-left rounded-3xl p-4 border shadow-sm bg-white transition',
                  unread ? 'border-[#FF4FD8]' : 'border-[#EFE7FF]',
                  'hover:border-[#6B2EFF]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {unread && (
                    <span className="px-3 py-1 rounded-full bg-[#FF4FD8] text-white text-sm font-extrabold">
                      미열람
                    </span>
                  )}
                  {status === 'open' ? (
                    <span className="px-3 py-1 rounded-full bg-[#49B7FF] text-white text-sm font-extrabold">
                      진행중
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-[#2C154B] text-white text-sm font-extrabold">
                      완료
                    </span>
                  )}

                  <div className="flex-1" />
                  <div className="text-sm text-[#2C154B]/60 font-bold">
                    {r.last_message_at
                      ? `마지막: ${new Date(r.last_message_at).toLocaleString('ko-KR')}`
                      : `생성: ${new Date(r.created_at).toLocaleString('ko-KR')}`}
                  </div>
                </div>

                <div className="mt-2 text-xl font-extrabold text-[#2C154B]">
                  {r.title ?? '(제목 없음)'}
                </div>

                <div className="mt-1 text-sm text-[#2C154B]/70 font-bold">
                  UID: <span className="font-mono">{r.user_id}</span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500 font-bold">
              표시할 문의가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone: 'pink' | 'sky' | 'purple';
}) {
  const activeCls =
    tone === 'pink'
      ? 'bg-[#FF4FD8] border-[#FF4FD8]'
      : tone === 'sky'
      ? 'bg-[#49B7FF] border-[#49B7FF]'
      : 'bg-[#6B2EFF] border-[#6B2EFF]';

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 font-extrabold border ${
        active
          ? `${activeCls} text-white`
          : 'bg-white text-[#6B2EFF] border-[#E8DAFF] hover:border-[#CDB5FF]'
      }`}
    >
      {children}
    </button>
  );
}
