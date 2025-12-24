'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type RoomRow = {
  id: string;
  user1_id: string;
  user2_id: string;
};

type MsgRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function pickName(p?: { nickname?: string | null; name?: string | null } | null) {
  return p?.nickname || p?.name || '상대';
}

function readKey(roomId: string) {
  return `uplog.chat.readAt.${roomId}`;
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String((params as any)?.id || '');

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState('');
  const [meProfile, setMeProfile] = useState<ProfileRow | null>(null);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [otherId, setOtherId] = useState('');
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null);

  const otherName = useMemo(() => pickName(otherProfile), [otherProfile]);

  const lastMsgAt = useMemo(() => {
    if (!msgs.length) return '';
    return msgs[msgs.length - 1]?.created_at || '';
  }, [msgs]);

  const readAt = useMemo(() => {
    try {
      const v = localStorage.getItem(readKey(roomId));
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  }, [roomId]);

  const isUnread = useMemo(() => {
    if (!lastMsgAt) return false;
    const t = new Date(lastMsgAt).getTime();
    return Number.isFinite(t) && t > readAt;
  }, [lastMsgAt, readAt]);

  const meName = useMemo(() => pickName(meProfile), [meProfile]);
  const meAvatar = useMemo(() => getAvatarSrc(meProfile?.avatar_url || ''), [meProfile]);
  const otherAvatar = useMemo(() => getAvatarSrc(otherProfile?.avatar_url || ''), [otherProfile]);

  // ✅ 메시지 늘어나면 하단으로
  useEffect(() => {
    const t = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 60);
    return () => clearTimeout(t);
  }, [msgs.length]);

  // ✅ 방 들어오면 읽음 처리(로컬)
  useEffect(() => {
    if (!roomId || !isUuid(roomId)) return;
    if (!msgs.length) return;
    try {
      localStorage.setItem(readKey(roomId), String(Date.now()));
    } catch {}
  }, [roomId, msgs.length]);

  useEffect(() => {
    let alive = true;
    let cleanup: null | (() => void) = null;

    async function boot() {
      try {
        if (!roomId || !isUuid(roomId)) {
          router.replace('/chats');
          return;
        }

        // 1) 내 uid
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || '';
        if (!uid) {
          router.replace('/login');
          return;
        }
        if (!alive) return;
        setMeId(uid);

        // 2) 내 프로필
        const { data: mp } = await supabase
          .from('profiles')
          .select('user_id,nickname,name,avatar_url')
          .eq('user_id', uid)
          .maybeSingle();
        if (alive) setMeProfile((mp as any) || null);

        // 3) 방
        const { data: r, error: rErr } = await supabase
          .from('chat_rooms')
          .select('id,user1_id,user2_id')
          .eq('id', roomId)
          .maybeSingle();

        if (rErr) console.error('roomErr', rErr);
        if (!r) {
          router.replace('/chats');
          return;
        }
        if (!alive) return;
        setRoom(r as any);

        // 4) 상대 uid
        const other =
          r.user1_id === uid ? r.user2_id : r.user2_id === uid ? r.user1_id : '';
        setOtherId(other || '');

        // 5) 상대 프로필
        if (other && isUuid(other)) {
          const { data: op } = await supabase
            .from('profiles')
            .select('user_id,nickname,name,avatar_url')
            .eq('user_id', other)
            .maybeSingle();
          if (alive) setOtherProfile((op as any) || null);
        }

        // 6) 메시지 로드 (✅ content만)
        const { data: m, error: mErr } = await supabase
          .from('chat_messages')
          .select('id,room_id,sender_id,content,created_at')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (mErr) console.error('msgsErr', mErr);
        if (alive) setMsgs((m as any) || []);

        // 7) realtime
        const channel = supabase
          .channel(`room:${roomId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
            (payload) => {
              const row = payload.new as any;
              const safe: MsgRow = {
                id: row.id,
                room_id: row.room_id,
                sender_id: row.sender_id,
                content: row.content ?? '',
                created_at: row.created_at,
              };
              setMsgs((prev) => [...prev, safe]);
            }
          )
          .subscribe();

        cleanup = () => {
          supabase.removeChannel(channel);
        };

        if (alive) setLoading(false);
      } catch (e) {
        console.error(e);
        if (alive) setLoading(false);
      }
    }

    boot();

    return () => {
      alive = false;
      if (cleanup) cleanup();
    };
  }, [roomId, router]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    if (!meId || !isUuid(roomId)) return;

    setText('');

    const { error } = await supabase.from('chat_messages').insert([
      { room_id: roomId, sender_id: meId, content: v },
    ]);

    if (error) {
      console.error('sendErr', error);
      setText(v);
    }
  }

  if (loading) {
    return (
      <ClientShell>
        <div style={{ padding: 24, fontSize: 18, fontWeight: 950, color: '#2a1236' }}>
          채팅 불러오는 중…
        </div>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '10px 10px 110px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 26,
            border: '1px solid rgba(90,40,120,0.14)',
            boxShadow: '0 22px 60px rgba(40,10,70,0.14)',
            overflow: 'hidden',
          }}
        >
          {/* ✅ 깔끔 상단: 상대 프로필 + 닉네임 + 와의 UP채팅방 + 읽음점 + 목록 */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid rgba(90,40,120,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'rgba(255,255,255,0.90)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: '3px solid rgba(255,79,161,0.55)',
                  background: '#fff',
                  flex: '0 0 auto',
                  display: 'grid',
                  placeItems: 'center',
                }}
                title={otherName}
              >
                {otherAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otherAvatar} alt={otherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 26 }}>🙂</span>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 950,
                      color: '#2a1236',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '58vw',
                    }}
                  >
                    {otherName}
                  </div>

                  {/* ✅ 읽음/안읽음 점 */}
                  <span
                    title={isUnread ? '안읽음' : '읽음'}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: isUnread ? '#ff2d55' : '#22c55e',
                      boxShadow: isUnread ? '0 0 0 3px rgba(255,45,85,0.12)' : '0 0 0 3px rgba(34,197,94,0.10)',
                      display: 'inline-block',
                      flex: '0 0 auto',
                    }}
                  />
                </div>
                <div style={{ marginTop: 2, fontSize: 14, fontWeight: 850, color: 'rgba(42,18,54,0.55)' }}>
                  와의 UP채팅방
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/chats')}
              style={{
                height: 42,
                padding: '0 16px',
                borderRadius: 14,
                border: '1px solid rgba(168,85,247,0.45)',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 950,
                fontSize: 14,
                color: '#2a1236',
                flex: '0 0 auto',
              }}
            >
              목록
            </button>
          </div>

          {/* ✅ 메시지 리스트 */}
          <div
            ref={listRef}
            style={{
              padding: 16,
              height: 'min(66vh, 640px)',
              overflow: 'auto',
              background:
                'radial-gradient(900px 500px at 15% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%),' +
                'radial-gradient(900px 520px at 78% 22%, rgba(243,232,255,0.85) 0%, rgba(255,255,255,0) 60%),' +
                'linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 50%, #f8f4ff 100%)',
            }}
          >
            {msgs.map((m) => {
              const mine = m.sender_id === meId;
              const whoName = mine ? meName : otherName;
              const whoAvatar = mine ? meAvatar : otherAvatar;

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                    {/* 아바타 */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        overflow: 'hidden',
                        border: mine ? '3px solid rgba(255,79,161,0.45)' : '3px solid rgba(168,85,247,0.32)',
                        background: '#fff',
                        flex: '0 0 auto',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title={whoName}
                    >
                      {whoAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={whoAvatar} alt={whoName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>🙂</span>
                      )}
                    </div>

                    {/* 닉네임 + 버블 */}
                    <div style={{ display: 'grid', justifyItems: mine ? 'end' : 'start', gap: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: 'rgba(42,18,54,0.68)' }}>{whoName}</div>

                      <div
                        style={{
                          maxWidth: '78vw',
                          width: 'fit-content',
                          padding: '10px 12px',
                          borderRadius: 16,
                          background: mine ? 'linear-gradient(90deg,#ff4fa1,#a855f7)' : 'rgba(255,255,255,0.92)',
                          color: mine ? '#fff' : '#2a1236',
                          border: mine ? '0' : '1px solid rgba(90,40,120,0.12)',
                          boxShadow: mine ? '0 12px 22px rgba(168,85,247,0.22)' : '0 10px 18px rgba(40,10,70,0.08)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontWeight: 850,
                          lineHeight: 1.35,
                        }}
                      >
                        {m.content || ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ✅ 하단 입력바 */}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            padding: '12px 14px 16px',
            background: 'rgba(255,255,255,0.96)',
            borderTop: '2px solid rgba(255,79,161,0.55)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ width: 'min(980px, 100%)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메시지 입력…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              style={{
                height: 56,
                borderRadius: 18,
                border: '1px solid rgba(90,40,120,0.18)',
                padding: '0 14px',
                fontSize: 16,
                fontWeight: 900,
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              style={{
                height: 56,
                padding: '0 18px',
                borderRadius: 18,
                border: 0,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 950,
                color: '#fff',
                background: 'linear-gradient(90deg,#ff4fa1,#a855f7)',
                boxShadow: '0 14px 28px rgba(168,85,247,0.22)',
              }}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
