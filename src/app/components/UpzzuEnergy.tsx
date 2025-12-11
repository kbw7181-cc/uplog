// src/components/UpzzuEnergy.tsx
'use client';

import { useEffect, useState } from 'react';

const ENERGY_FRAMES = [
  '/assets/upzzu/UPZ_E01.png',
  '/assets/upzzu/UPZ_E02.png',
  '/assets/upzzu/UPZ_E03.png',
  '/assets/upzzu/UPZ_E04.png',
  '/assets/upzzu/UPZ_E05.png',
];

export function UpzzuEnergy({ size = 160 }: { size?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ENERGY_FRAMES.length);
    }, 150); // 0.15초마다 다음 프레임
    return () => clearInterval(timer);
  }, []);

  return (
    <img
      src={ENERGY_FRAMES[index]}
      alt="UP쭈 에너지 모션"
      style={{
        width: size,
        height: 'auto',
        imageRendering: 'auto',
      }}
    />
  );
}
