// src/app/rebuttal/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type RebuttalType =
  | '가격 부담'
  | '시간 부족'
  | '이미 사용 중'
  | '가족/지인과 상의'
  | '신뢰/의심'
  | '보류/미루기'
  | '기타';

const REBUTTAL_OPTIONS: { id: RebuttalType; label: string }[] = [
  { id: '가격 부담', label: '가격 부담' },
  { id: '시간 부족', label: '시간 부족·바쁨' },
  { id: '이미 사용 중', label: '이미 사용 중' },
  { id: '가족/지인과 상의', label: '가족/지인과 상의' },
  { id: '신뢰/의심', label: '신뢰·의심·걱정' },
  { id: '보류/미루기', label: '보류·나중에 연락해 달라' },
  { id: '기타', label: '기타' },
];

const TYPE_HINT: Record<RebuttalType, string> = {
  '가격 부담':
    '가격 이야기는 최대한 짧게, 대신 고객이 얻는 변화와 이득을 이미지로 보여주면 좋아요.',
  '시간 부족':
    '시간을 빼앗는 느낌이 아니라, 오히려 시간을 절약해 주는 제안이라는 걸 보여주면 좋아요.',
  '이미 사용 중':
    '지금 쓰는 것의 장점을 먼저 인정해 주고, 대표님 제안의 차이를 “조금 더” 정도로 가볍게 제시해 보세요.',
  '가족/지인과 상의':
    '가족과 상의하는 태도 자체를 존중해 주고, 함께 볼 수 있는 자료·포인트를 정리해 주면 좋아요.',
  '신뢰/의심':
    '의심은 자연스러운 감정이에요. 솔직하게 인정해 주고, 다른 고객들의 변화 사례를 짧게 들려주세요.',
  '보류/미루기':
    '지금 당장 결정이 부담스럽다는 신호니까, “부담 없는 다음 스텝”을 하나만 제안해 보세요.',
  기타:
    '고객이 숨기고 있는 진짜 이유가 무엇인지, 부드럽게 한 번 더 물어볼 수 있는 질문을 준비해 두면 좋아요.',
};

// ✅ 모든 페이지 공통 규칙: “기존 슬라이드/문구 삭제” + “고정 가이드 1개”
const FIXED_GUIDE =
  '거절 멘트를 그대로 적어두면, 시간이 지나도 감정 대신 문장과 상황이 선명하게 남아요.';

type MyRebuttal = {
  id: string;
  created_at: string;
  category: string | null;
  content: string | null;
};

