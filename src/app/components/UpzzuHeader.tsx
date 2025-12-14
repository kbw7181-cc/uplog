// src/components/UpzzuHeader.tsx
'use client';

import Image from 'next/image';

type Props = {
  /** /public/assets/images/xxx.png 형태로 넣기 */
  imageSrc: string;
  /** 말풍선 텍스트 */
  text: string;
  /** 말풍선 꼬리 방향: 업쮸가 오른쪽이면 기본 right */
  tail?: 'right' | 'left';
  /** 이미지 크기 (기본 86) */
  size?: number;
};

export default function UpzzuHeader({
  imageSrc,
  text,
  tail = 'right',
  size = 86,
}: Props) {
  return (
    <section className="upzzu-wrap">
      <div className={`upzzu-bubble ${tail === 'right' ? 'tail-right' : 'tail-left'}`}>
        <div className="upzzu-bubble-text">{text}</div>
      </div>

      <div className="upzzu-mascot" aria-hidden>
        <div className="upzzu-float">
          <Image
            src={imageSrc}
            alt="업쮸"
            width={size}
            height={size}
            priority
            style={{ height: 'auto', width: size }}
          />
        </div>
      </div>
    </section>
  );
}
