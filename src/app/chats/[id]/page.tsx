// src/app/chats/[id]/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type ChatRoomRow = {
  id: string;
  member_a: string;
  member_b: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const chatId = params?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<ChatRoomRow | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);
  const [isSelfRoom, setIsSelfRoom] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) 로그인 정보
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.push('/login');
          return;
        }
        const myId = user.id;
        if (cancelled) return;
        setMeId(myId);

        // 2) 채팅방 정보
        const { data: roomRow, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id, member_a, member_b, created_at')
          .eq('id', chatId)
          .single();

        if (roomError) throw roomError;
        const roomData = roomRow as ChatRoomRow;

        // 접근 권한 체크
        if (
          roomData.member_a !== myId &&
          roomData.member_b !== myId
        ) {
          setError('이 채팅방에 접근할 수 없습니다.');
          setLoading(false);
          return;
        }

        setRoom(roomData);
        const selfRoom =
          roomData.member_a === myId && roomData.member_b === myId;
        setIsSelfRoom(selfRoom);

        // 3) 상대방 / 나 프로필 가져오기 (selfRoom이면 나 자신)
        const otherId = selfRoom
          ? myId
          : roomData.member_a === myId
          ? roomData.member_b
          : roomData.member_a;

        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', otherId);


        if (profileError) throw profileError;

        const prof = (profileRows?.[0] ?? null) as ProfileRow | null;
        setOtherProfile(prof);

        // 4) 메시지 목록
        const { data: msgRows, error: msgError } = await supabase
          .from('chat_messages')
          .select('id, chat_id, sender_id, message, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        setMessages((msgRows ?? []) as ChatMessage[]);
        setLoading(false);

        // 스크롤 맨 아래로
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e.message ?? '채팅방을 불러오는 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [chatId, router]);

  async function handleSend() {
    if (!chatId || !meId) return;
    const text = input.trim();
    if (!text) return;

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: meId,
          message: text,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data as ChatMessage]);
      setInput('');

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? '메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }

  if (!chatId) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        잘못된 채팅방 주소입니다.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        채팅방을 불러오는 중입니다…
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        {error ?? '채팅방을 찾을 수 없습니다.'}
      </div>
    );
  }

  const title = isSelfRoom
    ? '내 전용 메모 채팅방'
    : otherProfile?.name ?? '친구와의 채팅';

  const subtitle = isSelfRoom
    ? '오늘 들었던 반론, 아이디어, 하고 싶은 말들을 전부 여기에 쌓아두세요.'
    : '영업 반론, 스크립트, 오늘의 감정까지 솔직하게 나눠보세요.';

  return (
    <div className="flex min-h-screen flex-col bg-[#050509] text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {/* 헤더 */}
        <header className="mb-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-xs text-zinc-300 hover:text-zinc-100"
          >
            ← 채팅 목록으로
          </button>
          <span className="text-[11px] text-zinc-500">
            {new Date(room.created_at).toLocaleString()}
          </span>
        </header>

        {/* 타이틀 */}
        <section className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500/80 to-pink-500/80 text-xs font-semibold">
            {title.trim().charAt(0)}
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold">{title}</h1>
            <p className="text-[11px] text-zinc-500">{subtitle}</p>
          </div>
        </section>

        {/* 메시지 영역 */}
        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          {messages.length === 0 && (
            <p className="py-8 text-center text-xs text-zinc-500">
              아직 메시지가 없습니다.
              <br />
              아래 입력창에 오늘 들은 반론이나 떠오른 문장을 바로 기록해보세요.
            </p>
          )}

          {messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div
                key={m.id}
                className={`flex w-full ${
                  mine ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    mine
                      ? 'bg-pink-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.message}</div>
                  <div className="mt-1 text-[9px] text-zinc-300/70">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력 영역 */}
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!sending) handleSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isSelfRoom
                ? '예) “생각해본다고 하심” / 오늘 들었던 반론, 하고 싶은 말을 적어보세요.'
                : '친구에게 보낼 메시지를 입력하세요.'
            }
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-full bg-pink-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {sending ? '전송 중…' : '전송'}
          </button>
        </form>
      </div>
    </div>
  );
}
