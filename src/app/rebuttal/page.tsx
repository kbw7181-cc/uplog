// src/app/rebuttal/page.tsx
'use client';

import { useEffect, useState } from 'react';
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

type MyRebuttal = {
  id: string;
  created_at: string;
  category: string | null;
  content: string | null;
};

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
  const [openId, setOpenId] = useState<string | null>(null); // ✅ 펼침/접기용

  // 최근 저장된 반론 목록 불러오기
  const loadMyRebuttals = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMyList([]);
        return;
      }

      const { data, error } = await supabase
        .from('rebuttals')
        .select('id, created_at, category, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !data) {
        console.error(error);
        setMyList([]);
        return;
      }

      setMyList(data as MyRebuttal[]);
    } catch (err) {
      console.error(err);
      setMyList([]);
    }
  };

  useEffect(() => {
    loadMyRebuttals();
  }, []);

  // AI 스타일 스크립트 생성
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
      setToast(
        'AI 스타일 반론 스크립트를 만들어 놨어요. 대표님 말투에 맞게만 살짝 고쳐 쓰시면 돼요.',
      );
    }, 350);
  };

  // Supabase에 자산으로 저장
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
        loadMyRebuttals();
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 알 수 없는 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  /** 🔗 커뮤니티에 자동 공유 (community_posts INSERT) */
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
        .map((l) => l.trim())
        .filter(Boolean);

      const typeLine = lines.find((l) => l.startsWith('【거절 유형】')) || '';
      const firstSentence =
        lines.find((l) => l.startsWith('“')) ||
        lines.find((l) => l.startsWith('받은 거절 멘트')) ||
        lines[1] ||
        '';

      const short =
        firstSentence.length > 40
          ? firstSentence.slice(0, 40) + '…'
          : firstSentence;

      const title =
        '[피드백] ' +
        (typeLine.replace('【거절 유형】', '').trim() ||
          item.category ||
          '반론 스크립트') +
        ' · ' +
        short.replace('받은 거절 멘트', '').trim();

      const payload: any = {
        category: '피드백',
        title,
        content: item.content,
      };

      // 🔧 대표님 DB에 맞게 author_id / user_id 중 맞는 컬럼 쓰면 됨
      payload.user_id = user.id;

      const { error: postError } = await supabase
        .from('community_posts')
        .insert(payload);

      if (postError) {
        console.error(postError);
        alert(
          '커뮤니티에 올리는 중 오류가 발생했어요. 컬럼 이름(user_id/author_id) 확인이 필요할 수 있어요.',
        );
        return;
      }

      setToast(
        '커뮤니티에 "피드백" 글로 자동 공유됐어요. 커뮤니티에서 바로 확인하실 수 있어요.',
      );
      // ✅ 공유 후 커뮤니티 화면으로 이동
      router.push('/community');
    } catch (err) {
      console.error(err);
      alert('커뮤니티 공유 중 알 수 없는 오류가 발생했어요.');
    }
  };

  /** 🔗 친구에게 공유: 친구 목록으로 이동 + 채팅방에서 쓸 텍스트 준비 */
