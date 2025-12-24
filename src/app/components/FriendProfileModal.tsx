'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normPair(a: string, b: string) {
  // ✅ 항상 작은 uid를 user_id로 저장
  return a < b ? { user_id: a, friend_id: b } : { user_id: b, friend_id: a };
}

type Props = {
  open: boolean;
  onClose: () => void;
  meId: string;
  targetUserId: string;
  targetNickname?: string;
};

export default function FriendProfileModal({ open, onClose, meId, targetUserId, targetNickname }: Props) {
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<any>(null);

  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [busy, setBusy] = useState(false);

  const safeTargetId = useMemo(() => (isUuid(targetUserId) ? targetUserId : ''), [targetUserId]);

  const canQuery = open && !!meId && !!safeTargetId && meId !== safeTargetId;

  useEffect(() => {
    if (!open) return;
    if (!meId || !safeTargetId) return;

    const run = async () => {
      setLoading(true);

      // ✅ 프로필 로드 (필드 최소 안전)
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('user_id, nickname, name, avatar_url, career, company, team, likes_count, posts_count, feedback_count')
          .eq('user_id', safeTargetId)
          .maybeSingle();

        setTarget(p ?? null);
      } catch {
        setTarget(null);
      }

      // ✅ 친구 상태 체크 (friends 테이블)
      try {
        if (meId === safeTargetId) {
          setFriendStatus('accepted');
        } else {
          const pair = normPair(meId, safeTargetId);
          const { data, error } = await supabase
            .from('friends')
            .select('status')
            .eq('user_id', pair.user_id)
            .eq('friend_id', pair.friend_id)
            .maybeSingle();

          if (error || !data?.status) setFriendStatus('none');
          else if (data.status === 'accepted') setFriendStatus('accepted');
          else setFriendStatus('pending');
        }
      } catch {
        setFriendStatus('none');
      }

      setLoading(false);
    };

    run();
  }, [open, meId, safeTargetId]);

  const displayName = target?.nickname || target?.name || targetNickname || '친구';
  const career = target?.career ? String(target.career) : '';
  const company = target?.company ? String(target.company) : '';
  const team = target?.team ? String(target.team) : '';

  const likesN = Number(target?.likes_count ?? 0);
  const postsN = Number(target?.posts_count ?? 0);
  const feedbackN = Number(target?.feedback_count ?? 0);

  const onChat = () => {
    window.location.href = `/chats/open?to=${safeTargetId}`;
  };

  const onAddFriend = async () => {
    if (!canQuery) return;
    setBusy(true);
    try {
      const pair = normPair(meId, safeTargetId);

      // ✅ pending 업서트
      const { error } = await supabase
        .from('friends')
        .upsert(
          { user_id: pair.user_id, friend_id: pair.friend_id, status: 'pending' },
          { onConflict: 'user_id,friend_id' as any }
        );

      if (error) {
        console.error('add friend error', error);
        alert('친구 요청 중 오류가 발생했어요.');
      } else {
        setFriendStatus('pending');
      }
    } finally {
      setBusy(false);
    }
  };

  const onRemoveFriend = async () => {
    if (!canQuery) return;
    setBusy(true);
    try {
      const pair = normPair(meId, safeTargetId);
      const { error } = await supabase.from('friends').delete().eq('user_id', pair.user_id).eq('friend_id', pair.friend_id);

      if (error) {
        console.error('remove friend error', error);
        alert('친구 해제 중 오류가 발생했어요.');
      } else {
        setFriendStatus('none');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fp-backdrop" onClick={onClose}>
      <div className="fp-panel" onClick={(e) => e.stopPropagation()}>
        <button className="fp-close" onClick={onClose} type="button">
          ✕
        </button>

        <div className="fp-title">프로필</div>

        {loading ? (
          <div className="fp-loading">불러오는 중...</div>
        ) : (
          <>
            <div className="fp-card">
              <div className="fp-name">{displayName}</div>

              <div className="fp-meta">
                {career && <span className="fp-pill">경력 {career}</span>}
                {company && <span className="fp-pill">{company}</span>}
                {team && <span className="fp-pill">{team}</span>}
              </div>

              <div className="fp-stats">
                <span className="fp-stat">좋아요 <b>{likesN}</b></span>
                <span className="fp-stat">게시글 <b>{postsN}</b></span>
                <span className="fp-stat">피드백 <b>{feedbackN}</b></span>
              </div>

              <div className="fp-actions">
                <button type="button" className="fp-btn fp-chat" onClick={onChat}>
                  💬 채팅하기
                </button>

                {/* ✅ 친구면 "친구해제(빨강)" / 아니면 "친구하기(핑크퍼플)" */}
                {friendStatus === 'accepted' ? (
                  <button type="button" className="fp-btn fp-remove" onClick={onRemoveFriend} disabled={busy}>
                    친구해제
                  </button>
                ) : (
                  <button type="button" className="fp-btn fp-add" onClick={onAddFriend} disabled={busy}>
                    {friendStatus === 'pending' ? '친구요청중' : '친구하기'}
                  </button>
                )}
              </div>

              {/* ✅ 상태 텍스트(작게) */}
              <div className="fp-status">
                {friendStatus === 'accepted' && <span className="st ok">이미 친구입니다</span>}
                {friendStatus === 'pending' && <span className="st wait">친구 요청 대기중</span>}
                {friendStatus === 'none' && <span className="st none">아직 친구가 아니에요</span>}
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          .fp-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 80;
            padding: 18px;
          }
          .fp-panel {
            width: 420px;
            max-width: 94vw;
            border-radius: 26px;
            background: #fff;
            box-shadow: 0 28px 70px rgba(15, 23, 42, 0.38);
            border: 1px solid rgba(226, 232, 240, 0.95);
            padding: 16px;
            position: relative;
          }
          .fp-close {
            position: absolute;
            top: 10px;
            right: 12px;
            width: 34px;
            height: 34px;
            border-radius: 999px;
            border: none;
            background: #f3f4ff;
            cursor: pointer;
            font-weight: 900;
            color: #4b2d7a;
          }
          .fp-title {
            font-size: 18px;
            font-weight: 950;
            color: #1b1030;
            margin-bottom: 10px;
          }
          .fp-loading {
            padding: 22px 6px;
            color: #7a69c4;
            font-weight: 900;
          }
          .fp-card {
            border-radius: 20px;
            border: 1px solid rgba(217, 204, 255, 0.85);
            background: rgba(255, 255, 255, 0.98);
            padding: 14px;
          }
          .fp-name {
            font-size: 22px;
            font-weight: 950;
            color: #2a1236;
          }
          .fp-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .fp-pill {
            font-size: 12px;
            font-weight: 950;
            padding: 5px 10px;
            border-radius: 999px;
            background: #f4f0ff;
            color: #352153;
            border: 1px solid rgba(217, 204, 255, 0.75);
          }
          .fp-stats {
            display: flex;
            gap: 10px;
            margin-top: 12px;
            flex-wrap: wrap;
          }
          .fp-stat {
            font-size: 13px;
            font-weight: 950;
            color: #3a1f62;
            background: #faf7ff;
            border: 1px solid rgba(229, 221, 255, 0.8);
            padding: 8px 10px;
            border-radius: 14px;
          }
          .fp-stat b {
            color: #ff4f9f;
          }

          .fp-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 14px;
          }
          .fp-btn {
            height: 44px;
            border-radius: 16px;
            border: none;
            cursor: pointer;
            font-weight: 950;
            font-size: 14px;
          }
          .fp-chat {
            color: #fff;
            background: linear-gradient(135deg, rgba(244, 114, 182, 0.92), rgba(168, 85, 247, 0.9));
            box-shadow: 0 14px 22px rgba(0, 0, 0, 0.12);
          }
          .fp-add {
            color: #fff;
            background: linear-gradient(135deg, rgba(244, 114, 182, 0.92), rgba(168, 85, 247, 0.9));
            box-shadow: 0 14px 22px rgba(0, 0, 0, 0.12);
          }
          .fp-remove {
            color: #fff;
            background: linear-gradient(135deg, rgba(248, 113, 113, 0.95), rgba(239, 68, 68, 0.95));
            box-shadow: 0 14px 22px rgba(0, 0, 0, 0.12);
          }
          .fp-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .fp-status {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
          }
          .st {
            font-weight: 950;
            font-size: 12px;
            padding: 6px 10px;
            border-radius: 999px;
            border: 1px solid rgba(226, 232, 240, 0.9);
          }
          .st.ok {
            background: rgba(16, 185, 129, 0.12);
            color: #0f766e;
            border-color: rgba(16, 185, 129, 0.3);
          }
          .st.wait {
            background: rgba(168, 85, 247, 0.10);
            color: #6d28d9;
            border-color: rgba(168, 85, 247, 0.28);
          }
          .st.none {
            background: rgba(244, 114, 182, 0.10);
            color: #be185d;
            border-color: rgba(244, 114, 182, 0.28);
          }
        `}</style>
      </div>
    </div>
  );
}
