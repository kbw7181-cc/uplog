// src/app/rebuttal/page.tsx
'use client';

import { useState } from 'react';

export default function RebuttalPage() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [rawMent, setRawMent] = useState('');
  const [situation, setSituation] = useState('');
  const [empathyText, setEmpathyText] = useState('');
  const [storyText, setStoryText] = useState('');

  const handleAiRebuttal = () => {
    if (!rawMent.trim()) {
      alert('오늘 받은 거절 멘트를 먼저 적어주세요.');
      return;
    }

    // ⚠️ 지금은 디자인용 더미 텍스트.
    // 나중에 /api 호출이나 기존 AI 함수로 바꿔 끼우면 됨.
    setEmpathyText(
      '대표님, 지금 상황에서 부담스럽게 느끼실 수 있다는 점 충분히 이해합니다. ' +
        '이미 여러 가지를 고민하고 계셨을 거라는 것도 알고 있어요.'
    );
    setStoryText(
      '사실 기존 고객분들 중에도 처음에는 같은 고민을 하셨던 분들이 많았어요. ' +
        '그래서 대표님의 속도에 맞게, 부담되지 않는 선에서 먼저 작은 경험부터 시작하실 수 있게 도와드리고 있어요. ' +
        '이번 제안도 “당장 결정”이 아니라, 대표님께 진짜 도움이 될 수 있는지 같이 살펴보는 과정이라고 생각해 주시면 좋겠습니다.'
    );
  };

  const handleTempSave = () => {
    // 기능은 나중에 Supabase 저장으로 교체 가능
    localStorage.setItem(
      'uplog_rebuttal_temp',
      JSON.stringify({ rawMent, situation })
    );
    alert('임시 저장되었습니다. (지금은 브라우저 로컬 임시 저장)');
  };

  return (
    <div className="rebuttal-root">
      <div className="rebuttal-inner">
        {/* 헤더 영역 */}
        <header className="rebuttal-header-card">
          <div className="rebuttal-header-left">
            <div className="rebuttal-tag">UPLOG · REBUTTAL</div>
            <h1 className="rebuttal-title">반론 아카이브</h1>
            <p className="rebuttal-desc">
              오늘 받은 거절 멘트를 AI와 함께 공감 멘트와 스토리텔링 반론으로 정리하는
              나만의 기록장이에요.
            </p>
          </div>

          <aside className="rebuttal-summary-card">
            <h2 className="summary-title">오늘 요약</h2>
            <dl className="summary-list">
              <div className="summary-row">
                <dt>날짜</dt>
                <dd>{today}</dd>
              </div>
              <div className="summary-row">
                <dt>오늘 기록한 거절</dt>
                <dd>0개</dd>
              </div>
              <div className="summary-row">
                <dt>AI 반론 초안</dt>
                <dd>{empathyText || storyText ? '1개' : '0개'}</dd>
              </div>
            </dl>
          </aside>
        </header>

        {/* TODAY INPUT */}
        <section className="block-section">
          <div className="block-label">TODAY INPUT</div>
          <div className="block-card">
            <h2 className="block-title">오늘 받은 거절 멘트를 그대로 적어주세요.</h2>
            <p className="block-sub">
              기록한 문장을 기준으로 AI가 공감 멘트와 스토리텔링 반론을 만들어줘요.
            </p>

            <div className="field-group">
              <label className="field-label">거절 멘트</label>
              <textarea
                className="field-textarea"
                placeholder="예) 지금은 생각이 없어요. 나중에 필요하면 제가 연락드릴게요."
                value={rawMent}
                onChange={(e) => setRawMent(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                상황 메모 <span className="field-optional">(선택)</span>
              </label>
              <textarea
                className="field-textarea"
                placeholder="예) 기존 고객 / 전화 상담 / 가격 부담을 많이 느끼는 상황 등"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
              />
            </div>

            <div className="button-row">
              <button
                type="button"
                className="btn-primary"
                onClick={handleAiRebuttal}
              >
                AI 피드백 받기
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTempSave}
              >
                임시 저장
              </button>
            </div>
          </div>
        </section>

        {/* AI REBUTTAL */}
        <section className="block-section">
          <div className="block-label">AI REBUTTAL</div>
          <div className="block-card">
            <h2 className="block-title">공감 멘트 + 스토리텔링 반론</h2>
            <p className="block-sub">
              AI 피드백 받기를 누르면 대표님이 적은 거절 멘트를 기준으로 아래 내용이
              채워집니다.
            </p>

            <div className="ai-step">
              <div className="ai-step-header">
                <span className="ai-step-badge">1단계 · 공감 멘트</span>
              </div>
              <div className="ai-text-box">
                {empathyText ? (
                  <p>{empathyText}</p>
                ) : (
                  <p className="ai-placeholder">
                    아직 공감 멘트가 없어요. 위에서 거절 멘트를 적고{' '}
                    <strong>AI 피드백 받기</strong> 버튼을 눌러보세요.
                  </p>
                )}
              </div>
            </div>

            <div className="ai-step">
              <div className="ai-step-header">
                <span className="ai-step-badge purple">
                  2단계 · 스토리텔링 반론
                </span>
              </div>
              <div className="ai-text-box">
                {storyText ? (
                  <p>{storyText}</p>
                ) : (
                  <p className="ai-placeholder">
                    고객에게 실제로 전하고 싶은 스토리텔링 반론이 이 영역에 정리됩니다.
                  </p>
                )}
              </div>
            </div>

            <div className="ai-footer-info">
              <span>TIP.</span> 마음에 드는 멘트는 나중에 반론 아카이브 목록에 따로
              정리해 두면 좋아요.
            </div>
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
  padding: 24px;
  box-sizing: border-box;
  /* 나의 U P 관리와 비슷한 밝은 그라데이션 배경 */
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 50%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.rebuttal-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 헤더 카드 */

.rebuttal-header-card {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(260px, 1fr);
  gap: 18px;
  padding: 22px 26px;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff89bd, #a45bff);
  box-shadow: 0 22px 44px rgba(0,0,0,0.15);
  color: #fff;
}

.rebuttal-tag {
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.9;
}

.rebuttal-title {
  margin-top: 10px;
  font-size: 26px;
  font-weight: 800;
}

.rebuttal-desc {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.96;
}

/* 오늘 요약 카드 */

.rebuttal-summary-card {
  background: rgba(4, 0, 12, 0.92);
  border-radius: 22px;
  padding: 16px 18px;
  box-shadow: 0 18px 32px rgba(0,0,0,0.45);
}

.summary-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}

.summary-list {
  margin: 0;
  padding: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.16);
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row dt {
  opacity: 0.8;
}

.summary-row dd {
  font-weight: 600;
}

/* 공통 섹션 */

.block-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #7b5bff;
}