const handleShareToFriend = (item: MyRebuttal) => {
  const raw = (item.content || '').trim();
  if (!raw) {
    setToast('공유할 내용이 없습니다.');
    return;
  }

  // 채팅방에서 쓸 텍스트
  const shareText = ['[UPLOG 반론 스크립트 공유]', '', raw].join('\n');

  try {
    if (typeof window !== 'undefined') {
      // 채팅방에서 한 번만 꺼내 쓰도록 sessionStorage에 저장
      sessionStorage.setItem('uplog-share-to-chat', shareText);
    }

    setToast('어느 친구에게 보낼지 선택해 주세요.');
    // ✅ 바로 방으로 가지 않고, "채팅 목록" 페이지로만 이동
    router.push('/memo-chat');
  } catch (err) {
    console.error(err);
    setToast('공유 준비 중 오류가 발생했어요. 나중에 다시 시도해 주세요.');
  }
};


  // 아카이브 내용 렌더링 (제목 줄 / 단계 굵게)
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
        {/* 헤더 */}
        <header className="rebuttal-hero">
          <div className="hero-badge">UPLOG · REBUTTAL</div>
          <h1 className="hero-title">반론 아카이브</h1>
          <p className="hero-sub">
            오늘 받은 거절 멘트를 AI와 함께 <strong>공감 멘트</strong>와{' '}
            <strong>스토리텔링형 반론</strong>으로 정리하는 나만의 기록장이에요.
          </p>

          <div className="hero-today-card">
            <div className="hero-today-row">
              <span className="hero-today-label">날짜</span>
              <span className="hero-today-value">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            </div>
            <div className="hero-today-row">
              <span className="hero-today-label">오늘 기록한 거절</span>
              <span className="hero-today-value hero-pill">
                스크립트 연습 중
              </span>
            </div>
            <div className="hero-today-row">
              <span className="hero-today-label">AI 받은 조합</span>
              <span className="hero-today-value hero-pill hero-pill-soft">
                대표님만의 자산으로 저장됩니다
              </span>
            </div>
          </div>
        </header>

        {/* TODAY INPUT */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">TODAY INPUT</h2>
            <p className="section-desc">
              감정은 그대로 두고, <strong>문장만 기록</strong>으로 남겨봅니다. AI가
              대표님의 말투를 살려서{' '}
              <strong>공감형·스토리텔링형 반론</strong>으로 바꿔 줄 거예요.
            </p>
          </div>

          <div className="card input-card">
            {/* 거절 유형 */}
            <div className="field-group">
              <label className="field-label">거절 유형</label>
              <select
                className="field-select"
                value={rebuttalType}
                onChange={(e) =>
                  setRebuttalType(e.target.value as RebuttalType)
                }
              >
                {REBUTTAL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 거절 멘트 */}
            <div className="field-group">
              <label className="field-label">
                오늘 받은 거절 멘트를 그대로 적어주세요.
              </label>
              <p className="field-help">
                기록한 문장을 기준으로 AI가{' '}
                <strong>공감 멘트 + 스토리텔링형 반론</strong>을 만들어 줘요.
              </p>
              <textarea
                className="field-textarea"
                rows={4}
                placeholder="예) 지금은 생각이 없어요. 나중에 필요하면 제가 연락드릴게요."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>

            {/* 상황 메모 */}
            <div className="field-group">
              <label className="field-label">
                상황 메모 <span className="field-optional">(선택)</span>
              </label>
              <p className="field-help">
                예) 기존 고객 / 첫 통화 / 가격 부담을 많이 느끼는 상황 등 간단히 적어
                두면, 나중에 다시 읽을 때 이해가 쉬워요.
              </p>
              <textarea
                className="field-textarea"
                rows={3}
                placeholder="상황을 간단히 적어 두면, 나중에 다시 읽을 때 이해가 쉬워요."
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
              />
            </div>

            {/* AI 피드백 버튼 */}
            <div className="button-row">
              <button
                type="button"
                className="btn primary"
                onClick={handleGetFeedback}
                disabled={loading}
              >
                {loading ? 'AI 피드백 만드는 중...' : 'AI 피드백 받기'}
              </button>
            </div>
          </div>
        </section>

        {/* AI 결과 + 저장 버튼 */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">AI 반론 스크립트 · 사용 팁</h2>
            <p className="section-desc">
              대표님의 말투로 <strong>조금만 다듬어서</strong> 사용해 보세요. 마음을
              먼저 받아준 뒤, 자연스럽게 다음 스텝으로 이어지는 흐름이면 좋아요.
            </p>
          </div>

          <div className="card result-card">
            <div className="result-block">
              <div className="result-label">
                AI가 제안하는 공감형·스토리텔링 반론
              </div>
              <textarea
                className="field-textarea result-textarea"
                rows={8}
                value={aiScript}
                onChange={(e) => setAiScript(e.target.value)}
                placeholder="AI 피드백을 받으면 이곳에 스크립트가 표시됩니다. 대표님 말투에 맞게 자유롭게 고쳐 쓰셔도 돼요."
              />
            </div>

            <div className="result-block">
              <div className="result-label">사용 팁 · 한 줄 정리</div>
              <textarea
                className="field-textarea tip-textarea"
                rows={4}
                value={aiTips}
                onChange={(e) => setAiTips(e.target.value)}
                placeholder="예) 먼저 고객의 부담감을 인정해 주고, 가격이 아닌 ‘얻는 변화’를 그림 그려주기."
              />
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="button-row result-save-row">
            <button
              type="button"
              className="btn save-strong"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '나의 반론 아카이브에 저장'}
            </button>
          </div>

          {toast && <div className="toast">{toast}</div>}
        </section>

        {/* 나의 반론 아카이브 */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">나의 반론 아카이브</h2>
            <p className="section-desc">
              최근에 저장한 반론 스크립트가 여기에 정리돼요. 발표용·복습용으로 그대로
              활용하시면 됩니다.
            </p>
          </div>

          <div className="card archive-card">
            {myList.length === 0 ? (
              <p className="archive-empty">
                아직 저장된 반론 스크립트가 없습니다.
              </p>
            ) : (
              <ul className="archive-list">
                {myList.map((item) => {
                  const dateLabel = new Date(
                    item.created_at,
                  ).toLocaleDateString('ko-KR', {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit',
                  });
                  const fullContent = item.content || '';
                  const firstLine =
                    fullContent
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean)[1] || '';
                  const preview =
                    firstLine.length > 40
                      ? firstLine.slice(0, 40) + ' ···'
                      : firstLine || '내용 미리보기를 불러올 수 없습니다.';

                  const isOpen = openId === item.id;

                  return (
                    <li key={item.id} className="archive-item">
                      {/* 헤더 */}
                      <button
                        type="button"
                        className={`archive-header ${
                          isOpen ? 'open' : ''
                        }`}
                        onClick={() =>
                          setOpenId(isOpen ? null : item.id)
                        }
                      >
                        <div className="archive-header-left">
                          <span className="archive-chip">
                            {item.category || '유형 미지정'}
                          </span>
                          <span className="archive-preview-text">
                            {preview}
                          </span>
                        </div>
                        <span className="archive-date">
                          {dateLabel}
                          <span className="archive-toggle-icon">
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </span>
                      </button>

                      {isOpen && (
                        <>
                          {renderContent(fullContent)}

                          <div className="archive-actions">
                            <button
                              type="button"
                              className="btn archive-btn archive-community"
                              onClick={() =>
                                handleShareToCommunity(item)
                              }
                            >
                              커뮤니티에 공유
                            </button>
                            <button
                              type="button"
                              className="btn archive-btn archive-friend"
                              onClick={() =>
                                handleShareToFriend(item)
                              }
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
.rebuttal-root {
  min-height: 100vh;
  padding: 24px 16px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
  overflow-x: hidden;
}

.rebuttal-inner {
  max-width: 980px;
  margin: 0 auto 40px;
}

.section {
  margin-top: 20px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 23px;
  font-weight: 900;
  color: #6b41ff;
}

.section-desc {
  margin-top: 4px;
  font-size: 15px;
  color: #7a69c4;
}

.rebuttal-hero {
  padding: 24px 24px 20px;
  border-radius: 26px;
  background: linear-gradient(135deg, #ff89bd, #a45bff);
  color: #fffdfd;
  box-shadow: 0 20px 38px rgba(0,0,0,0.32);
  margin-bottom: 20px;
}

.hero-badge {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.7);
  margin-bottom: 8px;
  background: rgba(0,0,0,0.12);
}

.hero-title {
  font-size: 30px;
  font-weight: 900;
  margin: 0 0 6px;
}

.hero-sub {
  font-size: 16px;
  max-width: 520px;
}

.hero-sub strong {
  color: #fffbaf;
}

.hero-today-card {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.94);
  color: #30133f;
  box-shadow: 0 12px 24px rgba(0,0,0,0.18);
}

.hero-today-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 5px 0;
  border-bottom: 1px dashed rgba(148,114,255,0.3);
}

.hero-today-row:last-child {
  border-bottom: none;
}

.hero-today-label {
  color: #7a69c4;
}

.hero-today-value {
  font-weight: 700;
}

.hero-pill {
  padding: 3px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb5df, #ff9ad1);
  color: #3b1030;
  font-size: 13px;
}

.hero-pill-soft {
  background: #f0ecff;
  color: #7a3aed;
}

.card {
  border-radius: 20px;
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  box-sizing: border-box;
}

.input-card,
.result-card,
.archive-card {
  font-size: 15px;
}

.field-group {
  margin-bottom: 14px;
}

.field-label {
  display: block;
  font-size: 15px;
  font-weight: 750;
  color: #3a225c;
  margin-bottom: 4px;
}

.field-optional {
  font-size: 13px;
  font-weight: 500;
  color: #a78bfa;
}

.field-help {
  font-size: 13px;
  color: #8b7bd4;
  margin-bottom: 4px;
}

.field-select {
  width: 100%;
  max-width: 100%;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 15px;
  border: 1px solid #d8cffd;
  background: #f8f5ff;
  color: #271434;
  outline: none;
  box-sizing: border-box;
}

.field-select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}

.field-textarea {
  width: 100%;
  max-width: 100%;
  border-radius: 16px;
  padding: 10px 12px;
  font-size: 15px;
  border: 1px solid #d8cffd;
  background: #faf7ff;
  resize: vertical;
  outline: none;
  line-height: 1.55;
  box-sizing: border-box;
}

.field-textarea:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.result-save-row {
  margin-top: 16px;
}

.btn {
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 750;
  border: none;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg, #f153aa, #a855f7);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(148,60,180,0.45);
}

.btn.primary:disabled {
  opacity: 0.7;
  cursor: default;
}

.btn.save-strong {
  background: linear-gradient(135deg, #f97316, #ec4899);
  color: #ffffff;
  box-shadow: 0 14px 26px rgba(236,72,153,0.45);
}

.btn.save-strong:disabled {
  opacity: 0.7;
  cursor: default;
}

.toast {
  margin-top: 10px;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.result-card {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr);
  gap: 14px;
  margin-top: 6px;
}

.result-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-label {
  font-size: 14px;
  font-weight: 800;
  color: #6b41ff;
}

.result-textarea {
  min-height: 220px;
}

.tip-textarea {
  min-height: 140px;
}

.archive-card {
  padding-top: 14px;
}

.archive-empty {
  font-size: 14px;
  color: #9b8bdc;
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.archive-item {
  padding: 8px 10px 10px;
  border-radius: 14px;
  border: 1px dashed #e0d5ff;
  background: #fbf9ff;
}

.archive-header {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px 4px;
  cursor: pointer;
}

.archive-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.archive-chip {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #efe9ff;
  color: #5b21b6;
  font-weight: 700;
}

.archive-preview-text {
  font-size: 14px;
  color: #4b365f;
}

.archive-date {
  font-size: 12px;
  color: #a1a1aa;
  display: flex;
  align-items: center;
  gap: 4px;
}

.archive-toggle-icon {
  font-size: 11px;
}

.archive-header.open {
  border-bottom: 1px dashed #e0d5ff;
  padding-bottom: 6px;
}

.archive-content {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e4ddff;
  font-size: 13.5px;
  line-height: 1.6;
  color: #423154;
}

.archive-line {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.archive-line-tag {
  margin-top: 6px;
  font-weight: 800;
  color: #6b21a8;
}

.archive-line-step {
  margin-top: 4px;
  font-weight: 800;
  color: #ea580c;
}

.archive-line-note {
  font-size: 13px;
  color: #a16207;
}

.archive-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.archive-btn {
  padding: 7px 16px;
  font-size: 13px;
  box-shadow: none;
}

.archive-community {
  background: #fef2ff;
  color: #be185d;
  border: 1px solid #f9a8d4;
}

.archive-friend {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #7dd3fc;
}

@media (max-width: 960px) {
  .rebuttal-root {
    padding: 16px 12px;
  }

  .rebuttal-inner {
    max-width: 100%;
  }

  .rebuttal-hero {
    padding: 20px 18px 18px;
  }

  .hero-title {
    font-size: 26px;
  }

  .result-card {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 21px;
  }

  .field-textarea {
    font-size: 14px;
  }

  .field-select {
    font-size: 14px;
  }

  .archive-content {
    font-size: 13px;
  }
}
`;