function formatKoreanDate(d: Date) {
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function toYYMMDD(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function RebuttalPage() {
  const router = useRouter();

  const [rebuttalType, setRebuttalType] = useState<RebuttalType>('가격 부담');
  const [rawText, setRawText] = useState('');
  const [situation, setSituation] = useState('');
  const [aiScript, setAiScript] = useState('');
  const [aiTips, setAiTips] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [myList, setMyList] = useState<MyRebuttal[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // ✅ “대표님만의 자산 N개 저장”
  const [assetCount, setAssetCount] = useState<number>(0);

  const todayLabel = useMemo(() => formatKoreanDate(new Date()), []);

  const loadMyRebuttals = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMyList([]);
        setAssetCount(0);
        return;
      }

      // ✅ 1) 리스트(최근 7개)
      const { data, error } = await supabase
        .from('rebuttals')
        .select('id, created_at, category, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (error || !data) {
        console.error(error);
        setMyList([]);
      } else {
        setMyList(data as MyRebuttal[]);
      }

      // ✅ 2) 총 자산 개수(전체 count)
      const { count, error: countError } = await supabase
        .from('rebuttals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error(countError);
        setAssetCount(0);
      } else {
        setAssetCount(count ?? 0);
      }
    } catch (err) {
      console.error(err);
      setMyList([]);
      setAssetCount(0);
    }
  };

  useEffect(() => {
    loadMyRebuttals();
  }, []);

  const handleGetFeedback = () => {
    if (!rawText.trim()) {
      alert('오늘 받은 거절 멘트를 먼저 적어 주세요.');
      return;
    }

    setLoading(true);
    setToast(null);

    const cleanRaw = rawText.trim();
    const cleanSituation = situation.trim();

    const scriptLines: string[] = [];
    scriptLines.push('① 공감 한 마디');
    scriptLines.push(
      `“${cleanRaw}”라고 말씀해 주신 거 보니까, ${rebuttalType} 부분이 많이 신경 쓰이시는 것 같아요. 솔직하게 말씀해 주셔서 감사해요.`,
    );
    scriptLines.push('');
    scriptLines.push('② 진짜 이유 한 번 더 열어보기');
    scriptLines.push(
      '“대표님, 혹시 가장 걱정되시는 부분이 가격 자체일까요, 아니면 바뀌었을 때 적응이나 결과가 조금 불안하신 걸까요?”',
    );
    scriptLines.push('');
    scriptLines.push('③ 스토리텔링형 제안');
    scriptLines.push(
      '“제가 지금까지 도와드렸던 분들 중에도 처음에는 같은 말씀을 많이 하셨어요. 그런데 작은 변화부터 하나씩 해 보시면서, ‘이걸 왜 이제야 했을까’ 하신 분들이 많았거든요.”',
    );
    scriptLines.push('');
    scriptLines.push('④ 다음 스텝 가볍게 제안');
    scriptLines.push(
      '“오늘 당장 결정하지 않으셔도 돼요. 대신 대표님께 꼭 필요하신 부분만 쏙 정리해서 한 번만 더 설명드려도 괜찮으실까요?”',
    );

    if (cleanSituation) {
      scriptLines.push('');
      scriptLines.push('※ 상황 메모 참고');
      scriptLines.push(cleanSituation);
    }

    const script = scriptLines.join('\n');

    const tip = `▪️ 유형: ${rebuttalType}
▪️ 핵심 포인트: ${TYPE_HINT[rebuttalType]}
▪️ 사용법: 거절 문장을 그대로 받아 적고, ① 공감 → ② 진짜 이유 질문 → ③ 사례·스토리 → ④ 부담 없는 다음 스텝 순서로 말해 보세요.`;

    setTimeout(() => {
      setAiScript(script);
      setAiTips(tip);
      setLoading(false);
      setToast('AI 스크립트를 만들었어요. 대표님 말투로 살짝만 다듬어 쓰시면 돼요.');
    }, 280);
  };

  const handleSave = async () => {
    if (!rawText.trim() || !aiScript.trim()) {
      alert('거절 멘트와 AI 스크립트가 모두 있어야 저장할 수 있어요.');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        setSaving(false);
        return;
      }

      const content = [
        `【거절 유형】 ${rebuttalType}`,
        '',
        '【받은 거절 멘트】',
        rawText.trim(),
        '',
        situation.trim() ? '【상황 메모】\n' + situation.trim() + '\n' : '',
        '【AI 공감형·스토리텔링 반론 스크립트】',
        aiScript.trim(),
        '',
        aiTips.trim()
          ? '【사용 팁】\n' + aiTips.trim()
          : '【사용 팁】\n대표님 말투에 맞게 살짝만 고쳐서 사용해 보세요.',
      ]
        .join('\n')
        .trim();

      const { error: insertError } = await supabase.from('rebuttals').insert({
        user_id: user.id,
        category: rebuttalType,
        content,
      });

      if (insertError) {
        console.error(insertError);
        alert('반론 아카이브 저장 중 오류가 발생했어요.');
      } else {
        setToast('오늘 반론 스크립트가 아카이브에 자산으로 저장됐어요.');
        setRawText('');
        setSituation('');
        setAiScript('');
        setAiTips('');
        await loadMyRebuttals(); // ✅ 저장 후 카운트/리스트 갱신
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 알 수 없는 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareToCommunity = async (item: MyRebuttal) => {
    if (!item.content) {
      setToast('공유할 내용이 없습니다.');
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('로그인이 필요해요.');
        return;
      }

      const lines = item.content
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const typeLine = lines.find(l => l.startsWith('【거절 유형】')) || '';
      const rawIndex = lines.findIndex(l => l.startsWith('【받은 거절 멘트】'));
      const rawLine = rawIndex >= 0 ? lines[rawIndex + 1] ?? '' : '';
      const short = rawLine.length > 40 ? rawLine.slice(0, 40) + '…' : rawLine;

      const title =
        '[피드백] ' +
        (typeLine.replace('【거절 유형】', '').trim() || item.category || '반론 스크립트') +
        (short ? ' · ' + short : '');

      const payload: any = {
        category: '피드백',
        title,
        content: item.content,
        user_id: user.id,
      };

      const { error: postError } = await supabase.from('community_posts').insert(payload);

      if (postError) {
        console.error(postError);
        alert(
          '커뮤니티 공유 중 오류가 발생했어요. 컬럼 이름(user_id/author_id) 확인이 필요할 수 있어요.',
        );
        return;
      }

      setToast('커뮤니티에 "피드백" 글로 자동 공유됐어요.');
      router.push('/community');
    } catch (err) {
      console.error(err);
      alert('커뮤니티 공유 중 알 수 없는 오류가 발생했어요.');
    }
  };

  const handleShareToFriend = (item: MyRebuttal) => {
    const raw = (item.content || '').trim();
    if (!raw) {
      setToast('공유할 내용이 없습니다.');
      return;
    }

    const shareText = ['[UPLOG 반론 스크립트 공유]', '', raw].join('\n');

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('uplog-share-to-chat', shareText);
      }
      setToast('어느 친구에게 보낼지 선택해 주세요.');
      router.push('/memo-chat');
    } catch (err) {
      console.error(err);
      setToast('공유 준비 중 오류가 발생했어요.');
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="archive-content">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          let className = 'archive-line';

          if (
            trimmed.startsWith('【거절 유형】') ||
            trimmed.startsWith('【받은 거절 멘트】') ||
            trimmed.startsWith('【상황 메모】') ||
            trimmed.startsWith('【AI 공감형·스토리텔링 반론 스크립트】') ||
            trimmed.startsWith('【사용 팁】')
          ) {
            className += ' archive-line-tag';
          }

          if (
            trimmed.startsWith('①') ||
            trimmed.startsWith('②') ||
            trimmed.startsWith('③') ||
            trimmed.startsWith('④')
          ) {
            className += ' archive-line-step';
          }

          if (trimmed.startsWith('※ 상황 메모 참고')) {
            className += ' archive-line-note';
          }

          return (
            <p key={idx} className={className}>
              {line || '\u00A0'}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rebuttal-root">
      <div className="rebuttal-inner">
        {/* ===== 헤더 ===== */}
        <header className="rebuttal-header">
          <div className="rebuttal-header-inner">
            <div className="rebuttal-header-text">
              <div className="rebuttal-header-tag">UPLOG · REBUTTAL</div>
              <h1 className="rebuttal-header-title">반론 아카이브</h1>
            </div>

            {/* ✅ 말풍선 + 마스코트(테두리 없음, upzzu7.png 고정) */}
            <div className="header-bottom">
              <div className="bubble-and-mascot">
                <div className="guide-bubble">
                  <div className="guide-bubble-top">
                    <span className="guide-bubble-tag">오늘의 U P 반론 가이드</span>
                  </div>
                  <p className="guide-bubble-text">{FIXED_GUIDE}</p>
                </div>

                <img
                  className="mascot-img"
                  src="/assets/upzzu7.png"
                  alt="업쮸"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </header>

        {/* ===== 오늘 카드 ===== */}
        <section className="info-card">
          <div className="info-row">
            <span className="info-label">오늘 날짜</span>
            <span className="info-value">{todayLabel}</span>
          </div>
          <div className="info-row">
            <span className="info-label">오늘 상태</span>
            <span className="info-pill info-pill-warm">스크립트 연습 중</span>
          </div>
          <div className="info-row">
            <span className="info-label">AI 조합</span>
            <span className="info-pill info-pill-soft">대표님만의 자산 {assetCount}개 저장</span>
          </div>
        </section>

        {/* ===== 입력 ===== */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">거절 유형 입력 · AI 피드백 받기</h2>
            <p className="section-desc">
              거절 유형과 오늘 받은 멘트를 저장해두면, AI가 <strong>공감 멘트</strong>와{' '}
              <strong>스토리텔링형 반론 스크립트</strong>를 만들어 줘요.
            </p>
          </div>

          <div className="card">
            <div className="field">
              <label className="label">거절 유형</label>
              <select
                className="select"
                value={rebuttalType}
                onChange={e => setRebuttalType(e.target.value as RebuttalType)}
              >
                {REBUTTAL_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">오늘 받은 거절 멘트를 그대로 적어주세요.</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="예) 지금은 생각이 없어요. 나중에 필요하면 제가 연락드릴게요."
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">
                상황 메모 <span className="optional">(선택)</span>
              </label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="예) 기존 고객 / 첫 통화 / 가격 부담을 많이 느끼는 상황 등 간단히 적어 두면 좋아요."
                value={situation}
                onChange={e => setSituation(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button
                type="button"
                className="btn primary"
                onClick={handleGetFeedback}
                disabled={loading}
              >
                {loading ? 'AI 피드백 만드는 중…' : 'AI 피드백 받기'}
              </button>
            </div>
          </div>
        </section>

        {/* ===== 결과 ===== */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">AI 반론 스크립트 · 사용 팁</h2>
            <p className="section-desc">
              대표님의 말투로 <strong>조금만</strong> 다듬어서 사용해 보세요.
            </p>
          </div>

          <div className="card result-grid">
            <div className="result-block">
              <div className="result-label">AI가 제안하는 공감형·스토리텔링 반론</div>
              <textarea
                className="textarea textarea-big"
                rows={10}
                value={aiScript}
                onChange={e => setAiScript(e.target.value)}
                placeholder="AI 피드백을 받으면 이곳에 스크립트가 표시됩니다."
              />
            </div>

            <div className="result-block">
              <div className="result-label">사용 팁 · 한 줄 정리</div>
              <textarea
                className="textarea textarea-tip"
                rows={6}
                value={aiTips}
                onChange={e => setAiTips(e.target.value)}
                placeholder="예) 먼저 고객의 부담감을 인정해 주고, 가격이 아닌 ‘얻는 변화’를 그림 그려주기."
              />
            </div>
          </div>

          <div className="btn-row save-row">
            <button type="button" className="btn save" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '나의 반론 아카이브에 저장'}
            </button>
          </div>

          {toast && <div className="toast">{toast}</div>}
        </section>

        {/* ===== 아카이브 ===== */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">나의 반론 아카이브</h2>
            <p className="section-desc">최근에 저장한 반론 스크립트가 여기에 정리돼요.</p>
          </div>

          <div className="card archive">
            {myList.length === 0 ? (
              <p className="empty">아직 저장된 반론 스크립트가 없습니다.</p>
            ) : (
              <ul className="archive-list">
                {myList.map(item => {
                  const dateLabel = toYYMMDD(item.created_at);
                  const full = item.content || '';

                  const lines = full.split('\n').map(l => l.trim());
                  const rawIndex = lines.findIndex(l => l.startsWith('【받은 거절 멘트】'));
                  const previewSource =
                    rawIndex >= 0 ? lines[rawIndex + 1] ?? '' : lines.find(l => l.startsWith('“')) ?? '';
                  const preview =
                    previewSource.length > 44
                      ? previewSource.slice(0, 44) + ' ···'
                      : previewSource || '내용 미리보기를 불러올 수 없습니다.';

                  const isOpen = openId === item.id;

                  return (
                    <li key={item.id} className="archive-item">
                      <button
                        type="button"
                        className={'archive-head' + (isOpen ? ' open' : '')}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                      >
                        <div className="archive-left">
                          <span className="chip">{item.category || '유형 미지정'}</span>
                          <span className="preview">{preview}</span>
                        </div>
                        <span className="date">
                          {dateLabel}
                          <span className="toggle">{isOpen ? '▲' : '▼'}</span>
                        </span>
                      </button>

                      {isOpen && (
                        <>
                          {renderContent(full)}

                          <div className="actions">
                            <button
                              type="button"
                              className="btn mini community"
                              onClick={() => handleShareToCommunity(item)}
                            >
                              커뮤니티에 공유
                            </button>
                            <button
                              type="button"
                              className="btn mini friend"
                              onClick={() => handleShareToFriend(item)}
                            >
                              친구에게 공유
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
/* =========================
   BASE
   ========================= */
.rebuttal-root{
  min-height:100vh;
  padding:24px;
  box-sizing:border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color:#1b1030;
}
.rebuttal-inner{
  max-width:1160px;
  margin:0 auto 80px;
}

/* 공통 타이틀 */
.section-title{
  font-size:18px;
  font-weight:800;
  color:#6b41ff;
}
.section-desc{
  margin-top:6px;
  font-size:14px;
  color:#7a69c4;
  line-height:1.6;
}
.section{ margin-top:24px; }
.section-head{ margin-bottom:12px; }

/* 카드 */
.card{
  border-radius:26px;
  background:#ffffff;
  border:1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  padding:18px 20px;
  box-sizing:border-box;
}

/* =========================
   HEADER
   ========================= */
.rebuttal-header{
  border-radius:40px;
  background: radial-gradient(circle at top left, #ff8ac8 0, #a855f7 40%, #5b21ff 100%);
  box-shadow: 0 28px 60px rgba(0,0,0,0.45);
  color:#fff;

  /* ✅ 헤더 영역 더 넓게 */
  padding:64px 56px 52px;
  margin-bottom:18px;
}
.rebuttal-header-inner{
  display:flex;
  flex-direction:column;
  gap:28px;
}
.rebuttal-header-tag{
  font-size:14px;
  letter-spacing:0.18em;
  font-weight:700;
}
.rebuttal-header-title{
  font-size:34px;
  font-weight:900;
  margin:6px 0 0;
}

/* 말풍선+업쮸 라인 */
.header-bottom{
  margin-top:18px;
  display:flex;
  justify-content:center;
}
.bubble-and-mascot{
  width:100%;
  max-width:860px;
  display:flex;
  gap:16px;
  justify-content:center;
  align-items:center;
}

/* 말풍선 */
.guide-bubble{
  flex:1;
  border-radius:999px;
  padding:14px 22px;
  background: rgba(255,255,255,0.97);
  color:#2b163a;
  box-shadow: 0 10px 22px rgba(0,0,0,0.18);
  border:1px solid rgba(223, 202, 255, 0.9);
  position:relative;
  min-height:78px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

/* ✅ 꼬리: 마스코트 방향(오른쪽 중앙) */
.guide-bubble::after{
  content:'';
  position:absolute;
  right:-6px;
  top:50%;
  transform: translateY(-50%) rotate(45deg);
  width:14px;
  height:14px;
  background: rgba(255,255,255,0.97);
  border-radius:4px;
  border-right:1px solid rgba(223, 202, 255, 0.9);
  border-bottom:1px solid rgba(223, 202, 255, 0.9);
}

.guide-bubble-top{
  display:flex;
  justify-content:center;
  margin-bottom:6px;
}
.guide-bubble-tag{
  font-size:11px;
  font-weight:800;
  padding:4px 10px;
  border-radius:999px;
  background: rgba(250, 244, 255, 0.95);
  color:#f973b8;
  border:1px solid rgba(223, 202, 255, 0.6);
}
.guide-bubble-text{
  margin:0;
  font-size:14px;
  font-weight:650;
  color:#4b2966;
  text-align:center;
  line-height:1.55;
  white-space:normal;
}

/* ✅ 마스코트: 테두리/프레임 없음 + 둥둥 */
.mascot-img{
  width:160px;
  height:160px;
  object-fit:contain;
  flex-shrink:0;
  user-select:none;
  -webkit-user-drag:none;

  animation: upzzu-float 2.6s ease-in-out infinite;
  filter: drop-shadow(0 10px 14px rgba(0,0,0,0.18));
}

@keyframes upzzu-float{
  0%   { transform: translateY(0) scale(1); }
  45%  { transform: translateY(-6px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}

/* =========================
   INFO CARD
   ========================= */
.info-card{
  border-radius:26px;
  background:#ffffff;
  border:1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  padding:14px 18px;
  margin-top:16px;
}
.info-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-size:14px;
  padding:8px 0;
  border-bottom:1px dashed rgba(148,114,255,0.3);
}
.info-row:last-child{ border-bottom:none; }
.info-label{ color:#7a69c4; font-weight:650; }
.info-value{ font-weight:900; color:#241336; }
.info-pill{
  padding:6px 12px;
  border-radius:999px;
  font-size:13px;
  font-weight:800;
}
.info-pill-warm{
  background: linear-gradient(135deg, #ffb5df, #ff9ad1);
  color:#3b1030;
}
.info-pill-soft{
  background:#f0ecff;
  color:#7a3aed;
}

/* =========================
   FORM
   ========================= */
.field{ margin-bottom:14px; }
.label{
  display:block;
  font-size:15px;
  font-weight:800;
  color:#5a3cb2;
  margin-bottom:6px;
}
.optional{ font-size:13px; font-weight:600; color:#a78bfa; }

.select{
  width:100%;
  border-radius:999px;
  border:1px solid #d6c7ff;
  padding:10px 14px;
  font-size:15px;
  background:#faf7ff;
  color:#241336;
  outline:none;
  box-sizing:border-box;
}
.select:focus{
  border-color:#a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}

.textarea{
  width:100%;
  border-radius:18px;
  border:1px solid #d6c7ff;
  padding:10px 12px;
  font-size:15px;
  background:#faf7ff;
  color:#241336;
  outline:none;
  resize:vertical;
  line-height:1.7;
  box-sizing:border-box;
}
.textarea:focus{
  border-color:#a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}
.textarea::placeholder{ color:#aa97e0; }
.textarea-big{ min-height:220px; }
.textarea-tip{ min-height:160px; }

.btn-row{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:10px;
}
.save-row{ margin-top:14px; justify-content:flex-end; }

.btn{
  border-radius:999px;
  border:none;
  cursor:pointer;
  padding:10px 18px;
  font-size:14px;
  font-weight:900;
}
.btn.primary{
  background: linear-gradient(135deg, #f153aa, #a855f7);
  color:#fff;
  box-shadow: 0 12px 22px rgba(0,0,0,0.25);
}
.btn.save{
  background: radial-gradient(circle at top left, #ff9ed5 0, #a35dff 70%);
  color:#fff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.32);
}
.btn:disabled{ opacity:0.7; cursor:default; }

/* results layout */
.result-grid{
  display:grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
  gap:14px;
}
.result-block{ display:flex; flex-direction:column; gap:8px; }
.result-label{
  font-size:14px;
  font-weight:900;
  color:#6b41ff;
}

/* toast */
.toast{
  margin-top:12px;
  border-radius:999px;
  padding:10px 14px;
  font-size:13px;
  background:#ecfdf5;
  color:#047857;
  border:1px solid #a7f3d0;
  font-weight:800;
}

/* =========================
   ARCHIVE
   ========================= */
.archive{ padding-top:16px; }
.empty{ font-size:14px; color:#7a69c4; line-height:1.6; }
.archive-list{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.archive-item{
  padding:10px 10px 12px;
  border-radius:18px;
  border:1px dashed #e0d5ff;
  background:#fbf9ff;
}
.archive-head{
  width:100%;
  border:none;
  background:transparent;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:6px 6px 6px;
  cursor:pointer;
}
.archive-head.open{
  border-bottom:1px dashed #e0d5ff;
  padding-bottom:10px;
  margin-bottom:6px;
}
.archive-left{
  display:flex;
  align-items:center;
  gap:10px;
  text-align:left;
  min-width:0;
}
.chip{
  font-size:13px;
  padding:5px 10px;
  border-radius:999px;
  background:#efe9ff;
  color:#5b21b6;
  font-weight:900;
  flex-shrink:0;
}
.preview{
  font-size:14px;
  color:#4b365f;
  font-weight:700;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  max-width:680px;
}
.date{
  font-size:12px;
  color:#a1a1aa;
  display:flex;
  align-items:center;
  gap:6px;
  font-weight:800;
}
.toggle{ font-size:11px; }

/* expanded content */
.archive-content{
  margin-top:8px;
  padding:10px 12px;
  border-radius:14px;
  background:#ffffff;
  border:1px solid #e4ddff;
  font-size:13.5px;
  line-height:1.65;
  color:#423154;
}
.archive-line{
  margin:0;
  white-space:pre-wrap;
  word-break:break-word;
}
.archive-line-tag{
  margin-top:8px;
  font-weight:900;
  color:#6b21a8;
}
.archive-line-step{
  margin-top:6px;
  font-weight:900;
  color:#ea580c;
}
.archive-line-note{
  font-size:13px;
  color:#a16207;
  font-weight:800;
}

.actions{
  display:flex;
  gap:10px;
  margin-top:12px;
  flex-wrap:wrap;
}
.btn.mini{
  padding:9px 14px;
  font-size:13px;
  font-weight:900;
  box-shadow:none;
}
.btn.mini.community{
  background:#fef2ff;
  color:#be185d;
  border:1px solid #f9a8d4;
}
.btn.mini.friend{
  background:#f0f9ff;
  color:#0369a1;
  border:1px solid #7dd3fc;
}

/* =========================
   RESPONSIVE
   ========================= */
@media (max-width: 960px){
  .rebuttal-root{ padding:16px; }
  .rebuttal-header{ padding:36px 24px 30px; }
  .rebuttal-header-title{ font-size:30px; }
  .result-grid{ grid-template-columns: 1fr; }
  .preview{ max-width: 420px; }
}

@media (max-width: 640px){
  .bubble-and-mascot{ gap:12px; }
  .mascot-img{ width:132px; height:132px; }
}
`;
