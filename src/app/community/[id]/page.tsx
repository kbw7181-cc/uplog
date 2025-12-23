// ✅ 파일: src/app/community/[id]/page.tsx
// (만약 폴더가 다르면 import ClientShell 경로만 맞춰주세요)
// - 이 파일이 src/app/community/[id]/page.tsx 라면: import ClientShell from '../../ClientShell';

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';
import { getProfileSelect } from '@/lib/profileSelect';

import ClientShell from '../../components/ClientShell';

type PostRow = {
  id: string;
  user_id: string | null;
  category: string | null;
  title: string | null;
  content: string | null;
  created_at: string | null;
  view_count?: number | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string | null;
  content: string | null;
  created_at: string | null;
};

type ProfileLite = {
  user_id: string;
  avatar_url: string | null;
  nickname?: string | null;
  name?: string | null;
};

type LikeRow = { post_id: string; user_id: string };

function fmtTime(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = (params?.id ?? '') as string;

  const [meId, setMeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? '';
      if (!uid) {
        router.replace('/login');
        return;
      }
      if (mounted) setMeId(uid);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function fetchProfiles(userIds: string[]) {
    if (!userIds.length) return;

    const cols = await getProfileSelect(); // base: user_id,avatar_url + (nickname or name)
    const sel = cols.select; // 예: user_id,avatar_url,nickname OR user_id,avatar_url,name OR user_id,avatar_url

    const { data: profData, error: profErr } = await supabase.from('profiles').select(sel).in('user_id', userIds);

    if (profErr || !profData) return;

    const map: Record<string, ProfileLite> = {};
    for (const row of profData as any[]) {
      map[row.user_id] = row as ProfileLite;
    }
    setProfiles(map);
  }

  async function refetchCommentsAndProfiles(pRow: PostRow | null) {
    const { data: cData, error: cErr } = await supabase
      .from('community_comments')
      .select('id,post_id,user_id,content,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (cErr) {
      setErr(cErr.message);
      return;
    }

    const cRows = (cData ?? []) as CommentRow[];
    setComments(cRows);

    const ids = new Set<string>();
    if (pRow?.user_id) ids.add(pRow.user_id);
    for (const c of cRows) if (c.user_id) ids.add(c.user_id);

    await fetchProfiles(Array.from(ids));
  }

  useEffect(() => {
    if (!meId || !postId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');

      // 1) post
      const { data: pData, error: pErr } = await supabase
        .from('community_posts')
        .select('id,user_id,category,title,content,created_at,view_count')
        .eq('id', postId)
        .maybeSingle();

      if (!alive) return;

      if (pErr) {
        setErr(pErr.message);
        setLoading(false);
        return;
      }

      const pRow = (pData ?? null) as PostRow | null;
      setPost(pRow);

      // 2) comments + profiles
      await refetchCommentsAndProfiles(pRow);

      // 3) likes
      const { data: lData, error: lErr } = await supabase.from('post_likes').select('post_id,user_id').eq('post_id', postId);

      if (!alive) return;

      if (!lErr) {
        const lRows = (lData ?? []) as LikeRow[];
        setLikeCount(lRows.length);
        setLiked(lRows.some((r) => r.user_id === meId));
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [meId, postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const author = useMemo(() => {
    const uid = post?.user_id ?? '';
    const prof = uid ? profiles[uid] : undefined;

    const nickname =
      (prof?.nickname && String(prof.nickname).trim()) ||
      (prof?.name && String(prof.name).trim()) ||
      '익명 영업인';

    const avatar = getAvatarSrc(prof?.avatar_url || '');
    return { nickname, avatar };
  }, [post?.user_id, profiles]);

  async function toggleLike() {
    if (!meId || !postId) return;

    if (liked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', meId);
      if (!error) {
        setLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      }
      return;
    }

    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: meId });
    if (!error) {
      setLiked(true);
      setLikeCount((n) => n + 1);
    }
  }

  async function submitComment() {
    const text = newComment.trim();
    if (!text || !meId || !postId) return;

    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      user_id: meId,
      content: text,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setNewComment('');
    await refetchCommentsAndProfiles(post);
  }

  return (
    <ClientShell>
      <div className="page">
        <div className="top">
          <Link className="btn ghost" href="/community">
            ← 목록
          </Link>
          <Link className="btn ghost" href="/home">
            홈
          </Link>
        </div>

        {loading && <div className="card">불러오는 중…</div>}
        {!!err && <div className="card err">에러: {err}</div>}

        {!loading && !err && !post && <div className="card">글을 찾을 수 없어요.</div>}

        {!loading && !err && post && (
          <>
            <div className="card post">
              <div className="meta">
                <div className="who">
                  <div className="avatarWrap">
                    {author.avatar ? <img className="avatar" src={author.avatar} alt="avatar" /> : <div className="avatar ph" />}
                  </div>
                  <div>
                    <div className="nick">{author.nickname}</div>
                    <div className="time">{fmtTime(post.created_at)}</div>
                  </div>
                </div>

                {post.category ? <div className="pill">{post.category}</div> : <div />}
              </div>

              <div className="title">{post.title ?? '(제목 없음)'}</div>
              <div className="body">{post.content ?? ''}</div>

              <div className="foot">
                <button className={`likeBtn ${liked ? 'on' : ''}`} onClick={toggleLike}>
                  {liked ? '❤️' : '🤍'} {likeCount}
                </button>

                {typeof post.view_count === 'number' ? <div className="views">👀 {post.view_count}</div> : <div />}
              </div>
            </div>

            <div className="card">
              <div className="cTitle">댓글 {comments.length}</div>

              <div className="cBox">
                <textarea
                  className="ta"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 남겨보세요"
                />
                <button className="btn primary" onClick={submitComment}>
                  댓글 등록
                </button>
              </div>

              <div className="cList">
                {comments.map((c) => {
                  const prof = c.user_id ? profiles[c.user_id] : undefined;

                  const nickname =
                    (prof?.nickname && String(prof.nickname).trim()) ||
                    (prof?.name && String(prof.name).trim()) ||
                    '익명 영업인';

                  const avatar = getAvatarSrc(prof?.avatar_url || '');

                  return (
                    <div key={c.id} className="cItem">
                      <div className="avatarWrap sm">
                        {avatar ? <img className="avatar sm" src={avatar} alt="avatar" /> : <div className="avatar sm ph" />}
                      </div>
                      <div className="cText">
                        <div className="cMeta">
                          <span className="cNick">{nickname}</span>
                          <span className="cTime">{fmtTime(c.created_at)}</span>
                        </div>
                        <div className="cBody">{c.content ?? ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <style jsx>{styles}</style>
      </div>
    </ClientShell>
  );
}

const styles = `
.page{
  position:relative;
  padding: 6px 0 0;
  color:#24112f;
}

.top{ display:flex; justify-content:space-between; gap:10px; margin-bottom: 12px; }

.btn{
  display:inline-flex; align-items:center; justify-content:center;
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  font-weight: 950;
  text-decoration:none;
  border: 1px solid rgba(80,0,120,0.18);
  background: rgba(255,255,255,0.75);
  box-shadow: 0 10px 22px rgba(160,70,255,0.10);
  color:#2a1236;
  cursor:pointer;
}
.btn.primary{
  border: 0;
  background: linear-gradient(90deg, rgba(255,79,216,0.92), rgba(185,130,255,0.92));
  color: white;
}

.card{
  padding: 14px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(80,0,120,0.12);
  box-shadow: 0 12px 28px rgba(90,0,140,0.08);
  margin-bottom: 12px;
}
.card.err{ color:#7b1230; border-color: rgba(255,0,80,0.18); font-weight:900; }

.post .meta{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
.who{ display:flex; align-items:center; gap: 10px; }

.avatarWrap{ width: 48px; height: 48px; flex: 0 0 48px; }
.avatar{
  width: 48px; height: 48px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 10px 18px rgba(180,76,255,0.16);
}
.avatar.ph{
  background: linear-gradient(135deg, rgba(255,79,216,0.35), rgba(185,130,255,0.25));
  border: 1px solid rgba(255,79,216,0.25);
}

.avatarWrap.sm{ width: 36px; height: 36px; flex: 0 0 36px; }
.avatar.sm{ width: 36px; height: 36px; border-radius: 14px; }

.nick{ font-weight: 950; font-size: 16px; }
.time{ font-size: 12px; font-weight: 800; opacity:0.65; margin-top: 2px; }

.pill{
  padding: 7px 10px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  background: rgba(243,232,255,0.65);
  border: 1px solid rgba(185,130,255,0.18);
}

.title{
  font-size: 20px;
  font-weight: 950;
  letter-spacing:-0.4px;
  margin: 12px 0 10px;
}
.body{
  font-size: 15px;
  font-weight: 800;
  line-height: 1.55;
  white-space: pre-wrap;
  opacity: 0.88;
}

.foot{
  display:flex; justify-content:space-between; align-items:center;
  margin-top: 14px;
}
.likeBtn{
  height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(80,0,120,0.16);
  background: rgba(255,255,255,0.78);
  font-weight: 950;
  cursor:pointer;
}
.likeBtn.on{
  background: linear-gradient(90deg, rgba(255,79,216,0.14), rgba(185,130,255,0.12));
}
.views{ font-weight: 900; opacity:0.7; }

.cTitle{ font-size: 16px; font-weight: 950; margin-bottom: 10px; }
.cBox{ display:flex; gap:10px; align-items:flex-end; }
.ta{
  flex:1;
  min-height: 92px;
  resize: vertical;
  padding: 12px 12px;
  border-radius: 16px;
  border: 1px solid rgba(80,0,120,0.12);
  background: rgba(255,255,255,0.75);
  font-weight: 800;
  outline: none;
}

.cList{ margin-top: 14px; display:flex; flex-direction:column; gap: 10px; }
.cItem{
  display:flex; gap: 10px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(243,232,255,0.35);
  border: 1px solid rgba(185,130,255,0.10);
}
.cMeta{ display:flex; gap: 10px; align-items:center; }
.cNick{ font-weight: 950; }
.cTime{ font-size: 12px; font-weight: 800; opacity:0.65; }
.cBody{ margin-top: 6px; font-weight: 800; opacity:0.88; white-space: pre-wrap; }
`;
