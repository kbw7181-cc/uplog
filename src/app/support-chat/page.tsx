// src/app/support-chat/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type ChatRole = 'user' | 'admin';

type ChatMessage = {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export default function SupportChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 사용자 확인
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      setLoadingUser(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        alert('로그인 후 문의 채팅을 이용하실 수 있습니다.');
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setLoadingUser(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 메시지 불러오기
  async function fetchMessages(uid: string) {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('SUPPORT_CHAT_FETCH_ERROR', error);
      setMessages([]);
    } else {
      setMessages((data || []) as ChatMessage[]);
    }
    setLoadingMessages(false);
  }

  // 실시간 구독 + 초기 로딩
  useEffect(() => {
    if (!userId) return;

    fetchMessages(userId);

    const channel = supabase
      .channel(`support-chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              const next = [...prev, payload.new as ChatMessage];
              return next.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 스크롤 항상 맨 아래로
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: userId,
        role: 'user',
        content: text,
      });

      if (error) {
        console.error('SUPPORT_CHAT_SEND_ERROR', error);
        alert('메시지 전송 중 오류가 발생했습니다.');
      } else {
        setInput('');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isReady = useMemo(
    () => !loadingUser && !!userId,
    [loadingUser, userId]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050013',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          borderRadius: 24,
          padding: 20,
          background:
            'radial-gradient(circle at top left,#312e81 0,#020016 55%,#000 100%)',
          border: '1px solid rgba(148,163,184,0.4)',
          boxShadow: '0 20px 50px rgba(15,23,42,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* 헤더 */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                margin: 0,
                color: '#a5b4fc',
              }}
            >
              UPLOG · SUPPORT
            </p>
            <h1
              style={{
                margin: '6px 0 0',
                fontSize: 22,
                fontWeight: 700,
                color: '#f9fafb',
              }}
            >
              문의하기 · 실시간 채팅
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: '#e5e7eb',
              }}
            >
              사용 중 궁금한 점이나 불편한 점을 남겨주시면, 관리자 또는
              담당자가 순서대로 답변을 드립니다.
            </p>
          </div>
        </header>

        {/* 채팅 박스 */}
        <section
          style={{
            flex: 1,
            minHeight: 360,
            maxHeight: '60vh',
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(148,163,184,0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* 안내 문구 */}
          <div
            style={{
              padding: '8px 12px 10px',
              borderRadius: 12,
              marginBottom: 6,
              background:
                'linear-gradient(90deg,rgba(251,113,133,0.14),rgba(168,85,247,0.12))',
              border: '1px solid rgba(244,114,182,0.5)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: '#fecaca',
                lineHeight: 1.5,
              }}
            >
              ✨
              <span style={{ fontWeight: 600 }}> TIP</span> · 대표님이 남기신
              문의는 채널별로 기록이 남습니다. 설치 오류, 기능 제안, 버그
              제보 등 편하게 말씀해 주세요.
            </p>
          </div>

          {/* 메시지 목록 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 4px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {(!isReady || loadingMessages) && (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  padding: '8px 4px',
                }}
              >
                채팅 내역을 불러오는 중입니다…
              </div>
            )}

            {isReady && !loadingMessages && messages.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  padding: '8px 4px',
                }}
              >
                아직 대화가 없습니다. 아래 입력창에 첫 문의를 남겨 주세요.
              </div>
            )}

            {messages.map((msg) => {
              const isMine = msg.role === 'user';
              const timeLabel = new Date(
                msg.created_at
              ).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: '#9ca3af',
                      }}
                    >
                      {isMine ? '나' : '운영자'}
                    </span>
                    <div
                      style={{
                        borderRadius: 18,
                        padding: '8px 12px',
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                        background: isMine
                          ? 'linear-gradient(135deg,#fb7185,#a855f7)'
                          : 'rgba(15,23,42,0.9)',
                        color: '#f9fafb',
                        border: isMine
                          ? '1px solid rgba(248,250,252,0.3)'
                          : '1px solid rgba(148,163,184,0.6)',
                        boxShadow: isMine
                          ? '0 0 14px rgba(244,114,182,0.55)'
                          : '0 4px 10px rgba(15,23,42,0.8)',
                      }}
                    >
                      {msg.content}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#6b7280',
                      }}
                    >
                      {timeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* 입력창 */}
        <section
          style={{
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'rgba(17,24,39,0.95)',
            border: '1px solid rgba(148,163,184,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <label
            style={{
              fontSize: 12,
              color: '#e5e7eb',
              fontWeight: 500,
            }}
          >
            메시지 입력
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="문의하실 내용을 편하게 남겨 주세요. 엔터로 전송, 줄바꿈은 Shift+Enter 입니다."
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid rgba(156,163,175,0.7)',
              backgroundColor: 'rgba(15,23,42,0.9)',
              color: '#f9fafb',
              fontSize: 13,
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginTop: 2,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: '#9ca3af',
              }}
            >
              • 대표님 계정 기준으로 채팅이 저장됩니다.  
              • 서비스/기능 제안도 언제든 환영합니다.
            </p>
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || !isReady}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  !input.trim() || sending || !isReady
                    ? 'default'
                    : 'pointer',
                background: !input.trim() || sending || !isReady
                  ? 'rgba(148,163,184,0.4)'
                  : 'linear-gradient(90deg,#fb7185,#a855f7)',
                color: '#f9fafb',
                boxShadow:
                  !input.trim() || sending || !isReady
                    ? 'none'
                    : '0 0 14px rgba(244,114,182,0.55)',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? '전송 중…' : '전송하기'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
