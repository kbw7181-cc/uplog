// src/components/UpzzuHeaderCoach.tsx
'use client';

import { useEffect, useState } from 'react';

const HEADER_FRAMES = [
  '/assets/upzzu/UPZ_H01.png',
  '/assets/upzzu/UPZ_H02.png',
  '/assets/upzzu/UPZ_H03.png',
  '/assets/upzzu/UPZ_H04.png',
  '/assets/upzzu/UPZ_H05.png',
];

export function UpzzuHeaderCoach({ size = 120 }: { size?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HEADER_FRAMES.length);
    }, 350); // 헤더는 더 천천히
    return () => clearInterval(timer);
  }, []);

  return (
    <img
      src={HEADER_FRAMES[index]}
      alt="UP쭈 코치"
      style={{
        width: size,
        height: 'auto',
      }}
    />
  );
}
