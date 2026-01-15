// ✅✅✅ 전체복붙: src/app/chats/[id]/page.tsx
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
  created_at: string;
};

type MsgRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  image_url?: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  email?: string | null;
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
function safeSetReadAt(roomId: string, ts: number) {
  try {
    localStorage.setItem(readKey(roomId), String(ts));
  } catch {}
}

function timeLabel(iso: string) {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();

  const roomId = (params?.id as string) || '';
  const canUseRoomId = roomId && isUuid(roomId);

  const FALLBACK_AVATAR = '/gogo.png';

  const [meId, setMeId] = useState('');
  const [loading, setLoading] = useState(true);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [otherId, setOtherId] = useState('');
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);

  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [text, setText] = useState('');

  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  function avatarOrGogo(raw: string | null | undefined) {
    const v = getAvatarSrc((raw || '').toString().trim());
    return v || FALLBACK_AVATAR;
  }
  function forceGogo(e: any) {
    try {
      if (e?.currentTarget?.src && !e.currentTarget.src.endsWith('/gogo.png')) {
        e.currentTarget.src = FALLBACK_AVATAR;
      }
    } catch {}
  }

  const otherName = useMemo(() => pickName(otherProfile), [otherProfile]);
  const otherAvatar = useMemo(() => avatarOrGogo(otherProfile?.avatar_url || ''), [otherProfile]);

  function scrollToEnd() {
    try {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }

  async function loadRoomAndMessages(uid: string) {
    if (!canUseRoomId) {
      setLoading(false);
      return;
    }

    const { data: r, error: rErr } = await supabase
      .from('chat_rooms')
      .select('id,user1_id,user2_id,created_at')
      .eq('id', roomId)
      .maybeSingle();

    if (rErr || !r) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setRoom(r as any);

    const oId =
      (r as any).user1_id === uid
        ? (r as any).user2_id
        : (r as any).user2_id === uid
        ? (r as any).user1_id
        : '';

    setOtherId(oId);

    if (oId && isUuid(oId)) {
      const { data: p } = await supabase
        .from('profiles')
        .select('user_id,nickname,name,avatar_url,email')
        .eq('user_id', oId)
        .maybeSingle();
      setOtherProfile((p as any) || null);
    }

    const { data: ms } = await supabase
      .from('chat_messages')
      .select('id,room_id,sender_id,content,image_url,created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(500);

    setMessages(Array.isArray(ms) ? (ms as any) : []);
    setLoading(false);

    safeSetReadAt(roomId, Date.now());
    setTimeout(scrollToEnd, 50);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!canUseRoomId) {
          setLoading(false);
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || '';
        if (!uid) {
          router.replace('/login');
          return;
        }
        if (!alive) return;

        setMeId(uid);
        await loadRoomAndMessages(uid);

        const ch = supabase
          .channel(`room:${roomId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
            (payload) => {
              const row = payload.new as any as MsgRow;
              setMessages((prev) => [...prev, row]);
              safeSetReadAt(roomId, Date.now());
              setTimeout(scrollToEnd, 20);
            }
          )
          .subscribe();

        return () => {
          try {
            supabase.removeChannel(ch);
          } catch {}
        };
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function sendText() {
    const t = (text || '').trim();
    if (!t || sending) return;
    if (!meId || !roomId) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert([
        { room_id: roomId, sender_id: meId, content: t, image_url: null },
      ]);
      if (error) console.error('sendText error', error);
      setText('');
      safeSetReadAt(roomId, Date.now());
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File) {
    if (!file || uploading) return;
    if (!meId || !roomId) return;
    if (!file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `rooms/${roomId}/${meId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

      const up = await supabase.storage.from('chat_uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

      if (up.error) {
        console.error('upload error', up.error);
        return;
      }

      const pub = supabase.storage.from('chat_uploads').getPublicUrl(path);
      const publicUrl = (pub?.data?.publicUrl || '').toString();

      const { error } = await supabase.from('chat_messages').insert([
        { room_id: roomId, sender_id: meId, content: null, image_url: publicUrl || path },
      ]);

      if (error) {
        console.error('insert image message error', error);
        return;
      }

      safeSetReadAt(roomId, Date.now());
      setTimeout(scrollToEnd, 30);
    } finally {
      setUploading(false);
    }
  }

  function onPickImage() {
    if (uploading) return;
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    await sendImage(f);
  }

  function resolveImageSrc(v: string | null | undefined) {
    const raw = (v || '').toString().trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    try {
      const pub = supabase.storage.from('chat_uploads').getPublicUrl(raw);
      return (pub?.data?.publicUrl || '').toString() || '';
    } catch {
      return '';
    }
  }

  const headerDotOn = useMemo(() => {
    const last = messages.length ? messages[messages.length - 1] : null;
    if (!last?.created_at) return false;
    const t = new Date(last.created_at).getTime();
    return Date.now() - t < 2 * 60 * 1000;
  }, [messages]);

  return (
    <ClientShell>
      <div className="wrap">
        <div className="topBar">
          <div className="topLeft">
            <button type="button" className="backBtn" onClick={() => router.push('/chats')}>
              ←
            </button>

            <div className="avatarRing">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={otherAvatar} onError={forceGogo} alt={otherName} />
              <span className={`dot ${headerDotOn ? 'on' : 'off'}`} />
            </div>

            <div className="topText">
              <div className="roomName">{otherName}</div>
              <div className="roomSub">와의 U P채팅방</div>
            </div>
          </div>

          <button type="button" className="listBtn" onClick={() => router.push('/chats')}>
            목록
          </button>
        </div>

        <div className="chatBox">
          {loading ? (
            <div className="centerHint">불러오는 중…</div>
          ) : !room ? (
            <div className="centerHint">채팅방을 찾을 수 없어요.</div>
          ) : (
            <>
              <div className="msgList">
                {messages.map((m) => {
                  const mine = m.sender_id === meId;
                  const imgSrc = resolveImageSrc((m as any).image_url);
                  const hasImg = !!imgSrc;

                  return (
                    <div key={m.id} className={`msgRow ${mine ? 'mine' : 'theirs'}`}>
                      <div className={`bubble ${mine ? 'bMine' : 'bTheirs'}`}>
                        {hasImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc}
                            alt="photo"
                            className="photo"
                            onError={(e) => {
                              try {
                                (e.currentTarget as any).style.display = 'none';
                              } catch {}
                            }}
                          />
                        ) : null}

                        {m.content ? <div className="txt">{m.content}</div> : null}
                        <div className="meta">{m.created_at ? timeLabel(m.created_at) : ''}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* ✅ 입력바: 높이 줄이고(2줄까지), 버튼도 작게 + 플러스 */}
              <div className="inputBar">
                <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />

                <button
                  type="button"
                  className={`plusBtn ${uploading ? 'disabled' : ''}`}
                  onClick={onPickImage}
                  title="사진/파일"
                >
                  +
                </button>

                <textarea
                  className="input"
                  value={text}
                  onChange={(e) => setText((e.target as HTMLTextAreaElement).value || '')}
                  placeholder="메시지 입력..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                />

                <button type="button" className={`sendBtn ${(sending || uploading) ? 'disabled' : ''}`} onClick={sendText}>
                  전송
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .wrap { max-width: 980px; margin: 0 auto; padding: 10px 10px 12px; }

          .topBar{
            display:flex; align-items:center; justify-content:space-between; gap:10px;
            padding:12px; border-radius:22px; background: rgba(255,255,255,0.90);
            border:1px solid rgba(90,40,120,0.12); box-shadow: 0 18px 46px rgba(40,10,70,0.12);
          }
          .topLeft{ display:flex; align-items:center; gap:10px; min-width:0; }
          .backBtn{
            width:44px; height:44px; border-radius:999px;
            border:1px solid rgba(90,40,120,0.16); background: rgba(255,255,255,0.95);
            font-weight:950; color:#2a1236; cursor:pointer; flex:0 0 auto;
          }

          .avatarRing{
            width:56px; height:56px; border-radius:999px; overflow:hidden;
            border:3px solid rgba(168,85,247,0.22); background:#fff; position:relative; flex:0 0 auto;
          }
          .avatarRing img{ width:100%; height:100%; object-fit:cover; display:block; }
          .dot{
            position:absolute; right:-2px; bottom:-2px; width:12px; height:12px; border-radius:999px;
            border:2px solid #fff; box-shadow: 0 10px 18px rgba(0,0,0,0.12);
          }
          .dot.on{ background:#ff2d55; box-shadow: 0 0 0 4px rgba(255,45,85,0.12), 0 10px 18px rgba(0,0,0,0.12); }
          .dot.off{ background:#c7c7d1; box-shadow: 0 0 0 4px rgba(120,120,150,0.08), 0 10px 18px rgba(0,0,0,0.12); }

          .topText{ min-width:0; }
          .roomName{
            font-size:20px; font-weight:950; color:#2a1236; line-height:1.05;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:52vw;
          }
          .roomSub{ margin-top:4px; font-size:13px; font-weight:900; color: rgba(42,18,54,0.62); }

          .listBtn{
            padding:10px 14px; border-radius:999px;
            border:1px solid rgba(124,58,237,0.22); background: rgba(124,58,237,0.10);
            font-weight:950; color:#2a1236; cursor:pointer; flex:0 0 auto;
          }

          .chatBox{
            margin-top:12px; border-radius:26px; background: rgba(255,255,255,0.86);
            border:1px solid rgba(90,40,120,0.12); box-shadow: 0 18px 58px rgba(40,10,70,0.12);
            overflow:hidden; min-height: calc(100vh - 180px); display:flex; flex-direction:column;
          }
          .centerHint{ padding:18px; font-size:14px; font-weight:900; color: rgba(42,18,54,0.70); }

          .msgList{
            flex:1; padding:14px; overflow:auto;
            background:
              radial-gradient(800px 420px at 50% 0%, rgba(255,45,85,0.08), transparent 60%),
              radial-gradient(900px 520px at 60% 30%, rgba(124,58,237,0.08), transparent 62%);
          }
          .msgRow{ display:flex; margin:10px 0; }
          .msgRow.mine{ justify-content:flex-end; }
          .msgRow.theirs{ justify-content:flex-start; }

          .bubble{
            max-width:min(78%, 520px);
            border-radius:18px; padding:10px 10px 8px;
            border:1px solid rgba(90,40,120,0.12);
            box-shadow: 0 12px 26px rgba(40,10,70,0.08);
          }
          .bMine{ background: linear-gradient(135deg, rgba(255,45,85,0.16), rgba(124,58,237,0.12)); }
          .bTheirs{ background: rgba(255,255,255,0.92); }

          .photo{
            width:100%; max-height:360px; object-fit:cover; border-radius:14px; display:block;
            border:1px solid rgba(90,40,120,0.12); margin-bottom:8px;
          }
          .txt{
            font-size:14px; font-weight:900; color:#2a1236;
            white-space:pre-wrap; word-break:break-word; line-height:1.35;
          }
          .meta{ margin-top:6px; font-size:11px; font-weight:900; color: rgba(42,18,54,0.50); text-align:right; }

          /* ✅✅✅ 핵심 수정: 입력바 줄이고 버튼들도 덜 커지게 */
          .inputBar{
            padding:10px 10px 12px;
            display:grid;
            grid-template-columns: 44px 1fr 72px;
            gap:10px;
            align-items:end;
            border-top:1px solid rgba(90,40,120,0.12);
            background: rgba(255,255,255,0.92);
          }

          /* ✅ 플러스 버튼: 작고 테두리 얇게 */
          .plusBtn{
            width:44px;
            height:44px;
            border-radius:14px;
            border:1px solid rgba(90,40,120,0.16);
            background: rgba(255,255,255,0.95);
            font-weight:950;
            font-size:22px;
            line-height:1;
            cursor:pointer;
            color:#2a1236;
            display:grid;
            place-items:center;
            box-shadow: 0 10px 22px rgba(40,10,70,0.08);
          }
          .plusBtn.disabled{ opacity:0.6; cursor:default; }

          /* ✅ textarea: 높이 줄이고 2줄까지 자동 */
          .input{
            min-height:44px;
            max-height:88px; /* 2줄 정도 */
            resize:none;
            border-radius:14px;
            border:1px solid rgba(90,40,120,0.16);
            background: rgba(255,255,255,0.98);
            outline:none;
            padding:12px 12px;
            font-size:14px;
            font-weight:900;
            color:#2a1236;
            line-height:1.2;
            overflow:auto;
          }

          /* ✅ 전송 버튼: 폭/높이 줄여서 글자 안 잘리게 */
          .sendBtn{
            height:44px;
            border-radius:14px;
            border:1px solid rgba(255,45,85,0.22);
            background: linear-gradient(135deg, rgba(255,45,85,0.92), rgba(124,58,237,0.92));
            color:#fff;
            font-weight:950;
            cursor:pointer;
            font-size:14px;
            letter-spacing:-0.2px;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:0 10px;
            white-space:nowrap;
          }
          .sendBtn.disabled{ opacity:0.6; cursor:default; }

          @media (max-width: 520px){
            .roomName{ max-width:46vw; font-size:18px; }
            .msgList{ padding:12px; }
            .bubble{ max-width:86%; }

            .inputBar{
              grid-template-columns: 42px 1fr 70px;
              gap:8px;
              padding:10px 10px 12px;
            }
            .plusBtn{ width:42px; height:42px; font-size:22px; border-radius:14px; }
            .input{ min-height:42px; }
            .sendBtn{ height:42px; font-size:13px; }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
