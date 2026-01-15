// ✅✅✅ 전체복붙: src/app/chats/open/OpenChatClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function sort2(a: string, b: string) {
  return a <= b ? [a, b] : [b, a];
}

function norm(v: string) {
  return (v || '').trim();
}

const FRIEND_OK = 'accepted';

/** ✅ TS 빨간줄 방지용 "진짜" 판별 유니온 */
type ResultOk = { ok: true };
type ResultErr = { ok: false; message: string };
type Result = ResultOk | ResultErr;

/** ✅ friends: (id, user_id, friend_id, status, created_at) */
async function checkFriendAccepted(meId: string, otherId: string): Promise<boolean> {
  if (!isUuid(meId) || !isUuid(otherId) || meId === otherId) return false;

  const { data, error } = await supabase
    .from('friends')
    .select('user_id,friend_id,status')
    .or(`and(user_id.eq.${meId},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${meId})`)
    .limit(10);

  if (error || !Array.isArray(data)) return false;
  return data.some((r: any) => String(r?.status ?? '') === FRIEND_OK);
}

/** ✅ 친구추가: "즉시 친구" 모델(accepted로 저장) */
async function addFriend(meId: string, otherId: string): Promise<Result> {
  if (!isUuid(meId) || !isUuid(otherId) || meId === otherId) return { ok: false, message: '잘못된 대상입니다.' };

  const payload = { user_id: meId, friend_id: otherId, status: FRIEND_OK };

  const { error } = await supabase.from('friends').insert([payload]);
  if (!error) return { ok: true };

  // ✅ 중복/이미 존재 가능 → 재확인
  const fr = await checkFriendAccepted(meId, otherId);
  if (fr) return { ok: true };

  return { ok: false, message: '친구 추가가 막혀있어요. (friends RLS/정책 확인 필요)' };
}

/**
 * ✅ to 파라미터가 UUID가 아니면, profiles에서 상대 user_id로 resolve
 * - email 컬럼이 없을 수 있으니: email 검색은 try/catch + error fallback
 */
async function resolveToUserId(
  meId: string,
  rawTo: string
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const to = norm(rawTo);
  if (!to) return { ok: false, message: '대상(to)이 없습니다.' };

  if (isUuid(to)) {
    if (to === meId) return { ok: false, message: '본인과는 채팅방을 만들 수 없어요.' };
    return { ok: true, userId: to };
  }

  const looksEmail = to.includes('@') && to.includes('.');

  // ✅ 1) email exact (있으면)
  if (looksEmail) {
    try {
      const r = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', meId)
        .eq('email', to)
        .maybeSingle();

      if (!r.error && r.data?.user_id && isUuid(r.data.user_id)) return { ok: true, userId: r.data.user_id };
    } catch {
      // ignore
    }
  }

  // ✅ 2) nickname/name exact (case-insensitive)
  try {
    const r2 = await supabase
      .from('profiles')
      .select('user_id,nickname,name')
      .neq('user_id', meId)
      .or(`nickname.ilike.${to},name.ilike.${to}`)
      .limit(10);

    if (!r2.error && Array.isArray(r2.data)) {
      const exact = r2.data.find((p: any) => {
        const nn = norm(p?.nickname || '');
        const nm = norm(p?.name || '');
        return nn.toLowerCase() === to.toLowerCase() || nm.toLowerCase() === to.toLowerCase();
      });

      if (exact?.user_id && isUuid(exact.user_id)) return { ok: true, userId: exact.user_id };
    }
  } catch {
    // ignore
  }

  // ✅ 3) partial search → 1명만 나오면 채택
  try {
    const like = `%${to}%`;
    const r3 = await supabase
      .from('profiles')
      .select('user_id,nickname,name')
      .neq('user_id', meId)
      .or(`nickname.ilike.${like},name.ilike.${like}`)
      .limit(10);

    if (!r3.error && Array.isArray(r3.data)) {
      const uniq = r3.data.filter((p: any) => p?.user_id && isUuid(p.user_id));
      if (uniq.length === 1) {
        const uid = uniq[0].user_id;
        if (uid !== meId) return { ok: true, userId: uid };
      }
      if (uniq.length >= 2) {
        return { ok: false, message: '검색 결과가 여러 명이에요. 채팅 목록에서 프로필을 눌러 선택해주세요.' };
      }
    }
  } catch {
    // ignore
  }

  if (looksEmail) {
    return {
      ok: false,
      message:
        '해당 이메일로 가입된 사용자를 찾지 못했어요.\n(중요) 이메일 검색을 쓰려면 profiles에 email 컬럼이 저장되어 있어야 해요.',
    };
  }

  return { ok: false, message: '대상을 찾지 못했어요. (닉네임/이메일/UID 확인)' };
}

/** ✅ 응원하기 (cheer_logs 테이블이 있어야 함) */
async function cheerOnce(fromId: string, toId: string): Promise<Result> {
  if (!isUuid(fromId) || !isUuid(toId) || fromId === toId) return { ok: false, message: '잘못된 대상입니다.' };

  const { error } = await supabase.from('cheer_logs').insert([{ from_user_id: fromId, to_user_id: toId }]);
  if (!error) return { ok: true };

  return { ok: false, message: '응원 저장이 막혀있어요. (cheer_logs 테이블/RLS 확인 필요)' };
}

