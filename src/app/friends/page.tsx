'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  user_id: string;
  nickname: string | null;
  name: string | null;
};

export default function FriendsPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.replace('/login');
        return;
      }

      const uid = auth.user.id;
      setMe(uid);

      // 👉 일단 전체 유저를 친구처럼 표시 (관리자 포함)
      const { data } = await supabase
        .from('profiles')
        .select('user_id, nickname, name')
        .neq('user_id', uid);

      setFriends((data || []) as Profile[]);
    })();
  }, [router]);

  async function openChat(otherId: string) {
    if (!me) return;

    const a = me < otherId ? me : otherId;
    const b = me < otherId ? otherId : me;

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('user1_id', a)
      .eq('user2_id', b)
      .maybeSingle();

    if (room?.id) {
      router.push(`/chats/${room.id}`);
      return;
    }

    const { data: created } = await supabase
      .from('chat_rooms')
      .insert({ user1_id: a, user2_id: b })
      .select('id')
      .single();

    if (created?.id) {
      router.push(`/chats/${created.id}`);
    }
  }

  return (
    <ClientShell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
        <h2 style={{ fontWeight: 900, marginBottom: 12 }}>친구목록</h2>

        {friends.length === 0 && (
          <div style={{ opacity: 0.6 }}>아직 친구가 없습니다.</div>
        )}

        {friends.map((f) => (
  <div
    key={f.user_id}
    onClick={() => openChat(f.user_id)}
    style={{
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 20,
      padding: '16px 18px',
      marginBottom: 12,
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(40,10,70,0.10)',
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <span>{f.nickname || f.name || '사용자'}</span>
    <span style={{ opacity: 0.4 }}>›</span>
  </div>
))}

      </div>
    </ClientShell>
  );
}
