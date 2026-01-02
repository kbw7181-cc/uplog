// ✅✅✅ 전체복붙: src/app/community/write/WriteClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type CommunityCategory =
  | '실전 세일즈'
  | '노하우/자료'
  | '멘탈/마인드'
  | '성과/인증'
  | '피드백 요청'
  | '업종 라운지'
  | '구인/구직';

const CATEGORY_LIST: { id: CommunityCategory; emoji: string; desc: string; hint: string }[] = [
  { id: '실전 세일즈', emoji: '🔥', desc: '상담/거절/반론, 전환 포인트 공유', hint: '상담/거절/반론, 전환 포인트 공유' },
  { id: '노하우/자료', emoji: '📚', desc: '문자/스크립트/루틴 템플릿 공유', hint: '문자/스크립트/루틴 템플릿 공유' },
  { id: '멘탈/마인드', emoji: '🧠', desc: '멘탈 관리, 꾸준함, 슬럼프 극복', hint: '멘탈 관리/루틴/슬럼프 극복 팁' },
  { id: '성과/인증', emoji: '🏆', desc: '성과 인증, 성과 만든 루틴/전략', hint: '성과 인증 + 루틴/전략 공유' },
  { id: '피드백 요청', emoji: '🧩', desc: '멘트/문자/상황 피드백 받기', hint: '멘트/문자/상황 피드백 요청' },
  { id: '업종 라운지', emoji: '🏢', desc: '업종별 팁/이슈/고객 반응 공유', hint: '업종별 팀/이슈/고객 반응 공유' },
  { id: '구인/구직', emoji: '🧳', desc: '채용/구직 정보(과한 광고 금지)', hint: '채용/구직 정보 (과한 광고 금지)' },
];

function clamp(v: string, max: number) {
  return (v ?? '').toString().slice(0, max);
}

