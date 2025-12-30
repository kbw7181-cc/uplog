// ✅✅✅ 전체복붙: src/app/community/[id]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type CommunityCategory =
  | '실전 세일즈'
  | '노하우/자료'
  | '멘탈/마인드'
  | '성과/인증'
  | '피드백 요청'
  | '업종 라운지'
  | '구인/구직';

type PostRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  category: CommunityCategory | null;
  industry: string | null;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
  view_count?: number | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type MiniProfile = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
};

function safeText(v?: string | null, fallback = '') {
  const t = (v || '').trim();
  return t ? t : fallback;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function normalizeStoragePath(vRaw: string, bucket: string) {
  const v = (vRaw || '').trim();
  if (!v) return '';
  const p = v.replace(/^\/+/, '');
  if (p.startsWith(`${bucket}/`)) return p.slice(bucket.length + 1);
  if (p.startsWith(`public/${bucket}/`)) return p.slice(`public/${bucket}/`.length);
  if (p.startsWith(`storage/${bucket}/`)) return p.slice(`storage/${bucket}/`.length);
  return p;
}

async function resolveCommunityImageSrc(imageUrlOrPath?: string | null): Promise<string> {
  const v = (imageUrlOrPath || '').trim();
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('/')) return v;

  const bucketCandidates = ['community', 'community_uploads', 'uploads', 'COMMUNITY-IMAGES'] as const;

  for (const bucket of bucketCandidates) {
    const path = normalizeStoragePath(v, bucket);

    const pub = supabase.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl || '';
    if (pub) return pub;

    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
  }
  return '';
}

