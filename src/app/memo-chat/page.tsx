// src/app/memo-chat/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type ChatMessage = {
  id: string;
  role: 'me' | 'other';
  content: string;
  createdAt: string;
};

type ChatRoom = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  avatarInitial: string;
};

const STORAGE_PREFIX = 'uplog-chat-room-';

const BASE_ROOMS: ChatRoom[] = [
  {
    id: 'memo',
    title: '나와의 U P 메모',
    subtitle: '오늘의 마음 · 잘한 것 · 아쉬운 점',
    lastMessage: '오늘도 한 통 더 걸어본 나, 잘했어.',
    time: '오늘',
    unread: 0,
    isGroup: false,
    avatarInitial: 'U',
  },
  {
    id: 'team-up',
    title: 'UPLOG 팀 단톡방',
    subtitle: '영업 목표 · 아이디어 공유',
    lastMessage: '이번 주 목표 정리했어요. 같이 달려봐요!',
    time: '어제',
    unread: 0,
    isGroup: true,
    avatarInitial: '팀',
  },
  {
    id: 'kim',
    title: '김영업 팀장',
    subtitle: '뷰티 · TM 영업 · 6~9년',
    lastMessage: '오늘 미팅 후기 남겨주세요~',
    time: '오전 11:32',
    unread: 0,
    isGroup: false,
    avatarInitial: '김',
  },
  {
    id: 'park',
    title: '박성장 사원',
    subtitle: '보험 설계 · 2년차',
    lastMessage: '콜 리스트 정리되면 공유할게요!',
    time: '어제',
    unread: 0,
    isGroup: false,
    avatarInitial: '박',
  },
  {
    id: 'lee',
    title: '이멘탈 대리',
    subtitle: '교육 · 컨설팅 · 4~5년',
    lastMessage: '멘탈 흔들리면 바로 톡해요 🔥',
    time: '3일 전',
    unread: 0,
    isGroup: false,
    avatarInitial: '이',
  },
];

function getLastLine(text: string) {
  const firstLine = text.split('\n')[0];
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine;
}

export default function MemoChatListPage() {
  const router = useRouter();

  const [nickname, setNickname] = useState<string>('영업인');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>(BASE_ROOMS);

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
        const updated = BASE_ROOMS.map((base) => {
          try {
            const raw = window.localStorage.getItem(
              STORAGE_PREFIX + base.id
            );
            if (!raw) return { ...base };

            const parsed = JSON.parse(raw) as ChatMessage[];
            if (!parsed || parsed.length === 0) return { ...base };

            const last = parsed[parsed.length - 1];
            const timeLabel = new Date(last.createdAt).toLocaleTimeString(
              'ko-KR',
              { hour: '2-digit', minute: '2-digit', hour12: false }
            );

            return {
              ...base,
              lastMessage: getLastLine(last.content),
              time: timeLabel,
              unread: 0,
            };
          } catch {
            return { ...base };
          }
        });

        setRooms(updated);
      }
    };

    load();
  }, []);

  const handleOpenRoom = (roomId: string) => {
    router.push(`/memo-chat/${roomId}`);
  };

  const memoRoomAvatarInitial =
    nickname && nickname.trim().length > 0 ? nickname.trim()[0] : 'U';

  return (
    <div className="page-root">
      <div className="page-inner">
        {/* 헤더 */}
        <header className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push('/home')}
          >
            ← 대시보드로
          </button>

          <div className="header-center">
            <div className="header-pill">U P 채팅</div>
            <h1 className="header-title">나의 U P 채팅 목록</h1>
            <p className="header-sub">
              나와의 U P 메모, 친구들과의 대화, 팀 채팅을 한눈에 볼 수 있어요.
            </p>
          </div>
        </header>

        {/* 가로 가이드 바 */}
        <section className="guide-bar">
          <div className="guide-icon">!</div>
          <div className="guide-text">
            <div className="guide-title">채팅 이용 가이드</div>
            <div className="guide-lines">
              <span>비방 · 욕설 · 인신공격 금지</span>
              <span>개인정보(주민번호, 계좌번호 등) 공유 금지</span>
              <span>부적절한 사진·영상·파일 업로드 금지</span>
              <span>
                위 기준 반복 위반 시, 채팅·서비스 이용이 제한될 수 있어요.
              </span>
            </div>
          </div>
        </section>

        {/* 채팅방 리스트 */}
        <main className="main">
          <section className="chat-list-card">
            <div className="chat-list-header">
              <div>
                <div className="section-title">채팅방</div>
                <div className="section-sub">
                  자주 대화하는 친구/팀은 상단 즐겨찾기로 둘 수 있도록
                  이후에 기능을 확장할 수 있어요.
                </div>
              </div>
            </div>

            <ul className="room-list">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="room-item"
                  onClick={() => handleOpenRoom(room.id)}
                >
                  <div className="room-avatar-wrap">
                    <div
                      className={
                        'room-avatar ' +
                        (room.isGroup ? 'room-avatar-group' : '')
                      }
                    >
                      {room.id === 'memo' && profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileImage} alt="나의 프로필" />
                      ) : room.id === 'memo' ? (
                        memoRoomAvatarInitial
                      ) : (
                        room.avatarInitial
                      )}
                    </div>
                  </div>

                  <div className="room-main">
                    <div className="room-top-row">
                      <div className="room-title-row">
                        <span className="room-title">{room.title}</span>
                        {room.isGroup && (
                          <span className="room-badge">그룹</span>
                        )}
                      </div>
                      <span className="room-time">{room.time}</span>
                    </div>

                    <div className="room-middle-row">
                      <span className="room-subtitle">{room.subtitle}</span>
                    </div>

                    <div className="room-bottom-row">
                      <span className="room-last">{room.lastMessage}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
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
  background: radial-gradient(circle at top left, #f9d7ff 0, #f4ecff 40%, #e5f4ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.page-inner {
  max-width: 1180px;
  margin: 0 auto;
}

