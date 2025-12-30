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

// ✅✅✅ 이미지 src: URL/경로 모두 대응 + 버킷 후보들 publicUrl/signedUrl 시도
async function resolveCommunityImageSrc(imageUrlOrPath?: string | null): Promise<string> {
  const v = (imageUrlOrPath || '').trim();
  if (!v) return '';

  // 절대 URL
  if (v.startsWith('http://') || v.startsWith('https://')) return v;

  // public 상대경로(/something.png)
  if (v.startsWith('/')) return v;

  const bucketCandidates = ['community', 'community_uploads', 'uploads'] as const;

  for (const bucket of bucketCandidates) {
    const path = normalizeStoragePath(v, bucket);

    // public url
    const pub = supabase.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl || '';
    if (pub) return pub;

    // signed url (private일 수 있으니)
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

/** ✅ 카테고리별 가이드 슬라이드(자동 슬라이드) */
function buildGuideSlides() {
  const base = [
    '1) 상황(고객 유형/대화 흐름)',
    '2) 내 멘트·문자(복붙 가능)',
    '3) 결과(반응/전환/다음 약속)',
    '4) 팁(주의점/응용 포인트)',
  ];

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

  const mascotCandidates = useMemo(() => ['/upzzu3.png', '/assets/upzzu3.png'], []);
  const [mascotIdx, setMascotIdx] = useState(0);
  const mascotSrc = mascotCandidates[Math.min(mascotIdx, mascotCandidates.length - 1)];

  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});

  const [meId, setMeId] = useState<string>('');
  const [likeCount, setLikeCount] = useState<Record<string, number>>({});
  const [likedMe, setLikedMe] = useState<Record<string, boolean>>({});
  const [liking, setLiking] = useState<Record<string, boolean>>({});

  const [viewCount, setViewCount] = useState<Record<string, number>>({});
  const [commentCount, setCommentCount] = useState<Record<string, number>>({});

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

      // ✅ 댓글 수
      const initCmt: Record<string, number> = {};
      postIds.forEach((id) => (initCmt[id] = 0));
      setCommentCount(initCmt);

      if (postIds.length) {
        // 댓글 테이블: community_comments (post_id)
        const c1 = await supabase.from('community_comments').select('post_id').in('post_id', postIds);
        if (!c1.error) {
          const nextCmt: Record<string, number> = {};
          postIds.forEach((id) => (nextCmt[id] = 0));
          (c1.data || []).forEach((r: any) => {
            if (r?.post_id) nextCmt[r.post_id] = (nextCmt[r.post_id] || 0) + 1;
          });
          setCommentCount(nextCmt);
        }

        // 좋아요(내가 누른 것)
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

        // 좋아요(전체 카운트)
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

      // ✅ 이미지 썸네일: 상단 50개 선로딩 (작성자 이미지 보이게)
      const top = rows.slice(0, 50);
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

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return posts.filter((p) => {
      const okCat = cat === '전체' ? true : (p.category || '') === cat;
      if (!okCat) return false;

      if (!keyword) return true;
      const hay =
        `${p.title || ''} ${p.content || ''} ${p.category || ''} ${p.industry || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(keyword);
    });
  }, [posts, q, cat]);

  const highlightA = filtered.slice(0, 2);
  const highlightB = filtered.slice(2, 4);

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
    setViewCount((m) => ({ ...m, [postId]: (m[postId] || 0) + 1 }));
    try {
      const next = (viewCount[postId] || 0) + 1;
      await supabase.from('community_posts').update({ view_count: next }).eq('id', postId);
    } catch {
      // ignore
    }
  }

  function openPost(postId: string) {
    bumpView(postId);
    router.push(`/community/${postId}`);
  }

  const activeGuide = guideSlides[Math.min(guideIdx, guideSlides.length - 1)];

  return (
    <ClientShell>
      <div style={styles.page}>
        {/* ✅✅✅ 커뮤니티 테두리 큰 카드 제거 (다른 페이지처럼 “내용 카드들”만) */}
        <div style={styles.topTitle}>
          <div style={styles.heroTitle}>커뮤니티</div>
          <div style={styles.heroSub}>세일즈들끼리 경험을 공유하고, 내 자산으로 저장하세요.</div>
        </div>

        {/* ✅✅✅ 말풍선 + 마스코트: “하나의 카드” 안에서 같이 */}
        <div style={styles.guideCard}>
          <div style={styles.guideBubble}>
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
          </div>

          <div style={styles.guideMascotWrap}>
            <img
              src={mascotSrc}
              alt="upzzu"
              style={styles.mascot as any}
              onError={() => setMascotIdx((i) => (i < mascotCandidates.length - 1 ? i + 1 : i))}
            />
          </div>
        </div>

        {/* ✅✅✅ 경고카드 유지 + 글작성하기는 “경고 아래” */}
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

        {/* ✅✅✅ 검색/카테고리: “select 옵션 안에 설명” 넣고, 아래에 따로 나열하는 칩은 삭제 */}
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

        <div style={styles.sectionCard}>
          <div style={styles.sectionTitle}>커뮤니티 하이라이트</div>

          <div className="uplog-community-hl" style={styles.hlGrid}>
            <div style={styles.hlCol}>
              <div style={styles.hlHead}>조회수 많은 글</div>
              {highlightA.length ? (
                <div style={styles.hlList}>
                  {highlightA.map((p) => (
                    <PostCard
                      key={p.id}
                      p={p}
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

            <div style={styles.hlCol}>
              <div style={styles.hlHead}>좋아요 많은 글</div>
              {highlightB.length ? (
                <div style={styles.hlList}>
                  {highlightB.map((p) => (
                    <PostCard
                      key={p.id}
                      p={p}
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
          <div style={styles.sectionTitle}>전체 글</div>

          {loading ? (
            <div style={{ marginTop: 14, fontWeight: 1000, color: '#4a2a55' }}>불러오는 중…</div>
          ) : filtered.length ? (
            <div className="uplog-community-list" style={styles.listGrid}>
              {filtered.map((p) => (
                <PostCard
                  key={p.id}
                  p={p}
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
  return (
    <div style={{ marginTop: 12, padding: 16, borderRadius: 18, border: '1px dashed rgba(255,120,200,0.25)', color: '#5a2d6b', fontWeight: 900 }}>
      아직 없어요.
    </div>
  );
}

function PostCard({
  p,
  onOpen,
  onLike,
  likeN,
  liked,
  liking,
  thumbSrc,
  ensureThumb,
  viewN,
  commentN,
}: {
  p: PostRow;
  onOpen: () => void;
  onLike: (e: any) => void;
  likeN: number;
  liked: boolean;
  liking: boolean;
  thumbSrc: string;
  ensureThumb: () => void;
  viewN: number;
  commentN: number;
}) {
  const catLabel = p.category || '실전 세일즈';
  const title = safeText(p.title, '(제목 없음)');
  const snippetBase = safeText(p.content, '');
  const snippet = snippetBase.length > 56 ? `${snippetBase.slice(0, 56)}…` : snippetBase;

  useEffect(() => {
    if (!thumbSrc && p.image_url) ensureThumb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {/* ✅✅✅ 이모지 제거: 조회수/댓글/좋아요 텍스트형 */}
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
  },

  topTitle: { padding: '0 4px', boxSizing: 'border-box' },
  heroTitle: { fontSize: 28, fontWeight: 1000, color: '#3c184c' },
  heroSub: { marginTop: 8, fontSize: 16, color: '#5a2d6b', fontWeight: 850 },

  // ✅✅✅ 말풍선+마스코트 한 카드
  guideCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 14,
    border: '1px solid rgba(255,120,200,0.20)',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.12), rgba(170,120,255,0.12))',
    boxShadow: '0 12px 26px rgba(30,10,55,0.08)',
    display: 'grid',
    gridTemplateColumns: '1fr 220px',
    gap: 12,
    alignItems: 'stretch',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  guideBubble: {
    borderRadius: 18,
    padding: 16,
    border: '1px solid rgba(255,120,200,0.16)',
    background: 'rgba(255,255,255,0.92)',
    minHeight: 150,
    boxSizing: 'border-box',
  },
  guideMascotWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    boxSizing: 'border-box',
  },

  tipBadge: {
    display: 'inline-block',
    fontSize: 11.5,
    fontWeight: 1000,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(255,120,200,0.22), rgba(170,120,255,0.18))',
    color: '#3c184c',
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

  mascot: {
    width: 170,
    height: 'auto',
    userSelect: 'none',
    filter: 'drop-shadow(0 14px 24px rgba(40,10,60,0.16))',
    animation: 'upzzuFloat 2.8s ease-in-out infinite',
  },

  // ✅✅✅ 경고카드
  warnCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,200,220,0.14)',
    color: '#4a2a55',
    boxSizing: 'border-box',
  },

  // ✅✅✅ 글작성하기는 경고 아래
  writeRow: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' },
  writeBtn: {
    border: 'none',
    borderRadius: 16,
    padding: '12px 18px',
    fontSize: 15.5,
    fontWeight: 1000,
    cursor: 'pointer',
    color: '#2f143a',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.88), rgba(170,120,255,0.88))',
    boxShadow: '0 14px 30px rgba(70,10,110,0.18)',
    minWidth: 160,
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
  sectionTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  // ✅ 오른쪽으로 튀는거 방지(그리드 폭 안전)
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

  hlGrid: { marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, boxSizing: 'border-box' },
  hlCol: {
    padding: 14,
    borderRadius: 20,
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'rgba(255,255,255,0.95)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  hlHead: { fontSize: 15.5, fontWeight: 1000, color: '#3c184c' },
  hlList: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 },

  // ✅ 자동 맞춤(오른쪽 튐 방지)
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
    background: 'rgba(255,255,255,0.96)',
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
    background: 'linear-gradient(135deg, rgba(255,120,200,0.22), rgba(170,120,255,0.18))',
    borderColor: 'rgba(255,120,200,0.28)',
  },

  emptyBox: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    border: '1px dashed rgba(255,120,200,0.25)',
    color: '#5a2d6b',
    fontWeight: 1000,
  },
};

if (typeof document !== 'undefined') {
  const id = 'uplog-community-page-keyframes-v9';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      @keyframes upzzuFloat {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }

      /* ✅ 모바일에서도 카드가 오른쪽 튀지 않게 */
      @media (max-width: 920px){
        .uplog-community-hl { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 820px){
        .uplog-community-filter { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 720px){
        .uplog-community-list { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(s);
  }
}
