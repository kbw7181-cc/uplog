// ✅ 파일: src/lib/chatRooms.ts
import { supabase } from '@/lib/supabaseClient';

// ✅ 방 찾기/생성은 무조건 RPC로만 (REST .or() 제거)
export async function getOrCreateRoomId(otherUserId: string) {
  if (!otherUserId) throw new Error('상대 유저 ID가 없습니다.');

  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) throw new Error('로그인이 필요합니다.');

  if (me === otherUserId) throw new Error('본인과는 채팅할 수 없습니다.');

  const { data, error } = await supabase.rpc('get_or_create_chat_room', {
    other_user_id: otherUserId,
  });

  if (error) throw error;
  if (!data) throw new Error('채팅방 ID 생성/조회에 실패했습니다.');

  return data as string; // roomId(uuid)
}
