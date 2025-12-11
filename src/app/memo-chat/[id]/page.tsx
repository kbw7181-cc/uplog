// src/app/memo-chat/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type ChatMessage = {
  id: string;
  role: 'me' | 'other';
  content: string;
  createdAt: string;
};

const STORAGE_PREFIX = 'uplog-chat-room-';

const ROOM_META: Record<
  string,
  { title: string; subtitle: string; placeholder: string }
> = {
  memo: {
    title: '나와의 U P 메모',
    subtitle: '오늘의 마음 · 잘한 점 · 아쉬운 점을 그냥 다 쏟아내 주세요.',
    placeholder: '오늘 있었던 일, 감정, 떠오르는 반론 연습 내용을 적어 보세요.',
  },
  'team-up': {
    title: 'UPLOG 팀 단톡방',
    subtitle: '팀 목표, 아이디어, 오늘의 이슈를 같이 정리해 보세요.',
    placeholder: '팀원들과 나누고 싶은 내용을 적어 보세요.',
  },
  kim: {
    title: '김영업 팀장',
    subtitle: '뷰티 · TM 영업 · 6~9년, 멘토 같은 팀장님.',
    placeholder: '팀장님께 공유할 소식이나 질문을 적어 보세요.',
  },
  park: {
    title: '박성장 사원',
    subtitle: '보험 설계 · 2년차, 같이 성장하는 동료.',
    placeholder: '오늘 영업 이야기를 편하게 남겨 보세요.',
  },
  lee: {
    title: '이멘탈 대리',
    subtitle: '교육 · 컨설팅 · 멘탈 관리 담당(?) 대리님.',
    placeholder: '멘탈 흔들릴 때 털어놓고 싶은 말을 적어 보세요.',
  },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function MemoChatRoomPage() {
  const params = useParams();
  const router = useRouter();

  const roomIdRaw = params?.id;
  const roomId =
    typeof roomIdRaw === 'string'
      ? roomIdRaw
      : Array.isArray(roomIdRaw)
      ? roomIdRaw[0]
      : 'memo';

  const meta = ROOM_META[roomId] ?? ROOM_META['memo'];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState<string>('나');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // 프로필 + 기존 채팅 + 공유 텍스트 적용
  useEffect(() => {
    const load = async () => {
      // 1) 유저 프로필
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
          setNickname(user.email.split('@')[0] ?? '나');
        }

        if (anyProfile?.avatar_url) {
          setProfileImage(anyProfile.avatar_url);
        }
      }

      if (typeof window === 'undefined') return;

      // 2) 기존 채팅
      let loaded: ChatMessage[] = [];
      try {
        const raw = window.localStorage.getItem(
          STORAGE_PREFIX + roomId,
        );
        if (raw) {
          loaded = JSON.parse(raw) as ChatMessage[];
        }
      } catch {
        loaded = [];
      }

      // 3) 반론 아카이브에서 공유된 텍스트가 있으면 이 방에만 추가
      try {
        const shared = window.sessionStorage.getItem(
          'uplog-share-to-chat',
        );
        if (shared && shared.trim()) {
          const newMsg: ChatMessage = {
            id: 'share-' + Date.now().toString(),
            role: 'me',
            content: shared,
            createdAt: new Date().toISOString(),
          };
          loaded = [...loaded, newMsg];

          window.localStorage.setItem(
            STORAGE_PREFIX + roomId,
            JSON.stringify(loaded),
          );

          window.sessionStorage.removeItem('uplog-share-to-chat');
        }
      } catch {
        // 무시
      }

      setMessages(loaded);
    };

    load();
  }, [roomId]);

  const saveMessages = (next: ChatMessage[]) => {
    setMessages(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_PREFIX + roomId,
        JSON.stringify(next),
      );
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'me',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    saveMessages([...messages, newMsg]);
    setInput('');
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="room-root">
      <div className="room-inner">
        {/* 헤더 */}
        <header className="room-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push('/memo-chat')}
          >
            ← 채팅 목록으로
          </button>

          <div className="room-header-main">
            <h1 className="room-title">{meta.title}</h1>
            <p className="room-sub">{meta.subtitle}</p>
          </div>
        </header>

        {/* 안내 바 */}
        <section className="share-info">
          <span className="share-pill">TIP</span>
          <p className="share-text">
            반론 아카이브에서 공유한 스크립트가 있다면,
            이 방의 가장 아래쪽에 자동으로 추가돼요. 이어서 대표님 말투에 맞게 수정해 보세요.
          </p>
        </section>

        {/* 메시지 영역 */}
        <main className="room-main">
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="message-empty">
                아직 대화가 없습니다. 아래 입력창에 첫 메시지를 남겨 보세요.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    'message-row ' + (m.role === 'me' ? 'me' : 'other')
                  }
                >
                  {m.role === 'other' && (
                    <div className="avatar avatar-other">친</div>
                  )}

                  <div className="bubble-wrap">
                    <div className="bubble">{m.content}</div>
                    <div className="time">{formatTime(m.createdAt)}</div>
                  </div>

                  {m.role === 'me' && (
                    <div className="avatar avatar-me">
                      {profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileImage} alt="나의 프로필" />
                      ) : (
                        (nickname?.[0] ?? '나')
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>

        {/* 입력 영역 */}
        <footer className="room-input-area">
          <div className="input-card">
            <textarea
              className="input-textarea"
              rows={2}
              placeholder={meta.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="send-btn"
              onClick={handleSend}
            >
              전송
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.room-root {
  min-height: 100vh;
  padding: 20px 16px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, #f9d7ff 0, #f4ecff 40%, #e5f4ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.room-inner {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100vh - 40px);
}

.room-header {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
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

.room-header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-title {
  font-size: 22px;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  -webkit-background-clip: text;
  color: transparent;
}

.room-sub {
  font-size: 13px;
  color: #6b647e;
}

.share-info {
  margin-top: 4px;
  padding: 8px 12px;
  border-radius: 18px;
  background: linear-gradient(90deg, #ec4899, #a855f7, #6366f1);
  color: #fdf2ff;
  display: flex;
  gap: 10px;
  align-items: center;
  box-shadow: 0 10px 20px rgba(139,92,246,0.45);
}

.share-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  color: #db2777;
  font-size: 11px;
  font-weight: 800;
}

.share-text {
  font-size: 12px;
  line-height: 1.5;
}

.room-main {
  flex: 1;
  min-height: 0;
}

.message-list {
  background: #ffffff;
  border-radius: 22px;
  padding: 14px 12px;
  box-shadow:
    0 18px 36px rgba(0,0,0,0.18),
    0 0 0 1px rgba(255,255,255,0.8);
  border: 1px solid #dccfff;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.message-empty {
  font-size: 13px;
  color: #9b8bdc;
}

.message-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-row.me {
  justify-content: flex-end;
}

.bubble-wrap {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bubble {
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-row.me .bubble {
  background: linear-gradient(135deg, #f97316, #ec4899);
  color: #fff7fb;
  border-bottom-right-radius: 4px;
}

.message-row.other .bubble {
  background: #f4f4ff;
  color: #362b4b;
  border-bottom-left-radius: 4px;
}

.time {
  font-size: 11px;
  color: #a1a1aa;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  overflow: hidden;
  box-shadow: 0 0 0 2px #ffffff;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-other {
  background: radial-gradient(circle at top left, #38bdf8 0, #6366f1 60%);
}

.room-input-area {
  margin-top: 4px;
}

.input-card {
  background: #ffffff;
  border-radius: 22px;
  padding: 10px 10px 10px 14px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  border: 1px solid #e5ddff;
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
}

.input-textarea {
  flex: 1;
  border-radius: 18px;
  border: 1px solid #d8cffd;
  padding: 8px 10px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: #faf7ff;
}

.input-textarea:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}

.send-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 800;
  background: linear-gradient(135deg, #f153aa, #a855f7);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(148,60,180,0.45);
}

@media (max-width: 840px) {
  .room-inner {
    gap: 10px;
  }
  .room-header {
    grid-template-columns: 1fr;
  }
  .share-info {
    align-items: flex-start;
  }
}
`;
