'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// chat_rooms 제약: user1_id <= user2_id
function sortPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

export default function ChatOpenPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const to = sp.get('to') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  // ✅ same to 반복 실행 방지
  const lastToRef = useRef<string>('');

  const canRun = useMemo(() => isUuid(to), [to]);

  useEffect(() => {
    const run = async () => {
      if (!canRun) {
        setStatus('error');
        setMsg('잘못된 대상(to) 값입니다.');
        return;
      }
      if (lastToRef.current === to && status === 'loading') return;
      lastToRef.current = to;

      setStatus('loading');
      setMsg('채팅방을 여는 중...');

      // 1) me
      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (uErr || !user?.id) {
        setStatus('error');
        setMsg('로그인이 필요합니다.');
        router.replace('/login');
        return;
      }

      const me = user.id;
      if (!isUuid(me)) {
        setStatus('error');
        setMsg('내 사용자 정보가 올바르지 않습니다.');
        return;
      }

      const [u1, u2] = sortPair(me, to);

      try {
        // 2) 기존 room 찾기
        const { data: exist, error: exErr } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('user1_id', u1)
          .eq('user2_id', u2)
          .maybeSingle();

        if (!exErr && exist?.id) {
          setStatus('done');
          router.replace(`/chats/${exist.id}`);
          return;
        }

        // 3) 없으면 생성
        const { data: created, error: cErr } = await supabase
          .from('chat_rooms')
          .insert({ user1_id: u1, user2_id: u2 })
          .select('id')
          .maybeSingle();

        if (cErr) {
          // 레이스 컨디션: 동시에 만들다 실패했을 수 있으니 한번 더 조회
          const { data: exist2 } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('user1_id', u1)
            .eq('user2_id', u2)
            .maybeSingle();

          if (exist2?.id) {
            setStatus('done');
            router.replace(`/chats/${exist2.id}`);
            return;
          }

          setStatus('error');
          setMsg('채팅방 생성에 실패했어요.');
          console.error('chat_rooms insert error', cErr);
          return;
        }

        if (created?.id) {
          setStatus('done');
          router.replace(`/chats/${created.id}`);
          return;
        }

        setStatus('error');
        setMsg('채팅방을 열 수 없어요.');
      } catch (e) {
        console.error('chat open fatal', e);
        setStatus('error');
        setMsg('채팅방 열기 중 오류가 발생했어요.');
      }
    };

    // ✅ to 바뀔 때마다 실행되게
    if (!to) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, canRun]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 22, fontWeight: 900 }}>채팅 여는 중…</div>
      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
        {status === 'loading' ? '채팅방을 준비하고 있어요.' : status === 'error' ? msg : '이동 중입니다.'}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => router.replace('/chats')} style={{ padding: '8px 12px', borderRadius: 10 }}>
          채팅 목록으로
        </button>
      </div>
    </div>
  );
}
