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

function formatKST(iso: string) {
  try {
    const d = new Date(iso);
    // ✅ 브라우저 locale + KST 고정
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const map: any = {};
    parts.forEach((p) => {
      if (p.type !== 'literal') map[p.type] = p.value;
    });

    const yyyy = map.year || '';
    const mm = map.month || '';
    const dd = map.day || '';
    const hh = map.hour || '';
    const mi = map.minute || '';
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
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

  const author = useMemo(() => {
    if (!post?.user_id) return null;
    return profiles[post.user_id] || null;
  }, [post?.user_id, profiles]);

  const authorName = useMemo(() => {
    return safeText(author?.nickname || author?.name, '익명 영업인');
  }, [author?.nickname, author?.name]);

  const authorAvatar = useMemo(() => {
    return getAvatarSrc(author?.avatar_url || null);
  }, [author?.avatar_url]);

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

      // ✅ 작성자 프로필 로드(이거 때문에 “작성자/시간”이 안 보인 느낌이 났음)
      await loadProfilesFor([p.user_id]);

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
            return [...prev].concat([row]).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
    setErrMsg(null);

    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: postId,
        user_id: meId,
        content: text,
      });

      if (error) throw error;

      setErrMsg(null);
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

        {/* ✅ 경고카드: “연한 핑크” 포인트로 유지(화이트로 뭉개지지 않게) */}
        <div style={styles.warnCard}>
          <div style={{ fontWeight: 1000 }}>🌸안내🌸</div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            작은 응원 한마디가 큰 힘이 됩니다 ^^💗
                따뜻한 댓글로 서로를 UP~!! 해주세요!💗
          </div>
        </div>

        {errMsg ? (
          <div style={{ ...styles.issueCard }}>
            <div style={{ fontSize: 16.5, color: '#7a1a3a', fontWeight: 1000 }}>이슈</div>
            <div style={{ marginTop: 8, color: '#6b2340', fontSize: 14.5, fontWeight: 900, whiteSpace: 'pre-wrap' }}>{errMsg}</div>
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
              {/* ✅ 작성자/작성일/카테고리 “확실히” 보이게 */}
              <div style={styles.postHeaderRow}>
                <div style={styles.authorBox}>
                  <div style={styles.authorAvatar}>
                    {authorAvatar ? (
                      <img src={authorAvatar} alt="av" style={styles.authorAvatarImg as any} />
                    ) : (
                      <div style={styles.authorAvatarFallback}>U</div>
                    )}
                  </div>

                  <div style={styles.authorMeta}>
                    <div style={styles.authorNameRow}>
                      <span style={styles.authorName}>{authorName}</span>
                      <span style={styles.authorDot}>•</span>
                      <span style={styles.authorCat}>{catLabel}</span>
                    </div>
                    <div style={styles.authorTimeRow}>
                      <span style={styles.authorTimeAbs}>{formatKST(post.created_at)}</span>
                      <span style={styles.authorTimeAgo}>{timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.metaRightPills}>
                  <span style={styles.metaPillSoft}>조회수 {viewN}</span>
                </div>
              </div>

              <div style={styles.title}>{title}</div>

              {imgSrc ? (
                <div style={styles.imgFrame}>
                  <img src={imgSrc} alt="post" style={styles.img as any} onError={() => setImgSrc('')} />
                </div>
              ) : null}

              <div style={styles.content}>{content || '내용이 없어요.'}</div>

              {/* ✅ 포인트는 살리고(핑크/퍼플), 전체가 하얗게 죽지 않게 */}
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

              {/* ✅ 댓글창 “촌스러움 제거”: 입력 박스/버튼/포커스/모양 정리 */}
              <div className="uplog-cmtbox" style={styles.commentBox}>
                <textarea
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    if (errMsg) setErrMsg(null);
                  }}
                  placeholder="댓글을 입력하세요"
                  style={styles.textarea as any}
                />

                <button
                  type="button"
                  onClick={onSubmitComment}
                  disabled={commentSaving || !commentText.trim()}
                  style={{ ...styles.commentBtn, ...(commentSaving || !commentText.trim() ? styles.commentBtnDisabled : {}) }}
                >
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
  page: {
    padding: '22px 14px 46px',
    maxWidth: 980,
    margin: '0 auto',
    boxSizing: 'border-box',
  },

  topRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' },
  backBtn: {
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    padding: '10px 12px',
    fontWeight: 1000,
    color: '#2f143a',
    cursor: 'pointer',
  },
  topTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  // ✅ 경고카드: 연핑크 포인트 (전체가 하얘지지 않게)
  warnCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,200,220,0.18)',
    color: '#4a2a55',
    boxSizing: 'border-box',
  },

  issueCard: {
    marginTop: 14,
    borderRadius: 20,
    padding: 16,
    background: 'rgba(255,230,240,0.42)',
    border: '1px solid rgba(255,70,140,0.25)',
    boxShadow: '0 16px 45px rgba(40,10,60,0.08)',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
  },

  sectionCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(255,120,200,0.22)',
    boxShadow: '0 16px 45px rgba(40,10,60,0.10)',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
  },

  // ✅ 작성자/시간/카테고리 영역
  postHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    boxSizing: 'border-box',
  },

  authorBox: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },

  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.18)',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.14), rgba(170,120,255,0.12))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
  },
  authorAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  authorAvatarFallback: { fontWeight: 1000, color: '#6b4a78' },

  authorMeta: { minWidth: 0 },
  authorNameRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' },
  authorName: { fontSize: 14.2, fontWeight: 1000, color: '#2f143a' },
  authorDot: { color: 'rgba(90,45,107,0.55)', fontWeight: 1000 },
  authorCat: {
    fontSize: 12.6,
    fontWeight: 1000,
    color: '#3c184c',
    padding: '5px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'rgba(255,255,255,0.92)',
    whiteSpace: 'nowrap',
  },

  authorTimeRow: { marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  authorTimeAbs: { fontSize: 12.5, fontWeight: 900, color: '#6b4a78' },
  authorTimeAgo: {
    fontSize: 12,
    fontWeight: 1000,
    color: '#7a1a3a',
    background: 'rgba(255,200,220,0.35)',
    border: '1px solid rgba(255,120,200,0.20)',
    padding: '4px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },

  metaRightPills: { display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' },
  metaPillSoft: {
    fontSize: 12.5,
    fontWeight: 1000,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    color: '#4a2a55',
    whiteSpace: 'nowrap',
  },

  title: { marginTop: 12, fontSize: 20, fontWeight: 1000, color: '#2f143a' },

  imgFrame: {
    marginTop: 12,
    width: '100%',
    aspectRatio: '16 / 9',
    maxHeight: 320,
    borderRadius: 18,
    border: '1px solid rgba(255,120,200,0.16)',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.92)',
    display: 'block',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },

  content: {
    marginTop: 12,
    fontSize: 15.5,
    fontWeight: 900,
    color: '#4a2a55',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
  },

  statsRow: { marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  statPill: {
    fontSize: 12.5,
    fontWeight: 1000,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    color: '#4a2a55',
  },

  likeBtn: {
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 12.5,
    fontWeight: 1000,
    color: '#4a2a55',
    cursor: 'pointer',
    minWidth: 110,
  },
  likeBtnOn: {
    background: 'linear-gradient(135deg, rgba(255,120,200,0.22), rgba(170,120,255,0.18))',
    borderColor: 'rgba(255,120,200,0.28)',
  },

  sectionTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  // ✅ 댓글 입력: “촌스러움 제거” 핵심
  commentBox: {
    marginTop: 12,
    display: 'grid',
    gridTemplateColumns: '1fr 140px',
    gap: 12,
    alignItems: 'stretch',
    padding: 12,
    borderRadius: 18,
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'linear-gradient(135deg, rgba(255,200,220,0.16), rgba(200,180,255,0.12))',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    minHeight: 92,
    resize: 'vertical',
    borderRadius: 16,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.98)',
    padding: 12,
    fontSize: 14.5,
    fontWeight: 900,
    color: '#2f143a',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  },

  commentBtn: {
    border: 'none',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 14.5,
    fontWeight: 1000,
    cursor: 'pointer',
    color: '#2f143a',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.90), rgba(170,120,255,0.90))',
    boxShadow: '0 14px 30px rgba(70,10,110,0.16)',
    minHeight: 48,
  },
  commentBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },

  commentList: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 },

  commentItem: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.95)',
    boxSizing: 'border-box',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.18)',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarFallback: { fontWeight: 1000, color: '#6b4a78' },

  commentBody: { minWidth: 0 },
  commentTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  commentTopLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },

  commentName: { fontSize: 13.5, fontWeight: 1000, color: '#3c184c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  commentTime: {
    fontSize: 12,
    fontWeight: 1000,
    color: '#6b4a78',
    whiteSpace: 'nowrap',
    background: 'rgba(200,180,255,0.14)',
    border: '1px solid rgba(170,120,255,0.16)',
    padding: '4px 8px',
    borderRadius: 999,
  },

  delBtn: {
    border: '1px solid rgba(255,120,200,0.20)',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12.5,
    fontWeight: 1000,
    color: '#7a1a3a',
    cursor: 'pointer',
    minWidth: 60,
  },

  commentText: { marginTop: 6, fontSize: 14, fontWeight: 900, color: '#4a2a55', lineHeight: 1.55, whiteSpace: 'pre-wrap' },

  emptyBox: { marginTop: 10, padding: 16, borderRadius: 18, border: '1px dashed rgba(255,120,200,0.25)', color: '#5a2d6b', fontWeight: 1000 },
};

if (typeof document !== 'undefined') {
  const id = 'uplog-community-detail-css-v7';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      @media (max-width: 820px){
        .uplog-cmtbox { grid-template-columns: 1fr !important; }
      }

      .uplog-cmtbox textarea:focus{
        border-color: rgba(255,120,200,0.42) !important;
        box-shadow: 0 0 0 4px rgba(255,120,200,0.12) !important;
      }
    `;
    document.head.appendChild(s);
  }
}
