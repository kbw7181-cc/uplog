'use client';

import { useMemo, useState } from 'react';

type Props = {
  topTag?: string;          // "UPLOG · REBUTTAL"
  title?: string;           // "반론 아카이브"
  guideTag?: string;        // "오늘의 U P 반론 가이드"
  slides: string[];         // 가이드 문구 배열
  mascotSrc?: string;       // 기본: /assets/images/upzzu7.png
};

export default function UpzzuGuideHero({
  topTag = 'UPLOG · PAGE',
  title = '제목',
  guideTag = '오늘의 U P 가이드',
  slides,
  mascotSrc = '/assets/images/upzzu7.png',
}: Props) {
  const [idx, setIdx] = useState(0);
  const current = useMemo(() => slides[idx] ?? '', [slides, idx]);

  const prev = () => setIdx((p) => (p === 0 ? slides.length - 1 : p - 1));
  const next = () => setIdx((p) => (p === slides.length - 1 ? 0 : p + 1));

  return (
    <header className="uplog-hero">
      <div className="uplog-hero-inner">
        <div className="uplog-hero-text">
          <div className="uplog-hero-tag">{topTag}</div>
          <h1 className="uplog-hero-title">{title}</h1>
        </div>

        <div className="uplog-hero-bottom">
          <div className="uplog-bubble-row">
            <div className="uplog-bubble">
              <div className="uplog-bubble-top">
                <span className="uplog-bubble-tag">{guideTag}</span>
              </div>

              <p className="uplog-bubble-text">{current}</p>

              <div className="uplog-bubble-nav">
                <button type="button" className="uplog-nav-arrow" onClick={prev} aria-label="이전">
                  ‹
                </button>

                <div className="uplog-dots">
                  {slides.map((_, i) => (
                    <span key={i} className={'uplog-dot' + (i === idx ? ' uplog-dot-active' : '')} />
                  ))}
                </div>

                <button type="button" className="uplog-nav-arrow" onClick={next} aria-label="다음">
                  ›
                </button>
              </div>

              {/* ✅ 말풍선 꼬리: 모든 페이지 동일(어색하면 여기만 수정하면 끝) */}
              <span className="uplog-bubble-tail" aria-hidden />
            </div>

            {/* ✅ 업쮸: 테두리/링/프레임 없음 (요구사항 고정) */}
            <div className="uplog-mascot">
              <img className="uplog-mascot-img" src={mascotSrc} alt="upzzu" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .uplog-hero{
          border-radius:40px;
          background: radial-gradient(circle at top left, #ff8ac8 0, #a855f7 40%, #5b21ff 100%);
          box-shadow: 0 28px 60px rgba(0,0,0,0.30);
          color:#fff;
          padding:48px 52px 40px;
          margin-bottom:16px;
        }
        .uplog-hero-inner{
          display:flex;
          flex-direction:column;
          gap:22px;
        }
        .uplog-hero-tag{
          font-size:14px;
          letter-spacing:0.18em;
          font-weight:800;
        }
        .uplog-hero-title{
          font-size:34px;
          font-weight:900;
          margin:6px 0 0;
        }

        .uplog-hero-bottom{
          margin-top:14px;
          display:flex;
          justify-content:center;
        }
        .uplog-bubble-row{
          width:100%;
          max-width:860px;
          display:flex;
          gap:16px;
          align-items:flex-end;
          justify-content:center;
        }

        /* ✅ 말풍선: 크기/모양 모든 페이지 동일 */
        .uplog-bubble{
          position:relative;
          flex:1;
          border-radius:999px;
          padding:16px 26px;
          background: rgba(255,255,255,0.97);
          color:#2b163a;
          border:1px solid rgba(223, 202, 255, 0.9);
          box-shadow: 0 10px 22px rgba(0,0,0,0.18);
          min-height:86px;
          display:flex;
          flex-direction:column;
          justify-content:center;
        }

        /* ✅ 꼬리: 지금 어색하다고 하셔서 "따로 요소"로 빼서 고정 */
        .uplog-bubble-tail{
          position:absolute;
          right:42px;
          bottom:-8px;
          width:14px;
          height:14px;
          background: rgba(255,255,255,0.97);
          border-right:1px solid rgba(223,202,255,0.9);
          border-bottom:1px solid rgba(223,202,255,0.9);
          transform: rotate(45deg);
          border-radius:4px;
        }

        .uplog-bubble-top{
          display:flex;
          justify-content:center;
          margin-bottom:6px;
        }
        .uplog-bubble-tag{
          font-size:11px;
          font-weight:900;
          padding:4px 10px;
          border-radius:999px;
          background: rgba(250,244,255,0.95);
          color:#f973b8;
          border:1px solid rgba(223,202,255,0.6);
        }
        .uplog-bubble-text{
          margin:0;
          font-size:14px;
          font-weight:750;
          color:#4b2966;
          text-align:center;
          line-height:1.55;
          white-space:normal;
        }

        .uplog-bubble-nav{
          margin-top:10px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
        }
        .uplog-nav-arrow{
          width:30px;
          height:30px;
          border-radius:999px;
          border:none;
          cursor:pointer;
          background:#f0e8ff;
          color:#5a3cb2;
          font-size:16px;
          font-weight:900;
        }
        .uplog-dots{
          display:flex;
          align-items:center;
          gap:6px;
        }
        .uplog-dot{
          width:7px;
          height:7px;
          border-radius:999px;
          background:#e7ddff;
        }
        .uplog-dot-active{
          width:11px;
          height:11px;
          background:#f153aa;
        }

        /* ✅ 업쮸: "테두리 없음" 고정 */
        .uplog-mascot{
          width:120px;
          height:120px;
          flex-shrink:0;
          display:flex;
          align-items:flex-end;
          justify-content:center;
        }
        .uplog-mascot-img{
          width:120px;
          height:120px;
          object-fit:contain;
          filter: drop-shadow(0 14px 26px rgba(0,0,0,0.25));
        }

        @media (max-width: 960px){
          .uplog-hero{ padding:32px 24px 28px; }
          .uplog-hero-title{ font-size:30px; }
        }
        @media (max-width: 640px){
          .uplog-bubble-row{ gap:12px; }
          .uplog-mascot{ width:96px; height:96px; }
          .uplog-mascot-img{ width:96px; height:96px; }
          .uplog-bubble-tail{ right:22px; }
        }
      `}</style>
    </header>
  );
}
