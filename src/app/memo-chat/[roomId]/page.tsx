'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useParams } from 'next/navigation';
import { getAiRebuttals } from '../../../lib/uplogApi';


type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};


export default function MemoChatRoomPage() {
  // roomId 타입 명시
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // --------------------------
  // 1) 현재 로그인 유저 정보 불러오기
  // --------------------------
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data?.session;
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // --------------------------
  // 2) 실시간 메시지 구독 + 초기 로딩
  // --------------------------
  useEffect(() => {
    if (!roomId) return;

    // 초기 로딩
    supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then((res) => {
        if (res.data) {
          setMessages(res.data as ChatMessage[]);
        }
      });

    // 실시간 채널
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // --------------------------
  // 3) 메세지 전송 함수
  // --------------------------
  async function sendMessage(content: string) {
    if (!userId || !roomId) return;

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: userId,
      content,
    });
  }

  async function handleSend() {
    if (!input.trim()) return;
    await sendMessage(input.trim());
    setInput('');
  }

  // --------------------------
  // 4) AI 반론 자동 생성 & 메모 방 자동 저장
  // --------------------------
  async function handleAiClick() {
    const saying = prompt('고객이 실제로 했던 말을 적어주세요.');
    if (!saying) return;

    try {
      setAiLoading(true);

      // 1) AI 반론 3개 생성
      const { suggestions } = await getAiRebuttals({
        customerSaying: saying,
        productType: '일반 세일즈',
        tone: '부드럽고 공감 먼저',
      });

      // 2) 생성된 3개를 “자동으로” 메모 채팅방에 전송
      for (const text of suggestions) {
        await sendMessage(text);
      }

      alert('✨ AI 반론 3개가 자동으로 메모 채팅방에 저장되었습니다.');
    } catch (e: any) {
      alert(e?.message ?? 'AI 반론 생성 실패');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-lg font-semibold mb-4">내 전용 메모 채팅방</h2>

      {/* 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-3 rounded-lg">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 my-1 rounded-lg max-w-[70%] ${
              m.sender_id === userId
                ? 'ml-auto bg-pink-200'
                : 'mr-auto bg-white'
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메모 입력..."
          className="flex-1 border p-2 rounded-lg"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          전송
        </button>

        {/* 🔥 AI 자동생성 버튼 */}
        <button
          onClick={handleAiClick}
          disabled={aiLoading}
          className="px-3 py-2 bg-pink-500 text-white rounded-lg"
        >
          {aiLoading ? 'AI 생성중…' : 'AI 반론'}
        </button>
      </div>
    </div>
  );
}