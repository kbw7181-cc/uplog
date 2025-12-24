'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type RoomRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
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
  return p?.nickname || p?.name || '친구';
}

function readKey(roomId: string) {
  return `uplog.chat.readAt.${roomId}`;
}
function safeGetReadAt(roomId: string) {
  try {
    const v = localStorage.getItem(readKey(roomId));
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}
function safeSetReadAt(roomId: string, ts: number) {
  try {
    localStorage.setItem(readKey(roomId), String(ts));
  } catch {}
}

type ChatItem = {
  roomId: string;
  otherId: string;
  otherName: string;
  otherAvatar: string;
  lastText: string;
  lastAt: string;
  unread: boolean;
};

export default function ChatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState('');
  const [meProfile, setMeProfile] = useState<ProfileRow | null>(null);

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [lastMsgs, setLastMsgs] = useState<Record<string, MsgRow | null>>({});

  // ✅ 채팅 마스코트(고정): public/upzzu5.png
 // ✅ 채팅 마스코트 경로 폴백 (public 어디에 있든 잡히게)
const MASCOT_CANDIDATES = ['/upzzu5.png', '/assets/upzzu5.png', '/assets/images/upzzu5.png'];
const [mascotIdx, setMascotIdx] = useState(0);
const mascotSrc = MASCOT_CANDIDATES[mascotIdx] || '/upzzu5.png';


  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || '';
        if (!uid) {
          router.replace('/login');
          return;
        }
        if (!alive) return;
        setMeId(uid);

        const { data: mp } = await supabase
          .from('profiles')
          .select('user_id,nickname,name,avatar_url')
          .eq('user_id', uid)
          .maybeSingle();
        if (alive) setMeProfile((mp as any) || null);

        const { data: r, error: rErr } = await supabase
          .from('chat_rooms')
          .select('id,user1_id,user2_id,created_at')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .order('created_at', { ascending: false });

        if (rErr) console.error('roomsErr', rErr);
        const rr = ((r as any) || []) as RoomRow[];
        if (!alive) return;
        setRooms(rr);

        const otherIds = Array.from(
          new Set(
            rr
              .map((x) => (x.user1_id === uid ? x.user2_id : x.user2_id === uid ? x.user1_id : ''))
              .filter((x) => x && isUuid(x))
          )
        );

        if (otherIds.length) {
          const { data: ps, error: pErr } = await supabase
            .from('profiles')
            .select('user_id,nickname,name,avatar_url')
            .in('user_id', otherIds);

          if (pErr) console.error('profilesErr', pErr);

          const map: Record<string, ProfileRow> = {};
          (ps as any[] | null)?.forEach((p) => {
            if (p?.user_id) map[p.user_id] = p as any;
          });
          if (!alive) return;
          setProfiles(map);
        } else {
          setProfiles({});
        }

        const lastMap: Record<string, MsgRow | null> = {};
        for (const room of rr) {
          const { data: m, error: mErr } = await supabase
            .from('chat_messages')
            .select('id,room_id,sender_id,content,created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (mErr) console.error('lastMsgErr', room.id, mErr);
          lastMap[room.id] = (m && (m as any)[0]) ? ((m as any)[0] as MsgRow) : null;
        }
        if (!alive) return;
        setLastMsgs(lastMap);

        setLoading(false);
      } catch (e) {
        console.error(e);
        if (alive) setLoading(false);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  const meName = useMemo(() => pickName(meProfile), [meProfile]);

  const items: ChatItem[] = useMemo(() => {
    if (!meId) return [];

    return rooms.map((r) => {
      const otherId =
        r.user1_id === meId ? r.user2_id : r.user2_id === meId ? r.user1_id : '';

      const p = otherId ? profiles[otherId] : null;
      const otherName = pickName(p);
      const otherAvatar = getAvatarSrc(p?.avatar_url || '');

      const last = lastMsgs[r.id];
      const lastText = (last?.content || '').trim();
      const lastAt = last?.created_at || '';

      const readAt = safeGetReadAt(r.id);
      const isUnread = lastAt ? new Date(lastAt).getTime() > readAt : false;

      return {
        roomId: r.id,
        otherId,
        otherName,
        otherAvatar,
        lastText: lastText || '대화를 시작해보세요.',
        lastAt,
        unread: isUnread,
      };
    });
  }, [rooms, profiles, lastMsgs, meId]);

  function openRoom(roomId: string) {
    safeSetReadAt(roomId, Date.now());
    router.push(`/chats/${roomId}`);
  }

  return (
    <ClientShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '10px 10px 110px' }}>
        {/* ✅ 메인 헤더 카드 느낌 그대로 */}
        <div
          style={{
            borderRadius: 26,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(90,40,120,0.14)',
            boxShadow: '0 22px 60px rgba(40,10,70,0.14)',
            padding: 16,
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 950, color: '#2a1236', letterSpacing: -0.3 }}>
              U P 채팅 목록
            </div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 850, color: 'rgba(42,18,54,0.6)' }}>
              {meName}님의 채팅방을 한눈에 확인하세요.
            </div>
          </div>

          {/* ✅ 말풍선 왼쪽 / 마스코트 오른쪽 (메인과 동일 컨셉) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14, marginTop: 14, alignItems: 'center' }}>
            {/* 말풍선 */}
            <div
              style={{
                position: 'relative',
                borderRadius: 22,
                border: '1px solid rgba(90,40,120,0.12)',
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 16px 36px rgba(40,10,70,0.10)',
                padding: '12px 14px',
                minHeight: 92,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 950, color: '#2a1236' }}>
                채팅 가이드
              </div>

              <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 950,
                      color: '#ff2d55',
                      background: 'rgba(255,45,85,0.10)',
                      border: '1px solid rgba(255,45,85,0.25)',
                    }}
                  >
                    욕설·비방 금지
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 850, color: 'rgba(42,18,54,0.75)' }}>
                    불쾌감을 주는 발언은 신고/제재 대상입니다.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 950,
                      color: '#7c3aed',
                      background: 'rgba(124,58,237,0.10)',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    정지 안내
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 850, color: 'rgba(42,18,54,0.75)' }}>
                    위반 시 기능 제한 또는 계정 정지가 적용될 수 있어요.
                  </span>
                </div>
              </div>

              {/* 말풍선 꼬리 (오른쪽 마스코트 방향) */}
              <div
                style={{
                  position: 'absolute',
                  right: -10,
                  top: 28,
                  width: 0,
                  height: 0,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: '10px solid rgba(255,255,255,0.9)',
                  filter: 'drop-shadow(0 2px 2px rgba(40,10,70,0.10))',
                }}
              />
            </div>

            {/* ✅ 업쮸: 테두리 없음 + 둥둥 */}
            <div style={{ display: 'grid', justifyItems: 'end' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  position: 'relative',
                  animation: 'upzzuFloat 2.6s ease-in-out infinite',
                }}
                title="업쮸"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
  src={mascotSrc}
  alt="upzzu5"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  }}
  onError={() => {
    setMascotIdx((v) => (v + 1 < MASCOT_CANDIDATES.length ? v + 1 : v));
  }}