/* 헤더 */

.header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 18px;
  margin-bottom: 14px;
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

.header-center {
  text-align: center;
}

.header-pill {
  display: inline-flex;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(196, 181, 253, 0.9);
  font-size: 12px;
  color: #7c3aed;
  margin-bottom: 6px;
}

.header-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 4px;
}

.header-sub {
  font-size: 13px;
  color: #6b647e;
  line-height: 1.6;
}

/* 가로 가이드 바 */

.guide-bar {
  margin-bottom: 16px;
  border-radius: 18px;
  padding: 10px 16px;
  background: linear-gradient(90deg, #ec4899, #a855f7, #6366f1);
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fdf2ff;
  box-shadow: 0 14px 30px rgba(139, 92, 246, 0.45);
}

.guide-icon {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  color: #db2777;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
}

.guide-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.guide-title {
  font-size: 14px;
  font-weight: 800;
}

.guide-lines {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  font-size: 12px;
}

/* 메인 */

.main {
  margin-top: 4px;
}

.chat-list-card {
  border-radius: 22px;
  background: #ffffff;
  box-shadow:
    0 18px 36px rgba(0,0,0,0.18),
    0 0 0 1px rgba(255,255,255,0.8);
  border: 1px solid #dccfff;
  padding: 14px 16px 18px;
}

.chat-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: #6b41ff;
}

.section-sub {
  font-size: 13px;
  margin-top: 4px;
  color: #8c7ad9;
}

/* 채팅방 리스트 */

.room-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.room-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.16s ease;
  border: 1px solid transparent;
}

.room-item:hover {
  background: #faf5ff;
  border-color: #e0d4ff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}

.room-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 18px;
  box-shadow: 0 0 0 2px #ffffff;
  overflow: hidden;
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-avatar-group {
  background: radial-gradient(circle at top left, #f97316 0, #f973b7 40%, #7c3aed 100%);
}

.room-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.room-title {
  font-size: 15px;
  font-weight: 800;
  color: #241336;
}

.room-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
}

.room-time {
  font-size: 11px;
  color: #a49ad4;
}

.room-middle-row {
  font-size: 12px;
  color: #7a69c4;
}

.room-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.room-last {
  font-size: 13px;
  color: #4b3f6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 반응형 */

@media (max-width: 960px) {
  .page-root {
    padding: 16px;
  }
  .header {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .header-center {
    text-align: left;
  }
  .guide-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;
