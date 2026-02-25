// ✅✅✅ 전체복붙: src/app/community/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type CommunityCategory =
  | '실전 세일즈'
  | '노하우/자료'
  | '멘탈/마인드'
  | '성과/인증'
  | '피드백 요청'
  | '업종 라운지'
  | '구인/구직';

const CATEGORY_LIST: { id: CommunityCategory; emoji: string; desc: string }[] = [
  { id: '실전 세일즈', emoji: '🔥', desc: '상담/거절/반론, 전환 포인트 공유' },
  { id: '노하우/자료', emoji: '📚', desc: '문자/스크립트/루틴 템플릿 공유' },
  { id: '멘탈/마인드', emoji: '🧠', desc: '멘탈 관리, 꾸준함, 슬럼프 극복' },
  { id: '성과/인증', emoji: '🏆', desc: '성과 인증, 성과 만든 루틴/전략' },
  { id: '피드백 요청', emoji: '🤝', desc: '멘트/문자/상황 피드백 받기' },
  { id: '업종 라운지', emoji: '🧩', desc: '업종별 팁/이슈/고객 반응 공유' },
  { id: '구인/구직', emoji: '💼', desc: '채용/구직 정보(과한 광고 금지)' },
];

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

  const bucketCandidates = ['COMMUNITY-IMAGES', 'community', 'community_uploads', 'uploads'] as const;

  for (const bucket of bucketCandidates) {
    const path = normalizeStoragePath(v, bucket);
    const pub = supabase.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl || '';
    if (pub) return pub;

    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // ignore
    }
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

function buildGuideSlides() {
  const base = ['1) 상황(고객 유형/대화 흐름)', '2) 내 멘트·문자(복붙 가능)', '3) 결과(반응/전환/다음 약속)', '4) 팁(주의점/응용 포인트)'];

  const map: Record<CommunityCategory, { title: string; lines: string[]; desc: string }> = {
    '실전 세일즈': {
      title: '거절/반론/전환 “실전 썰”을 남겨요',
      desc: '상담/거절/반론, 전환 포인트 공유',
      lines: ['• 고객 원문(한 줄이라도)', '• 내 답변(핵심 멘트)', '• 다음 액션(약속/리마인드/자료)', ...base],
    },
    '노하우/자료': {
      title: '템플릿을 “복붙 자산”으로 공유해요',
      desc: '문자/스크립트/루틴 템플릿 공유',
      lines: ['• 첫통화/재통화/계약후 감사/관리문자', '• 스크립트 구조(인삿말→질문→제안→마무리)', '• 사용 타이밍(언제/누구에게)', ...base],
    },
    '멘탈/마인드': {
      title: '꾸준함·슬럼프 극복 루틴을 공유해요',
      desc: '멘탈 관리, 꾸준함, 슬럼프 극복',
      lines: ['• 무너질 때 다시 세우는 방법', '• 하루 최소 기준(딱 1개라도)', '• 회복 루틴(운동/기록/피드백)', ...base],
    },
    '성과/인증': {
      title: '성과를 “재현 가능”하게 남겨요',
      desc: '성과 인증, 성과 만든 루틴/전략',
      lines: ['• 어떤 행동이 성과로 이어졌는지', '• 전환 포인트(결정적 질문/문장)', '• 다음에 그대로 쓰는 체크리스트', ...base],
    },
    '피드백 요청': {
      title: '멘트/문자/상황을 올리고 피드백 받아요',
      desc: '멘트/문자/상황 피드백 받기',
      lines: ['• 상황(고객 유형/현재 단계)', '• 내 초안(멘트/문자 그대로)', '• 원하는 결과(약속/설명/거절방어)', ...base],
    },
    '업종 라운지': {
      title: '업종별 반응/이슈/포인트를 모아요',
      desc: '업종별 팁/이슈/고객 반응 공유',
      lines: ['• 업종/타겟(연령/관심사)', '• 자주 나오는 반론 TOP', '• 업종 전용 금지/추천 멘트', ...base],
    },
    '구인/구직': {
      title: '정보 공유는 OK, 과한 광고는 NO',
      desc: '채용/구직 정보(과한 광고 금지)',
      lines: ['• 포지션/지역/조건을 명확히', '• 도배/과장/링크 남발 금지', '• 문의 방식(댓글/쪽지 등)만 간단히', ...base],
    },
  };

  return CATEGORY_LIST.map((c) => ({
    id: c.id,
    emoji: c.emoji,
    desc: map[c.id].desc,
    title: map[c.id].title,
    lines: map[c.id].lines,
  }));
}