export default function WriteClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  const [category, setCategory] = useState<CommunityCategory>('실전 세일즈');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [openHelp, setOpenHelp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const titleMax = 80;
  const contentMax = 5000;

  const selectedMeta = useMemo(() => CATEGORY_LIST.find((c) => c.id === category)!, [category]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;
        if (!alive) return;
        setMeId(uid);

        // ✅ 프리필(반론 공유 등): /community/write?cat=...&title=...&content=...
        const cat = sp.get('cat');
        const t = sp.get('title');
        const c = sp.get('content');

        if (cat && CATEGORY_LIST.some((x) => x.id === cat)) setCategory(cat as CommunityCategory);
        if (t) setTitle(clamp(decodeURIComponent(t), titleMax));
        if (c) setContent(clamp(decodeURIComponent(c), contentMax));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    try {
      setMsg(null);
      if (!meId) {
        setMsg('로그인이 필요합니다.');
        router.push('/login');
        return;
      }
      const t = clamp(title.trim(), titleMax);
      const b = clamp(content.trim(), contentMax);

      if (!category) return setMsg('카테고리를 선택해 주세요.');
      if (t.length < 2) return setMsg('제목을 2자 이상 입력해 주세요.');
      if (b.length < 2) return setMsg('내용을 2자 이상 입력해 주세요.');

      setSaving(true);

      // ✅ community_posts 테이블 가정 컬럼:
      // user_id(uuid), category(text), title(text), content(text), created_at(timestamptz default now())
      const { error } = await supabase.from('community_posts').insert([
        {
          user_id: meId,
          category,
          title: t,
          content: b,
        },
      ]);

      if (error) throw error;

      // ✅ 업로드 확인: 커뮤니티 목록으로 이동 + 새로고침 트리거용 쿼리
      router.replace('/community?uploaded=1');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    padding: '18px 14px 80px',
    background:
      'radial-gradient(900px 520px at 18% 10%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 60%),' +
      'radial-gradient(900px 560px at 82% 14%, rgba(243,232,255,0.85) 0%, rgba(255,255,255,0) 62%),' +
      'linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 55%, #f8f4ff 100%)',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 960,
    margin: '0 auto',
    borderRadius: 22,
    padding: 18,
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(168,85,247,0.18)',
    boxShadow: '0 22px 60px rgba(40,10,70,0.12)',
  };

  const titleRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  };

  const h1Style: React.CSSProperties = {
    margin: 0,
    fontSize: 34,
    fontWeight: 950,
    letterSpacing: '-0.02em',
    color: '#1f0b2a',
  };

  const subStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 800,
    color: 'rgba(31,11,42,0.72)',
  };

  const ghostBtn: React.CSSProperties = {
    height: 38,
    padding: '0 14px',
    borderRadius: 14,
    border: '1px solid rgba(168,85,247,0.22)',
    background: 'rgba(255,255,255,0.70)',
    color: '#2a1236',
    fontWeight: 900,
    cursor: 'pointer',
  };

  const sectionLabel: React.CSSProperties = {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 950,
    color: '#1f0b2a',
  };

  const catGrid: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  };

  const catBtnBase: React.CSSProperties = {
    height: 44,
    padding: '0 14px',
    borderRadius: 16,
    border: '1px solid rgba(168,85,247,0.22)',
    background: 'rgba(255,255,255,0.85)',
    color: '#2a1236', // ✅ 흰색글씨 금지(안 보임)
    fontWeight: 950,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 10px 24px rgba(40,10,70,0.06)',
  };

  const catBtnActive: React.CSSProperties = {
    border: '1px solid rgba(59,130,246,0.22)',
    background: 'linear-gradient(90deg, rgba(255,79,161,0.24), rgba(168,85,247,0.22))',
    boxShadow: '0 16px 36px rgba(168,85,247,0.16), 0 0 0 3px rgba(255,79,161,0.10)',
  };

  const hintPill: React.CSSProperties = {
    marginTop: 10,
    borderRadius: 16,
    padding: '10px 12px',
    background: 'linear-gradient(90deg, rgba(59,130,246,0.14), rgba(168,85,247,0.12))',
    border: '1px solid rgba(59,130,246,0.18)',
    color: '#1f0b2a', // ✅ 흰색글씨 금지
    fontWeight: 900,
    fontSize: 14,
  };

  const helpWrap: React.CSSProperties = {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    background: 'rgba(255,255,255,0.75)',
    border: '1px dashed rgba(168,85,247,0.28)',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(168,85,247,0.24)',
    background: 'rgba(255,255,255,0.92)',
    padding: '0 12px',
    fontSize: 15,
    fontWeight: 900,
    color: '#1f0b2a',
    outline: 'none',
  };

  const inputWrap: React.CSSProperties = {
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.86))',
    border: '1px solid rgba(168,85,247,0.18)',
    boxShadow: '0 16px 40px rgba(40,10,70,0.08)',
    overflow: 'hidden',
  };

  const inputTopBar: React.CSSProperties = {
    padding: '10px 12px',
    background: 'linear-gradient(90deg, rgba(59,130,246,0.10), rgba(168,85,247,0.10))',
    borderBottom: '1px solid rgba(168,85,247,0.12)',
    fontWeight: 950,
    color: '#1f0b2a',
  };

  const titleInput: React.CSSProperties = {
    width: '100%',
    height: 52,
    border: 0,
    outline: 'none',
    padding: '0 12px',
    fontSize: 16,
    fontWeight: 900,
    color: '#1f0b2a',
    background: 'rgba(255,255,255,0.75)',
  };

  const textarea: React.CSSProperties = {
    width: '100%',
    minHeight: 220,
    border: 0,
    outline: 'none',
    padding: 12,
    fontSize: 15,
    fontWeight: 800,
    color: '#1f0b2a',
    background: 'rgba(255,255,255,0.72)',
    resize: 'vertical',
    lineHeight: 1.5,
  };

  const counter: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 900,
    color: 'rgba(31,11,42,0.55)',
    textAlign: 'right',
  };

  const bottomRow: React.CSSProperties = {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  };

  const cancelBtn: React.CSSProperties = {
    height: 44,
    padding: '0 16px',
    borderRadius: 16,
    border: '1px solid rgba(168,85,247,0.20)',
    background: 'rgba(255,255,255,0.80)',
    color: '#2a1236',
    fontWeight: 950,
    cursor: 'pointer',
  };

  const saveBtn: React.CSSProperties = {
    height: 44,
    padding: '0 18px',
    borderRadius: 16,
    border: 0,
    background: 'linear-gradient(90deg, #ff4fa1, #a855f7)',
    color: '#fff',
    fontWeight: 950,
    cursor: 'pointer',
    boxShadow: '0 16px 36px rgba(168,85,247,0.18)',
    minWidth: 120,
  };

  const msgStyle: React.CSSProperties = {
    marginTop: 10,
    fontSize: 13,
    fontWeight: 900,
    color: '#b91c1c',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ color: '#2a1236', fontWeight: 900, padding: 6 }}>불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleRow}>
          <div>
            <h1 style={h1Style}>커뮤니티 글쓰기</h1>
            <div style={subStyle}>카테고리 선택하고, 제목/내용 쓰면 바로 저장돼!</div>
          </div>
          <button type="button" style={ghostBtn} onClick={() => router.push('/community')}>
            목록으로
          </button>
        </div>

        <div style={sectionLabel}>카테고리</div>

        <div style={catGrid}>
          {CATEGORY_LIST.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  ...catBtnBase,
                  ...(active ? catBtnActive : null),
                }}
              >
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <span style={{ fontSize: 14 }}>{c.id}</span>
              </button>
            );
          })}
        </div>

        {/* ✅ 카테고리 힌트(스크린샷처럼 “🔥 상담/거절/반론..” 줄) */}
        <div style={hintPill}>
          {selectedMeta.emoji} {selectedMeta.hint}
        </div>

        {/* ✅ 전체 카테고리 설명 보기 (스크린샷처럼) */}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setOpenHelp((v) => !v)}
            style={{
              height: 44,
              width: '100%',
              borderRadius: 16,
              border: '1px dashed rgba(168,85,247,0.28)',
              background: 'rgba(255,255,255,0.70)',
              color: '#2a1236',
              fontWeight: 950,
              cursor: 'pointer',
            }}
          >
            전체 카테고리 설명 보기
          </button>

          {openHelp && (
            <div style={helpWrap}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                style={selectStyle}
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.id} - {c.desc}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 10, color: '#1f0b2a', fontWeight: 900, fontSize: 13, opacity: 0.8 }}>
                {CATEGORY_LIST.map((c) => (
                  <div key={c.id} style={{ marginTop: 6 }}>
                    {c.emoji} <b>{c.id}</b> : {c.desc}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ 제목 */}
        <div style={sectionLabel}>제목</div>
        <div style={inputWrap}>
          <div style={inputTopBar}>예: 거절 멘트 이렇게 넘겼어요</div>
          <input
            value={title}
            onChange={(e) => setTitle(clamp(e.target.value, titleMax))}
            placeholder="제목을 입력해 주세요."
            style={titleInput}
          />
        </div>
        <div style={counter}>
          {title.length}/{titleMax}
        </div>

        {/* ✅ 내용 */}
        <div style={sectionLabel}>내용</div>
        <div style={inputWrap}>
          <div style={inputTopBar}>상황/멘트/포인트/결과까지 적으면 반응이 좋아요.</div>
          <textarea
            value={content}
            onChange={(e) => setContent(clamp(e.target.value, contentMax))}
            placeholder="내용을 입력해 주세요."
            style={textarea}
          />
        </div>
        <div style={counter}>
          {content.length}/{contentMax}
        </div>

        {msg && <div style={msgStyle}>{msg}</div>}

        <div style={bottomRow}>
          <button type="button" style={cancelBtn} onClick={() => router.push('/community')} disabled={saving}>
            취소
          </button>

          <button type="button" style={saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>

        {/* ✅ 저장 성공 안내(커뮤니티로 이동하므로 여기선 메시지 최소) */}
      </div>
    </div>
  );
}
