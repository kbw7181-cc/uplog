// src/app/memo-chat/[roomId]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type ChatMessage = {
  id: string;
  role: 'me' | 'other';
  content: string;
  createdAt: string;
};

type RoomMeta = {
  id: string;
  title: string;
  subtitle: string;
};

const STORAGE_PREFIX = 'uplog-chat-room-';

const ROOM_META: Record<string, RoomMeta> = {
  memo: {
    id: 'memo',
    title: '나와의 U P 메모',
    subtitle: '오늘의 마음 · 최근 기록',
  },
  'team-up': {
    id: 'team-up',
    title: 'UPLOG 팀 단톡방',
    subtitle: '영업 목표 · 아이디어 공유',
  },
  kim: {
    id: 'kim',
    title: '김영업 팀장',
    subtitle: '뷰티 · TM 영업 · 피드백',
  },
  park: {
    id: 'park',
    title: '박성장 사원',
    subtitle: '콜 · 리스트 · 성장 기록',
  },
  lee: {
    id: 'lee',
    title: '이멘탈 대리',
    subtitle: '멘탈 관리 · 고민 나누기',
  },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MemoChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = (params?.roomId as string) || 'memo';

  const meta = ROOM_META[roomId] ?? ROOM_META['memo'];

  const [nickname, setNickname] = useState<string>('영업인');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const avatarInitial =
    nickname && nickname.trim().length > 0 ? nickname.trim()[0] : 'U';

  // 프로필 + 기존 메시지 로드
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        const anyProfile = profile as any;

        if (anyProfile?.nickname) {
          setNickname(anyProfile.nickname);
        } else if (anyProfile?.name) {
          setNickname(anyProfile.name);
        } else if (user.email) {
          setNickname(user.email.split('@')[0]);
        }

        if (anyProfile?.avatar_url) {
          setProfileImage(anyProfile.avatar_url);
        }
      }

      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(
          STORAGE_PREFIX + roomId
        );

        if (raw) {
          try {
            const arr = JSON.parse(raw) as ChatMessage[];
            if (Array.isArray(arr) && arr.length > 0) {
              setMessages(arr);
              return;
            }
          } catch {
            // ignore
          }
        }

        // 기본 예시 메시지
        const initial: ChatMessage[] =
          roomId === 'memo'
            ? [
                {
                  id: 'm1',
                  role: 'other',
                  content:
                    '오늘 있었던 일, 감정, 잘한 점을 자유롭게 적어 보세요. 기록은 대표님의 성장 그래프가 됩니다.',
                  createdAt: new Date().toISOString(),
                },
              ]
            : [
                {
                  id: 'g1',
                  role: 'other',
                  content: '첫 메시지를 남겨 보세요. 편하게 이야기 나눠요 :)',
                  createdAt: new Date().toISOString(),
                },
              ];

        setMessages(initial);
        window.localStorage.setItem(
          STORAGE_PREFIX + roomId,
          JSON.stringify(initial)
        );
      }
    };

    load();
  }, [roomId]);

  // 스크롤 항상 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'me',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, msg];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          STORAGE_PREFIX + roomId,
          JSON.stringify(next)
        );
      }
      return next;
    });

    setInput('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMyMessageId = useMemo(() => {
    const mine = [...messages].filter((m) => m.role === 'me');
    return mine.length ? mine[mine.length - 1].id : null;
  }, [messages]);

  return (
    <div className="page-root">
      <div className="page-inner">
        {/* 상단 바 */}
        <header className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push('/memo-chat')}
          >
            ← 채팅방 목록
          </button>
        </header>

        {/* 방 헤더 */}
        <section className="room-header">
          <div className="room-avatar">
            {profileImage && meta.id === 'memo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt="나의 프로필" />
            ) : (
              avatarInitial
            )}
          </div>
          <div className="room-text">
            <div className="room-title">{meta.title}</div>
            <div className="room-subtitle">{meta.subtitle}</div>
          </div>
          {meta.id === 'memo' && (
            <span className="room-tag">U P 채팅</span>
          )}
        </section>

        {/* 채팅 영역 */}
        <main className="chat-card">
          <div className="chat-scroll" ref={scrollRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  'chat-row ' + (m.role === 'me' ? 'chat-row-me' : 'chat-row-other')
                }
              >
                {m.role === 'other' && (
                  <div className="chat-avatar chat-avatar-other">
                    {meta.id === 'memo' ? 'U' : meta.title[0]}
                  </div>
                )}
                <div className="chat-bundle">
                  <div
                    className={
                      'chat-bubble ' +
                      (m.role === 'me' ? 'chat-bubble-me' : 'chat-bubble-other')
                    }
                  >
                    {m.content}
                  </div>
                  <div className="chat-meta">
                    <span className="chat-time">
                      {formatDateTime(m.createdAt)}
                    </span>
                    {m.role === 'me' && m.id === lastMyMessageId && (
                      <span className="chat-read">읽음</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 입력 영역 */}
          <div className="input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                meta.id === 'memo'
                  ? '오늘 있었던 일, 감정, 잘한 점을 자유롭게 적어 보세요.\nEnter: 전송, Shift+Enter: 줄바꿈'
                  : '메시지를 입력해 주세요.\nEnter: 전송, Shift+Enter: 줄바꿈'
              }
            />
            <button type="button" className="send-btn" onClick={handleSend}>
              전송
            </button>
          </div>
        </main>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.page-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, #ffd7f5 0, #f4ecff 40%, #e5f4ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.page-inner {
  max-width: 1180px;
  margin: 0 auto;
}

