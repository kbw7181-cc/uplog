import { supabase } from '@/lib/supabaseClient';

export async function openRoom(
  myId: string,
  targetId: string
): Promise<string> {
  // ✅ 나와의 채팅도 허용 (myId === targetId)
  const a = myId <= targetId ? myId : targetId;
  const b = myId <= targetId ? targetId : myId;

  // 1) 기존 방 조회
  const { data: exist, error: selErr } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('user1_id', a)
    .eq('user2_id', b)
    .maybeSingle();

  if (selErr) throw selErr;
  if (exist?.id) return exist.id;

  // 2) 없으면 생성
  const { data: created, error: insErr } = await supabase
    .from('chat_rooms')
    .insert({ user1_id: a, user2_id: b })
    .select('id')
    .single();

  if (insErr) throw insErr;
  return created.id;
}
