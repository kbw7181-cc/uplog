'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type SupportStatus = 'open' | 'pending' | 'closed';
type TabKey = 'unread' | 'open' | 'pending' | 'closed' | 'all';

type SupportRow = {
  id: string;
  title: string | null;
  body: string | null;          // ✅ 이제 정식 컬럼
  category: string | null;      // ✅ 이제 정식 컬럼
  status: SupportStatus;
  created_at: string;
  is_read_admin: boolean | null;
};

type SupportMessage = {
  id: string;
  support_id: string;
  sender: 'user' | 'admin';
  message: string;
  created_at: string;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function statusLabel(s: SupportStatus) {
  if (s === 'open') return '답변중';
  if (s === 'pending') return '진행중';
  return '완료';
}

function statusBadgeClass(s: SupportStatus) {
  if (s === 'open') return 'bg-pink-500/25 text-pink-200 border-pink-300/40';
  if (s === 'pending') return 'bg-sky-500/20 text-sky-200 border-sky-300/40';
  return 'bg-emerald-500/15 text-emerald-200 border-emerald-300/35';
}

export default function AdminSupportPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get('tab') as TabKey) || 'unread';

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [list, setList] = useState<SupportRow[]>([]);
  const [selected, setSelected] = useState<SupportRow | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [fallbackBody, setFallbackBody] = useState<string>(''); // ✅ body가 없을 때만 사용

  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState<SupportStatus>('open');

  const tickRef = useRef<number | null>(null);
  const msgTickRef = useRef<number | null>(null);

  async function loadList() {
    setLoading(true);
    setErr(null);

    try {
      let q = supabase
        .from('supports')
        .select('id,title,body,category,status,created_at,is_read_admin')
        .order('created_at', { ascending: false });

      if (tab === 'unread') q = q.eq('is_read_admin', false);
      if (tab !== 'unread' && tab !== 'all') q = q.eq('status', tab);

      const { data, error } = await q;
      if (error) throw error;

      setList((data as SupportRow[]) ?? []);
    } catch (e: any) {
      setErr(e?.message ?? '목록을 불러오지 못했습니다.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(supportId: string) {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id,support_id,sender,message,created_at')
      .eq('support_id', supportId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const rows = (data as SupportMessage[]) ?? [];
    setMessages(rows);

    // ✅ fallback: 첫 고객 메시지
    const firstUser = rows.find((m) => m.sender === 'user');
    setFallbackBody(firstUser?.message ?? '');
  }

  async function openItem(row: SupportRow) {
    setSelected(row);
    setReply('');
    setNextStatus(row.status);
    setFallbackBody('');

    // ✅ 읽음 처리
    if (row.is_read_admin === false) {
      await supabase.from('supports').update({ is_read_admin: true }).eq('id', row.id);
      setList((prev) =>
        prev
          .map((x) => (x.id === row.id ? { ...x, is_read_admin: true } : x))
          .filter((x) => (tab === 'unread' ? x.id !== row.id : true)),
      );
    }

    try {
      await loadMessages(row.id);
    } catch (e: any) {
      alert(e?.message ?? '메시지를 불러오지 못했습니다.');
    }
  }

  async function sendReply() {
    if (!selected) return;
    const text = reply.trim();
    if (!text) return;

    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('support_messages').insert({
        support_id: selected.id,
        sender: 'admin',
        message: text,
      });
      if (insErr) throw insErr;

      const { error: upErr } = await supabase
        .from('supports')
        .update({ status: nextStatus })
        .eq('id', selected.id);
      if (upErr) throw upErr;

      setReply('');
      setSelected((prev) => (prev ? { ...prev, status: nextStatus } : prev));

      await loadMessages(selected.id);
      await loadList();
    } catch (e: any) {
      alert(e?.message ?? '답변 전송 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadList();
    setSelected(null);
    setMessages([]);
    setReply('');
    setFallbackBody('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ supports 실시간 목록
  useEffect(() => {
    const ch = supabase
      .channel('admin-supports-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supports' }, () => {
        if (tickRef.current) window.clearTimeout(tickRef.current);
        tickRef.current = window.setTimeout(() => {
          loadList();
          tickRef.current = null;
        }, 350);
      })
      .subscribe();

    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ 선택된 문의 메시지 실시간
  useEffect(() => {
    if (!selected) return;

    const ch = supabase
      .channel(`admin-support-messages-${selected.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages', filter: `support_id=eq.${selected.id}` },
        () => {
          if (msgTickRef.current) window.clearTimeout(msgTickRef.current);
          msgTickRef.current = window.setTimeout(() => {
            loadMessages(selected.id).catch(() => {});
            msgTickRef.current = null;
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (msgTickRef.current) window.clearTimeout(msgTickRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const displayBody = (selected?.body && selected.body.trim()) ? selected.body : fallbackBody;

  return (
    <main className="min-h-screen bg-[#B982FF] p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] font-black">문의 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin')}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-extrabold text-white hover:bg-white/15"
          >
            ← 대시보드
          </button>
          <button
            onClick={loadList}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-extrabold text-white hover:bg-white/15"
          >
            ⟳ 새로고침
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {[
          ['unread', '미열람'],
          ['open', '답변중'],
          ['pending', '진행중'],
          ['closed', '완료'],
          ['all', '전체'],
        ].map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => router.push(`/admin/support?tab=${k}`)}
              className={[
                'px-6 py-3 rounded-full text-[16px] font-black transition border',
                active ? 'bg-pink-500 border-pink-200/40' : 'bg-white/15 border-white/25 hover:bg-white/20',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 목록 */}
        <section className="bg-white/10 rounded-3xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-black">
              문의 목록 <span className="text-pink-200">({list.length})</span>
            </h2>
            {loading ? <span className="text-[14px] font-extrabold text-white/75">불러오는 중...</span> : null}
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-pink-200/40 bg-pink-500/15 px-4 py-3 text-[15px] font-extrabold text-white">
              ⚠️ {err}
            </div>
          ) : null}

          {list.length === 0 && !loading ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[17px] font-extrabold text-white/75">
              표시할 문의가 없습니다.
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {list.map((it) => {
              const isActive = selected?.id === it.id;
              const isNew = it.is_read_admin === false;

              return (
                <button
                  key={it.id}
                  onClick={() => openItem(it)}
                  className={[
                    'w-full text-left rounded-2xl p-5 border transition',
                    isActive ? 'bg-white/18 border-white/35' : 'bg-white/10 border-white/18 hover:bg-white/15 hover:border-white/28',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isNew ? (
                          <span className="text-[12px] font-black bg-pink-500 px-2 py-1 rounded-full border border-pink-200/40">
                            NEW
                          </span>
                        ) : null}
                        <span className={['text-[13px] font-black px-3 py-1 rounded-full border', statusBadgeClass(it.status)].join(' ')}>
                          {statusLabel(it.status)}
                        </span>
                        <span className="text-[13px] font-extrabold text-white/75">{fmtDate(it.created_at)}</span>
                      </div>

                      <div className="mt-2 text-[20px] font-black truncate">{it.title || '(제목 없음)'}</div>
                      {it.category ? (
                        <div className="mt-1 text-[13px] font-extrabold text-white/70">카테고리: {it.category}</div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-[18px] font-black text-white/90">›</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] font-extrabold text-white/75">
            💡 TIP: 새 문의/상태 변경은 자동 반영됩니다.
          </div>
        </section>

        {/* 상세 */}
        <section className="bg-white/10 rounded-3xl p-6 border border-white/20">
          {!selected ? (
            <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-5 text-[18px] font-extrabold text-white/75">
              왼쪽에서 문의를 선택하세요.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={['text-[14px] font-black px-3 py-1 rounded-full border', statusBadgeClass(selected.status)].join(' ')}>
                      {statusLabel(selected.status)}
                    </span>
                    <span className="text-[14px] font-extrabold text-white/75">{fmtDate(selected.created_at)}</span>
                  </div>

                  <h2 className="mt-2 text-[24px] font-black truncate">{selected.title || '(제목 없음)'}</h2>
                </div>

                <button
                  onClick={() => {
                    setSelected(null);
                    setMessages([]);
                    setReply('');
                    setFallbackBody('');
                  }}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[14px] font-extrabold text-white hover:bg-white/15"
                >
                  닫기
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/15 bg-white/8 px-5 py-4 text-[17px] font-semibold leading-relaxed text-white/90">
                {displayBody ? displayBody : <span className="text-white/60">문의 내용이 없습니다.</span>}
              </div>

              <div className="mt-5 rounded-2xl border border-white/15 bg-white/8 p-4">
                <div className="text-[16px] font-black text-white/90">대화</div>

                {messages.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-white/12 bg-white/8 px-4 py-3 text-[15px] font-extrabold text-white/70">
                    메시지가 없습니다.
                  </div>
                ) : (
                  <div className="mt-3 max-h-[340px] overflow-auto space-y-3 pr-1">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={[
                          'rounded-2xl border p-4',
                          m.sender === 'admin' ? 'border-pink-200/35 bg-pink-500/15' : 'border-white/12 bg-white/10',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[14px] font-black text-white/85">{m.sender === 'admin' ? '관리자' : '고객'}</div>
                          <div className="text-[13px] font-extrabold text-white/60">{fmtDate(m.created_at)}</div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-[17px] font-semibold leading-relaxed text-white/92">
                          {m.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <div className="text-[16px] font-black text-white/90">상태 선택 (전송 시 적용)</div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(['open', 'pending', 'closed'] as SupportStatus[]).map((s) => {
                      const active = nextStatus === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setNextStatus(s)}
                          className={[
                            'rounded-xl border px-3 py-3 text-[15px] font-black transition',
                            active
                              ? (s === 'open'
                                  ? 'border-pink-200/45 bg-pink-500/25 text-pink-100'
                                  : s === 'pending'
                                  ? 'border-sky-200/45 bg-sky-500/20 text-sky-100'
                                  : 'border-emerald-200/40 bg-emerald-500/15 text-emerald-100')
                              : 'border-white/18 bg-white/10 text-white/80 hover:bg-white/14',
                          ].join(' ')}
                        >
                          {statusLabel(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="관리자 답변을 입력하세요"
                  className="w-full h-32 rounded-2xl p-5 text-black text-[17px] font-semibold"
                />

                <button
                  onClick={sendReply}
                  disabled={saving || !reply.trim()}
                  className={[
                    'w-full py-4 rounded-2xl text-[19px] font-black transition border',
                    saving || !reply.trim()
                      ? 'bg-white/10 border-white/15 text-white/60'
                      : 'bg-pink-500 hover:bg-pink-600 border-pink-200/40 text-white',
                  ].join(' ')}
                >
                  {saving ? '전송 중...' : '답변 전송'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
