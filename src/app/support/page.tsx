'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type SupportStatus = 'open' | 'pending' | 'closed';

type SupportRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  category: string | null;
  status: SupportStatus;
  is_read_admin: boolean;
  created_at: string;
};

type SupportMessage = {
  id: string;
  support_id: string;
  sender: 'user' | 'admin';
  message: string;
  created_at: string;
};

const CATEGORIES = [
  { id: '일반', label: '일반' },
  { id: '계정', label: '계정/로그인' },
  { id: '결제', label: '결제/환불' },
  { id: '버그', label: '버그/오류' },
  { id: '기능', label: '기능 요청' },
] as const;

function fmtDate(d: string) {
  return new Date(d).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupportPage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  // ✅ 작성 폼
  const [category, setCategory] = useState<string>('일반');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // ✅ 내가 만든 티켓 목록/선택
  const [tickets, setTickets] = useState<SupportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ 채팅 메시지
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [chatText, setChatText] = useState('');

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  // 0) 로그인 체크
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoadingMe(true);
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      if (!ignore) {
        setMeId(uid);
        setLoadingMe(false);
        if (!uid) router.push('/login');
      }
    })();

    return () => {
      ignore = true;
    };
  }, [router]);

  // 1) 내 티켓 목록 로드
  async function loadTickets() {
    if (!meId) return;

    const { data, error } = await supabase
      .from('supports')
      .select('id,user_id,title,body,category,status,is_read_admin,created_at')
      .eq('user_id', meId)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setTickets((data as SupportRow[]) ?? []);
  }

  // 2) 선택 티켓 메시지 로드
  async function loadMessages(supportId: string) {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id,support_id,sender,message,created_at')
      .eq('support_id', supportId)
      .order('created_at', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((data as SupportMessage[]) ?? []);
  }

  useEffect(() => {
    if (!meId) return;
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ✅ 3) 티켓 생성: supports에 title/body/category 저장 + 첫 user 메시지까지 저장
  async function createTicket() {
    if (!meId) return;

    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setCreating(true);
    try {
      // 1) supports 생성
      const { data: created, error: insErr } = await supabase
        .from('supports')
        .insert({
          user_id: meId,
          title: t,
          body: b,
          category,
          status: 'open',
          is_read_admin: false,
        })
        .select('id,user_id,title,body,category,status,is_read_admin,created_at')
        .single();

      if (insErr) throw insErr;
      if (!created?.id) throw new Error('문의 생성 실패(아이디 없음)');

      // 2) 첫 메시지(유저)도 채팅 테이블에 저장 → 관리자 화면에서 대화/본문 fallback 가능
      const { error: msgErr } = await supabase.from('support_messages').insert({
        support_id: created.id,
        sender: 'user',
        message: b,
      });
      if (msgErr) throw msgErr;

      // 3) UI 갱신
      setTitle('');
      setBody('');
      setCategory('일반');

      await loadTickets();
      setSelectedId(created.id);
      await loadMessages(created.id);
    } catch (e: any) {
      alert(e?.message ?? '문의 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }

  // ✅ 4) 채팅 전송(유저 메시지)
  async function sendChat() {
    if (!selectedId) return;
    const text = chatText.trim();
    if (!text) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        support_id: selectedId,
        sender: 'user',
        message: text,
      });
      if (error) throw error;

      setChatText('');
      await loadMessages(selectedId);
      await loadTickets();
    } catch (e: any) {
      alert(e?.message ?? '메시지 전송 오류');
    } finally {
      setSending(false);
    }
  }

  if (loadingMe) {
    return (
      <main className="min-h-screen bg-[#B982FF] p-6 text-white">
        <div className="text-[18px] font-black">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#B982FF] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[30px] font-black">문의하기</h1>
          <button
            onClick={() => router.push('/home')}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-extrabold text-white hover:bg-white/15"
          >
            ← 홈으로
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ✅ 새 문의 작성 */}
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6">
            <div className="text-[22px] font-black">새 문의 작성</div>
            <div className="mt-2 text-[14px] font-extrabold text-white/80">
              문의를 등록하면 관리자 화면에서 자동으로 확인 가능합니다.
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                <div className="text-[14px] font-black text-white/90 mb-2">카테고리</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={[
                          'rounded-full border px-4 py-2 text-[14px] font-black transition',
                          active ? 'bg-pink-500/90 border-pink-200/45' : 'bg-white/10 border-white/20 hover:bg-white/15',
                        ].join(' ')}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                <div className="text-[14px] font-black text-white/90 mb-2">제목</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예) 로그인 오류가 납니다"
                  className="w-full rounded-xl px-4 py-3 text-[16px] font-semibold text-black"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                <div className="text-[14px] font-black text-white/90 mb-2">내용</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="문제 상황을 자세히 적어주세요."
                  className="w-full h-40 rounded-xl px-4 py-3 text-[16px] font-semibold text-black"
                />
              </div>

              <button
                onClick={createTicket}
                disabled={creating}
                className={[
                  'w-full rounded-2xl border py-4 text-[18px] font-black transition',
                  creating ? 'bg-white/10 border-white/15 text-white/60' : 'bg-pink-500 hover:bg-pink-600 border-pink-200/45 text-white',
                ].join(' ')}
              >
                {creating ? '등록 중...' : '문의 등록'}
              </button>
            </div>
          </section>

          {/* ✅ 내 문의 목록 + 채팅 */}
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[22px] font-black">내 문의</div>
              <button
                onClick={loadTickets}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-extrabold text-white hover:bg-white/15"
              >
                ⟳ 새로고침
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {tickets.length === 0 ? (
                <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[16px] font-extrabold text-white/75">
                  아직 문의가 없습니다.
                </div>
              ) : (
                tickets.map((t) => {
                  const active = selectedId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={[
                        'w-full text-left rounded-2xl border p-4 transition',
                        active ? 'bg-white/18 border-white/35' : 'bg-white/10 border-white/18 hover:bg-white/15 hover:border-white/28',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[18px] font-black truncate">{t.title || '(제목 없음)'}</div>
                          <div className="mt-1 text-[13px] font-extrabold text-white/75">
                            {t.category ? `카테고리: ${t.category} · ` : ''}
                            {fmtDate(t.created_at)}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[13px] font-black text-white/90">
                          {t.status === 'open' ? '답변중' : t.status === 'pending' ? '진행중' : '완료'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* 채팅 */}
            {selectedTicket ? (
              <div className="mt-5 rounded-3xl border border-white/20 bg-white/8 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[18px] font-black">대화</div>
                  <div className="text-[13px] font-extrabold text-white/75">{fmtDate(selectedTicket.created_at)}</div>
                </div>

                <div className="mt-3 max-h-[320px] overflow-auto space-y-3 pr-1">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-[15px] font-extrabold text-white/70">
                      메시지가 없습니다.
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={[
                          'rounded-2xl border p-4',
                          m.sender === 'user' ? 'border-white/15 bg-white/10' : 'border-pink-200/35 bg-pink-500/15',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[14px] font-black text-white/85">{m.sender === 'user' ? '나' : '관리자'}</div>
                          <div className="text-[13px] font-extrabold text-white/60">{fmtDate(m.created_at)}</div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-[16px] font-semibold leading-relaxed text-white/92">
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="메시지를 입력하세요"
                    className="flex-1 rounded-xl px-4 py-3 text-[16px] font-semibold text-black"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendChat();
                    }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={sending || !chatText.trim()}
                    className={[
                      'rounded-xl px-5 py-3 text-[16px] font-black border transition',
                      sending || !chatText.trim()
                        ? 'bg-white/10 border-white/15 text-white/60'
                        : 'bg-pink-500 hover:bg-pink-600 border-pink-200/45 text-white',
                    ].join(' ')}
                  >
                    전송
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[16px] font-extrabold text-white/75">
                왼쪽 목록에서 문의를 선택하면 대화가 열립니다.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
