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
function timeHM(iso: string) {
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}
function readKey(roomId: string) {
  return `uplog.chat.readAt.${roomId}`;
}
function safeSetReadAt(roomId: string, ts: number) {
  try {
    localStorage.setItem(readKey(roomId), String(ts));
  } catch {}
}
function safeText(v?: string | null) {
  return (v || '').toString();
}
function bytesToMB(n: number) {
  return Math.round((n / (1024 * 1024)) * 10) / 10;
}

/** ✅ IMG 메시지 포맷
 *  - 구버전: "IMG:https://...."
 *  - 신버전: "IMG:<bucket>:<path>"
 */
function isImgContent(content?: string | null) {
  const t = (content || '').trim();
  return t.startsWith('IMG:');
}
function parseImgPayload(content?: string | null) {
  const t = (content || '').trim();
  if (!t.startsWith('IMG:')) return null;
  const raw = t.slice(4).trim();
  if (!raw) return null;

  // 구버전: URL
  if (/^https?:\/\//i.test(raw)) {
    return { kind: 'url' as const, url: raw };
  }

  // 신버전: bucket:path (첫 ":"만 bucket 구분으로 사용)
  const firstColon = raw.indexOf(':');
  if (firstColon <= 0) return null;

  const bucket = raw.slice(0, firstColon).trim();
  const path = raw.slice(firstColon + 1).trim();
  if (!bucket || !path) return null;

  return { kind: 'ref' as const, bucket, path };
}