/>

              </div>
            </div>
          </div>
        </div>

        {/* ✅ 채팅방 목록 */}
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ padding: 18, fontSize: 16, fontWeight: 950, color: '#2a1236' }}>
              채팅 목록 불러오는 중…
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(90,40,120,0.12)',
                boxShadow: '0 16px 36px rgba(40,10,70,0.10)',
                padding: 18,
                color: '#2a1236',
                fontWeight: 900,
              }}
            >
              아직 채팅방이 없어요. 친구 목록에서 채팅을 시작해보세요.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {items.map((it) => (
                <button
                  key={it.roomId}
                  type="button"
                  onClick={() => openRoom(it.roomId)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 22,
                    border: '1px solid rgba(90,40,120,0.12)',
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 14px 30px rgba(40,10,70,0.10)',
                    padding: 14,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  {/* 아바타 */}
                  <div style={{ position: 'relative', flex: '0 0 auto' }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 999,
                        overflow: 'hidden',
                        border: '3px solid rgba(168,85,247,0.25)',
                        background: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title={it.otherName}
                    >
                      {it.otherAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.otherAvatar}
                          alt={it.otherName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 22 }}>🙂</span>
                      )}
                    </div>

                    {/* 🔴/🟢 읽음 표시 */}
                    <span
                      title={it.unread ? '안읽음' : '읽음'}
                      style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background: it.unread ? '#ff2d55' : '#22c55e',
                        border: '2px solid #fff',
                        boxShadow: it.unread
                          ? '0 0 0 3px rgba(255,45,85,0.10)'
                          : '0 0 0 3px rgba(34,197,94,0.10)',
                      }}
                    />
                  </div>

                  {/* 텍스트 */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 950,
                          color: '#2a1236',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {it.otherName}
                      </div>

                      {/* 숫자/닷 (대표님 규칙 유지) */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 950,
                          color: it.unread ? '#ff2d55' : '#16a34a',
                          background: 'rgba(255,255,255,0.85)',
                          border: `1px solid ${it.unread ? 'rgba(255,45,85,0.28)' : 'rgba(34,197,94,0.28)'}`,
                          padding: '4px 8px',
                          borderRadius: 999,
                          flex: '0 0 auto',
                        }}
                      >
                        {it.unread ? '1' : '•'}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        fontWeight: 850,
                        color: 'rgba(42,18,54,0.65)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {it.lastText}
                    </div>
                  </div>

                  <div style={{ flex: '0 0 auto', color: 'rgba(42,18,54,0.35)', fontWeight: 950 }}>
                    ›
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes upzzuFloat {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
