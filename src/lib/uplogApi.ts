// src/lib/uplogApi.ts
import { supabase } from './supabaseClient';
import type { Friend } from '../types/uplog';

/**
 * ✅ 친구 목록: 내가 포함된 friend row 전부 가져오기
 * - 테이블명이 다르면 여기서만 바꾸면 됨 (기본: friends)
 */
export async function fetchMyFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Friend[];
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

/**
 * ✅ 친구 요청 보내기
 */
export async function sendFriendRequest(myUserId: string, targetUserId: string) {
  // 중복 방지(선택): 기존 row 있으면 그냥 리턴
  const { data: exists, error: existErr } = await supabase
    .from('friends')
    .select('id')
    .or(
      `and(user_id.eq.${myUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${myUserId})`,
    )
    .maybeSingle();

  if (existErr && existErr.code !== 'PGRST116') throw existErr; // maybeSingle no rows
  if (exists?.id) return;

  const { error } = await supabase.from('friends').insert({
    user_id: myUserId,
    friend_id: targetUserId,
    status: 'pending',
  });

  if (error) throw error;
}

/**
 * ✅ 1:1 채팅방 보장
 * - "빨간불"의 핵심: 반드시 string(chatId)을 return 해야 함.
 * - 우선은 DB 없이도 돌아가게 "결정적 chatId"를 만들어 라우팅 가능하게 처리.
 * - 나중에 chats 테이블 실제 연동으로 바꿔도 FriendsPage는 그대로 사용 가능.
 */
export async function ensureDirectChat(myUserId: string, otherUserId: string): Promise<string> {
  const a = (myUserId ?? '').trim();
  const b = (otherUserId ?? '').trim();
  if (!a || !b) throw new Error('채팅 생성에 필요한 유저 정보가 없습니다.');

  // ✅ 항상 같은 조합이면 같은 chatId가 나오게(정렬)
  const chatId = [a, b].sort().join('__direct__');

  // (선택) 실제 테이블이 있으면 여기서 upsert 가능:
  // await supabase.from('chats').upsert({ id: chatId, type: 'direct', user_a: a, user_b: b });

  return chatId;
}