async function uploadChatImageAsRef(file: File, meId: string, roomId: string) {
  // ✅ 버킷명 후보(프로젝트에 맞게 실제 사용하는 걸 1개로 고정해도 됨)
  const bucketCandidates = ['chat_uploads', 'chats', 'uploads'] as const;

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ext || 'png';
  const path = `rooms/${roomId}/${meId}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

  let lastErr: any = null;

  for (const bucket of bucketCandidates) {
    try {
      const up = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/*',
      });

      if (up.error) {
        lastErr = up.error;
        continue;
      }

      // ✅ 여기서 URL을 저장하지 않고 bucket+path를 반환
      return { bucket, path };
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('이미지 업로드 실패');
}

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = (params?.id || '').toString();

  const FALLBACK_AVATAR = '/gogo.png';

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState('');
  const [room, setRoom] = useState<RoomRow | null>(null);

  const [otherId, setOtherId] = useState('');
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);

  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [sending, setSending] = useState(false);

  const [text, setText] = useState('');

  // ✅ 사진 선택/미리보기
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 이미지 URL 해석 캐시 (messageId -> signedUrl)
  const [imgUrlMap, setImgUrlMap] = useState<Record<string, string>>({});

  // ✅ UI 토스트
  const [toast, setToast] = useState('');
  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1700);
  }

  // ✅ 스크롤/자동 하단
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  function avatarOrGogo(raw: string | null | undefined) {
    const v = getAvatarSrc((raw || '').toString().trim());
    return v || FALLBACK_AVATAR;
  }

  const otherName = useMemo(() => pickName(otherProfile), [otherProfile]);

  // ✅ 미리보기 URL 관리
  useEffect(() => {
    if (!pickedFile) {
      if (pickedPreview) URL.revokeObjectURL(pickedPreview);
      setPickedPreview('');
      return;
    }

    const url = URL.createObjectURL(pickedFile);
    setPickedPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedFile]);

  async function loadRoomAndMe() {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || '';
      if (!uid) {
        router.replace('/login');
        return;
      }
      setMeId(uid);

      if (!roomId || !isUuid(roomId)) {
        showToast('채팅방 정보가 올바르지 않아요');
        setLoading(false);
        return;
      }

      const r1 = await supabase.from('chat_rooms').select('id,user1_id,user2_id,created_at').eq('id', roomId).maybeSingle();
      if (r1.error) throw r1.error;

      const rr = (r1.data as any) as RoomRow | null;
      if (!rr) {
        showToast('채팅방을 찾을 수 없어요');
        setLoading(false);
        return;
      }

      const mine = rr.user1_id === uid || rr.user2_id === uid;
      if (!mine) {
        showToast('접근 권한이 없어요');
        router.replace('/chats');
        return;
      }

      setRoom(rr);

      const oid = rr.user1_id === uid ? rr.user2_id : rr.user2_id === uid ? rr.user1_id : '';
      setOtherId(oid);

      if (oid && isUuid(oid)) {
        const p = await supabase.from('profiles').select('user_id,nickname,name,avatar_url,email').eq('user_id', oid).maybeSingle();
        if (!p.error && p.data) setOtherProfile(p.data as any);
      }

      const m1 = await supabase
        .from('chat_messages')
        .select('id,room_id,sender_id,content,created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(500);

      if (!m1.error) setMessages(((m1.data as any) || []) as MsgRow[]);

      safeSetReadAt(roomId, Date.now());
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 0);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || '채팅 로드 오류');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!roomId) return;
    loadRoomAndMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ✅ realtime 메시지
  useEffect(() => {
    if (!roomId) return;

    const ch = supabase
      .channel(`chat_messages_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload: any) => {
          const row = payload?.new as MsgRow | undefined;
          if (!row?.id) return;

          setMessages((prev) => {
            if (prev.some((x) => x.id === row.id)) return prev;
            const next = [...prev, row].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return next;
          });

          safeSetReadAt(roomId, Date.now());

          if (stickToBottomRef.current) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  // ✅ 스크롤이 하단 근처면 stick 유지
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('chat-scroll-area');
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      stickToBottomRef.current = nearBottom;
      if (nearBottom) safeSetReadAt(roomId, Date.now());
    };

    const el = document.getElementById('chat-scroll-area');
    if (!el) return;

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [roomId]);

  // ✅ IMG:bucket:path 를 만나면 signedUrl을 생성해서 imgUrlMap에 저장
  useEffect(() => {
    let alive = true;

    async function resolveAll() {
      const need: Array<{ msgId: string; bucket: string; path: string }> = [];

      for (const m of messages) {
        if (!m?.id) continue;
        if (!isImgContent(m.content)) continue;

        const parsed = parseImgPayload(m.content);
        if (!parsed) continue;

        if (parsed.kind === 'url') {
          // 구버전 URL은 그대로 캐시에 박아둠(한번만)
          if (!imgUrlMap[m.id]) {
            need.push({ msgId: m.id, bucket: '__URL__', path: parsed.url });
          }
          continue;
        }

        if (parsed.kind === 'ref') {
          if (!imgUrlMap[m.id]) {
            need.push({ msgId: m.id, bucket: parsed.bucket, path: parsed.path });
          }
        }
      }

      if (!need.length) return;

      const next: Record<string, string> = {};

      for (const item of need) {
        // __URL__ 은 그냥 URL 저장
        if (item.bucket === '__URL__') {
          next[item.msgId] = item.path;
          continue;
        }

        try {
          // ✅ 7일짜리 signed url (private bucket이어도 표시됨)
          const signed = await supabase.storage.from(item.bucket).createSignedUrl(item.path, 60 * 60 * 24 * 7);
          const url = signed?.data?.signedUrl || '';
          if (url) next[item.msgId] = url;
          else next[item.msgId] = ''; // 실패하면 빈값
        } catch {
          next[item.msgId] = '';
        }
      }

      if (!alive) return;

      setImgUrlMap((prev) => ({ ...prev, ...next }));
    }

    resolveAll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function onPickClick() {
    fileInputRef.current?.click();
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    e.target.value = '';

    if (!f) return;

    if (f.size > 10 * 1024 * 1024) {
      showToast(`사진이 너무 커요 (${bytesToMB(f.size)}MB). 10MB 이하로 올려주세요.`);
      return;
    }
    if (!f.type.startsWith('image/')) {
      showToast('이미지 파일만 선택할 수 있어요');
      return;
    }

    setPickedFile(f);
  }

  function clearPicked() {
    setPickedFile(null);
  }

  async function sendText() {
    const t = text.trim();
    if (!t) return;
    if (!meId || !roomId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: meId,
        content: t,
      });

      if (error) throw error;

      setText('');
      safeSetReadAt(roomId, Date.now());
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || '메시지 전송 실패');
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    if (!pickedFile) return;
    if (!meId || !roomId || sending) return;

    setSending(true);
    try {
      const ref = await uploadChatImageAsRef(pickedFile, meId, roomId);

      // ✅ 메시지에 URL 대신 bucket/path 저장
      const { error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: meId,
        content: `IMG:${ref.bucket}:${ref.path}`,
      });

      if (error) throw error;

      clearPicked();
      safeSetReadAt(roomId, Date.now());
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || '사진 전송 실패(버킷/RLS 확인 필요)');
    } finally {
      setSending(false);
    }
  }

  async function onSend() {
    if (pickedFile) return sendImage();
    return sendText();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  }

  const headerAvatar = useMemo(() => avatarOrGogo(otherProfile?.avatar_url || ''), [otherProfile]);

  return (
    <ClientShell>
      <div className="page">
        <div className="top">
          <button type="button" className="iconBtn" onClick={() => router.back()} aria-label="back">
            ←
          </button>

          <div className="who">
            <div className="whoAvatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={headerAvatar} alt={otherName} />
            </div>
            <div className="whoText">
              <div className="whoName">{otherName}</div>
              <div className="whoSub">와의 U P 채팅방</div>
            </div>
          </div>

          <button type="button" className="listBtn" onClick={() => router.push('/chats')}>
            목록
          </button>
        </div>

        <div id="chat-scroll-area" className="scroll">
          {loading ? (
            <div className="hint">불러오는 중…</div>
          ) : !room ? (
            <div className="hint">채팅방이 없어요.</div>
          ) : (
            <div className="msgCol">
              {messages.map((m) => {
                const mine = m.sender_id === meId;

                const isImg = isImgContent(m.content);
                const parsed = isImg ? parseImgPayload(m.content) : null;

                // ✅ 표시할 URL (signedUrl 캐시)
                const imgUrl = m.id ? imgUrlMap[m.id] : '';

                const hm = timeHM(m.created_at);

                return (
                  <div key={m.id} className={`row ${mine ? 'me' : 'you'}`}>
                    <div className={`bubble ${mine ? 'me' : 'you'}`}>
                      {isImg ? (
                        imgUrl ? (
                          <a href={imgUrl} target="_blank" rel="noreferrer" className="imgLink" title="새 탭에서 보기">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt="photo" className="imgMsg" />
                          </a>
                        ) : (
                          <div className="imgLoading">
                            사진 불러오는 중…
                            <div className="small">
                              {parsed?.kind === 'ref' ? `(${parsed.bucket})` : ''}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="txt">{safeText(m.content)}</div>
                      )}

                      <div className="time">{hm}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="composer">
          {pickedFile && pickedPreview ? (
            <div className="previewBox">
              <div className="previewLeft">
                <div className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pickedPreview} alt="preview" />
                </div>
                <div className="pinfo">
                  <div className="pname clamp1">{pickedFile.name}</div>
                  <div className="psub">{bytesToMB(pickedFile.size)}MB</div>
                </div>
              </div>
              <button type="button" className="xSmall" onClick={clearPicked} aria-label="remove">
                ✕
              </button>
            </div>
          ) : null}

          <div className="bar">
            <button type="button" className="plusBtn" onClick={onPickClick} disabled={sending} aria-label="add-photo">
              +
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />

            <input
              className="input"
              value={text}
              onChange={(e) => setText((e.target as HTMLInputElement).value || '')}
              placeholder={pickedFile ? '사진과 함께 보낼 문구(선택)' : '메시지 입력…'}
              onKeyDown={onKeyDown}
              disabled={sending}
            />

            <button type="button" className="sendBtn" onClick={onSend} disabled={sending || (!text.trim() && !pickedFile)}>
              {pickedFile ? '사진 전송' : '전송'}
            </button>
          </div>

          <div className="miniGuide">
            사진은 <b>+ 버튼</b>으로 선택 후 미리보기 확인, <b>전송</b>을 누르면 보내져요.
          </div>
        </div>

        {toast ? <div className="toast">{toast}</div> : null}

        <style jsx>{`
          .page {
            max-width: 980px;
            margin: 0 auto;
            padding: 10px 10px 18px;
          }

          .top {
            position: sticky;
            top: 0;
            z-index: 30;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 10px;
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(90, 40, 120, 0.12);
            box-shadow: 0 14px 36px rgba(40, 10, 70, 0.12);
            backdrop-filter: blur(10px);
          }

          .iconBtn {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            background: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            font-weight: 1000;
            color: #2a1236;
            flex: 0 0 auto;
          }

          .who {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .whoAvatar {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            overflow: hidden;
            border: 3px solid rgba(168, 85, 247, 0.2);
            background: #fff;
            flex: 0 0 auto;
          }
          .whoAvatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .whoText {
            min-width: 0;
          }
          .whoName {
            font-size: 16px;
            font-weight: 1000;
            color: #2a1236;
            line-height: 1.1;
          }
          .whoSub {
            margin-top: 4px;
            font-size: 12.5px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.6);
          }
          .listBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            background: rgba(124, 58, 237, 0.1);
            cursor: pointer;
            font-weight: 1000;
            color: #2a1236;
            flex: 0 0 auto;
            min-width: 60px;
          }

          .scroll {
            margin-top: 12px;
            height: calc(100vh - 240px);
            border-radius: 26px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.85));
            border: 1px solid rgba(90, 40, 120, 0.1);
            box-shadow: 0 14px 40px rgba(40, 10, 70, 0.1);
            overflow: auto;
            padding: 14px;
          }

          .hint {
            padding: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.65);
          }

          .msgCol {
            display: grid;
            gap: 10px;
          }

          .row {
            display: flex;
            align-items: flex-end;
          }
          .row.me {
            justify-content: flex-end;
          }
          .row.you {
            justify-content: flex-start;
          }

          .bubble {
            max-width: min(82%, 520px);
            border-radius: 18px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            box-shadow: 0 10px 24px rgba(40, 10, 70, 0.08);
            padding: 10px 12px;
            position: relative;
            overflow: hidden;
          }
          .bubble.me {
            background: linear-gradient(135deg, rgba(255, 140, 200, 0.25), rgba(170, 120, 255, 0.22));
          }
          .bubble.you {
            background: rgba(255, 255, 255, 0.92);
          }

          .txt {
            font-size: 14.5px;
            font-weight: 900;
            color: #2a1236;
            white-space: pre-wrap;
            line-height: 1.45;
          }

          .time {
            margin-top: 6px;
            font-size: 11.5px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.55);
            text-align: right;
          }

          .imgLink {
            display: block;
            text-decoration: none;
          }
          .imgMsg {
            width: 100%;
            max-width: 320px;
            height: auto;
            border-radius: 14px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            display: block;
            background: rgba(255, 255, 255, 0.8);
          }

          .imgLoading {
            padding: 10px 10px;
            border-radius: 14px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            font-weight: 950;
            color: rgba(42, 18, 54, 0.7);
          }
          .imgLoading .small {
            margin-top: 6px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.55);
          }

          .composer {
            margin-top: 12px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(90, 40, 120, 0.12);
            box-shadow: 0 16px 42px rgba(40, 10, 70, 0.12);
            padding: 12px;
          }

          .previewBox {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-radius: 18px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(255, 255, 255, 0.92);
            padding: 10px;
            margin-bottom: 10px;
          }
          .previewLeft {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }
          .thumb {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: #fff;
            flex: 0 0 auto;
          }
          .thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .pinfo {
            min-width: 0;
          }
          .pname {
            font-size: 13.5px;
            font-weight: 1000;
            color: #2a1236;
          }
          .psub {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.6);
          }
          .xSmall {
            width: 40px;
            height: 40px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            background: rgba(255, 255, 255, 0.95);
            cursor: pointer;
            font-weight: 1000;
            color: #2a1236;
            flex: 0 0 auto;
          }

          .bar {
            display: grid;
            grid-template-columns: 44px 1fr 92px;
            gap: 10px;
            align-items: center;
          }

          .plusBtn {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(124, 58, 237, 0.1);
            color: #2a1236;
            font-size: 22px;
            font-weight: 1000;
            cursor: pointer;
            line-height: 1;
          }

          .input {
            height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            outline: none;
            padding: 0 12px;
            font-size: 14px;
            font-weight: 900;
            color: #2a1236;
            background: rgba(255, 255, 255, 0.98);
            min-width: 0;
          }

          .sendBtn {
            height: 44px;
            border-radius: 14px;
            border: none;
            cursor: pointer;
            font-weight: 1000;
            color: #2a1236;
            background: linear-gradient(135deg, rgba(255, 120, 200, 0.9), rgba(170, 120, 255, 0.9));
            box-shadow: 0 12px 26px rgba(70, 10, 110, 0.14);
          }
          .sendBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            box-shadow: none;
          }

          .miniGuide {
            margin-top: 10px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.6);
            padding: 0 4px;
          }

          .toast {
            position: fixed;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%);
            z-index: 9999;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(20, 10, 30, 0.78);
            color: #fff;
            font-weight: 950;
            font-size: 13px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
          }

          .clamp1 {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 240px;
          }

          @media (max-width: 520px) {
            .scroll {
              height: calc(100vh - 240px);
            }
            .bar {
              grid-template-columns: 44px 1fr 88px;
            }
            .sendBtn {
              font-size: 13px;
            }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
