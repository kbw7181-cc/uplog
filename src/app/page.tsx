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
];

function getLastLine(text: string) {
  const firstLine = text.split('\n')[0];
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine;
}

export default function MemoChatListPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>(BASE_ROOMS);

  useEffect(() => {
    const load = async () => {
      if (typeof window !== 'undefined') {
        const updated = BASE_ROOMS.map((base) => {
          try {
            const raw = window.localStorage.getItem(STORAGE_PREFIX + base.id);
            if (!raw) return base;
            const parsed = JSON.parse(raw) as ChatMessage[];
            if (!parsed.length) return base;

            const last = parsed[parsed.length - 1];
            return {
              ...base,
              lastMessage: getLastLine(last.content),
              time: new Date(last.createdAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
            };
          } catch {
            return base;
          }
        });
        setRooms(updated);
      }
    };
    load();
  }, []);

  return (
    <div className="page-root">
      <header className="hero">
        <div className="hero-top">
          <button className="back-btn" onClick={() => router.push('/home')}>
            ← 대시보드
          </button>
          <span className="hero-pill">U P 채팅</span>
        </div>

        <h1 className="hero-title">나의 U P 채팅 목록</h1>
        <p className="hero-sub">
          나와의 U P 메모, 친구들과의 대화, 팀 채팅을 한눈에 볼 수 있어요.
        </p>

        {/* ✅ 통일된 가이드 + 마스코트 */}
        <div className="coach-wrap">
          <div className="coach-bubble">
            <span className="coach-tag">채팅 가이드</span>
            <p className="coach-text">
              <b>비방·욕설</b> 금지 · <b>개인정보</b> 공유 금지 ·{' '}
              <b>부적절한 파일</b> 업로드 금지<br />
              반복 위반 시_toggle 제한될 수 있어요.
            </p>
          </div>

          <img
            src="/assets/upzzu3.png"
            alt="업쮸"
            className="coach-mascot"
            draggable={false}
          />
        </div>
      </header>

      <main className="chat-card">
        <h2 className="section-title">채팅방</h2>

        <ul className="room-list">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="room-item"
              onClick={() => router.push(`/memo-chat/${room.id}`)}
            >
              <div className="room-avatar">{room.avatarInitial}</div>
              <div className="room-main">
                <div className="room-top">
                  <span className="room-title">{room.title}</span>
                  <span className="room-time">{room.time}</span>
                </div>
                <div className="room-sub">{room.subtitle}</div>
                <div className="room-last">{room.lastMessage}</div>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <style jsx>{`
        .page-root {
          min-height: 100vh;
          padding: 20px;
          background: radial-gradient(circle at top left, #f9d7ff, #eef2ff);
          font-family: system-ui, sans-serif;
        }

        .hero {
          border-radius: 26px;
          padding: 18px;
          background: linear-gradient(135deg, #f472b6, #8b5cf6);
          color: #fff;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-btn {
          border-radius: 999px;
          border: none;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.9);
          font-weight: 700;
        }

        .hero-pill {
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          font-weight: 800;
        }

        .hero-title {
          margin-top: 12px;
          font-size: 26px;
          font-weight: 900;
        }

        .hero-sub {
          font-size: 14px;
          opacity: 0.95;
        }

        /* ✅ 핵심 통일 영역 */
        .coach-wrap {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .coach-bubble {
          flex: 1;
          max-width: 520px; /* 말풍선 줄임 */
          background: #fff;
          border-radius: 20px;
          padding: 14px 16px;
          color: #3b2163;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }

        .coach-tag {
          display: inline-block;
          margin-bottom: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ec4899, #a855f7);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .coach-text {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.5;
        }

        .coach-mascot {
          width: 150px;   /* ✅ 크게 고정 */
          height: 150px;
          object-fit: contain;
          animation: float 2.4s ease-in-out infinite;
        }

        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }

        .chat-card {
          margin-top: 16px;
          background: #fff;
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 18px 36px rgba(0,0,0,0.16);
        }

        .section-title {
          font-size: 16px;
          font-weight: 900;
          color: #7c3aed;
        }

        .room-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .room-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 16px;
          cursor: pointer;
        }

        .room-item:hover {
          background: #faf5ff;
        }

        .room-avatar {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: linear-gradient(135deg, #f472b6, #8b5cf6);
          color: #fff;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .room-main {
          flex: 1;
        }

        .room-top {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
        }

        .room-sub {
          font-size: 12px;
          color: #7a69c4;
        }

        .room-last {
          font-size: 13px;
          color: #4b3f6b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
