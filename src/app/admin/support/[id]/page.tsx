'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Support = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  created_at: string;
};

type Message = {
  id: string;
  sender: 'user' | 'admin';
  content: string;
  created_at: string;
};

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [support, setSupport] = useState<Support | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fmt = useMemo(
    () => (d?: string | null) =>
      d ? new Date(d).toLocaleString('ko-KR', { hour12: false }) : '',
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1) 문의 본문(티켓)
      const { data: s } = await supabase
        .from('supports')
        .select('id,user_id,title,status,created_at')
        .eq('id', id)
        .single();

      setSupport(s ?? null);

      // 2) 메시지
      const { data: m } = await supabase
        .from('support_messages')
        .select('id,sender,content,created_at')
        .eq('support_id', id)
        .order('created_at', { ascending: true });

      setMessages(m ?? []);

      // 3) 관리자 읽음 처리
      await supabase.from('supports').update({ is_read_admin: true }).eq('id', id);

      setLoading(false);
    };

    load();
  }, [id]);

  const sendAndClose = async () => {
    if (!reply.trim()) return;
    if (sending) return;

    try {
      setSending(true);

      // 1) 관리자 답변 메시지 저장
      const { error: insErr } = await supabase.from('support_messages').insert({
        support_id: id,
        sender: 'admin',
        content: reply,
      });
      if (insErr) throw insErr;

      // 2) 답변과 동시에 티켓 완료 처리(목록에서 빠지게)
      const { error: upErr } = await supabase
        .from('supports')
        .update({
          status: 'closed',
          is_read_admin: true,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (upErr) throw upErr;

      // 3) 목록으로 복귀
      router.replace('/admin/support');
    } catch (e) {
      console.error(e);
      alert('답변 저장 중 오류가 발생했어요. 콘솔 확인!');
    } finally {
      setSending(false);
    }
  };

  const reopen = async () => {
    await supabase
      .from('supports')
      .update({ status: 'open', last_message_at: new Date().toISOString() })
      .eq('id', id);

    location.reload();
  };

  if (loading) return null;
  if (!support) return null;

  const isClosed = (support.status ?? 'open') === 'closed';

  return (
    <div className="min-h-screen bg-[#F7F8FF] px-6 py-6">
      <div className="max-w-4xl mx-auto">

        {/* 상단 */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.back()}
            className="text-[#5B2EFF] font-extrabold text-[14px]"
          >
            ← 목록
          </button>

          {isClosed ? (
            <button
              onClick={reopen}
              className="px-4 py-2 rounded-xl bg-[#FF4FD8] text-white font-extrabold text-[13px]"
            >
              다시 진행중으로
            </button>
          ) : (
            <span className="px-3 py-1 rounded-full bg-[#5BC0EB] text-white font-extrabold text-[12px]">
              진행중
            </span>
          )}
        </div>

        {/* 티켓 정보 */}
        <div className="bg-white rounded-2xl p-5 shadow mb-5 border border-[#EDE7FF]">
          <div className="text-[22px] font-extrabold text-[#2B2B2B]">
            {support.title ?? '문의'}
          </div>
          <div className="mt-2 text-[14px] text-gray-600">
            UID · <span className="font-semibold text-gray-800">{support.user_id}</span>
          </div>
          <div className="mt-1 text-[13px] text-gray-400">
            생성 · {fmt(support.created_at)}
          </div>
        </div>

        {/* 대화 */}
        <div className="space-y-4 mb-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-[16px] leading-relaxed ${
                m.sender === 'admin'
                  ? 'ml-auto bg-[#EAF7FF] text-[#1F2A37] border border-[#BFE9FF]'
                  : 'bg-white text-[#111827] border border-[#E6DEFF]'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div className="mt-1 text-[12px] text-gray-400 text-right">
                {fmt(m.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* 답변 입력 */}
        <div className="bg-white rounded-2xl p-4 shadow border border-[#EDE7FF]">
          <div className="text-[14px] font-extrabold text-[#5B2EFF] mb-2">
            관리자 답변 (보내면 자동 완료 처리됩니다)
          </div>

          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="답변을 입력하세요"
            className="w-full min-h-[120px] rounded-xl border border-[#E6DEFF] px-4 py-3 text-[16px] outline-none bg-[#FAFBFF] text-gray-900 placeholder:text-gray-400"
            disabled={sending}
          />

          <div className="flex justify-end mt-3">
            <button
              onClick={sendAndClose}
              disabled={sending || !reply.trim()}
              className={`px-6 py-3 rounded-xl font-extrabold text-[15px] text-white ${
                sending || !reply.trim()
                  ? 'bg-gray-300'
                  : 'bg-[#5BC0EB] hover:opacity-90'
              }`}
            >
              {sending ? '전송중...' : '답변 보내고 완료처리'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