export default function CommunityPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'전체' | CommunityCategory>('전체');

  const UPZZU_COMMUNITY_SRC = '/upzzu3.png';
  const mascotSrc = `${UPZZU_COMMUNITY_SRC}?v=${Date.now()}`;

  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});

  const [meId, setMeId] = useState<string>('');
  const [meRole, setMeRole] = useState<string>('');

  const [likeCount, setLikeCount] = useState<Record<string, number>>({});
  const [likedMe, setLikedMe] = useState<Record<string, boolean>>({});
  const [liking, setLiking] = useState<Record<string, boolean>>({});

  const [viewCount, setViewCount] = useState<Record<string, number>>({});
  const [commentCount, setCommentCount] = useState<Record<string, number>>({});

  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const guideSlides = useMemo(() => buildGuideSlides(), []);
  const [guideIdx, setGuideIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setGuideIdx((i) => (i + 1) % guideSlides.length), 3600);
    return () => window.clearInterval(t);
  }, [guideSlides.length]);

  async function load() {
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

      // ✅ 내 role 로드(없어도 안전)
      try {
        const pr = await supabase.from('profiles').select('role').eq('user_id', uid).maybeSingle();
        setMeRole(String((pr.data as any)?.role || ''));
      } catch {
        setMeRole('');
      }

      let rows: PostRow[] = [];
      {
        const selBase = 'id,user_id,title,content,category,industry,tags,image_url,created_at,view_count';
        const r1 = await supabase.from('community_posts').select(selBase).order('created_at', { ascending: false }).limit(200);

        if (r1.error) {
          const msg = (r1.error as any)?.message || '';
          const isMissingCol = msg.includes('view_count') || msg.includes('column') || msg.includes('42703');
          if (isMissingCol) {
            const r2 = await supabase
              .from('community_posts')
              .select('id,user_id,title,content,category,industry,tags,image_url,created_at')
              .order('created_at', { ascending: false })
              .limit(200);
            if (r2.error) throw r2.error;
            rows = (r2.data || []) as any;
          } else {
            throw r1.error;
          }
        } else {
          rows = (r1.data || []) as any;
        }
      }

      setPosts(rows);

      const initViews: Record<string, number> = {};
      rows.forEach((p) => (initViews[p.id] = Math.max(0, Number((p as any).view_count || 0))));
      setViewCount(initViews);

      const postIds = rows.map((p) => p.id);

      const initCmt: Record<string, number> = {};
      postIds.forEach((id) => (initCmt[id] = 0));
      setCommentCount(initCmt);

      if (postIds.length) {
        const c1 = await supabase.from('community_comments').select('post_id').in('post_id', postIds);
        if (!c1.error) {
          const nextCmt: Record<string, number> = {};
          postIds.forEach((id) => (nextCmt[id] = 0));
          (c1.data || []).forEach((r: any) => {
            if (r?.post_id) nextCmt[r.post_id] = (nextCmt[r.post_id] || 0) + 1;
          });
          setCommentCount(nextCmt);
        }

        const myLikeRes = await supabase.from('post_likes').select('post_id').eq('user_id', uid).in('post_id', postIds);
        if (!myLikeRes.error) {
          const mine = new Set((myLikeRes.data || []).map((x: any) => x.post_id));
          const nextMe: Record<string, boolean> = {};
          postIds.forEach((id) => (nextMe[id] = mine.has(id)));
          setLikedMe(nextMe);
        } else {
          const nextMe: Record<string, boolean> = {};
          postIds.forEach((id) => (nextMe[id] = false));
          setLikedMe(nextMe);
        }

        const allLikeRes = await supabase.from('post_likes').select('post_id').in('post_id', postIds);
        if (!allLikeRes.error) {
          const nextCnt: Record<string, number> = {};
          postIds.forEach((id) => (nextCnt[id] = 0));
          (allLikeRes.data || []).forEach((r: any) => {
            if (r?.post_id) nextCnt[r.post_id] = (nextCnt[r.post_id] || 0) + 1;
          });
          setLikeCount(nextCnt);
        } else {
          const nextCnt: Record<string, number> = {};
          postIds.forEach((id) => (nextCnt[id] = 0));
          setLikeCount(nextCnt);
        }
      }

      const top = rows.slice(0, 60);
      const nextMap: Record<string, string> = {};
      await Promise.all(
        top.map(async (p) => {
          const src = await resolveCommunityImageSrc(p.image_url);
          if (src) nextMap[p.id] = src;
        })
      );
      setThumbMap((prev) => ({ ...prev, ...nextMap }));
    } catch (e: any) {
      setErrMsg(e?.message || '커뮤니티 로드 오류');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = useMemo(() => String(meRole || '').toLowerCase() === 'admin', [meRole]);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const base = [...posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return base.filter((p) => {
      const okCat = cat === '전체' ? true : (p.category || '') === cat;
      if (!okCat) return false;

      if (!keyword) return true;
      const hay = `${p.title || ''} ${p.content || ''} ${p.category || ''} ${p.industry || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(keyword);
    });
  }, [posts, q, cat]);

  const previewA = filtered.slice(0, 2);
  const previewB = filtered.slice(2, 4);

  async function ensureThumb(postId: string, raw: string | null) {
    if (thumbMap[postId]) return;
    const src = await resolveCommunityImageSrc(raw);
    if (src) setThumbMap((prev) => ({ ...prev, [postId]: src }));
  }

  async function onClickLike(e: any, postId: string) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!meId) return;
    if (liking[postId]) return;

    setLiking((m) => ({ ...m, [postId]: true }));

    const wasLiked = !!likedMe[postId];
    setLikedMe((m) => ({ ...m, [postId]: !wasLiked }));
    setLikeCount((m) => ({ ...m, [postId]: Math.max(0, (m[postId] || 0) + (wasLiked ? -1 : 1)) }));

    try {
      const res = await toggleLike(postId, meId);
      setLikedMe((m) => ({ ...m, [postId]: res.liked }));
    } catch (err) {
      setLikedMe((m) => ({ ...m, [postId]: wasLiked }));
      setLikeCount((m) => ({ ...m, [postId]: Math.max(0, (m[postId] || 0) + (wasLiked ? +1 : -1)) }));
      setErrMsg((err as any)?.message || '좋아요 처리 오류');
    } finally {
      setLiking((m) => ({ ...m, [postId]: false }));
    }
  }

  async function bumpView(postId: string) {
    let next = 0;
    setViewCount((prev) => {
      next = (prev[postId] || 0) + 1;
      return { ...prev, [postId]: next };
    });

    try {
      await supabase.from('community_posts').update({ view_count: next }).eq('id', postId);
    } catch {
      // ignore
    }
  }

  function openPost(postId: string) {
    bumpView(postId);
    router.push(`/community/${postId}`);
  }

  async function deletePost(postId: string, ownerId: string) {
    if (!meId) return;
    if (deleting[postId]) return;

    const ok = window.confirm('이 게시글을 삭제할까요?\n삭제하면 복구할 수 없습니다.');
    if (!ok) return;

    setDeleting((m) => ({ ...m, [postId]: true }));
    setErrMsg(null);

    try {
      // ✅ 관련 데이터 먼저 정리(외래키/정책 환경에 따라 필요)
      try {
        await supabase.from('community_comments').delete().eq('post_id', postId);
      } catch {}
      try {
        await supabase.from('post_likes').delete().eq('post_id', postId);
      } catch {}

      // ✅ 게시글 삭제: admin이면 id만, 아니면 본인 글만 삭제
      const qDel = isAdmin
        ? supabase.from('community_posts').delete().eq('id', postId)
        : supabase.from('community_posts').delete().eq('id', postId).eq('user_id', ownerId || meId);

      const { error } = await qDel;
      if (error) throw error;

      // ✅ UI 즉시 반영
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setThumbMap((prev) => {
        const n = { ...prev };
        delete n[postId];
        return n;
      });
      setLikeCount((prev) => {
        const n = { ...prev };
        delete n[postId];
        return n;
      });
      setLikedMe((prev) => {
        const n = { ...prev };
        delete n[postId];
        return n;
      });
      setViewCount((prev) => {
        const n = { ...prev };
        delete n[postId];
        return n;
      });
      setCommentCount((prev) => {
        const n = { ...prev };
        delete n[postId];
        return n;
      });
    } catch (e: any) {
      setErrMsg(e?.message || '삭제 실패 (권한/RLS 확인 필요)');
    } finally {
      setDeleting((m) => ({ ...m, [postId]: false }));
    }
  }

  const activeGuide = guideSlides[Math.min(guideIdx, guideSlides.length - 1)];

  return (
    <ClientShell>
      <div style={styles.page}>
        <div style={styles.topTitle}>
          <div style={styles.heroTitle}>커뮤니티</div>
          <div style={styles.heroSub}>세일즈들끼리 경험을 공유하고, 내 자산으로 저장하세요.</div>
        </div>

        <div style={styles.guideCard}>
          <div style={styles.guideBubble} className="uplog-community-bubble-padfix">
            <div style={styles.tipBadge}>업쮸 가이드</div>

            <div style={styles.guideCatLine}>
              <span style={styles.guideCatPill}>
                {activeGuide.emoji} {activeGuide.id}
              </span>
              <span style={styles.guideCatDesc}>{activeGuide.desc}</span>
            </div>

            <div style={styles.tipTitle}>{activeGuide.title}</div>

            <div style={styles.tipLines}>
              {activeGuide.lines.map((l, i) => (
                <div key={`${activeGuide.id}-${i}`}>{l}</div>
              ))}
            </div>

            <div style={styles.dots}>
              {guideSlides.map((_, i) => (
                <span
                  key={i}
                  onClick={() => setGuideIdx(i)}
                  style={{ ...styles.dot, ...(i === guideIdx ? styles.dotOn : {}) }}
                  role="button"
                  aria-label={`dot-${i}`}
                />
              ))}
            </div>

            <img src={mascotSrc} alt="upzzu" style={styles.mascotInBubble as any} />
          </div>
        </div>

        {/* ✅ 경고: 연핑크 포인트 */}
        <div style={styles.warnCard}>
          <div style={{ fontWeight: 1000 }}>⚠️ 경고</div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>19금, 욕설, 비방/모욕, 차별, 과한 광고/도배는 제재 대상입니다.</div>
        </div>

        <div style={styles.writeRow}>
          <button type="button" onClick={() => router.push('/community/write')} style={styles.writeBtn}>
            ✍️ 글 작성하기
          </button>
        </div>

        {errMsg ? (
          <div style={{ ...styles.sectionCard, borderColor: 'rgba(255,70,140,0.45)' }}>
            <div style={{ fontSize: 18, color: '#7a1a3a', fontWeight: 1000 }}>이슈</div>
            <div style={{ marginTop: 8, color: '#6b2340', fontSize: 15.5, fontWeight: 900 }}>{errMsg}</div>
          </div>
        ) : null}

        <div style={styles.sectionCard}>
          <div className="uplog-community-filter" style={styles.filterRow}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색: 제목/내용/태그/업종" style={styles.search as any} />
            <select value={cat} onChange={(e) => setCat(e.target.value as any)} style={styles.select as any}>
              <option value="전체">전체</option>
              {CATEGORY_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.emoji} ${c.id} · ${c.desc}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ✅ 미리보기: 작게 유지 + 포인트 컬러 유지 */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionTitle}>미리보기</div>

          <div className="uplog-community-hl" style={styles.previewGrid}>
            <div style={styles.previewCol}>
              <div style={styles.previewHead}>조회수 많은 글 (최근순 미리보기)</div>
              {previewA.length ? (
                <div style={styles.previewList}>
                  {previewA.map((p) => (
                    <PostCard
                      key={p.id}
                      p={p}
                      compact
                      meId={meId}
                      isAdmin={isAdmin}
                      deleting={!!deleting[p.id]}
                      onDelete={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deletePost(p.id, p.user_id);
                      }}
                      thumbSrc={thumbMap[p.id] || ''}
                      ensureThumb={() => ensureThumb(p.id, p.image_url)}
                      likeN={likeCount[p.id] || 0}
                      liked={!!likedMe[p.id]}
                      liking={!!liking[p.id]}
                      viewN={viewCount[p.id] || 0}
                      commentN={commentCount[p.id] || 0}
                      onLike={(e) => onClickLike(e, p.id)}
                      onOpen={() => openPost(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptySmall />
              )}
            </div>

            <div style={styles.previewCol}>
              <div style={styles.previewHead}>좋아요 많은 글 (최근순 미리보기)</div>
              {previewB.length ? (
                <div style={styles.previewList}>
                  {previewB.map((p) => (
                    <PostCard
                      key={p.id}
                      p={p}
                      compact
                      meId={meId}
                      isAdmin={isAdmin}
                      deleting={!!deleting[p.id]}
                      onDelete={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deletePost(p.id, p.user_id);
                      }}
                      thumbSrc={thumbMap[p.id] || ''}
                      ensureThumb={() => ensureThumb(p.id, p.image_url)}
                      likeN={likeCount[p.id] || 0}
                      liked={!!likedMe[p.id]}
                      liking={!!liking[p.id]}
                      viewN={viewCount[p.id] || 0}
                      commentN={commentCount[p.id] || 0}
                      onLike={(e) => onClickLike(e, p.id)}
                      onOpen={() => openPost(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptySmall />
              )}
            </div>
          </div>
        </div>

        <div style={styles.sectionCard}>
          <div style={styles.sectionTitle}>전체 글 (최근 게시글 순)</div>

          {loading ? (
            <div style={{ marginTop: 14, fontWeight: 1000, color: '#4a2a55' }}>불러오는 중…</div>
          ) : filtered.length ? (
            <div className="uplog-community-list" style={styles.listGrid}>
              {filtered.map((p) => (
                <PostCard
                  key={p.id}
                  p={p}
                  meId={meId}
                  isAdmin={isAdmin}
                  deleting={!!deleting[p.id]}
                  onDelete={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deletePost(p.id, p.user_id);
                  }}
                  thumbSrc={thumbMap[p.id] || ''}
                  ensureThumb={() => ensureThumb(p.id, p.image_url)}
                  likeN={likeCount[p.id] || 0}
                  liked={!!likedMe[p.id]}
                  liking={!!liking[p.id]}
                  viewN={viewCount[p.id] || 0}
                  commentN={commentCount[p.id] || 0}
                  onLike={(e) => onClickLike(e, p.id)}
                  onOpen={() => openPost(p.id)}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyBox}>게시글이 없어요.</div>
          )}
        </div>

        <div style={{ height: 30 }} />
      </div>
    </ClientShell>
  );
}

function EmptySmall() {
  return <div style={styles.emptySmall}>아직 없어요.</div>;
}

function PostCard({
  p,
  onOpen,
  onLike,
  onDelete,
  likeN,
  liked,
  liking,
  thumbSrc,
  ensureThumb,
  viewN,
  commentN,
  compact,
  meId,
  isAdmin,
  deleting,
}: {
  p: PostRow;
  onOpen: () => void;
  onLike: (e: any) => void;
  onDelete: (e: any) => void;
  likeN: number;
  liked: boolean;
  liking: boolean;
  thumbSrc: string;
  ensureThumb: () => void;
  viewN: number;
  commentN: number;
  compact?: boolean;
  meId: string;
  isAdmin: boolean;
  deleting: boolean;
}) {
  const catLabel = p.category || '실전 세일즈';
  const title = safeText(p.title, '(제목 없음)');
  const snippetBase = safeText(p.content, '');
  const snippet = compact
    ? snippetBase.length > 32
      ? `${snippetBase.slice(0, 32)}…`
      : snippetBase
    : snippetBase.length > 56
      ? `${snippetBase.slice(0, 56)}…`
      : snippetBase;

  const canDelete = !!meId && (isAdmin || p.user_id === meId);

  useEffect(() => {
    if (!thumbSrc && p.image_url) ensureThumb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (compact) {
    return (
      <div style={styles.postCardMini} onClick={onOpen} role="button" aria-label="open post">
        <div style={styles.thumbMini}>
          {thumbSrc ? <img src={thumbSrc} alt="thumb" style={styles.thumbImg as any} /> : null}
          {!thumbSrc ? <div style={styles.thumbEmptyMini}>없음</div> : null}
        </div>

        <div style={styles.postBodyMini}>
          <div style={styles.metaRowMini}>
            <span style={styles.catMini}>{catLabel}</span>
            <span style={styles.timeMini}>{timeAgo(p.created_at)}</span>
          </div>

          <div style={styles.postTitleMini}>{title}</div>
          {snippet ? <div style={styles.postSnippetMini}>{snippet}</div> : null}

          <div style={styles.badgeRowMini}>
            <span style={styles.statPillMini}>조회 {viewN}</span>
            <span style={styles.statPillMini}>댓글 {commentN}</span>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLike(e);
              }}
              disabled={liking}
              style={{ ...styles.likeBtnMini, ...(liked ? styles.likeBtnOnMini : {}) }}
              aria-label="like"
            >
              좋아요 <span style={{ fontWeight: 1000 }}>{likeN}</span>
            </button>

            {canDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(e);
                }}
                disabled={deleting}
                style={{ ...styles.delBtnMini, ...(deleting ? styles.delBtnDisabled : {}) }}
                aria-label="delete"
                title="삭제"
              >
                {deleting ? '삭제중…' : '삭제'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.postCard} onClick={onOpen} role="button" aria-label="open post">
      <div style={styles.thumb}>
        {thumbSrc ? <img src={thumbSrc} alt="thumb" style={styles.thumbImg as any} /> : null}
        {!thumbSrc ? <div style={styles.thumbEmpty}>이미지 없음</div> : null}
      </div>

      <div style={styles.postBody}>
        <div style={styles.metaRow}>
          <div style={styles.metaLeft}>
            <span style={styles.cat}>{catLabel}</span>
            <span style={styles.time}>{timeAgo(p.created_at)}</span>
          </div>
        </div>

        <div style={styles.postTitle}>{title}</div>
        <div style={styles.postSnippet}>{snippet}</div>

        <div style={styles.badgeRow}>
          <span style={styles.statPill}>조회수 {viewN}</span>
          <span style={styles.statPill}>댓글 {commentN}</span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLike(e);
            }}
            disabled={liking}
            style={{ ...styles.likeBtn, ...(liked ? styles.likeBtnOn : {}) }}
            aria-label="like"
          >
            좋아요 <span style={{ fontWeight: 1000 }}>{likeN}</span>
          </button>

          {canDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(e);
              }}
              disabled={deleting}
              style={{ ...styles.delBtn, ...(deleting ? styles.delBtnDisabled : {}) }}
              aria-label="delete"
              title="삭제"
            >
              {deleting ? '삭제중…' : '삭제'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    padding: '22px 14px 46px',
    maxWidth: 980,
    margin: '0 auto',
    boxSizing: 'border-box',
    background:
      'radial-gradient(800px 420px at 22% 10%, rgba(255,170,210,0.20) 0%, rgba(255,170,210,0) 60%), radial-gradient(700px 420px at 92% 22%, rgba(170,140,255,0.18) 0%, rgba(170,140,255,0) 62%), linear-gradient(180deg, rgba(255,245,250,0.92) 0%, rgba(248,244,255,0.95) 70%, rgba(255,255,255,1) 100%)',
    minHeight: 'calc(100vh - 20px)',
    borderRadius: 18,
  },

  topTitle: { padding: '0 4px', boxSizing: 'border-box' },
  heroTitle: { fontSize: 28, fontWeight: 1000, color: '#2f143a' },
  heroSub: { marginTop: 8, fontSize: 16, color: '#4a2a55', fontWeight: 850 },

  guideCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 12,
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'rgba(255,255,255,0.78)',
    boxShadow: '0 12px 26px rgba(30,10,55,0.08)',
    boxSizing: 'border-box',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  },

  guideBubble: {
    position: 'relative',
    borderRadius: 18,
    padding: '16px 150px 16px 16px',
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    minHeight: 168,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  mascotInBubble: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 120,
    height: 'auto',
    userSelect: 'none',
    filter: 'drop-shadow(0 14px 24px rgba(40,10,60,0.16))',
    animation: 'upzzuFloat 2.8s ease-in-out infinite',
    pointerEvents: 'none',
  },

  tipBadge: {
    display: 'inline-block',
    fontSize: 11.5,
    fontWeight: 1000,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(255,120,200,0.20), rgba(170,120,255,0.16))',
    color: '#3c184c',
    border: '1px solid rgba(255,120,200,0.18)',
  },

  guideCatLine: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  guideCatPill: {
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 12.5,
    fontWeight: 1000,
    color: '#3c184c',
    whiteSpace: 'nowrap' as const,
  },
  guideCatDesc: { fontSize: 13, fontWeight: 900, color: '#5a2d6b' },

  tipTitle: { marginTop: 10, fontSize: 14.5, fontWeight: 1000, color: '#3c184c' },
  tipLines: { marginTop: 10, fontSize: 13.1, fontWeight: 900, color: '#4a2a55', lineHeight: 1.6 },

  dots: { marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, background: 'rgba(120,80,160,0.20)', cursor: 'pointer' },
  dotOn: { background: 'rgba(255,120,200,0.72)' },

  warnCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    border: '1px solid rgba(255,120,200,0.28)',
    background: 'linear-gradient(180deg, rgba(255,215,230,0.45), rgba(255,240,246,0.75))',
    color: '#4a2a55',
    boxSizing: 'border-box',
  },

  writeRow: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' },
  writeBtn: {
    border: 'none',
    borderRadius: 16,
    padding: '12px 18px',
    fontSize: 15.5,
    fontWeight: 1000,
    cursor: 'pointer',
    color: '#2f143a',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.92), rgba(170,120,255,0.92))',
    boxShadow: '0 14px 30px rgba(70,10,110,0.18)',
    minWidth: 160,
  },

  sectionCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(255,120,200,0.18)',
    boxShadow: '0 16px 45px rgba(40,10,60,0.10)',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  filterRow: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, alignItems: 'center', boxSizing: 'border-box' },
  search: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    padding: '0 12px',
    fontSize: 15,
    fontWeight: 900,
    color: '#2f143a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    padding: '0 10px',
    fontSize: 15,
    fontWeight: 1000,
    color: '#2f143a',
    outline: 'none',
    boxSizing: 'border-box',
  },

  previewGrid: { marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, boxSizing: 'border-box' },
  previewCol: {
    padding: 12,
    borderRadius: 18,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  previewHead: { fontSize: 13.5, fontWeight: 1000, color: '#3c184c' },
  previewList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 },

  listGrid: {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 14,
    boxSizing: 'border-box',
  },

  postCard: {
    width: '100%',
    border: '1px solid rgba(255,120,200,0.18)',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 12px 26px rgba(30,10,55,0.08)',
    cursor: 'pointer',
    padding: 14,
    display: 'grid',
    gridTemplateColumns: '124px 1fr',
    gap: 14,
    textAlign: 'left',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  postCardMini: {
    width: '100%',
    border: '1px solid rgba(255,120,200,0.18)',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 10px 18px rgba(30,10,55,0.06)',
    cursor: 'pointer',
    padding: 10,
    display: 'grid',
    gridTemplateColumns: '72px 1fr',
    gap: 10,
    textAlign: 'left',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  thumb: {
    width: 124,
    height: 92,
    borderRadius: 16,
    border: '1px dashed rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.95)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  thumbMini: {
    width: 72,
    height: 56,
    borderRadius: 14,
    border: '1px dashed rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.95)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbEmpty: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12.5,
    fontWeight: 1000,
    color: '#6b4a78',
  },
  thumbEmptyMini: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 1000,
    color: '#6b4a78',
  },

  postBody: { minWidth: 0, overflow: 'hidden' },
  metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  metaLeft: { display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 },
  cat: { fontSize: 13, fontWeight: 1000, color: '#3c184c', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const },
  time: { fontSize: 12.5, fontWeight: 900, color: '#6b4a78', whiteSpace: 'nowrap' as const },

  postTitle: { marginTop: 7, fontSize: 16, fontWeight: 1000, color: '#2f143a' },
  postSnippet: { marginTop: 7, fontSize: 13.5, fontWeight: 900, color: '#4a2a55', lineHeight: 1.45 },

  badgeRow: { marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },

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
    minWidth: 96,
  },
  likeBtnOn: {
    background: 'linear-gradient(135deg, rgba(255,120,200,0.20), rgba(170,120,255,0.16))',
    borderColor: 'rgba(255,120,200,0.28)',
  },

  // ✅ 삭제 버튼(핑크-레드 계열)
  delBtn: {
    border: '1px solid rgba(255,70,140,0.22)',
    background: 'linear-gradient(180deg, rgba(255,220,235,0.75), rgba(255,245,250,0.92))',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 12.5,
    fontWeight: 1000,
    color: '#7a1a3a',
    cursor: 'pointer',
    minWidth: 74,
  },
  delBtnMini: {
    border: '1px solid rgba(255,70,140,0.22)',
    background: 'linear-gradient(180deg, rgba(255,220,235,0.75), rgba(255,245,250,0.92))',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 11.5,
    fontWeight: 1000,
    color: '#7a1a3a',
    cursor: 'pointer',
    minWidth: 64,
  },
  delBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  postBodyMini: { minWidth: 0, overflow: 'hidden' },
  metaRowMini: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 },
  catMini: { fontSize: 12, fontWeight: 1000, color: '#3c184c', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const },
  timeMini: { fontSize: 11.5, fontWeight: 900, color: '#6b4a78', whiteSpace: 'nowrap' as const },

  postTitleMini: { marginTop: 5, fontSize: 13.5, fontWeight: 1000, color: '#2f143a', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const },
  postSnippetMini: { marginTop: 5, fontSize: 12.2, fontWeight: 900, color: '#4a2a55', lineHeight: 1.35, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const },

  badgeRowMini: { marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  statPillMini: {
    fontSize: 11.5,
    fontWeight: 1000,
    padding: '5px 9px',
    borderRadius: 999,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    color: '#4a2a55',
  },
  likeBtnMini: {
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 11.5,
    fontWeight: 1000,
    color: '#4a2a55',
    cursor: 'pointer',
    minWidth: 88,
  },
  likeBtnOnMini: {
    background: 'linear-gradient(135deg, rgba(255,120,200,0.18), rgba(170,120,255,0.14))',
    borderColor: 'rgba(255,120,200,0.26)',
  },

  emptySmall: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    border: '1px dashed rgba(255,120,200,0.22)',
    color: '#5a2d6b',
    fontWeight: 900,
    background: 'rgba(255,255,255,0.86)',
  },

  emptyBox: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    border: '1px dashed rgba(255,120,200,0.25)',
    color: '#5a2d6b',
    fontWeight: 1000,
    background: 'rgba(255,255,255,0.86)',
  },
};

if (typeof document !== 'undefined') {
  const id = 'uplog-community-page-keyframes-v12-pink';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      @keyframes upzzuFloat {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }

      @media (max-width: 920px){
        .uplog-community-hl { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 820px){
        .uplog-community-filter { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 720px){
        .uplog-community-list { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 520px){
        .uplog-community-bubble-padfix { padding-right: 120px !important; }
      }
    `;
    document.head.appendChild(s);
  }
}