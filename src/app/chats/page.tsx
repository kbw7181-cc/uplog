// ✅✅✅ 전체복붙: src/app/chats/page.tsx
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
  email?: string | null;

  career?: string | null;
  company?: string | null;
  team_name?: string | null;
  role?: string | null;
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

function isImageMsg(content?: string | null) {
  const t = (content || '').trim();
  return t.startsWith('IMG:');
}
function imageUrlFromMsg(content?: string | null) {
  const t = (content || '').trim();
  if (!t.startsWith('IMG:')) return '';
  return t.slice(4).trim();
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

type FriendResult = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  email?: string | null;
  isFriend: boolean;
};

type BadgeMini = {
  label: string;
};

export default function ChatsPage() {
  const router = useRouter();

  const FALLBACK_AVATAR = '/gogo.png';
  const mascotSrc = '/upzzu1.png';

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState('');
  const [meProfile, setMeProfile] = useState<ProfileRow | null>(null);

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [lastMsgs, setLastMsgs] = useState<Record<string, MsgRow | null>>({});

  const [tab, setTab] = useState<'rooms' | 'friends'>('rooms');

  // ✅ 채팅방 검색
  const [roomQuery, setRoomQuery] = useState('');

  // ✅ 친구 검색
  const [friendQuery, setFriendQuery] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendResults, setFriendResults] = useState<FriendResult[]>([]);

  const [friendListLoading, setFriendListLoading] = useState(false);
  const [friendList, setFriendList] = useState<FriendResult[]>([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState<FriendResult | null>(null);

  const [selectedProfileExtra, setSelectedProfileExtra] = useState<ProfileRow | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<BadgeMini[]>([]);

  const [toast, setToast] = useState<string>('');

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1600);
  }

  function avatarOrGogo(raw: string | null | undefined) {
    const v = getAvatarSrc((raw || '').toString().trim());
    return v || FALLBACK_AVATAR;
  }

  const FRIEND_OK = 'accepted';

  async function loadFriendIds(uid: string) {
    try {
      const ids = new Set<string>();

      const { data: a, error: aErr } = await supabase.from('friends').select('friend_id,status').eq('user_id', uid);
      if (!aErr && Array.isArray(a)) {
        a.forEach((row: any) => {
          const fid = row?.friend_id;
          const st = (row?.status ?? '').toString();
          if (fid && isUuid(fid) && st === FRIEND_OK) ids.add(fid);
        });
      }

      const { data: b, error: bErr } = await supabase.from('friends').select('user_id,status').eq('friend_id', uid);
      if (!bErr && Array.isArray(b)) {
        b.forEach((row: any) => {
          const fid = row?.user_id;
          const st = (row?.status ?? '').toString();
          if (fid && isUuid(fid) && st === FRIEND_OK) ids.add(fid);
        });
      }

      setFriendIds(ids);
      return ids;
    } catch (e) {
      console.error('loadFriendIds err', e);
      setFriendIds(new Set());
      return new Set<string>();
    }
  }

  async function loadFriendList(uid: string, ids: Set<string>) {
    const arr = Array.from(ids).filter((x) => x && isUuid(x) && x !== uid);
    if (!arr.length) {
      setFriendList([]);
      return;
    }

    setFriendListLoading(true);
    try {
      const r1 = await supabase
        .from('profiles')
        .select('user_id,nickname,name,avatar_url,email,career,company,team_name')
        .in('user_id', arr)
        .limit(200);

      let list: any[] = [];
      if (r1.error) {
        const r2 = await supabase.from('profiles').select('user_id,nickname,name,avatar_url').in('user_id', arr).limit(200);
        list = Array.isArray(r2.data) ? (r2.data as any[]) : [];
      } else {
        list = Array.isArray(r1.data) ? (r1.data as any[]) : [];
      }

      const mapped: FriendResult[] = list
        .filter((p) => p?.user_id && isUuid(p.user_id))
        .map((p) => ({
          user_id: p.user_id,
          nickname: p.nickname ?? null,
          name: p.name ?? null,
          avatar_url: p.avatar_url ?? null,
          email: p.email ?? null,
          isFriend: true,
        }))
        .sort((a, b) => pickName(a).localeCompare(pickName(b), 'ko'));

      setFriendList(mapped);
    } catch (e) {
      console.error('loadFriendList err', e);
      setFriendList([]);
    } finally {
      setFriendListLoading(false);
    }
  }

  async function searchPeople(uid: string, q: string, ids: Set<string>) {
    const qq = (q || '').trim();
    if (!qq) {
      setFriendResults([]);
      return;
    }

    setFriendsLoading(true);
    try {
      const like = `%${qq}%`;

      let list: any[] = [];
      const r1 = await supabase
        .from('profiles')
        .select('user_id,nickname,name,avatar_url,email')
        .neq('user_id', uid)
        .or(`nickname.ilike.${like},name.ilike.${like},email.ilike.${like}`)
        .limit(20);

      if (r1.error) {
        const r2 = await supabase
          .from('profiles')
          .select('user_id,nickname,name,avatar_url')
          .neq('user_id', uid)
          .or(`nickname.ilike.${like},name.ilike.${like}`)
          .limit(20);

        list = Array.isArray(r2.data) ? (r2.data as any[]) : [];
      } else {
        list = Array.isArray(r1.data) ? (r1.data as any[]) : [];
      }

      const mapped: FriendResult[] = list
        .filter((p) => p?.user_id && isUuid(p.user_id))
        .map((p) => ({
          user_id: p.user_id,
          nickname: p.nickname ?? null,
          name: p.name ?? null,
          avatar_url: p.avatar_url ?? null,
          email: p.email ?? null,
          isFriend: ids.has(p.user_id),
        }));

      setFriendResults(mapped);
    } catch (e) {
      console.error('searchPeople err', e);
      setFriendResults([]);
    } finally {
      setFriendsLoading(false);
    }
  }

  async function loadSelectedExtra(userId: string) {
    setSelectedProfileExtra(null);
    setSelectedBadges([]);

    if (!userId || !isUuid(userId)) return;

    try {
      const r1 = await supabase
        .from('profiles')
        .select('user_id,nickname,name,avatar_url,email,career,company,team_name,role')
        .eq('user_id', userId)
        .maybeSingle();
      if (!r1.error && r1.data) setSelectedProfileExtra(r1.data as any);
    } catch {}

    try {
      const ub = await supabase
        .from('user_badges')
        .select('badge_name,badge_emoji,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!ub.error && Array.isArray(ub.data) && ub.data.length) {
        const list = (ub.data as any[]).map((x) => ({
          label: `${(x?.badge_emoji || '🏅').toString()} ${(x?.badge_name || '배지').toString()}`,
        }));
        setSelectedBadges(list);
        return;
      }
    } catch {}

    try {
      const mb = await supabase
        .from('monthly_badges')
        .select('badge_name,month_start')
        .eq('winner_user_id', userId)
        .order('month_start', { ascending: false })
        .limit(8);

      if (!mb.error && Array.isArray(mb.data) && mb.data.length) {
        const list = (mb.data as any[]).map((x) => ({
          label: `👑 ${(x?.badge_name || '월간 배지').toString()}`,
        }));
        setSelectedBadges(list);
      }
    } catch {}
  }

  async function addFriend(uid: string, otherId: string) {
    if (!uid || !otherId || !isUuid(uid) || !isUuid(otherId) || uid === otherId) return;

    try {
      const payload = { user_id: uid, friend_id: otherId, status: FRIEND_OK };
      const { error } = await supabase.from('friends').insert([payload]);

      if (error) {
        const { error: upErr } = await supabase
          .from('friends')
          // @ts-ignore
          .upsert([payload], { onConflict: 'user_id,friend_id' });
        if (upErr) {
          showToast('친구 추가가 막혀있어요 (RLS/정책 확인 필요)');
          return;
        }
      }

      const next = new Set(friendIds);
      next.add(otherId);
      setFriendIds(next);

      setFriendResults((prev) => prev.map((x) => (x.user_id === otherId ? { ...x, isFriend: true } : x)));
      if (selected?.user_id === otherId) setSelected({ ...selected, isFriend: true });

      await loadFriendList(uid, next);
      showToast('친구 추가 완료');
    } catch (e) {
      console.error('addFriend err', e);
      showToast('친구 추가 실패');
    }
  }

  async function removeFriend(uid: string, otherId: string) {
    if (!uid || !otherId || !isUuid(uid) || !isUuid(otherId) || uid === otherId) return;

    try {
      await supabase.from('friends').delete().eq('user_id', uid).eq('friend_id', otherId);
      await supabase.from('friends').delete().eq('user_id', otherId).eq('friend_id', uid);

      const next = new Set(friendIds);
      next.delete(otherId);
      setFriendIds(next);

      setFriendResults((prev) => prev.map((x) => (x.user_id === otherId ? { ...x, isFriend: false } : x)));
      if (selected?.user_id === otherId) setSelected({ ...selected, isFriend: false });

      await loadFriendList(uid, next);
      showToast('친구 해제 완료');
    } catch (e) {
      console.error('removeFriend err', e);
      showToast('친구 해제 실패');
    }
  }

  function goDirectChat(otherId: string, isFriend: boolean) {
    if (!otherId || !isUuid(otherId)) return;
    if (!isFriend) {
      showToast('친구만 채팅이 가능해요');
      return;
    }
    router.push(`/chats/open?to=${otherId}`);
  }

  async function openProfileModal(u: FriendResult) {
    setSelected(u);
    setProfileOpen(true);
    await loadSelectedExtra(u.user_id);
  }

  function forceGogo(e: any) {
    try {
      if (e?.currentTarget?.src && !e.currentTarget.src.endsWith('/gogo.png')) {
        e.currentTarget.src = FALLBACK_AVATAR;
      }
    } catch {}
  }

  function isOnlineLike(roomId: string) {
    const last = lastMsgs[roomId];
    if (!last?.created_at) return false;
    const t = new Date(last.created_at).getTime();
    return Date.now() - t < 2 * 60 * 1000;
  }

  // ✅✅✅ 응원하기: 하루 3회 제한(로컬) + DB 저장 시도(cheers 테이블이 있으면 저장)
  function cheerDailyKey(uid: string) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `uplog.cheer.used.${uid}.${y}-${m}-${day}`;
  }
  function safeGetCheerUsed(uid: string) {
    try {
      const v = localStorage.getItem(cheerDailyKey(uid));
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  }
  function safeSetCheerUsed(uid: string, n: number) {
    try {
      localStorage.setItem(cheerDailyKey(uid), String(n));
    } catch {}
  }
  async function handleCheer(toUserId: string) {
    if (!meId || !isUuid(meId)) {
      showToast('로그인이 필요해요');
      return;
    }
    if (!toUserId || !isUuid(toUserId) || toUserId === meId) return;

    const used = safeGetCheerUsed(meId);
    if (used >= 3) {
      showToast('응원은 하루 3번까지만 가능해요');
      return;
    }

    try {
      const { error } = await supabase.from('cheers').insert([{ from_user_id: meId, to_user_id: toUserId }]);
      if (error) {
        console.error('handleCheer insert error:', error);
        showToast('응원 저장이 막혀있어요 (테이블/RLS 확인 필요)');
        return;
      }
      safeSetCheerUsed(meId, used + 1);
      showToast('응원 +1 💗');
    } catch (e) {
      console.error('handleCheer err:', e);
      showToast('응원 실패');
    }
  }

  // ✅ 부팅
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
          .select('user_id,nickname,name,avatar_url,email,career,company,team_name,role')
          .eq('user_id', uid)
          .maybeSingle();
        if (alive) setMeProfile((mp as any) || null);

        const ids = await loadFriendIds(uid);
        await loadFriendList(uid, ids);

        const { data: r } = await supabase
          .from('chat_rooms')
          .select('id,user1_id,user2_id,created_at')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .order('created_at', { ascending: false });

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
          const { data: ps } = await supabase.from('profiles').select('user_id,nickname,name,avatar_url,email').in('user_id', otherIds);
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
          const { data: m } = await supabase
            .from('chat_messages')
            .select('id,room_id,sender_id,content,created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          lastMap[room.id] = m && (m as any)[0] ? ((m as any)[0] as MsgRow) : null;
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

  // ✅ 입력 멈추면 자동 검색(친구탭)
  useEffect(() => {
    if (!meId) return;
    const q = (friendQuery || '').trim();
    const t = window.setTimeout(async () => {
      if (!q) {
        setFriendResults([]);
        return;
      }
      await searchPeople(meId, q, friendIds);
    }, 220);
    return () => window.clearTimeout(t);
  }, [friendQuery, meId, friendIds]);

  const meName = useMemo(() => pickName(meProfile), [meProfile]);

  // ✅ 채팅 목록: 친구인 상대만 노출
  const chatItemsAll: ChatItem[] = useMemo(() => {
    if (!meId) return [];

    const filtered = rooms.filter((r) => {
      const otherId = r.user1_id === meId ? r.user2_id : r.user2_id === meId ? r.user1_id : '';
      return otherId && isUuid(otherId) && friendIds.has(otherId);
    });

    return filtered.map((r) => {
      const otherId = r.user1_id === meId ? r.user2_id : r.user2_id === meId ? r.user1_id : '';
      const p = otherId ? profiles[otherId] : null;

      const otherName = pickName(p);
      const otherAvatar = avatarOrGogo(p?.avatar_url || '');

      const last = lastMsgs[r.id];
      const lastAt = last?.created_at || '';

      let lastText = (last?.content || '').trim();
      if (isImageMsg(lastText)) lastText = '📷 사진';

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
  }, [rooms, profiles, lastMsgs, meId, friendIds]);

  // ✅ 채팅방 검색(이름+마지막메시지)
  const chatItems: ChatItem[] = useMemo(() => {
    const q = (roomQuery || '').trim().toLowerCase();
    if (!q) return chatItemsAll;

    return chatItemsAll.filter((x) => {
      const a = (x.otherName || '').toLowerCase();
      const b = (x.lastText || '').toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [chatItemsAll, roomQuery]);

  return (
    <ClientShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '10px 10px 110px' }}>
        {/* ✅ 헤더 카드 */}
        <div className="topCard">
          <div className="topRow">
            <div>
              <div className="title">U P 채팅</div>
              <div className="sub">{meName}님의 채팅을 관리하세요.</div>
            </div>

            <div className="tabs">
              <button type="button" className={`tabBtn ${tab === 'rooms' ? 'onPink' : ''}`} onClick={() => setTab('rooms')}>
                채팅방
              </button>
              <button type="button" className={`tabBtn ${tab === 'friends' ? 'onPurple' : ''}`} onClick={() => setTab('friends')}>
                친구
              </button>
            </div>
          </div>

          <div className="guideGrid">
            <div className="bubble">
              {tab === 'rooms' ? (
                <>
                  <div className="bubbleTitle">채팅 가이드</div>
                  <div className="bubbleLines">
                    <div className="line">
                      <span className="pill pink">매너 대화</span>
                      <span className="txt">친구와만 채팅이 가능해요.</span>
                    </div>
                    <div className="line">
                      <span className="pill purple">안읽음</span>
                      <span className="txt">새 메시지는 NEW로 표시돼요.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bubbleTitle">친구 가이드</div>
                  <div className="bubbleLines">
                    <div className="line">
                      <span className="pill blue">검색</span>
                      <span className="txt">검색 후 친구추가를 할 수 있어요.</span>
                    </div>
                    <div className="line">
                      <span className="pill green">프로필</span>
                      <span className="txt">프로필에서 채팅/응원하기를 할 수 있어요.</span>
                    </div>
                  </div>
                </>
              )}
              <div className="tail" />
            </div>

            <div className="mascotWrap" title="업쮸">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mascotSrc} onError={forceGogo} alt="upzzu" className="mascot" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {/* ✅ 채팅방 탭 */}
          {tab === 'rooms' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="card">
                <div className="cardHead">
                  <div className="cardTitle">채팅방 검색</div>
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() => {
                      setRoomQuery('');
                      showToast('검색 초기화');
                    }}
                  >
                    초기화
                  </button>
                </div>

                <div className="searchRow">
                  <input
                    value={roomQuery}
                    onChange={(e) => setRoomQuery((e.target as HTMLInputElement).value || '')}
                    placeholder="이름 또는 최근 메시지로 검색"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="searchInput"
                  />
                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={() => {
                      if (!(roomQuery || '').trim()) showToast('검색어를 입력하세요');
                    }}
                  >
                    검색
                  </button>
                </div>

                {loading ? (
                  <div className="hint">채팅 목록 불러오는 중…</div>
                ) : chatItems.length === 0 ? (
                  <div className="hint">표시할 채팅방이 없어요. (친구와 채팅을 시작해보세요)</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {chatItems.map((it) => {
                      const online = isOnlineLike(it.roomId);
                      return (
                        <div key={it.roomId} className="chatRow">
                          {/* ✅ 왼쪽(프로필) 클릭 */}
                          <button
                            type="button"
                            className="chatLeftBtn"
                            onClick={() =>
                              openProfileModal({
                                user_id: it.otherId,
                                nickname: profiles[it.otherId]?.nickname ?? null,
                                name: profiles[it.otherId]?.name ?? null,
                                avatar_url: profiles[it.otherId]?.avatar_url ?? null,
                                email: profiles[it.otherId]?.email ?? null,
                                isFriend: true,
                              })
                            }
                          >
                            <div className="avatarLg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={it.otherAvatar} onError={forceGogo} alt={it.otherName} />
                              <span className={`presenceDot ${online ? 'on' : 'off'}`} title={online ? '온라인' : '오프라인'} />
                            </div>

                            <div className="chatText">
                              <div className="chatNameRow">
                                <div className="chatName clamp2">{it.otherName}</div>
                                {it.unread ? <span className="miniPill pUnread">NEW</span> : null}
                              </div>
                              <div className="chatLast">{it.lastText}</div>
                            </div>
                          </button>

                          {/* ✅ 버튼 2개 */}
                          <div className="roomActions">
                            <button type="button" className="cheerBtn" onClick={() => handleCheer(it.otherId)}>
                              ❤️ 응원
                            </button>
                            <button type="button" className="chatGoBtn" onClick={() => router.push(`/chats/${it.roomId}`)}>
                              들어가기
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ 친구 탭 */}
          {tab === 'friends' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="card">
                <div className="cardHead">
                  <div className="cardTitle">친구 검색</div>
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={async () => {
                      if (!meId) return;
                      const ids = await loadFriendIds(meId);
                      await loadFriendList(meId, ids);
                      if ((friendQuery || '').trim()) await searchPeople(meId, friendQuery, ids);
                      showToast('갱신 완료');
                    }}
                  >
                    새로고침
                  </button>
                </div>

                <div className="searchRow">
                  <input
                    value={friendQuery}
                    onChange={(e) => setFriendQuery((e.target as HTMLInputElement).value || '')}
                    placeholder="닉네임/이메일로 검색"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="searchInput"
                  />
                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={() => {
                      const q = (friendQuery || '').trim();
                      if (!q) return showToast('검색어를 입력하세요');
                      searchPeople(meId, q, friendIds);
                    }}
                  >
                    검색
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  {friendsLoading ? (
                    <div className="hint">검색 중…</div>
                  ) : (friendQuery || '').trim() && friendResults.length === 0 ? (
                    <div className="hint">검색 결과가 없어요.</div>
                  ) : friendResults.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {friendResults.map((u) => {
                        const nm = pickName(u);
                        const av = avatarOrGogo(u.avatar_url);

                        return (
                          <div key={u.user_id} className="rowCard">
                            <button type="button" className="rowLeftBtn" onClick={() => openProfileModal(u)} title="프로필 보기">
                              <div className="avatar">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={av} onError={forceGogo} alt={nm} />
                              </div>
                              <div className="rowText">
                                <div className="rowName clamp2">{nm}</div>
                                <div className="rowSub">
                                  {u.isFriend ? '친구' : '친구 아님'} {u.email ? `· ${u.email}` : ''}
                                </div>
                              </div>
                            </button>

                            <div className="rowActions">
                              {u.isFriend ? (
                                <button type="button" className="warnBtn" onClick={() => removeFriend(meId, u.user_id)}>
                                  친구해제
                                </button>
                              ) : (
                                <button type="button" className="okBtn" onClick={() => addFriend(meId, u.user_id)}>
                                  친구추가
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="hint">검색어를 입력하면 사람을 찾을 수 있어요.</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="cardHead">
                  <div className="cardTitle">내 친구</div>
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={async () => {
                      if (!meId) return;
                      const ids = await loadFriendIds(meId);
                      await loadFriendList(meId, ids);
                      showToast('친구목록 갱신');
                    }}
                  >
                    갱신
                  </button>
                </div>

                {friendListLoading ? (
                  <div className="hint">친구 불러오는 중…</div>
                ) : friendList.length === 0 ? (
                  <div className="hint">아직 친구가 없어요. 위에서 검색 후 친구추가 해보세요.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {friendList.map((u) => {
                      const nm = pickName(u);
                      const av = avatarOrGogo(u.avatar_url);

                      return (
                        <div key={u.user_id} className="rowCard">
                          <button type="button" className="rowLeftBtn" onClick={() => openProfileModal(u)} title="프로필 보기">
                            <div className="avatar">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={av} onError={forceGogo} alt={nm} />
                            </div>
                            <div className="rowText">
                              <div className="rowName clamp2">{nm}</div>
                              <div className="rowSub">{u.email ? u.email : '친구'}</div>
                            </div>
                          </button>

                          <div className="rowActions">
                            <button type="button" className="ghostMini" onClick={() => openProfileModal(u)}>
                              프로필
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ 프로필 모달 */}
        {profileOpen && selected ? (
          <div className="modalBack" onClick={() => setProfileOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHead">
                <div className="modalTitle">프로필</div>
                <button type="button" className="xBtn" onClick={() => setProfileOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modalTop">
                <div className="avatarXL">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarOrGogo(selected.avatar_url)} onError={forceGogo} alt={pickName(selected)} />
                </div>

                <div className="modalInfo">
                  <div className="modalName">{pickName(selected)}</div>
                  <div className="modalSub">
                    {selected.isFriend ? '친구' : '친구 아님'} {selected.email ? `· ${selected.email}` : ''}
                  </div>

                  <div className="metaGrid">
                    <div className="metaRow">
                      <span className="metaPill purple">경력</span>
                      <span className="metaVal">{(selectedProfileExtra?.career ?? '').toString().trim() || '미입력'}</span>
                    </div>
                    <div className="metaRow">
                      <span className="metaPill blue">회사</span>
                      <span className="metaVal">{(selectedProfileExtra?.company ?? '').toString().trim() || '미입력'}</span>
                    </div>
                    <div className="metaRow">
                      <span className="metaPill green">팀명</span>
                      <span className="metaVal">{(selectedProfileExtra?.team_name ?? '').toString().trim() || '미입력'}</span>
                    </div>
                  </div>

                  <div className="modalBtns">
                    {selected.isFriend ? (
                      <button type="button" className="warnBtn" onClick={() => removeFriend(meId, selected.user_id)}>
                        친구해제
                      </button>
                    ) : (
                      <button type="button" className="okBtn" onClick={() => addFriend(meId, selected.user_id)}>
                        친구추가
                      </button>
                    )}

                    <button type="button" className="cheerBtnStrong" onClick={() => handleCheer(selected.user_id)}>
                      ❤️ 응원하기
                    </button>

                    <button
                      type="button"
                      className="chatBtnStrong"
                      onClick={() => goDirectChat(selected.user_id, selected.isFriend)}
                      title={selected.isFriend ? '채팅 시작' : '친구만 채팅 가능'}
                    >
                      채팅하기
                    </button>
                  </div>
                </div>
              </div>

              <div className="badgeBox">
                <div className="badgeTitle">받은 배지</div>
                {selectedBadges.length === 0 ? (
                  <div className="badgeHint">아직 표시할 배지가 없거나, 배지 테이블이 연결되지 않았어요.</div>
                ) : (
                  <div className="badgeWrap">
                    {selectedBadges.map((b, idx) => (
                      <span key={`${b.label}-${idx}`} className="badgePill">
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="hintBox">
                채팅은 <b>친구만</b> 가능해요.
              </div>
            </div>
          </div>
        ) : null}

        {/* ✅ 토스트 */}
        {toast ? <div className="toast">{toast}</div> : null}

        <style jsx>{`
          .topCard {
            border-radius: 26px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(90, 40, 120, 0.14);
            box-shadow: 0 22px 60px rgba(40, 10, 70, 0.14);
            padding: 16px;
            overflow: hidden;
          }
          .topRow {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
          }
          .title {
            font-size: 22px;
            font-weight: 950;
            color: #2a1236;
            letter-spacing: -0.3px;
          }
          .sub {
            margin-top: 4px;
            font-size: 14px;
            font-weight: 850;
            color: rgba(42, 18, 54, 0.6);
          }

          .tabs {
            display: flex;
            gap: 8px;
          }
          .tabBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            background: rgba(255, 255, 255, 0.9);
            color: #2a1236;
            font-weight: 950;
            cursor: pointer;
          }
          .tabBtn.onPink {
            border-color: rgba(255, 45, 85, 0.32);
            background: rgba(255, 45, 85, 0.1);
          }
          .tabBtn.onPurple {
            border-color: rgba(124, 58, 237, 0.3);
            background: rgba(124, 58, 237, 0.1);
          }

          .guideGrid {
            display: grid;
            grid-template-columns: 1fr 140px;
            gap: 14px;
            margin-top: 14px;
            align-items: center;
          }
          .bubble {
            position: relative;
            border-radius: 22px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 16px 36px rgba(40, 10, 70, 0.1);
            padding: 12px 14px;
            min-height: 92px;
          }
          .bubbleTitle {
            font-size: 15px;
            font-weight: 950;
            color: #2a1236;
          }
          .bubbleLines {
            margin-top: 8px;
            display: grid;
            gap: 8px;
          }
          .line {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .pill {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 950;
            border: 1px solid rgba(90, 40, 120, 0.18);
            background: rgba(255, 255, 255, 0.7);
            color: #2a1236;
          }
          .pill.pink {
            color: #ff2d55;
            background: rgba(255, 45, 85, 0.1);
            border-color: rgba(255, 45, 85, 0.25);
          }
          .pill.purple {
            color: #7c3aed;
            background: rgba(124, 58, 237, 0.1);
            border-color: rgba(124, 58, 237, 0.25);
          }
          .pill.blue {
            color: #2563eb;
            background: rgba(37, 99, 235, 0.1);
            border-color: rgba(37, 99, 235, 0.22);
          }
          .pill.green {
            color: #16a34a;
            background: rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.22);
          }
          .txt {
            font-size: 13px;
            font-weight: 850;
            color: rgba(42, 18, 54, 0.75);
          }
          .tail {
            position: absolute;
            right: -10px;
            top: 28px;
            width: 0;
            height: 0;
            border-top: 10px solid transparent;
            border-bottom: 10px solid transparent;
            border-left: 10px solid rgba(255, 255, 255, 0.9);
            filter: drop-shadow(0 2px 2px rgba(40, 10, 70, 0.1));
          }
          .mascotWrap {
            width: 120px;
            height: 120px;
            justify-self: end;
            animation: upzzuFloat 2.6s ease-in-out infinite;
          }
          .mascot {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          @keyframes upzzuFloat {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
            100% {
              transform: translateY(0px);
            }
          }

          .card {
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(90, 40, 120, 0.12);
            box-shadow: 0 16px 36px rgba(40, 10, 70, 0.1);
            padding: 14px;
          }
          .cardHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
          }
          .cardTitle {
            font-size: 15px;
            font-weight: 950;
            color: #2a1236;
          }
          .ghostBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.16);
            background: rgba(255, 255, 255, 0.95);
            color: #2a1236;
            font-weight: 950;
            cursor: pointer;
          }
          .searchRow {
            margin-top: 10px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .searchInput {
            flex: 1 1 260px;
            min-width: 220px;
            padding: 12px 12px;
            border-radius: 14px;
            border: 1px solid rgba(90, 40, 120, 0.16);
            outline: none;
            font-weight: 900;
            color: #2a1236;
            background: rgba(255, 255, 255, 0.98);
          }
          .primaryBtn {
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(124, 58, 237, 0.22);
            background: rgba(124, 58, 237, 0.1);
            color: #2a1236;
            font-weight: 950;
            cursor: pointer;
          }
          .hint {
            padding: 10px;
            font-size: 13px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.65);
          }

          .rowCard {
            border-radius: 18px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 12px 26px rgba(40, 10, 70, 0.08);
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .rowLeftBtn {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
            border: none;
            background: transparent;
            padding: 0;
            cursor: pointer;
            text-align: left;
          }
          .avatar {
            width: 52px;
            height: 52px;
            border-radius: 999px;
            overflow: hidden;
            border: 3px solid rgba(168, 85, 247, 0.22);
            background: #fff;
            display: grid;
            place-items: center;
            flex: 0 0 auto;
          }
          .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .rowText {
            min-width: 0;
            flex: 1;
          }
          .rowName {
            font-size: 16px;
            font-weight: 950;
            color: #2a1236;
          }
          .rowSub {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.6);
          }
          .rowActions {
            display: flex;
            gap: 8px;
            flex: 0 0 auto;
            align-items: center;
          }

          .ghostMini {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.16);
            background: rgba(255, 255, 255, 0.95);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
          }
          .okBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(34, 197, 94, 0.22);
            background: rgba(34, 197, 94, 0.1);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
          }
          .warnBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255, 45, 85, 0.22);
            background: rgba(255, 45, 85, 0.1);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
          }

          .chatRow {
            border-radius: 22px;
            border: 1px solid rgba(90, 40, 120, 0.12);
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 14px 30px rgba(40, 10, 70, 0.1);
            padding: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .chatLeftBtn {
            flex: 1;
            min-width: 0;
            border: none;
            background: transparent;
            padding: 0;
            cursor: pointer;
            text-align: left;
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .avatarLg {
            width: 54px;
            height: 54px;
            border-radius: 999px;
            overflow: hidden;
            border: 3px solid rgba(168, 85, 247, 0.25);
            background: #fff;
            display: grid;
            place-items: center;
            position: relative;
            flex: 0 0 auto;
          }
          .avatarLg img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .presenceDot {
            position: absolute;
            right: -2px;
            bottom: -2px;
            width: 12px;
            height: 12px;
            border-radius: 999px;
            border: 2px solid #fff;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          }
          .presenceDot.on {
            background: #22c55e;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12), 0 8px 16px rgba(0, 0, 0, 0.1);
          }
          .presenceDot.off {
            background: #c7c7d1;
            box-shadow: 0 0 0 3px rgba(120, 120, 150, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1);
          }

          .chatText {
            min-width: 0;
            flex: 1;
          }
          .chatNameRow {
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .chatName {
            font-size: 16px;
            font-weight: 950;
            color: #2a1236;
            min-width: 0;
            flex: 1;
          }

          .miniPill {
            font-size: 12px;
            font-weight: 950;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.14);
            background: rgba(255, 255, 255, 0.85);
            flex: 0 0 auto;
            margin-top: 1px;
          }
          .miniPill.pUnread {
            color: #ff2d55;
            border-color: rgba(255, 45, 85, 0.28);
          }

          .chatLast {
            margin-top: 6px;
            font-size: 13px;
            font-weight: 850;
            color: rgba(42, 18, 54, 0.65);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .roomActions {
            flex: 0 0 auto;
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .cheerBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255, 45, 85, 0.22);
            background: rgba(255, 45, 85, 0.12);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
            white-space: nowrap;
          }
          .chatGoBtn {
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(37, 99, 235, 0.22);
            background: rgba(37, 99, 235, 0.1);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
            white-space: nowrap;
            min-width: 92px;
          }

          .modalBack {
            position: fixed;
            inset: 0;
            background: rgba(10, 6, 16, 0.55);
            z-index: 9998;
            display: grid;
            place-items: center;
            padding: 14px;
          }
          .modal {
            width: min(560px, 100%);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(90, 40, 120, 0.14);
            box-shadow: 0 22px 70px rgba(0, 0, 0, 0.25);
            padding: 16px;
          }
          .modalHead {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
          .modalTitle {
            font-size: 18px;
            font-weight: 950;
            color: #2a1236;
          }
          .xBtn {
            width: 40px;
            height: 40px;
            border-radius: 999px;
            border: 1px solid rgba(90, 40, 120, 0.16);
            background: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            font-weight: 950;
            color: #2a1236;
          }

          .modalTop {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            margin-top: 12px;
          }
          .avatarXL {
            width: 72px;
            height: 72px;
            border-radius: 999px;
            overflow: hidden;
            border: 3px solid rgba(168, 85, 247, 0.22);
            background: #fff;
            display: grid;
            place-items: center;
            flex: 0 0 auto;
          }
          .avatarXL img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .modalInfo {
            min-width: 0;
            flex: 1;
          }
          .modalName {
            font-size: 18px;
            font-weight: 950;
            color: #2a1236;
          }
          .modalSub {
            margin-top: 6px;
            font-size: 13px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.6);
          }

          .metaGrid {
            margin-top: 10px;
            display: grid;
            gap: 6px;
          }
          .metaRow {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
          }
          .metaPill {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 950;
            border: 1px solid rgba(90, 40, 120, 0.18);
            background: rgba(255, 255, 255, 0.7);
          }
          .metaPill.purple {
            color: #7c3aed;
            background: rgba(124, 58, 237, 0.1);
            border-color: rgba(124, 58, 237, 0.22);
          }
          .metaPill.blue {
            color: #2563eb;
            background: rgba(37, 99, 235, 0.1);
            border-color: rgba(37, 99, 235, 0.22);
          }
          .metaPill.green {
            color: #16a34a;
            background: rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.22);
          }
          .metaVal {
            font-size: 13px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.75);
          }

          .modalBtns {
            margin-top: 12px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .cheerBtnStrong {
            padding: 10px 14px;
            border-radius: 999px;
            border: 1px solid rgba(255, 45, 85, 0.22);
            background: rgba(255, 45, 85, 0.12);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
          }
          .chatBtnStrong {
            padding: 10px 14px;
            border-radius: 999px;
            border: 1px solid rgba(37, 99, 235, 0.22);
            background: rgba(37, 99, 235, 0.14);
            font-weight: 950;
            cursor: pointer;
            color: #2a1236;
          }

          .badgeBox {
            margin-top: 14px;
            border-radius: 18px;
            border: 1px solid rgba(90, 40, 120, 0.1);
            background: rgba(255, 255, 255, 0.85);
            padding: 12px;
          }
          .badgeTitle {
            font-size: 13px;
            font-weight: 950;
            color: #2a1236;
          }
          .badgeHint {
            margin-top: 8px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.65);
            line-height: 1.45;
          }
          .badgeWrap {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .badgePill {
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 950;
            color: #2a1236;
            background: rgba(124, 58, 237, 0.1);
            border: 1px solid rgba(124, 58, 237, 0.18);
          }

          .hintBox {
            margin-top: 12px;
            border-radius: 18px;
            border: 1px solid rgba(90, 40, 120, 0.1);
            background: rgba(255, 255, 255, 0.85);
            padding: 12px;
            font-size: 12px;
            font-weight: 900;
            color: rgba(42, 18, 54, 0.7);
            line-height: 1.45;
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

          .clamp2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }

          @media (max-width: 520px) {
            .guideGrid {
              grid-template-columns: 1fr 120px;
            }
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
