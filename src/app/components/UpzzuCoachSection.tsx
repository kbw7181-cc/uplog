'use client';

import React from 'react';

type Props = {
  title?: string;            // pill 텍스트
  message: string;           // 말풍선 본문
  mascotSrc?: string;        // 업쮸 이미지 경로
  align?: 'header' | 'page'; // header(높이 고정), page(일반 섹션)
  maxWidth?: number;         // 말풍선 최대 폭
};

export default function UpzzuCoachSection({
  title = '오늘의 U P 한마디',
  message,
  mascotSrc = '/assets/upzzu1.png',
  align = 'page',
  maxWidth = 560,
}: Props) {
  return (
    <section className={`uplog-coach ${align === 'header' ? 'uplog-coach-header' : ''}`}>
      <div className="uplog-coach-row">
        <div className="uplog-coach-bubble" style={{ maxWidth }}>
          <div className="uplog-coach-pill">{title}</div>
          <div className="uplog-coach-text">{message}</div>
        </div>

        <div className="uplog-coach-mascot" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="uplog-coach-mascot-img" src={mascotSrc} alt="" />
          <span className="uplog-coach-sparkle s1">✨</span>
          <span className="uplog-coach-sparkle s2">✨</span>
        </div>
      </div>
    </section>
  );
}
