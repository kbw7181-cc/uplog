'use client';

import { useEffect, useState } from 'react';

function formatKoreanDate(d: Date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export default function DateLabel() {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(formatKoreanDate(new Date()));
  }, []);

  return (
    <div suppressHydrationWarning>
      {text}
    </div>
  );
}
