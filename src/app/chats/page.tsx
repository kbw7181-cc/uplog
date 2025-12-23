'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type ChatRoomRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
};

type ChatListItem = {
  id: string;
  otherUserId: string;
  isSelfRoom: boolean;
  title: string;
  description: string;
  created_at: string;
  profile?: {
    nickname: string | null;
    name: string | null;
    avatar_url: string | null;
  };
};

function pickName(p?: { nickname: string | null; name: string | null } | null) {
  return p?.nickname || p?.name || '친구';
}

export default function ChatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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
          router.replace('/login');
          return;
        }

        const myId = user.id;

        const { data: roomRows, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id, user1_id, user2_id, created_at')
          .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
          .order('created_at', { ascending: false });

        if (roomError) throw roomError;

        const rooms = (roomRows ?? []) as ChatRoomRow[];
        if (rooms.length === 0) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        // 상대/본인 프로필 조회용 id 모으기
        const idSet = new Set<string>();
        rooms.forEach((r) => {
          const isSelf = r.user1_id === myId && r.user2_id === myId;
          const otherId = isSelf ? myId : r.user1_id === myId ? r.user2_id : r.user1_id;
          idSet.add(otherId);
        });

        const allUserIds = Array.from(idSet);

        const profileMap = new Map<string, ProfileRow>();
        if (allUserIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, nickname, name, avatar_url')
            .in('user_id', allUserIds);

          if (profileError) throw profileError;

          (profiles ?? []).forEach((p: any) => {
            const row = p as ProfileRow;
            profileMap.set(row.user_id, row);
          });
        }

        const listItems: ChatListItem[] = rooms.map((r) => {
          const isSelfRoom = r.user1_id === myId && r.user2_id === myId;
          const otherUserId = isSelfRoom ? myId : r.user1_id === myId ? r.user2_id : r.user1_id;

          const prof = profileMap.get(otherUserId);
          const title = isSelfRoom ? '내 전용 메모방' : pickName(prof ?? null);
          const description = isSelfRoom
            ? '반론/멘트/감정을 혼자 정리하는 공간입니다.'
            : '친구와 반론/실적/멘트를 주고받는 대화방입니다.';

          return {
            id: r.id,
            otherUserId,
            isSelfRoom,
            title,
            description,
            created_at: r.created_at,
            profile: prof
              ? { nickname: prof.nickname, name: prof.name, avatar_url: prof.avatar_url }
              : undefined,
          };
        });

        if (!cancelled) {
          setItems(listItems);
          setLoading(false);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e.message ?? '채팅방을 불러오는 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const memoRoom = useMemo(() => items.find((x) => x.isSelfRoom), [items]);
  const friendRooms = useMemo(() => items.filter((x) => !x.isSelfRoom), [items]);

  return (
    <div className="min-h-screen bg-[#050509] text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">채팅 목록</h1>
            <p className="mt-1 text-xs text-zinc-400">
              친구를 누르면 채팅방으로 들어갑니다.
            </p>
          </div>
          <button
            onClick={() => router.push('/home')}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            홈으로
          </button>
        </header>

        {loading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
            채팅방을 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-950/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
            아직 채팅방이 없습니다.
            <br />
            친구 목록에서 <span className="font-semibold text-pink-400">“U P 채팅하기”</span>를 누르면
            <br />
            자동으로 방이 생성됩니다.
          </div>
        )}

        {memoRoom && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">내 메모 채팅방</h2>
            <button
              type="button"
              onClick={() => router.push(`/chats/${memoRoom.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left hover:bg-zinc-900/80"
            >
              <div className="flex items-center gap-3">
                <AvatarBubble
                  name="나"
                  avatarUrl={memoRoom.profile?.avatar_url ?? null}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{memoRoom.title}</span>
                  <span className="text-[11px] text-zinc-500">
                    오늘 들었던 반론/멘트/감정을 전부 이 방에 적어두세요.
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400">열기</span>
            </button>
          </section>
        )}

        {friendRooms.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">
              친구와의 채팅방 ({friendRooms.length})
            </h2>
            <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
              {friendRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => router.push(`/chats/${room.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-black/40 px-3 py-2 text-left text-sm hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <AvatarBubble
                      name={room.title}
                      avatarUrl={room.profile?.avatar_url ?? null}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{room.title}</span>
                      <span className="text-[11px] text-zinc-500">{room.description}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500">채팅 열기</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AvatarBubble({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initial = name && name.trim().charAt(0) ? name.trim().charAt(0) : '🙂';
  const src = avatarUrl ? getAvatarSrc(avatarUrl) : '';

  return (
    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500/80 to-pink-500/80 text-xs font-semibold">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="avatar" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
