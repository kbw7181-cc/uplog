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
  const [hasShare, setHasShare] = useState(false);

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

        if (anyProfile?.nickname) setNickname(anyProfile.nickname);
        else if (anyProfile?.name) setNickname(anyProfile.name);
        else if (user.email) setNickname(user.email.split('@')[0]);

        if (anyProfile?.avatar_url) setProfileImage(anyProfile.avatar_url);
      }

      if (typeof window !== 'undefined') {
        const shared = window.sessionStorage.getItem('uplog-share-to-chat');
        if (shared && shared.trim()) setHasShare(true);

        const updated = BASE_ROOMS.map((base) => {
          try {
            const raw = window.localStorage.getItem(STORAGE_PREFIX + base.id);
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
        <header className="hero">
          <div className="hero-top">
            <button
              type="button"
              className="back-btn"
              onClick={() => router.push('/home')}
              aria-label="대시보드로 이동"
            >
              ← 대시보드
            </button>

            <div className="hero-pill">U P 채팅</div>
          </div>

          <h1 className="hero-title">나의 U P 채팅 목록</h1>
          <p className="hero-sub">
            나와의 U P 메모, 친구들과의 대화, 팀 채팅을 한눈에 볼 수 있어요.
          </p>

          <div className="coach-wrap">
            <div className="coach-bubble">
              <div className="coach-tag">채팅 가이드</div>
              <div className="coach-text">
                <b>비방·욕설</b> 금지 · <b>개인정보</b> 공유 금지 ·{' '}
                <b>부적절한 파일</b> 업로드 금지
                <br />
                반복 위반 시 이용이 제한될 수 있어요.
              </div>
            </div>

            <img
              className="coach-mascot"
              src="/assets/upzzu3.png"
              alt="업쮸"
              draggable={false}
            />
          </div>
        </header>

        {hasShare && (
          <section className="share-hint">
            <span className="share-badge">반론 스크립트 준비됨</span>
            <span className="share-text">
              방금 만든 반론 스크립트를 공유할 친구를 선택해 주세요.
            </span>
          </section>
        )}

        <main className="main">
          <section className="chat-list-card">
            <div className="chat-list-header">
              <div>
                <div className="section-title">채팅방</div>
                <div className="section-sub">
                  자주 대화하는 친구/팀은 상단 즐겨찾기로 둘 수 있도록 이후에
                  기능을 확장할 수 있어요.
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
  --coachSize: 120px; /* ✅ 기본 업쮸 크기(통일) */
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, #f9d7ff 0, #f4ecff 40%, #e5f4ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.page-inner { max-width: 1180px; margin: 0 auto; }

/* HERO */
.hero{
  border-radius: 28px;
  padding: 18px 18px 16px;
  background: radial-gradient(circle at top left, rgba(255,158,213,0.95) 0, rgba(168,85,247,0.92) 45%, rgba(99,102,241,0.90) 100%);
  border: 1px solid rgba(255,255,255,0.35);
  box-shadow: 0 18px 40px rgba(139,92,246,0.25);
}

.hero-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}

.back-btn{
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.55);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 900;
  background: rgba(255,255,255,0.78);
  color: #6b21a8;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(0,0,0,0.10);
}

.hero-pill{
  display:inline-flex;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
  border: 1px solid rgba(255,255,255,0.35);
  font-size: 12px;
  font-weight: 900;
  color: rgba(255,255,255,0.95);
}

.hero-title{
  margin: 12px 0 2px;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: 1.5px;
  color: #fff;
  text-shadow: 0 10px 22px rgba(0,0,0,0.18);
}

.hero-sub{
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: rgba(255,255,255,0.92);
  line-height: 1.55;
}

/* 가이드 + 업쮸 */
.coach-wrap{
  margin-top: 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 14px;
}

.coach-bubble{
  position: relative;
  flex: 1;
  max-width: 560px;
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,240,255,0.92));
  box-shadow: 0 12px 26px rgba(0,0,0,0.10);
  border: 1px solid rgba(255,255,255,0.75);
}

