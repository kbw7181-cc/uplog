// src/app/chats/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type ChatRoomRow = {
  id: string;
  member_a: string;
  member_b: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
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
    name: string | null;
    avatar_url: string | null;
  };
};

export default function ChatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) 로그인 유저 확인
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.push('/login');
          return;
        }

        const myId = user.id;
        if (cancelled) return;
        setUserId(myId);

        // 2) 내가 들어있는 채팅방 목록 가져오기
        const { data: roomRows, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id, member_a, member_b, created_at')
          .or(`member_a.eq.${myId},member_b.eq.${myId}`)
          .order('created_at', { ascending: false });

        if (roomError) throw roomError;
        const rooms = (roomRows ?? []) as ChatRoomRow[];

        if (rooms.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // 3) 상대방/본인 프로필용 user_id 모으기
        const idSet = new Set<string>();
        rooms.forEach((r) => {
          if (r.member_a === myId && r.member_b === myId) {
            // 내 메모방
            idSet.add(myId);
          } else {
            const otherId = r.member_a === myId ? r.member_b : r.member_a;
            idSet.add(otherId);
          }
        });

        const allUserIds = Array.from(idSet);
        let profileMap = new Map<
          string,
          { name: string | null; avatar_url: string | null }
        >();

        if (allUserIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
         .from('profiles')
         .select('id, name, avatar_url')
         .in('id', allUserIds);
          if (profileError) throw profileError;

          (profiles ?? []).forEach((p: any) => {
         const row = p as ProfileRow;
         profileMap.set(row.id, {
         name: row.name,
          avatar_url: row.avatar_url,
         });
     });

        }

        // 4) 화면에서 쓸 리스트 형태로 변환
        const listItems: ChatListItem[] = rooms.map((r) => {
          const isSelfRoom = r.member_a === myId && r.member_b === myId;
          const otherUserId = isSelfRoom
            ? myId
            : r.member_a === myId
            ? r.member_b
            : r.member_a;

          const profile = profileMap.get(otherUserId);
          const title = isSelfRoom
            ? '내 전용 메모방'
            : profile?.name ?? '이름 미등록';
          const description = isSelfRoom
            ? '반론/아이디어를 혼자 정리하는 공간입니다.'
            : '친구와 반론/실적을 주고받는 대화방입니다.';

          return {
            id: r.id,
            otherUserId,
            isSelfRoom,
            title,
            description,
            created_at: r.created_at,
            profile,
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

  const memoRoom = useMemo(
    () => items.find((x) => x.isSelfRoom),
    [items],
  );
  const friendRooms = useMemo(
    () => items.filter((x) => !x.isSelfRoom),
    [items],
  );

  return (
    <div className="min-h-screen bg-[#050509] text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {/* 상단 헤더 */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">채팅</h1>
            <p className="mt-1 text-xs text-zinc-400">
              반론, 실적, 감정 기록을 메모하거나 친구와 나누는 공간입니다.
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
            반론 아카이브에서{' '}
            <span className="font-semibold text-pink-400">“친구에게 공유하기”</span>
            를 누르면<br />
            자동으로 내 전용 메모방이 생성됩니다.
          </div>
        )}

        {/* 내 메모방 섹션 */}
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
                  name={memoRoom.profile?.name ?? '나'}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {memoRoom.title}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    오늘 들었던 반론, 떠오른 멘트들을 전부 이 방에 적어두세요.
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400">열기</span>
            </button>
          </section>
        )}

        {/* 친구와의 채팅방 섹션 */}
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
                    <AvatarBubble name={room.profile?.name ?? '친구'} />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {room.title}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {room.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    채팅 열기
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 안내 문구 */}
        {!loading && (
          <p className="mt-4 text-[11px] text-zinc-500">
            ※ 메모방에 쌓인 내용은 이후 AI 코치/통계 기능과 연동될 예정입니다.
          </p>
        )}
      </div>
    </div>
  );
}

function AvatarBubble({ name }: { name: string | null | undefined }) {
  const initial =
    name && name.trim().charAt(0)
      ? name.trim().charAt(0)
      : '🙂';

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500/80 to-pink-500/80 text-xs font-semibold">
      {initial}
    </div>
  );
}