export default function OpenChatClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const to = norm(sp.get('to') ?? '');
  const safeTo = useMemo(() => to, [to]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [meId, setMeId] = useState<string>('');
  const [otherId, setOtherId] = useState<string>('');
  const [isFriend, setIsFriend] = useState<boolean>(false);

  const [busyFriend, setBusyFriend] = useState(false);
  const [busyCheer, setBusyCheer] = useState(false);
  const [toast, setToast] = useState<string>('');

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1500);
  }

  useEffect(() => {
    let alive = true;

    async function prep() {
      try {
        setLoading(true);
        setErr(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErr('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        if (!safeTo) {
          setErr('대상(to)이 없습니다.');
          setLoading(false);
          return;
        }

        if (!alive) return;
        setMeId(user.id);

        const resolved = await resolveToUserId(user.id, safeTo);

if (resolved.ok === false) {
  setErr(resolved.message);
  setLoading(false);
  return;
}

        const oid = resolved.userId;
        if (!alive) return;
        setOtherId(oid);

        const fr = await checkFriendAccepted(user.id, oid);
        if (!alive) return;
        setIsFriend(fr);

        if (fr) {
          await openOrCreateRoom(user.id, oid);
          return;
        }

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message ?? '오류가 발생했어요.');
        setLoading(false);
      }
    }

    prep();
    return () => {
      alive = false;
    };
  }, [safeTo]);

  async function openOrCreateRoom(uid: string, oid: string) {
    if (!isUuid(uid) || !isUuid(oid) || uid === oid) {
      setErr('잘못된 대상입니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [u1, u2] = sort2(uid, oid);

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

      const { data: created, error: createErr } = await supabase
        .from('chat_rooms')
        .insert({ user1_id: u1, user2_id: u2 })
        .select('id')
        .single();

      if (createErr) throw createErr;

      router.replace(`/chats/${created.id}`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? '채팅방 생성 중 오류');
      setLoading(false);
    }
  }

  async function onAddFriendAndChat() {
    if (!meId || !otherId) return;

    setBusyFriend(true);
    try {
      setErr(null);

      const r = await addFriend(meId, otherId);

      // ✅ TS가 확실히 좁히도록 "=== false"
      if (r.ok === false) {
        setErr(r.message);
        return;
      }

      showToast('친구 추가 완료');

      const fr = await checkFriendAccepted(meId, otherId);
      setIsFriend(fr);

      if (!fr) {
        setErr('친구 상태가 아직 확정되지 않았어요. (status/RLS 확인 필요)');
        return;
      }

      await openOrCreateRoom(meId, otherId);
    } finally {
      setBusyFriend(false);
    }
  }

  async function onCheer() {
    if (!meId || !otherId) return;

    setBusyCheer(true);
    try {
      setErr(null);

      const r = await cheerOnce(meId, otherId);

      // ✅ 여기 빨간줄 해결 포인트
      if (r.ok === false) {
        setErr(r.message);
        return;
      }

      showToast('응원 +1');
    } finally {
      setBusyCheer(false);
    }
  }

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      {loading && <div>채팅방 여는 중…</div>}

      {!loading && !err && !isFriend && (
        <div style={{ opacity: 0.92 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>친구가 필요해요</div>
          <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5, opacity: 0.9 }}>
            친구만 채팅이 가능해요.
            {'\n'}
            아래에서 친구추가 후 바로 채팅을 열 수 있어요.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              disabled={busyFriend}
              onClick={onAddFriendAndChat}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(34,197,94,0.18)',
                border: '1px solid rgba(34,197,94,0.28)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
                opacity: busyFriend ? 0.65 : 1,
              }}
            >
              친구추가 + 채팅열기
            </button>

            <button
              disabled={busyCheer}
              onClick={onCheer}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,45,85,0.18)',
                border: '1px solid rgba(255,45,85,0.28)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
                opacity: busyCheer ? 0.65 : 1,
              }}
            >
              ❤️ 응원하기
            </button>

            <button
              onClick={() => router.push('/chats')}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              채팅 목록으로
            </button>
          </div>
        </div>
      )}

      {!loading && err && (
        <div style={{ opacity: 0.92 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>오류</div>
          <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{err}</div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {meId && otherId && (
              <>
                <button
                  disabled={busyFriend}
                  onClick={onAddFriendAndChat}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(34,197,94,0.18)',
                    border: '1px solid rgba(34,197,94,0.28)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 900,
                    opacity: busyFriend ? 0.65 : 1,
                  }}
                >
                  친구추가 + 채팅열기
                </button>

                <button
                  disabled={busyCheer}
                  onClick={onCheer}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,45,85,0.18)',
                    border: '1px solid rgba(255,45,85,0.28)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 900,
                    opacity: busyCheer ? 0.65 : 1,
                  }}
                >
                  ❤️ 응원하기
                </button>
              </>
            )}

            <button
              onClick={() => router.push('/chats')}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              채팅 목록으로
            </button>

            <button
              onClick={() => router.back()}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(20,10,30,0.78)',
            color: '#fff',
            fontWeight: 950,
            fontSize: 13,
            boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
