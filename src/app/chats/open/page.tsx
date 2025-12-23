'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function sortTwo(a: string, b: string) {
  return a <= b ? [a, b] : [b, a];
}

async function openOrCreateRoom(myId: string, otherId: string) {
  const [u1, u2] = sortTwo(myId, otherId);

  const { data: found, error: fErr } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .maybeSingle();

  if (fErr) throw fErr;
  if (found?.id) return found.id as string;

  const { data: created, error: cErr } = await supabase
    .from('chat_rooms')
    .insert({ user1_id: u1, user2_id: u2 })
    .select('id')
    .single();

  if (cErr) throw cErr;
  return created.id as string;
}

export default function ChatsOpenPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const to = (sp.get('to') || '').trim();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      const myId = data?.user?.id || '';

      if (error || !myId) {
        router.replace('/login');
        return;
      }

      // to가 비었거나 UUID가 아니면 그냥 목록으로
      if (!to || !isUuid(to)) {
        router.replace('/chats');
        return;
      }

      try {
        const roomId = await openOrCreateRoom(myId, to);
        router.replace(`/chats/${roomId}`);
      } catch (e) {
        console.error(e);
        router.replace('/chats');
      }
    })();
  }, [router, to]);

  return (
    <div style={{ padding: 22, fontWeight: 900, color: '#2a0f3a' }}>
      채팅방 여는 중…
    </div>
  );
}
