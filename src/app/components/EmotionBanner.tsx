'use client';

import { useEffect, useState } from 'react';

type SlideItem = {
    id: string;
    tag: string;
    title: string;
    body: string;
};

const emotionSlides: SlideItem[] = [
    {
        id: 'sms-1',
        tag: '안부 문자 예시',
        title: '마음이 무거운 날엔',
        body: '조금 쉬어가도 괜찮아요. 다만 완전히 멈지만 않으면 됩니다. 대표님은 이미 충분히 잘하고 있어요.',
    },
    {
        id: 'mind-1',
        tag: '마인드',
        title: '오늘도 나를 UP 시키다',
        body: '거절은 줄이고, 경험은 쌓이고, 실력은 쌓입니다. 오늘 한 걸음이 내일의 계약을 만듭니다.',
    },
    {
        id: 'recovery-1',
        tag: '거절 회복',
        title: '거절은 실패가 아니라 힌트입니다',
        body: '고객이 남긴 말 한마디가 내 스크립트를 더 단단하게 만들어 줍니다. 오늘의 거절은 내일의 성공을 준비하는 중이에요.',
    },
];

export default function EmotionBanner() {
    const [slideIndex, setSlideIndex] = useState(0);

    // 감성 슬라이드 자동 전환
    useEffect(() => {
        if (emotionSlides.length <= 1) return;
        const timer = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % emotionSlides.length);
        }, 7000);
        return () => clearInterval(timer);
    }, []);

    const currentSlide = emotionSlides[slideIndex] ?? emotionSlides[0];

    return (
        <div className="rounded-3xl bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-500 p-[1px] shadow-[0_22px_70px_rgba(236,72,153,0.7)]">
            <div className="rounded-3xl bg-[#10061c] p-4 md:p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs">
                    <div className="text-[11px] text-pink-100/90">오늘의 감성 베너</div>
                    <span className="px-2 py-[2px] rounded-full bg-pink-500/20 text-[10px] text-pink-100 border border-pink-300/60">
                        {currentSlide.tag}
                    </span>
                </div>
                <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-2">
                        {currentSlide.title}
                    </h2>
                    <p className="text-[13px] md:text-sm text-pink-50/90 leading-relaxed">
                        {currentSlide.body}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {emotionSlides.map((s, idx) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSlideIndex(idx)}
                                className={`h-2 w-2 rounded-full transition ${idx === slideIndex
                                        ? 'bg-pink-200 scale-110'
                                        : 'bg-pink-400/40'
                                    }`}
                            />
                        ))}
                    </div>
                    <div className="text-[11px] text-pink-100/80">
                        대표님의 마인드를 위한 작은 카드
                    </div>
                </div>
            </div>
        </div>
    );
}
