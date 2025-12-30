// ✅✅✅ 전체복붙: src/app/community/write/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientShell from '@/app/components/ClientShell';
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

type Industry =
  | '보험'
  | '화장품'
  | '부동산'
  | '자동차'
  | '금융/대출'
  | '교육'
  | '통신'
  | 'B2B'
  | '헬스/피트니스'
  | '병원/의료'
  | '프랜차이즈'
  | '서비스'
  | '기타(직접입력)';

const INDUSTRY_LIST: Industry[] = [
  '보험',
  '화장품',
  '부동산',
  '자동차',
  '금융/대출',
  '교육',
  '통신',
  'B2B',
  '헬스/피트니스',
  '병원/의료',
  '프랜차이즈',
  '서비스',
  '기타(직접입력)',
];

function safeText(v?: string | null, fallback = '') {
  const t = (v || '').trim();
  return t ? t : fallback;
}

function splitTags(input: string): string[] {
  const raw = (input || '').trim();
  if (!raw) return [];
  return raw
    .split(/[,\n]/g)
    .map((s) => s.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 12);
}

/** ✅ 버킷명: 대표님이 만든 버킷 그대로 */
const COMMUNITY_BUCKET = 'COMMUNITY-IMAGES';

async function uploadCommunityImage(uid: string, file: File) {
  const bucket = COMMUNITY_BUCKET;

  const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const path = `${uid}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = data?.publicUrl || '';
  if (!url) throw new Error('이미지 업로드 URL 생성 실패');

  // ✅ 캐시 bust (바로 반영)
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

export default function CommunityWritePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // ✅ 수정모드: /community/write?id=POST_ID
  const editId = sp.get('id')?.trim() || '';

  // ✅ 공유 프리필(반론아카이브 → 글쓰기)
  const prefillTitle = sp.get('title') || '';
  const prefillContent = sp.get('content') || '';
  const prefillCat = sp.get('category') || '';

  // 폼
  const [industry, setIndustry] = useState<Industry>('보험');
  const [industryCustom, setIndustryCustom] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('실전 세일즈');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');

  // 이미지
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(''); // 새로 선택한 미리보기
  const [existingImageUrl, setExistingImageUrl] = useState<string>(''); // 기존 글 이미지

  // ✅ 작성하기 마스코트
  const UPZZU_WRITE_SRC = '/assets/up5.png';

  // ✅ 말풍선 슬라이드
  const SLIDES = useMemo(() => {
    const base = [
      {
        key: 'format',
        title: '✨ 글이 좋아지는 4줄 구조',
        point: '(상황) (내 멘트/문자) (고객 반응) (다음 액션)',
        body: '길게 쓰기보다 “바로 따라할 수 있는 핵심”을 남기면 저장/좋아요가 잘 붙어요.',
      },
      {
        key: 'warn',
        title: '⚠️ 커뮤니티 안전 안내',
        point: '19금·욕설·비방·차별·도배·과한 광고는 제재 대상입니다.',
        body: '팀/고객이 보는 공간이에요. “사실 기반 + 실전 도움” 중심으로 작성해 주세요.',
      },
    ];

    const byCat: Record<string, { title: string; point: string; body: string }> = {
      '실전 세일즈': {
        title: '🔥 실전 세일즈',
        point: '전환 포인트 1문장만 공유해도 충분해요.',
        body: '거절 순간 “어떤 질문을 던졌는지”를 적어주면 다른 사람이 그대로 써먹을 수 있어요.',
      },
      '노하우/자료': {
        title: '📚 노하우/자료',
        point: '복붙 가능한 템플릿은 저장률이 높아요.',
        body: '문자/스크립트는 “상황 제목 + 템플릿 + 사용 팁” 세트로 올리면 자료가 됩니다.',
      },
      '멘탈/마인드': {
        title: '🧠 멘탈/마인드',
        point: '무너질 때 다시 세우는 루틴이 실력입니다.',
        body: '슬럼프 때 “내가 실제로 한 행동 3가지”를 적어주면 공감/응원이 붙어요.',
      },
      '성과/인증': {
        title: '🏆 성과/인증',
        point: '성과보다 “만든 과정”이 더 값져요.',
        body: '성과 + (전날/당일 루틴) + (대화 포인트) + (다음 목표) 조합으로 남겨주세요.',
      },
      '피드백 요청': {
        title: '🤝 피드백 요청',
        point: '어디가 고민인지 한 줄로 지정하면 답이 빨라요.',
        body: '원하는 톤(부드럽게/강하게)과 목표(약속 잡기/거절 처리)를 같이 적어주세요.',
      },
      '업종 라운지': {
        title: '🧩 업종 라운지',
        point: '업종 특성(시즌/단가/고객성향)이 무기예요.',
        body: '업종 이슈 + 고객 반응 + 내 대응을 공유하면 같은 업종이 바로 적용해요.',
      },
      '구인/구직': {
        title: '💼 구인/구직',
        point: '정보는 깔끔하게, 과한 광고는 금지입니다.',
        body: '조건/지역/업무/수수료/교육 여부만 핵심으로 적어주세요.',
      },
    };

    const picked = byCat[category] ? [{ key: category, ...byCat[category] }] : [];
    return [...picked, ...base];
  }, [category]);

  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => setSlideIdx(0), [category]);
  useEffect(() => {
    const t = window.setInterval(() => {
      setSlideIdx((x) => (x + 1) % Math.max(1, SLIDES.length));
    }, 3800);
    return () => window.clearInterval(t);
  }, [SLIDES.length]);

  const slide = SLIDES[Math.min(slideIdx, SLIDES.length - 1)] || SLIDES[0];

  // ✅ 프리필 반영(신규 작성일 때만)
  useEffect(() => {
    if (editId) return;
    setTitle((v) => (v ? v : prefillTitle));
    setContent((v) => (v ? v : prefillContent));

    const c = (prefillCat || '').trim();
    if (c) {
      const hit = CATEGORY_LIST.find((x) => x.id === c)?.id;
      if (hit) setCategory(hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvedIndustry = useMemo(() => {
    if (industry === '기타(직접입력)') return safeText(industryCustom, '기타');
    return industry;
  }, [industry, industryCustom]);

  const tags = useMemo(() => splitTags(tagInput), [tagInput]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
    if (!f) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(f);
    setImagePreview(url);
  }

  function clearNewImagePick() {
    setImageFile(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function loadEditPost(uid: string) {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, user_id, title, content, category, industry, tags, image_url')
      .eq('id', editId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('글을 찾지 못했어요.');
    if ((data as any).user_id !== uid) throw new Error('내 글만 수정/삭제할 수 있어요.');

    setTitle((data as any).title ?? '');
    setContent((data as any).content ?? '');
    setCategory(((data as any).category as CommunityCategory) || '실전 세일즈');

    const ind = (data as any).industry as string | null;
    if (ind && (INDUSTRY_LIST as any).includes(ind)) {
      setIndustry(ind as Industry);
      setIndustryCustom('');
    } else if (ind) {
      setIndustry('기타(직접입력)');
      setIndustryCustom(ind);
    }

    setTagInput(Array.isArray((data as any).tags) ? (data as any).tags.join(', ') : '');
    setExistingImageUrl((data as any).image_url || '');
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          router.replace('/login');
          return;
        }

        if (editId) {
          await loadEditPost(uid);
        }
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || '글쓰기 준비 중 오류');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function onSave() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      router.replace('/login');
      return;
    }

    const t = safeText(title, '');
    const c = safeText(content, '');

    if (!t || t.length < 2) {
      setErrMsg('제목을 2자 이상 입력해 주세요.');
      return;
    }
    if (!c || c.length < 10) {
      setErrMsg('내용을 10자 이상 입력해 주세요.');
      return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      let imageUrl: string | null = existingImageUrl || null;

      if (imageFile) {
        imageUrl = await uploadCommunityImage(uid, imageFile);
      }

      const payload: any = {
        title: t,
        content: c,
        category,
        industry: resolvedIndustry,
        tags,
        image_url: imageUrl,
      };

      if (editId) {
        const { error } = await supabase.from('community_posts').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const insertPayload = { user_id: uid, ...payload };
        const { error } = await supabase.from('community_posts').insert(insertPayload);
        if (error) throw error;
      }

      // ✅ 저장 후 커뮤니티로 확실히 복귀 (캐시/리스트 갱신)
      const stamp = Date.now();
      router.replace(`/community?ts=${stamp}`);
      router.refresh();
    } catch (e: any) {
      setErrMsg(e?.message || '저장 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!editId) return;
    const ok = window.confirm('이 글을 삭제할까요? (복구 불가)');
    if (!ok) return;

    setDeleting(true);
    setErrMsg(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.replace('/login');
        return;
      }

      const { data: row, error: chkErr } = await supabase.from('community_posts').select('user_id').eq('id', editId).maybeSingle();
      if (chkErr) throw chkErr;
      if (!row) throw new Error('글을 찾지 못했어요.');
      if ((row as any).user_id !== uid) throw new Error('내 글만 삭제할 수 있어요.');

      const { error } = await supabase.from('community_posts').delete().eq('id', editId);
      if (error) throw error;

      const stamp = Date.now();
      router.replace(`/community?ts=${stamp}`);
      router.refresh();
    } catch (e: any) {
      setErrMsg(e?.message || '삭제 중 오류가 발생했어요.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <ClientShell>
        <div style={styles.page}>
          <div style={styles.sectionCard}>
            <div style={styles.loadingText}>글쓰기 준비 중…</div>
          </div>
        </div>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <div style={styles.page}>
        <div style={styles.heroCard}>
          <div style={styles.heroTitle}>{editId ? '글 수정하기' : '글 작성하기'}</div>
          <div style={styles.heroSub}>공유는 대표님의 자산이 됩니다. 부드럽게, 실전적으로 ✨</div>

          <div style={styles.upzzuWrap}>
            <div style={styles.balloon}>
              <div style={styles.slideTitle}>{slide?.title || '가이드'}</div>
              <div style={styles.slidePoint}>{slide?.point || ''}</div>
              <div style={styles.slideBody}>{slide?.body || ''}</div>
              <div style={styles.slideDots}>
                {SLIDES.map((s, i) => (
                  <span key={s.key} style={{ ...styles.dot, ...(i === slideIdx ? styles.dotOn : {}) }} />
                ))}
              </div>
            </div>

            <img
              src={UPZZU_WRITE_SRC}
              alt="upzzu"
              style={styles.upzzu as any}
              onError={(ev) => {
                (ev.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {errMsg ? (
          <div style={{ ...styles.sectionCard, borderColor: 'rgba(255,70,140,0.45)' }}>
            <div style={{ fontSize: 18, color: '#7a1a3a', fontWeight: 1000 }}>이슈</div>
            <div style={{ marginTop: 8, color: '#6b2340', fontSize: 15.5, fontWeight: 900 }}>{errMsg}</div>
          </div>
        ) : null}

        <div style={styles.sectionCard}>
          <div style={styles.sectionTitle}>📝 글 정보</div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <div style={styles.label}>업종 선택</div>
              <select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)} style={styles.select as any}>
                {INDUSTRY_LIST.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              {industry === '기타(직접입력)' ? (
                <input
                  value={industryCustom}
                  onChange={(e) => setIndustryCustom(e.target.value)}
                  placeholder="예: 뷰티, 렌탈, 상조, 가전…"
                  style={{ ...styles.input, marginTop: 10 } as any}
                />
              ) : null}
            </div>

            <div style={styles.field}>
              <div style={styles.label}>카테고리 선택</div>
              <select value={category} onChange={(e) => setCategory(e.target.value as CommunityCategory)} style={styles.select as any}>
                {CATEGORY_LIST.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.emoji} {x.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <div style={styles.label}>제목</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: [거절멘트] 가격 부담을 뒤집은 질문" style={styles.input as any} />
          </div>

          <div style={styles.field}>
            <div style={styles.label}>내용</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                '추천 구조:\n' +
                '1) 상황(고객/대화 흐름)\n' +
                '2) 내 멘트/문자(복붙 가능)\n' +
                '3) 결과(반응/전환/다음 약속)\n' +
                '4) 팁(주의점/응용)\n'
              }
              style={styles.textarea as any}
            />
          </div>

          <div style={styles.field}>
            <div style={styles.label}>태그(쉼표로 구분)</div>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="예: 반론,가격,첫통화,멘트" style={styles.input as any} />
            {tags.length ? (
              <div style={styles.tagRow}>
                {tags.map((t, i) => (
                  <span key={`${t}-${i}`} style={styles.tag}>
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div style={styles.field}>
            <div style={styles.label}>사진 첨부(선택)</div>

            <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />

            <div style={styles.imgActionRow}>
              <button type="button" onClick={() => fileRef.current?.click()} style={styles.pickBtn}>
                📷 사진 선택
              </button>

              {imageFile ? (
                <button type="button" onClick={clearNewImagePick} style={styles.removeBtn}>
                  새 선택 취소
                </button>
              ) : null}

              <div style={styles.fileName}>{imageFile ? imageFile.name : existingImageUrl ? '기존 사진 유지' : '선택된 사진 없음'}</div>
            </div>

            {imagePreview ? (
              <div style={styles.previewWrap}>
                <img src={imagePreview} alt="preview" style={styles.preview as any} />
              </div>
            ) : existingImageUrl ? (
              <div style={styles.previewWrap}>
                <img src={existingImageUrl} alt="existing" style={styles.preview as any} />
              </div>
            ) : null}
          </div>
        </div>

        <div style={styles.bottomBarFixSpace} />

        <div style={styles.bottomActionsFixed}>
          {editId ? (
            <>
              <button type="button" onClick={onSave} style={styles.saveBtnWide} disabled={saving}>
                {saving ? '수정 중…' : '✅ 수정 완료'}
              </button>
              <button type="button" onClick={onDelete} style={styles.deleteBtn} disabled={deleting}>
                {deleting ? '삭제 중…' : '🗑️ 삭제'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onSave} style={styles.saveBtnWide} disabled={saving}>
              {saving ? '저장 중…' : '✨ 글 작성하기'}
            </button>
          )}
        </div>

        <div style={{ height: 30 }} />
      </div>
    </ClientShell>
  );
}

const styles: Record<string, any> = {
  page: { padding: '18px 14px 140px', maxWidth: 980, margin: '0 auto' },
  loadingText: { fontSize: 18, fontWeight: 1000, color: '#4a2a55' },

  heroCard: {
    borderRadius: 26,
    padding: 20,
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 18px 55px rgba(30,10,55,0.10)',
    overflow: 'hidden',
  },
  heroTitle: { fontSize: 28, fontWeight: 1000, color: '#3c184c', letterSpacing: -0.2 },
  heroSub: { marginTop: 8, fontSize: 16, color: '#5a2d6b', fontWeight: 900 },

  upzzuWrap: {
    marginTop: 16,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },

  balloon: {
    flex: 1,
    minWidth: 280,
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(255,120,200,0.16)',
    borderRadius: 20,
    padding: 14,
    boxShadow: '0 12px 30px rgba(30,10,55,0.08)',
  },

  slideTitle: { fontSize: 16, fontWeight: 1000, color: '#3c184c' },
  slidePoint: {
    marginTop: 9,
    fontSize: 14.5,
    fontWeight: 1000,
    color: '#7a1a3a',
    padding: '9px 11px',
    borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(255,120,200,0.16), rgba(170,120,255,0.12))',
    border: '1px solid rgba(255,120,200,0.14)',
  },
  slideBody: { marginTop: 10, fontSize: 14.5, fontWeight: 900, color: '#4a2a55', lineHeight: 1.5 },

  slideDots: { marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, background: 'rgba(120,70,160,0.22)' },
  dotOn: { background: 'rgba(255,120,200,0.65)' },

  upzzu: {
    width: 185,
    height: 'auto',
    userSelect: 'none',
    animation: 'upzzuFloat 2.8s ease-in-out infinite',
    filter: 'drop-shadow(0 14px 24px rgba(40,10,60,0.16))',
    pointerEvents: 'none',
  },

  sectionCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(255,120,200,0.14)',
    boxShadow: '0 16px 45px rgba(40,10,60,0.10)',
  },
  sectionTitle: { fontSize: 18, fontWeight: 1000, color: '#3c184c' },

  formGrid: {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
    gap: 14,
    width: '100%',
  },

  field: { marginTop: 16, width: '100%' },
  label: { fontSize: 14, fontWeight: 1000, color: '#3c184c', marginBottom: 8 },

  input: {
    width: '100%',
    maxWidth: '100%',
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    padding: '0 12px',
    fontSize: 16,
    fontWeight: 900,
    color: '#2f143a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    maxWidth: '100%',
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    padding: '0 10px',
    fontSize: 16,
    fontWeight: 1000,
    color: '#2f143a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 200,
    borderRadius: 16,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    padding: 12,
    fontSize: 16,
    fontWeight: 900,
    color: '#2f143a',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.45,
    boxSizing: 'border-box',
  },

  tagRow: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' },
  tag: {
    fontSize: 12,
    fontWeight: 1000,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.80)',
    border: '1px solid rgba(255,120,200,0.16)',
    color: '#4a2a55',
  },

  imgActionRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%' },
  pickBtn: {
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(255,120,200,0.22)',
    background: 'rgba(255,255,255,0.96)',
    fontSize: 15,
    fontWeight: 1000,
    color: '#3c184c',
    cursor: 'pointer',
    padding: '0 12px',
  },
  removeBtn: {
    height: 44,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.22), rgba(170,120,255,0.18))',
    fontSize: 15,
    fontWeight: 1000,
    color: '#3c184c',
    cursor: 'pointer',
    padding: '0 12px',
  },
  fileName: { flex: 1, minWidth: 160, fontSize: 13.5, fontWeight: 900, color: '#6b4a78' },

  previewWrap: {
    marginTop: 10,
    borderRadius: 18,
    overflow: 'hidden',
    border: '1px solid rgba(255,120,200,0.18)',
    background: 'rgba(255,255,255,0.90)',
    boxShadow: '0 12px 26px rgba(30,10,55,0.08)',
  },
  preview: { width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' },

  bottomBarFixSpace: { height: 84 },

  bottomActionsFixed: {
    position: 'fixed',
    right: 18,
    bottom: 18,
    zIndex: 9999,
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    pointerEvents: 'auto',
  },

  saveBtnWide: {
    border: 'none',
    borderRadius: 16,
    padding: '13px 18px',
    fontSize: 16,
    fontWeight: 1000,
    cursor: 'pointer',
    color: '#2f143a',
    background: 'linear-gradient(135deg, rgba(255,120,200,0.88), rgba(170,120,255,0.88))',
    boxShadow: '0 14px 30px rgba(70,10,110,0.18)',
    minWidth: 220,
  },
  deleteBtn: {
    border: '1px solid rgba(255,70,140,0.35)',
    borderRadius: 16,
    padding: '13px 16px',
    fontSize: 16,
    fontWeight: 1000,
    cursor: 'pointer',
    color: '#7a1a3a',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 14px 30px rgba(70,10,110,0.10)',
    minWidth: 140,
  },
};

// ✅ keyframes
if (typeof document !== 'undefined') {
  const id = 'uplog-community-write-keyframes-v1';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @keyframes upzzuFloat {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      @media (max-width: 860px){
        .formGrid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }
}
