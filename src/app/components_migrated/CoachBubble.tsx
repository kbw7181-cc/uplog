// src/components/CoachBubble.tsx
'use client';

type Props = {
  title?: string;        // 작게 보이는 라벨 (예: 오늘의 U P 한마디)
  message: string;       // 본문
  mascotSrc: string;     // /assets/upzzu1.png 같은 경로
};

export default function CoachBubble({ title, message, mascotSrc }: Props) {
  return (
    <section className="coach-wrap">
      <div className="coach-bubble">
        {title ? <div className="coach-title">{title}</div> : null}
        <div className="coach-msg">{message}</div>
      </div>

      <div className="coach-mascot">
        <img src={mascotSrc} alt="UPZZU" />
      </div>
    </section>
  );
}