/* 헤더 */

.header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
}

.back-btn {
  border-radius: 999px;
  border: none;
  padding: 8px 14px;
  font-size: 13px;
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(0,0,0,0.12);
  color: #6b21a8;
  cursor: pointer;
}

/* 방 헤더 */

.room-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, #fef3ff, #ffe4f3);
  box-shadow: 0 16px 32px rgba(0,0,0,0.12);
  margin-bottom: 10px;
}

.room-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 900;
  font-size: 22px;
  overflow: hidden;
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-text {
  flex: 1;
}

.room-title {
  font-size: 18px;
  font-weight: 800;
  color: #29113e;
}

.room-subtitle {
  font-size: 13px;
  color: #7b6bb9;
}

.room-tag {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef9c3;
  color: #92400e;
}

/* 채팅 카드 */

.chat-card {
  margin-top: 8px;
  border-radius: 26px;
  background: #ffffff;
  padding: 14px 18px 16px;
  box-shadow:
    0 22px 44px rgba(0,0,0,0.18),
    0 0 0 1px rgba(255,255,255,0.8);
  border: 1px solid #e0d4ff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-scroll {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
}

/* 채팅 행 */

.chat-row {
  display: flex;
  margin-bottom: 8px;
}

.chat-row:last-child {
  margin-bottom: 0;
}

.chat-row-me {
  justify-content: flex-end;
}

.chat-row-other {
  justify-content: flex-start;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6b21a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  margin-right: 8px;
}

.chat-bundle {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-bubble {
  padding: 9px 12px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-bubble-me {
  background: linear-gradient(135deg, #f973c5, #a855f7);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.chat-bubble-other {
  background: #f4f0ff;
  color: #2b193f;
  border-bottom-left-radius: 4px;
}

.chat-meta {
  font-size: 11px;
  color: #a09ad0;
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.chat-time {
  white-space: nowrap;
}

.chat-read {
  color: #10b981;
}

/* 입력 영역 */

.input-area {
  margin-top: 4px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: flex-end;
}

.input-area textarea {
  width: 100%;
  min-height: 76px;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid #e0d4ff;
  padding: 9px 12px;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}

.send-btn {
  width: 84px;
  height: 76px;
  border-radius: 20px;
  border: none;
  background: linear-gradient(135deg, #fb7185, #a855f7);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(0,0,0,0.25);
}

/* 반응형 */

@media (max-width: 960px) {
  .page-root {
    padding: 16px;
  }
  .chat-card {
    padding: 12px 12px 14px;
  }
  .chat-bundle {
    max-width: 80%;
  }
}
`;