.block-card {
  border-radius: 26px;
  padding: 20px 22px 22px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.08);
  border: 1px solid #e4ddff;
}

.block-title {
  font-size: 18px;
  font-weight: 800;
  color: #251437;
}

.block-sub {
  margin-top: 6px;
  font-size: 13px;
  color: #6e5a9e;
}

/* 입력 영역 */

.field-group {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #3a2458;
}

.field-optional {
  font-size: 11px;
  font-weight: 400;
  color: #a597d7;
}

.field-textarea {
  min-height: 80px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid #dacfff;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  background: #faf7ff;
  color: #281432;
}

.field-textarea::placeholder {
  color: #b1a2e3;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.btn-primary,
.btn-secondary {
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  box-shadow: 0 12px 22px rgba(165, 94, 255, 0.38);
}

.btn-secondary {
  background: #f3efff;
  color: #51366d;
}

/* AI 결과 */

.ai-step {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-step-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #ffe5f1;
  color: #b02464;
}

.ai-step-badge.purple {
  background: #e8dfff;
  color: #5a39c8;
}

.ai-text-box {
  border-radius: 18px;
  padding: 12px 14px;
  background: #faf7ff;
  border: 1px solid #e0d6ff;
  font-size: 13px;
  line-height: 1.7;
  color: #2a1038;
  min-height: 70px;
}

.ai-placeholder {
  color: #a097cf;
}

.ai-footer-info {
  margin-top: 16px;
  font-size: 12px;
  color: #7b6ac5;
}

.ai-footer-info span {
  font-weight: 700;
  color: #f153aa;
}

/* 반응형 */

@media (max-width: 960px) {
  .rebuttal-root {
    padding: 16px;
  }
  .rebuttal-header-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;
