// src/components/ShareRebuttalButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { shareRebuttalToChat } from '../lib/uplogApi';

type Props = {
  rebuttalId: string;
  chatId: string;
};

export default function ShareRebuttalButton({ rebuttalId, chatId }: Props) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleShare() {
    try {
      setSending(true);
      setMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMsg('로그인이 필요합니다.');
        return;
      }

      await shareRebuttalToChat(rebuttalId, chatId, user.id);
      setMsg('채팅방으로 전송되었습니다.');
    } catch (e: any) {
      console.error(e);
      setMsg(e.message ?? '전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleShare}
        disabled={sending}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {sending ? '전송 중…' : '이 반론을 채팅으로 보내기'}
      </button>
      {msg && <p className="text-[11px] text-zinc-300">{msg}</p>}
    </div>
  );
}
