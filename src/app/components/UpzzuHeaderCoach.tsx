'use client';

type Props = {
  mascotSrc: string;
  text: string;
  tag?: string;
  sizePx?: number;
  emoji?: string;
};

export default function UpzzuHeaderCoach({
  mascotSrc,
  text,
  tag = '오늘의 U P 한마디',
  sizePx = 160,
  emoji = '✨',
}: Props) {
  return (
    <div className="uplog-coach">
      <div className="uplog-bubble" aria-label="coach-bubble">
        <div className="uplog-bubble-tag">
          <span className="uplog-bubble-emoji">{emoji}</span>
          <span>{tag}</span>
        </div>

        <div className="uplog-bubble-text">{text}</div>
      </div>

      <div className="uplog-mascot-wrap" aria-label="coach-mascot">
        <img
          className="uplog-mascot-img"
          src={mascotSrc}
          alt="upzzu"
          style={{ width: `${sizePx}px` }}
        />
      </div>
    </div>
  );
}
