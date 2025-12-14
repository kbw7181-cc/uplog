// src/app/friends/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchMyFriends,
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  ensureDirectChat,
} from '../../lib/uplogApi';
import type { Friend } from '../../types/uplog';

type FriendWithProfile = {
  id: string;
  status: Friend['status'];
  otherUserId: string;
  created_at: string;
  profile?: {
    name: string | null;
    avatar_url: string | null;
  };
};

export default function FriendsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 친구 요청 보내기용 상태
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  // ✅ 채팅 열기: ensureDirectChat 타입이 애매해도 빨간불 안 나게 안전 처리
  const openChat = async (otherUserIdRaw: string) => {
    try {
      const myId = userId;
      if (!myId) return;

      const otherId = (otherUserIdRaw ?? '').trim();
      if (!otherId) return;

      // ⚠️ ensureDirectChat 리턴 타입이 void로 되어있어도 여기서 강제 string 처리
      const chatId = (await ensureDirectChat(myId, otherId)) as unknown as string;

      if (!chatId || typeof chatId !== 'string') {
        throw new Error('채팅방 ID를 가져오지 못했어요. ensureDirectChat return을 확인해주세요.');
      }

      router.push(`/chats/${chatId}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? '채팅을 여는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.push('/login');
          return;
        }
        if (cancelled) return;

        setUserId(user.id);

        const rawFriends = await fetchMyFriends(user.id);
        if (cancelled) return;

        if (!rawFriends || rawFriends.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        const others = (rawFriends as any[]).map((f) =>
          f.user_id === user.id ? f.friend_id : f.user_id,
        );
        const uniqueOtherIds = Array.from(new Set(others));

        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', uniqueOtherIds);

        if (profileError) throw profileError;

        const profileMap = new Map<string, { name: string | null; avatar_url: string | null }>();

        (profileRows ?? []).forEach((p: any) => {
          profileMap.set(p.user_id, {
            name: p.name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });

        const merged: FriendWithProfile[] = (rawFriends as any[]).map((f) => {
          const otherUserId =
            f.user_id === user.id ? (f.friend_id as string) : (f.user_id as string);

          return {
            id: f.id as string,
            status: f.status as Friend['status'],
            created_at: f.created_at as string,
            otherUserId,
            profile: profileMap.get(otherUserId),
          };
        });

        setFriends(merged);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e.message ?? '친구 목록을 불러오는 중 오류가 발생했어요.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const accepted = useMemo(() => friends.filter((f) => f.status === 'accepted'), [friends]);
  const pending = useMemo(() => friends.filter((f) => f.status === 'pending'), [friends]);

  async function handleSendRequest() {
    if (!userId) {
      setSendMessage('로그인 정보가 없습니다.');
      return;
    }
    if (!targetUserId.trim()) {
      setSendMessage('상대방 user_id를 입력해주세요.');
      return;
    }
    if (targetUserId.trim() === userId) {
      setSendMessage('본인에게는 친구 요청을 보낼 수 없습니다.');
      return;
    }

    try {
      setSending(true);
      setSendMessage(null);

      await sendFriendRequest(userId, targetUserId.trim());
      setSendMessage('친구 요청을 보냈습니다. (status: pending)');
      setTargetUserId('');
      // 바로 갱신이 필요하면 새로고침(간단 버전)
      location.reload();
    } catch (e: any) {
      console.error(e);
      setSendMessage(e.message ?? '친구 요청 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050509] text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {/* 상단 헤더 */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">친구 목록</h1>
            <p className="mt-1 text-xs text-zinc-400">
              영업 동료들과 서로 힘이 되는 공간입니다.
            </p>
          </div>
          <button
            onClick={() => router.push('/home')}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            홈으로
          </button>
        </header>

        {/* 상태 표시 */}
        {loading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
            친구 목록 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-950/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && friends.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
            아직 등록된 친구가 없습니다.
            <br />
            앞으로 여기에서 동료들과 친구 맺고, 채팅/반론 공유까지 이어갈 거예요.
          </div>
        )}

        {/* 보류중(요청/대기) 섹션 */}
        {pending.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">대기 중인 친구</h2>
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              {pending.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <AvatarBubble name={f.profile?.name} />
                    <div className="flex flex-col">
                      <span className="font-medium">{f.profile?.name ?? '이름 미등록'}</span>
                      <span className="text-[11px] text-zinc-500">
                        친구 요청 상태: {f.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await acceptFriendRequest(f.id);
                        location.reload();
                      }}
                      className="rounded bg-indigo-600 px-2 py-1 text-xs"
                    >
                      수락
                    </button>
                    <button
                      onClick={async () => {
                        await declineFriendRequest(f.id);
                        location.reload();
                      }}
                      className="rounded bg-zinc-700 px-2 py-1 text-xs"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 친구 목록 섹션 */}
        {accepted.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">
              내 친구 {accepted.length}명
            </h2>
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              {accepted.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => openChat(f.otherUserId)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-left text-sm hover:bg-zinc-800/70"
                >
                  <div className="flex items-center gap-3">
                    <AvatarBubble name={f.profile?.name} />
                    <div className="flex flex-col">
                      <span className="font-medium">{f.profile?.name ?? '이름 미등록'}</span>
                      <span className="text-[11px] text-zinc-500">
                        통화/반론/채팅 기록은 여기서 이어집니다.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-400">채팅 열기</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 친구 요청 보내기 (user_id로 직접) */}
        <section className="mt-4 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            친구 요청 보내기 (user_id로 직접)
          </h2>
          <p className="mb-2 text-[11px] text-zinc-500">
            임시 테스트용입니다. 나중에는 프로필 화면에서 버튼으로 연결할 거예요.
          </p>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              placeholder="상대방 user_id 입력"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
            <button
              onClick={handleSendRequest}
              disabled={sending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {sending ? '보내는 중…' : '친구 요청'}
            </button>
          </div>

          {sendMessage && <p className="mt-2 text-[11px] text-zinc-300">{sendMessage}</p>}
        </section>

        {/* 맨 아래 안내 */}
        <p className="mt-4 text-[11px] text-zinc-500">
          ※ 이후 단계에서는 이 기능을 프로필 화면 버튼으로 옮기고,
          친구가 되면 자동으로 1:1 채팅방이 생성되도록 만들 예정입니다.
        </p>
      </div>
    </div>
  );
}

function AvatarBubble({ name }: { name: string | null | undefined }) {
  const initial = name && name.trim().charAt(0) ? name.trim().charAt(0) : '🙂';

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500/80 to-pink-500/80 text-xs font-semibold">
      {initial}
    </div>
  );
}
