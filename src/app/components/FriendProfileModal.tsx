'use client';

import { useEffect } from 'react';

export type FriendProfile = {
  // ✅ 친구 UID (profiles.user_id)
  user_id: string;

  // ✅ 표시용
  nickname: string;
  name?: string | null;

  // ✅ 프로필 상세
  career?: string | null;   // 경력 (예: "10년 이상")
  company?: string | null;  // 회사명
  team?: string | null;     // 팀명
  role?: string | null;     // (예: "팀장/사원/대리" 등)
  badgeEmoji?: string | null; // 배지 이모지 (예: "👑" "🔥" "💎")

  // ✅ 상태
  online?: boolean;
};

export default function FriendProfileModal({
  open,
  friend,
  onClose,
  onChat,
  onCheer,
}: {
  open: boolean;
  friend: FriendProfile | null;
  onClose: () => void;
  onChat: (friend: FriendProfile) => void;
  onCheer: (friend: FriendProfile) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !friend) return null;

  const displayName = friend.nickname || friend.name || '친구';
  const initial = displayName.trim().charAt(0) || '🙂';
  const badge = (friend.badgeEmoji || '').trim();
  const role = (friend.role || '').trim();
  const career = (friend.career || '').trim();
  const company = (friend.company || '').trim();
  const team = (friend.team || '').trim();
  const online = !!friend.online;

  return (
    <div className="fp-backdrop" onMouseDown={onClose}>
      <div className="fp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fp-top">
          <div className="fp-avatar">
            <span>{initial}</span>
            <span className={'fp-dot ' + (online ? 'on' : 'off')} />
          </div>

          <div className="fp-meta">
            <div className="fp-name-row">
              <div className="fp-name">
                {displayName}
                {badge ? <span className="fp-badge">{badge}</span> : null}
              </div>
              <button className="fp-x" onClick={onClose} aria-label="닫기">
                ×
              </button>
            </div>

            <div className="fp-sub">
              {role ? <span className="fp-pill">{role}</span> : null}
              {career ? <span className="fp-pill soft">{career}</span> : null}
              {company ? <span className="fp-pill soft2">{company}</span> : null}
              {team ? <span className="fp-pill soft2">{team}</span> : null}
            </div>

            <div className="fp-desc">
              대화는 <b>U P 채팅</b>에서 이어집니다.
            </div>
          </div>
        </div>

        <div className="fp-actions">
          <button className="fp-btn primary" onClick={() => onChat(friend)}>
            U P 채팅하기
          </button>
          <button className="fp-btn ghost" onClick={() => onCheer(friend)}>
            응원하기
          </button>
        </div>
      </div>

      <style jsx>{`
        .fp-backdrop{
          position: fixed; inset: 0;
          background: rgba(10, 6, 14, 0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          z-index: 9999;
        }
        .fp-panel{
          width: min(560px, 96vw);
          border-radius: 22px;
          background: rgba(255,255,255,0.96);
          border: 2px solid rgba(180,120,255,0.35);
          box-shadow: 0 30px 80px rgba(30, 10, 60, 0.25);
          overflow: hidden;
        }
        .fp-top{
          display: flex; gap: 14px;
          padding: 16px 16px 12px 16px;
          background:
            radial-gradient(600px 180px at 12% 0%, rgba(255, 215, 245, 0.95) 0%, rgba(255,255,255,0) 60%),
            radial-gradient(600px 220px at 88% 0%, rgba(230, 220, 255, 0.95) 0%, rgba(255,255,255,0) 65%);
        }
        .fp-avatar{
          position: relative;
          width: 54px; height: 54px;
          border-radius: 18px;
          display: grid; place-items: center;
          color: #230b35;
          font-weight: 950;
          background: linear-gradient(135deg, rgba(255,120,205,0.35), rgba(150,120,255,0.35));
          border: 2px solid rgba(255,110,210,0.35);
        }
        .fp-avatar span{ font-size: 22px; }
        .fp-dot{
          position: absolute; left: -6px; top: 50%;
          transform: translateY(-50%);
          width: 12px; height: 12px; border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 8px 18px rgba(0,0,0,0.12);
        }
        .fp-dot.on{ background: #22c55e; }
        .fp-dot.off{ background: #9ca3af; }

        .fp-meta{ flex: 1; min-width: 0; }
        .fp-name-row{
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .fp-name{
          font-size: 18px;
          font-weight: 950;
          color: #2a0f3a;
          letter-spacing: -0.2px;
          display: flex; align-items: center; gap: 8px;
        }
        .fp-badge{
          font-size: 18px;
          filter: drop-shadow(0 6px 10px rgba(180, 60, 255, 0.25));
        }
        .fp-x{
          width: 34px; height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(50, 20, 80, 0.12);
          background: rgba(255,255,255,0.85);
          color: rgba(60, 20, 90, 0.75);
          font-size: 18px;
          cursor: pointer;
        }
        .fp-x:hover{ background: rgba(255,255,255,1); }

        .fp-sub{
          margin-top: 6px;
          display: flex; flex-wrap: wrap;
          gap: 6px;
        }
        .fp-pill{
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,110,210,0.35);
          background: rgba(255, 230, 245, 0.65);
          color: #521a6a;
          font-weight: 800;
        }
        .fp-pill.soft{
          border-color: rgba(150,120,255,0.25);
          background: rgba(240, 232, 255, 0.65);
          color: #3b1a63;
        }
        .fp-pill.soft2{
          border-color: rgba(60,20,90,0.10);
          background: rgba(255,255,255,0.80);
          color: rgba(45, 12, 65, 0.85);
          font-weight: 850;
        }

        .fp-desc{
          margin-top: 8px;
          font-size: 12px;
          color: rgba(45, 12, 65, 0.72);
          font-weight: 800;
        }

        .fp-actions{
          display: flex;
          gap: 10px;
          padding: 14px 16px 16px 16px;
          background: rgba(255,255,255,0.92);
          border-top: 1px solid rgba(60,20,90,0.08);
        }
        .fp-btn{
          flex: 1;
          height: 44px;
          border-radius: 999px;
          font-weight: 950;
          letter-spacing: -0.2px;
          cursor: pointer;
          border: none;
        }
        .fp-btn.primary{
          color: white;
          background: linear-gradient(135deg, #ff5fb8, #7a5cff);
          box-shadow: 0 16px 35px rgba(120, 70, 255, 0.28);
        }
        .fp-btn.primary:hover{ filter: brightness(1.02); }
        .fp-btn.ghost{
          background: rgba(255,255,255,0.92);
          border: 2px solid rgba(150,120,255,0.35);
          color: #2a0f3a;
        }
        .fp-btn.ghost:hover{
          background: rgba(245, 240, 255, 0.85);
        }
      `}</style>
    </div>
  );
}