.coach-bubble:after{
  content:'';
  position:absolute;
  right:-6px;
  top:50%;
  transform: translateY(-50%) rotate(45deg);
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,240,255,0.92));
  border-right: 1px solid rgba(255,255,255,0.75);
  border-bottom: 1px solid rgba(255,255,255,0.75);
}

.coach-tag{
  display:inline-flex;
  align-items:center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
  color:#fff;
  background: linear-gradient(90deg, #ec4899, #a855f7);
  box-shadow: 0 8px 18px rgba(236,72,153,0.35);
  margin-bottom: 6px;
}

.coach-text{
  font-size: 13px;
  font-weight: 900;
  color: #3b2163;
  line-height: 1.55;
}
.coach-text b{ color: #ec4899; }

/* ✅ 업쮸: 여기 “단 한 번만” 정의 (통일감 핵심) */
.coach-mascot{
  flex: 0 0 auto;
  width: var(--coachSize);
  height: var(--coachSize);
  object-fit: contain;
  background: transparent;
  border: none;
  box-shadow: none;
  filter: drop-shadow(0 14px 20px rgba(0,0,0,0.18));
  user-select:none;
  pointer-events:none;
  animation: upzzu-float 2.4s ease-in-out infinite;
}

/* 둥둥 + 살짝 흔들 */
@keyframes upzzu-float{
  0%   { transform: translateY(0) rotate(0deg); }
  35%  { transform: translateY(-6px) rotate(-1deg); }
  70%  { transform: translateY(-2px) rotate(1deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* 반론 공유 안내 */
.share-hint {
  margin-top: 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #fef2ff;
  border: 1px dashed #f9a8d4;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9d174d;
}

.share-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #be185d;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.share-text { font-size: 12px; font-weight: 800; }

/* 리스트 카드 */
.main { margin-top: 8px; }

.chat-list-card {
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.8);
  border: 1px solid #dccfff;
  padding: 14px 16px 18px;
}

.chat-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}

.section-title { font-size: 16px; font-weight: 900; color: #6b41ff; }

.section-sub {
  font-size: 13px;
  margin-top: 4px;
  color: #8c7ad9;
  font-weight: 800;
}

.room-list { list-style: none; margin: 0; padding: 0; }

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

.room-avatar-wrap { display: flex; align-items: center; justify-content: center; }

.room-avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 900;
  font-size: 18px;
  box-shadow: 0 0 0 2px #ffffff;
  overflow: hidden;
}

.room-avatar img { width: 100%; height: 100%; object-fit: cover; }

.room-avatar-group {
  background: radial-gradient(circle at top left, #f97316 0, #f973b7 40%, #7c3aed 100%);
}

.room-main { display: flex; flex-direction: column; gap: 2px; }

.room-top-row { display: flex; justify-content: space-between; align-items: center; }

.room-title-row { display: flex; align-items: center; gap: 6px; }

.room-title { font-size: 15px; font-weight: 900; color: #241336; }

.room-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 900;
}

.room-time { font-size: 11px; color: #a49ad4; font-weight: 900; }

.room-middle-row { font-size: 12px; color: #7a69c4; font-weight: 800; }

.room-bottom-row { display: flex; gap: 8px; margin-top: 4px; }

.room-last {
  font-size: 13px;
  color: #4b3f6b;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 반응형 */
@media (max-width: 960px) {
  .page-root { padding: 16px; }
  .page-root { --coachSize: 104px; } /* ✅ 태블릿 */
  .coach-wrap{ justify-content: flex-start; }
}

@media (max-width: 520px) {
  .page-root { --coachSize: 92px; }  /* ✅ 모바일에서도 “작아보이지 않게” */
  .hero{ padding: 16px 14px 14px; }
  .hero-title{ font-size: 22px; letter-spacing: 0.8px; }
  .coach-wrap{ gap: 10px; }
  .coach-text{ font-size: 12.5px; }
}
`;