async function toggleLike(postId: string, uid: string) {
  const { data: row, error: selErr } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .maybeSingle();

  if (selErr) throw selErr;

  if (row?.id) {
    const { error: delErr } = await supabase.from('post_likes').delete().eq('id', row.id);
    if (delErr) throw delErr;
    return { liked: false };
  } else {
    const { error: insErr } = await supabase.from('post_likes').insert({ post_id: postId, user_id: uid });
    if (insErr) throw insErr;
    return { liked: true };
  }
}

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = (params?.id || '').toString();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState('');
  const [post, setPost] = useState<PostRow | null>(null);

  const [imgSrc, setImgSrc] = useState<string>('');

  const [viewN, setViewN] = useState(0);

  const [likeN, setLikeN] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [commentText, setCommentText] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  const bumpedRef = useRef(false);

  const catLabel = useMemo(() => post?.category || '실전 세일즈', [post?.category]);
  const title = useMemo(() => safeText(post?.title, '(제목 없음)'), [post?.title]);
  const content = useMemo(() => safeText(post?.content, ''), [post?.content]);

  async function loadProfilesFor(uids: string[]) {
    const ids = Array.from(new Set(uids.filter(Boolean)));
    if (!ids.length) return;

    const p1 = await supabase.from('profiles').select('user_id,nickname,name,avatar_url').in('user_id', ids);
    if (!p1.error) {
      setProfiles((prev) => {
        const next = { ...prev };
        (p1.data || []).forEach((r: any) => {
          if (r?.user_id) next[r.user_id] = r as MiniProfile;
        });
        return next;
      });
    }
  }

  async function loadComments() {
    const r1 = await supabase
      .from('community_comments')
      .select('id,post_id,user_id,content,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (r1.error) {
      setComments([]);
      return;
    }

    const rows = (r1.data || []) as CommentRow[];
    setComments(rows);
    await loadProfilesFor(rows.map((x) => x.user_id));
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErrMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.replace('/login');
        return;
      }
      setMeId(uid);

      // post
      const selBase = 'id,user_id,title,content,category,industry,tags,image_url,created_at,view_count';
      const r1 = await supabase.from('community_posts').select(selBase).eq('id', postId).maybeSingle();
      if (r1.error) throw r1.error;

      const p = (r1.data as any) as PostRow | null;
      if (!p) {
        setPost(null);
        setErrMsg('게시글을 찾을 수 없어요.');
        return;
      }
      setPost(p);

      // image
      if (p.image_url) {
        const resolved = await resolveCommunityImageSrc(p.image_url);
        setImgSrc(resolved || '');
      } else setImgSrc('');

      // view +1 once
      const currentV = Math.max(0, Number((p as any).view_count || 0));
      setViewN(currentV + 1);

      if (!bumpedRef.current) {
        bumpedRef.current = true;
        try {
          await supabase.from('community_posts').update({ view_count: currentV + 1 }).eq('id', postId);
        } catch {}
      }

      // likes
      const myLike = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', uid).maybeSingle();
      setLiked(!!myLike.data?.id);

      const allLike = await supabase.from('post_likes').select('post_id').eq('post_id', postId);
      if (!allLike.error) setLikeN((allLike.data || []).length);

      // comments
      await loadComments();
    } catch (e: any) {
      setErrMsg(e?.message || '상세 로드 오류');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!postId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // realtime comments
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`community_comments_${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        async (payload: any) => {
          const row = payload?.new as CommentRow | undefined;
          if (!row?.id) {
            await loadComments();
            return;
          }
          setComments((prev) => {
            if (prev.some((x) => x.id === row.id)) return prev;
            return [...prev, row].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          await loadProfilesFor([row.user_id]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        async (payload: any) => {
          const old = payload?.old as any;
          const deletedId = old?.id;
          if (!deletedId) {
            await loadComments();
            return;
          }
          setComments((prev) => prev.filter((x) => x.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function onClickLike() {
    if (!meId || liking) return;
    setLiking(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeN((n) => Math.max(0, n + (wasLiked ? -1 : 1)));

    try {
      const res = await toggleLike(postId, meId);
      setLiked(res.liked);

      const allLike = await supabase.from('post_likes').select('post_id').eq('post_id', postId);
      if (!allLike.error) setLikeN((allLike.data || []).length);
    } catch (e: any) {
      setLiked(wasLiked);
      setLikeN((n) => Math.max(0, n + (wasLiked ? +1 : -1)));
      setErrMsg(e?.message || '좋아요 오류');
    } finally {
      setLiking(false);
    }
  }

  // ✅✅✅ 댓글 저장: id를 보내지 말고 DB default(uuid)로 생성
  async function onSubmitComment() {
  const text = commentText.trim();
  if (!text || !meId || commentSaving) return;

  setCommentSaving(true);
  setErrMsg(null); // ✅ 여기

  try {
    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      user_id: meId,
      content: text,
    });

    if (error) throw error;

    setErrMsg(null);     // ✅ 성공 시 이슈 카드 제거
    setCommentText('');
    await loadComments();
  } catch (e: any) {
    setErrMsg(e?.message || '댓글 저장 오류');
  } finally {
    setCommentSaving(false);
  }
}


  async function onDeleteComment(commentId: string) {
    if (!meId) return;

    const prev = comments;
    setComments((arr) => arr.filter((x) => x.id !== commentId));

    try {
      const { error } = await supabase.from('community_comments').delete().eq('id', commentId).eq('user_id', meId);
      if (error) throw error;
    } catch (e: any) {
      setComments(prev);
      setErrMsg(e?.message || '댓글 삭제 오류');
    }
  }

  return (
    <ClientShell>
      <div style={styles.page}>
        <div style={styles.topRow}>
          <button type="button" onClick={() => router.back()} style={styles.backBtn}>
            ← 뒤로
          </button>
          <div style={styles.topTitle}>커뮤니티</div>
        </div>

        {errMsg ? (
          <div style={{ ...styles.sectionCard, borderColor: 'rgba(255,70,140,0.45)' }}>
            <div style={{ fontSize: 18, color: '#7a1a3a', fontWeight: 1000 }}>이슈</div>
            <div style={{ marginTop: 8, color: '#6b2340', fontSize: 15.5, fontWeight: 900, whiteSpace: 'pre-wrap' }}>
              {errMsg}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div style={{ ...styles.sectionCard, marginTop: 14 }}>
            <div style={{ fontWeight: 1000, color: '#4a2a55' }}>불러오는 중…</div>
          </div>
        ) : !post ? (
          <div style={{ ...styles.sectionCard, marginTop: 14 }}>
            <div style={{ fontWeight: 1000, color: '#4a2a55' }}>게시글이 없어요.</div>
          </div>
        ) : (
          <>
            <div style={styles.sectionCard}>
              <div style={styles.metaRow}>
                <span style={styles.cat}>{catLabel}</span>
                <span style={styles.time}>{timeAgo(post.created_at)}</span>
              </div>

              <div style={styles.title}>{title}</div>

              {imgSrc ? (
                <div style={styles.imgFrame}>
                  <img src={imgSrc} alt="post" style={styles.img as any} onError={() => setImgSrc('')} />
                </div>
              ) : null}

              <div style={styles.content}>{content || '내용이 없어요.'}</div>

              <div style={styles.statsRow}>
                <span style={styles.statPill}>조회수 {viewN}</span>
                <span style={styles.statPill}>댓글 {comments.length}</span>

                <button type="button" onClick={onClickLike} disabled={liking} style={{ ...styles.likeBtn, ...(liked ? styles.likeBtnOn : {}) }}>
                  좋아요 <b style={{ fontWeight: 1000 }}>{likeN}</b>
                </button>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionTitle}>댓글</div>

              <div className="uplog-cmtbox" style={styles.commentBox}>
                <textarea
  value={commentText}
  onChange={(e) => {
    setCommentText(e.target.value);
    if (errMsg) setErrMsg(null); // ✅ 여기
  }}
  placeholder="댓글을 입력하세요"
/>

                <button type="button" onClick={onSubmitComment} disabled={commentSaving || !commentText.trim()} style={styles.commentBtn}>
                  {commentSaving ? '저장 중…' : '댓글 저장'}
                </button>
              </div>

              <div style={styles.commentList}>
                {comments.length ? (
                  comments.map((c) => {
                    const pf = profiles[c.user_id];
                    const name = safeText(pf?.nickname || pf?.name, '익명 영업인');
                    const avatar = getAvatarSrc(pf?.avatar_url || null);
                    const isMine = meId && c.user_id === meId;

                    return (
                      <div key={c.id} style={styles.commentItem}>
                        <div style={styles.avatar}>
                          {avatar ? <img src={avatar} alt="av" style={styles.avatarImg as any} /> : <div style={styles.avatarFallback}>U</div>}
                        </div>

                        <div style={styles.commentBody}>
                          <div style={styles.commentTop}>
                            <div style={styles.commentTopLeft}>
                              <span style={styles.commentName}>{name}</span>
                              <span style={styles.commentTime}>{timeAgo(c.created_at)}</span>
                            </div>

                            {isMine ? (
                              <button type="button" onClick={() => onDeleteComment(c.id)} style={styles.delBtn}>
                                삭제
                              </button>
                            ) : null}
                          </div>

                          <div style={styles.commentText}>{c.content}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyBox}>첫 댓글을 남겨보세요.</div>
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ height: 30 }} />
      </div>
    </ClientShell>
  );
}

const styles: Record<string, any> = {
  page: { padding: '22px 14px 46px', maxWidth: 980, margin: '0 auto', boxSizing: 'border-box' },

  topRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' },
  backBtn: { border: '1px solid rgba(255,120,200,0.22)', background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: '10px 12px', fontWeight: 1000, color: '#2f143a', cursor: 'pointer' },
  topTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  sectionCard: { marginTop: 18, borderRadius: 24, padding: 18, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(255,120,200,0.22)', boxShadow: '0 16px 45px rgba(40,10,60,0.10)', boxSizing: 'border-box', width: '100%', overflow: 'hidden' },

  metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cat: { fontSize: 13, fontWeight: 1000, color: '#3c184c' },
  time: { fontSize: 12.5, fontWeight: 900, color: '#6b4a78' },

  title: { marginTop: 10, fontSize: 20, fontWeight: 1000, color: '#2f143a' },

  imgFrame: { marginTop: 12, width: '100%', aspectRatio: '16 / 9', maxHeight: 320, borderRadius: 18, border: '1px solid rgba(255,120,200,0.16)', overflow: 'hidden', background: 'rgba(255,255,255,0.92)', display: 'block' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },

  content: { marginTop: 12, fontSize: 15.5, fontWeight: 900, color: '#4a2a55', lineHeight: 1.65, whiteSpace: 'pre-wrap' },

  statsRow: { marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  statPill: { fontSize: 12.5, fontWeight: 1000, padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(255,120,200,0.16)', background: 'rgba(255,255,255,0.92)', color: '#4a2a55' },

  likeBtn: { border: '1px solid rgba(255,120,200,0.18)', background: 'rgba(255,255,255,0.92)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 1000, color: '#4a2a55', cursor: 'pointer', minWidth: 110 },
  likeBtnOn: { background: 'linear-gradient(135deg, rgba(255,120,200,0.22), rgba(170,120,255,0.18))', borderColor: 'rgba(255,120,200,0.28)' },

  sectionTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  commentBox: { marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, alignItems: 'stretch' },
  textarea: { width: '100%', minHeight: 84, resize: 'vertical', borderRadius: 16, border: '1px solid rgba(255,120,200,0.22)', background: 'rgba(255,255,255,0.96)', padding: 12, fontSize: 14.5, fontWeight: 900, color: '#2f143a', outline: 'none', boxSizing: 'border-box' },
  commentBtn: { border: 'none', borderRadius: 16, padding: '12px 14px', fontSize: 14.5, fontWeight: 1000, cursor: 'pointer', color: '#2f143a', background: 'linear-gradient(135deg, rgba(255,120,200,0.88), rgba(170,120,255,0.88))', boxShadow: '0 14px 30px rgba(70,10,110,0.16)' },

  commentList: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 },

  commentItem: { display: 'grid', gridTemplateColumns: '44px 1fr', gap: 10, padding: 12, borderRadius: 18, border: '1px solid rgba(255,120,200,0.16)', background: 'rgba(255,255,255,0.95)', boxSizing: 'border-box' },

  avatar: { width: 44, height: 44, borderRadius: 14, border: '1px solid rgba(255,120,200,0.18)', overflow: 'hidden', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarFallback: { fontWeight: 1000, color: '#6b4a78' },

  commentBody: { minWidth: 0 },
  commentTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  commentTopLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },

  commentName: { fontSize: 13.5, fontWeight: 1000, color: '#3c184c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  commentTime: { fontSize: 12, fontWeight: 900, color: '#6b4a78', whiteSpace: 'nowrap' },

  delBtn: { border: '1px solid rgba(255,120,200,0.20)', background: 'rgba(255,255,255,0.92)', borderRadius: 999, padding: '6px 10px', fontSize: 12.5, fontWeight: 1000, color: '#7a1a3a', cursor: 'pointer', minWidth: 60 },

  commentText: { marginTop: 6, fontSize: 14, fontWeight: 900, color: '#4a2a55', lineHeight: 1.55, whiteSpace: 'pre-wrap' },

  emptyBox: { marginTop: 10, padding: 16, borderRadius: 18, border: '1px dashed rgba(255,120,200,0.25)', color: '#5a2d6b', fontWeight: 1000 },
};

if (typeof document !== 'undefined') {
  const id = 'uplog-community-detail-css-v5';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      @media (max-width: 820px){
        .uplog-cmtbox { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(s);
  }
}
