// ✅ 파일: src/lib/uplogApi.ts
import { supabase } from '@/lib/supabaseClient';

// ✅ (교체) 1:1 채팅방 보장 생성/조회
// 전략:
// 1) RPC 몇 개 이름으로 시도
// 2) 테이블 fallback을 "여러 후보 테이블"로 순차 시도
//    - direct_chats
//    - chat_rooms
//    - chats
//    - direct_rooms
//
// 어떤 테이블이든 "id"만 얻어오면 성공으로 본다.
export async function ensureDirectChat(myId: string, otherId: string) {
  if (!myId || !otherId) throw new Error('ensureDirectChat: user id가 비었어요.');
  if (myId === otherId) throw new Error('본인과는 채팅방을 만들 수 없어요.');

  // ✅ 정규화(순서 고정)로 중복 방지
  const a = myId < otherId ? myId : otherId;
  const b = myId < otherId ? otherId : myId;

  // 1) RPC 우선 시도 (있으면 가장 깔끔)
  {
    const tryNames = ['ensure_direct_chat', 'ensureDirectChat', 'get_or_create_direct_chat'];
    for (const fn of tryNames) {
      // 1차 파라미터
      try {
        const { data, error } = await supabase.rpc(fn as any, { my_id: a, other_id: b });
        if (!error && data) return data;
      } catch {}

      // 2차 파라미터(키 다를 때)
      try {
        const { data, error } = await supabase.rpc(fn as any, {
          user_id: a,
          other_user_id: b,
        });
        if (!error && data) return data;
      } catch {}
    }
  }

  // 2) 테이블 fallback
  // ✅ 후보 테이블/컬럼 패턴을 여러 개 넣는다.
  // (대표님 프로젝트에서 실제 이름이 뭐든 하나는 걸릴 확률이 큼)
  const tableCandidates: Array<{
    table: string;
    // "두 유저를 나타내는 컬럼 세트" 후보들
    pairCols: Array<{ c1: string; c2: string }>;
  }> = [
    {
      table: 'direct_chats',
      pairCols: [
        { c1: 'user1_id', c2: 'user2_id' },
        { c1: 'user_id', c2: 'other_user_id' },
        { c1: 'a_user_id', c2: 'b_user_id' },
      ],
    },
    {
      table: 'chat_rooms',
      pairCols: [
        { c1: 'user1_id', c2: 'user2_id' },
        { c1: 'member1_id', c2: 'member2_id' },
        { c1: 'a_user_id', c2: 'b_user_id' },
      ],
    },
    {
      table: 'chats',
      pairCols: [
        { c1: 'user1_id', c2: 'user2_id' },
        { c1: 'sender_id', c2: 'receiver_id' },
        { c1: 'a_user_id', c2: 'b_user_id' },
      ],
    },
    {
      table: 'direct_rooms',
      pairCols: [
        { c1: 'user1_id', c2: 'user2_id' },
        { c1: 'a_user_id', c2: 'b_user_id' },
      ],
    },
  ];

  // ✅ 실제 시도 함수
  async function tryTable(table: string, c1: string, c2: string) {
    // 2-1) 기존 방 조회
    const sel = await supabase
      .from(table)
      .select('id')
      .eq(c1, a)
      .eq(c2, b)
      .maybeSingle();

    // 테이블이 없거나 컬럼이 없으면 여기서 error에 메시지 들어옴
    if (sel.error) return { ok: false as const, reason: sel.error.message };

    if (sel.data?.id) return { ok: true as const, id: sel.data.id as string };

    // 2-2) 없으면 생성
    const ins = await supabase
      .from(table)
      .insert({ [c1]: a, [c2]: b } as any)
      .select('id')
      .single();

    if (ins.error) return { ok: false as const, reason: ins.error.message };

    return { ok: true as const, id: ins.data.id as string };
  }

  const debugReasons: string[] = [];

  for (const cand of tableCandidates) {
    for (const cols of cand.pairCols) {
      const r = await tryTable(cand.table, cols.c1, cols.c2);
      if (r.ok) return { chat_id: r.id };

      debugReasons.push(`[${cand.table}.${cols.c1}/${cols.c2}] ${r.reason}`);
    }
  }

  // 여기까지 왔으면:
  // - 테이블이 하나도 없거나
  // - RLS 때문에 select/insert가 막혀 있거나
  // - 컬럼명이 전부 달라서 못 찾은 것
  console.error('ensureDirectChat fallback failed:', debugReasons);
  throw new Error(
    '채팅방을 만들 수 없어요. (테이블명/컬럼명 또는 RLS 문제)\n' +
      '콘솔 로그 ensureDirectChat fallback failed를 확인해주세요.',
  );
}
// ✅ friends/page.tsx import 호환용 export 보정

export async function fetchMyFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) throw error;
  return data ?? [];
}

export async function sendFriendRequest(myId: string, otherId: string) {
  const { error } = await supabase
    .from('friends')
    .insert({ user_id: myId, friend_id: otherId, status: 'pending' });

  if (error) throw error;
}

export async function acceptFriendRequest(friendRowId: string) {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', friendRowId);

  if (error) throw error;
}

export async function declineFriendRequest(friendRowId: string) {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'declined' })
    .eq('id', friendRowId);

  if (error) throw error;
}
