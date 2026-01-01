// ✅✅✅ 전체복붙: src/app/chats/open/OpenChatClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function sort2(a: string, b: string) {
  return a <= b ? [a, b] : [b, a];
}

export default function OpenChatClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const to = (sp.get('to') ?? '').trim();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const safeTo = useMemo(() => to, [to]);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErr('로그인이 필요합니다.');
          return;
        }

        if (!safeTo) {
          setErr('대상(to)이 없습니다.');
          return;
        }

        // self-chat 허용(원하면 막아도 됨)
        const [u1, u2] = sort2(user.id, safeTo);

        // ✅ 1) 기존 방 찾기
        const { data: found, error: findErr } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('user1_id', u1)
          .eq('user2_id', u2)
          .maybeSingle();

        if (findErr) throw findErr;

        if (found?.id) {
          router.replace(`/chats/${found.id}`);
          return;
        }

        // ✅ 2) 새 방 생성
        const { data: created, error: createErr } = await supabase
          .from('chat_rooms')
          .insert({ user1_id: u1, user2_id: u2 })
          .select('id')
          .single();

        if (createErr) throw createErr;

        router.replace(`/chats/${created.id}`);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message ?? '채팅방 생성 중 오류');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [router, safeTo]);

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      {loading && <div>채팅방 여는 중…</div>}
      {err && (
        <div style={{ opacity: 0.9 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>오류</div>
          <div>{err}</div>
          <button
            onClick={() => router.push('/chats')}
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            채팅 목록으로
          </button>
        </div>
      )}
    </div>
  );
}
