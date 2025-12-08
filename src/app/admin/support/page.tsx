// src/app/admin/support/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type ChatRole = 'user' | 'admin';

type ChatMessage = {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
};

type ConversationSummary = {
  userId: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
};

export default function AdminSupportPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 🔥 관리자 이메일 (DB 정책과 동일하게!)
  const ADMIN_EMAIL = 'uplog@naver.com';

  // 관리자 인증
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      setLoadingUser(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        alert('관리자 로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      if (user.email !== ADMIN_EMAIL) {
        alert('관리자 전용 페이지입니다.');
        router.push('/home');
        return;
      }

      setIsAdmin(true);
      setLoadingUser(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router, ADMIN_EMAIL]);

  // 전체 문의 불러오기
  async function fetchAllMessages() {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('ADMIN_SUPPORT_FETCH_ERROR', error);
      setMessages([]);
    } else {
      setMessages((data || []) as ChatMessage[]);
      if (!activeUserId && data && data.length > 0) {
        setActiveUserId(data[data.length - 1].user_id);
      }
    }
    setLoadingMessages(false);
  }

  // 관리자일 때만 구독
  useEffect(() => {
    if (!isAdmin) return;

    fetchAllMessages();

    const channel = supabase
      .channel('support-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          setMessages((prev) => {
            const others = prev.filter(
              (m) => m.id !== (payload.new as any).id
            );
            const next = [...others, payload.new as ChatMessage];
            return next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // 읽음 처리
  async function markAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('support_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('role', 'user')
        .eq('is_read', false);

      if (error) {
        console.error('ADMIN_SUPPORT_MARK_READ_ERROR', error);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.user_id === userId && m.role === 'user'
              ? {
                  ...m,
                  is_read: true,
                  read_at: m.read_at ?? new Date().toISOString(),
                }
              : m
          )
        );
      }
    } catch (e) {
      console.error('ADMIN_SUPPORT_MARK_READ_EXCEPTION', e);
    }
  }

  // 문의 목록 계산
  const conversations: ConversationSummary[] = useMemo(() => {
    const map = new Map<string, ConversationSummary>();

    for (const msg of messages) {
      const existing = map.get(msg.user_id);
      const createdAt = new Date(msg.created_at).getTime();
      const unreadInc = !msg.is_read && msg.role === 'user' ? 1 : 0;

      if (!existing) {
        map.set(msg.user_id, {
          userId: msg.user_id,
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unreadCount: unreadInc,
        });
      } else {
        const lastAtTime = new Date(existing.lastAt).getTime();
        if (createdAt >= lastAtTime) {
          existing.lastMessage = msg.content;
          existing.lastAt = msg.created_at;
        }
        existing.unreadCount += unreadInc;
      }
    }

    const list = Array.from(map.values());
    list.sort(
      (a, b) =>
        new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    return list;
  }, [messages]);

  const activeMessages = useMemo(
    () =>
      activeUserId
        ? messages.filter((m) => m.user_id === activeUserId)
        : [],
    [messages, activeUserId]
  );

  // 선택한 대화 바뀔 때 읽음 처리
  useEffect(() => {
    if (activeUserId && isAdmin) {
      markAsRead(activeUserId);
    }
  }, [activeUserId, isAdmin]);

  // 스크롤 하단
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length]);

  async function handleSendReply() {
    const text = replyInput.trim();
    if (!text || !activeUserId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: activeUserId,
        role: 'admin',
        content: text,
        is_read: true,
        read_at: new Date().toISOString(),
      });

      if (error) {
        console.error('ADMIN_SUPPORT_REPLY_ERROR', error);
        alert(
          '답변 전송 중 오류가 발생했습니다.\n\n' +
            (error.message || '알 수 없는 오류입니다.')
        );
      } else {
        setReplyInput('');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: any) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#050013',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e5e7eb',
        }}
      >
        관리자 인증 중입니다…
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
          maxWidth: 1120,
          borderRadius: 24,
          padding: 20,
          background:
            'radial-gradient(circle at top left,#312e81 0,#020016 55%,#000 100%)',
          border: '1px solid rgba(148,163,184,0.45)',
          boxShadow: '0 24px 60px rgba(15,23,42,0.75)',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 16,
        }}
      >
        {/* 좌측: 문의 목록 */}
        <aside
          style={{
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'rgba(15,23,42,0.96)',
            border: '1px solid rgba(148,163,184,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                margin: 0,
                color: '#a5b4fc',
              }}
            >
              UPLOG · ADMIN
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: 18,
                fontWeight: 700,
                color: '#f9fafb',
              }}
            >
              문의 목록
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 11,
                color: '#9ca3af',
              }}
            >
              계정별 문의를 모아보고, 선택 후 오른쪽에서 답변을 작성합니다.
            </p>
          </div>

          <div
            style={{
              marginTop: 8,
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {loadingMessages && (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  padding: '6px 4px',
                }}
              >
                문의 내역을 불러오는 중입니다…
              </div>
            )}

            {!loadingMessages && conversations.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  padding: '6px 4px',
                }}
              >
                아직 들어온 문의가 없습니다.
              </div>
            )}

            {conversations.map((conv) => {
              const active = conv.userId === activeUserId;
              const unread = conv.unreadCount > 0;

              const shortUser =
                conv.userId.length > 8
                  ? conv.userId.slice(0, 8) + '…'
                  : conv.userId;

              const timeLabel = new Date(conv.lastAt).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={conv.userId}
                  type="button"
                  onClick={() => setActiveUserId(conv.userId)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.7)',
                    padding: '8px 10px',
                    background: active
                      ? 'linear-gradient(90deg,#4c1d95,#1f2937)'
                      : 'rgba(15,23,42,0.9)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#e5e7eb',
                      }}
                    >
                      {shortUser}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#9ca3af',
                      }}
                    >
                      {timeLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: '#d1d5db',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.lastMessage}
                    </span>
                    {unread && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 999,
                          backgroundColor: '#f97316',
                          color: '#111827',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 우측: 대화 내용 + 답변 */}
        <section
          style={{
            borderRadius: 18,
            padding: 12,
            backgroundColor: 'rgba(15,23,42,0.96)',
            border: '1px solid rgba(148,163,184,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f9fafb',
                }}
              >
                {activeUserId
                  ? '선택한 문의 대화'
                  : '문의 대화를 선택해 주세요'}
              </h2>
              {activeUserId && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11,
                    color: '#9ca3af',
                  }}
                >
                  사용자 ID: {activeUserId}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 320,
              maxHeight: '60vh',
              borderRadius: 14,
              padding: 10,
              backgroundColor: 'rgba(17,24,39,0.96)',
              border: '1px solid rgba(148,163,184,0.7)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {(!activeUserId || loadingMessages) && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    padding: '6px 4px',
                  }}
                >
                  {loadingMessages
                    ? '문의 내역을 불러오는 중입니다…'
                    : '왼쪽에서 대화를 선택해 주세요.'}
                </div>
              )}

              {activeUserId &&
                !loadingMessages &&
                activeMessages.length === 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#9ca3af',
                      padding: '6px 4px',
                    }}
                  >
                    아직 이 사용자와의 대화가 없습니다.
                  </div>
                )}

              {activeMessages.map((msg) => {
                const isUser = msg.role === 'user';
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
                      justifyContent: isUser ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-start' : 'flex-end',
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9ca3af',
                        }}
                      >
                        {isUser ? '고객' : '운영자'}
                      </span>
                      <div
                        style={{
                          borderRadius: 18,
                          padding: '8px 12px',
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-line',
                          background: isUser
                            ? 'rgba(15,23,42,0.9)'
                            : 'linear-gradient(135deg,#fb7185,#a855f7)',
                          color: '#f9fafb',
                          border: isUser
                            ? '1px solid rgba(148,163,184,0.7)'
                            : '1px solid rgba(248,250,252,0.35)',
                          boxShadow: isUser
                            ? '0 4px 10px rgba(15,23,42,0.8)'
                            : '0 0 16px rgba(244,114,182,0.6)',
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
          </div>

          {/* 답변 입력 */}
          <div
            style={{
              borderRadius: 14,
              padding: 10,
              backgroundColor: 'rgba(17,24,39,0.98)',
              border: '1px solid rgba(148,163,184,0.7)',
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
              관리자 답변
            </label>
            <textarea
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={
                activeUserId
                  ? '선택한 고객에게 보낼 답변을 입력하세요. (Enter 전송 / Shift+Enter 줄바꿈)'
                  : '먼저 왼쪽에서 고객을 선택해 주세요.'
              }
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid rgba(156,163,175,0.8)',
                backgroundColor: 'rgba(15,23,42,0.95)',
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
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyInput.trim() || !activeUserId || sending}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    !replyInput.trim() || !activeUserId || sending
                      ? 'default'
                      : 'pointer',
                  background:
                    !replyInput.trim() || !activeUserId || sending
                      ? 'rgba(148,163,184,0.4)'
                      : 'linear-gradient(90deg,#fb7185,#a855f7)',
                  color: '#f9fafb',
                  boxShadow:
                    !replyInput.trim() || !activeUserId || sending
                      ? 'none'
                      : '0 0 14px rgba(244,114,182,0.55)',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? '전송 중…' : '답변 전송'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
