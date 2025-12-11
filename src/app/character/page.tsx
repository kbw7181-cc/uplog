// src/app/character/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type CharacterId = 'A' | 'B' | 'C' | 'D';

type Character = {
  id: CharacterId;
  name: string;
  subtitle: string;
  role: string;
  mainColor: string;
  subColor: string;
  badge: string;
  description: string;
  keywords: string[];
};

const CHARACTERS: Character[] = [
  {
    id: 'A',
    name: 'A 코치',
    subtitle: '기본형 UP 코치',
    role: '차분하게 방향을 잡아주는 기본 코치',
    mainColor: 'from-pink-400 via-fuchsia-400 to-purple-500',
    subColor: 'bg-pink-200/20',
    badge: '단단한 기본기',
    description:
      '기본기와 루틴을 가장 중요하게 생각하는 코치예요. 하루하루를 꼼꼼하게 쌓아 올리고 싶은 대표님에게 어울리는 기본형 캐릭터예요.',
    keywords: ['기본기', '루틴', '성장노트', '차분함'],
  },
  {
    id: 'B',
    name: 'B 코치',
    subtitle: '크라운 UP 코치',
    role: '왕관을 쓴 성과형 코치',
    mainColor: 'from-fuchsia-400 via-pink-400 to-amber-300',
    subColor: 'bg-fuchsia-200/15',
    badge: '왕관 · 성과 집중',
    description:
      '머리에 단단한 왕관을 쓴 성과 코치예요. 오늘의 목표, 계약, 가망 고객 숫자를 계속 의식하게 도와주는 “성과 압축형” 캐릭터 컨셉이에요.',
    keywords: ['왕관', '성과', '집중', '계약'],
  },
  {
    id: 'C',
    name: 'C 코치',
    subtitle: 'UP 화살표 코치',
    role: '항상 위쪽을 가리키는 방향 코치',
    mainColor: 'from-purple-400 via-violet-400 to-sky-400',
    subColor: 'bg-purple-200/15',
    badge: '화살표 · 방향성',
    description:
      '부드러운 파스텔 톤이지만, 항상 위를 가리키는 화살표를 품고 있어요. “조금씩만 위로”라는 메시지를 반복해서 알려주는 방향성 캐릭터예요.',
    keywords: ['화살표', '방향성', '꾸준함', '동기부여'],
  },
  {
    id: 'D',
    name: 'D 코치',
    subtitle: '움직이는 에너지 코치',
    role: '살짝 튀는 밝은 에너지',
    mainColor: 'from-pink-300 via-purple-300 to-indigo-400',
    subColor: 'bg-indigo-200/15',
    badge: '동글동글 에너지',
    description:
      '살짝 통통 튀는 느낌의 동글 캐릭터예요. 헤더에서 살짝 흔들리거나 점프하는 애니메이션을 줄 때 잘 어울리도록 만든 설정이에요.',
    keywords: ['파스텔', '통통튀는', '밝음', '점프'],
  },
];

export default function CharacterPage() {
  const [selectedId, setSelectedId] = useState<CharacterId>('B');

  const selected = CHARACTERS.find((c) => c.id === selectedId)!;

  return (
    <div className="min-h-screen w-full pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      {/* 상단 헤더 - 캐릭터 홈 제목 */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs sm:text-sm text-slate-200">
          <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-pink-500/70 text-white">
            NEW
          </span>
          <span className="text-slate-200/80">
            UPLOG 코치 캐릭터 - 헤더에 들어갈 버전 미리보기
          </span>
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-50 leading-tight">
          캐릭터 코치 설정
          <span className="block text-lg sm:text-xl mt-2 font-semibold text-pink-300">
            핑크·퍼플 파스텔 + 화살표·왕관 포인트로 단단하고 귀엽게
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-300/90 max-w-3xl leading-relaxed">
          대표님이 고른&nbsp;
          <span className="font-semibold text-pink-300">
            B 왕관 느낌 + C 화살표 느낌
          </span>
          &nbsp;조합을 중심으로, A/B/C/D 캐릭터를 한 눈에 비교하고 헤더 코치
          미리보기까지 볼 수 있는 페이지예요.
        </p>
      </div>

      {/* 메인 그리드 */}
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        {/* 왼쪽 - 캐릭터 상세 카드 */}
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-lg p-5 sm:p-7 lg:p-8 shadow-xl shadow-fuchsia-900/40">
          {/* 선택 토글 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`relative px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all
                  ${
                    selectedId === c.id
                      ? 'border-pink-300/80 bg-gradient-to-r from-pink-500/40 via-fuchsia-500/40 to-purple-500/40 text-slate-50 shadow-lg shadow-pink-500/40'
                      : 'border-white/12 bg-white/5 text-slate-200/80 hover:border-pink-300/60 hover:bg-pink-500/10'
                  }`}
              >
                <span className="mr-1 text-[11px] sm:text-xs text-pink-200/80">
                  {c.id}
                </span>
                {c.name}
              </button>
            ))}
          </div>

          {/* 메인 캐릭터 뷰 */}
          <div
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${selected.mainColor} p-5 sm:p-6`}
          >
            {/* 상단 라벨 */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-[11px] sm:text-xs text-slate-100">
                  <span className="text-pink-200/90">
                    {selected.badge}
                  </span>
                  <span className="w-px h-3 bg-white/20" />
                  <span className="text-slate-100/80">{selected.subtitle}</span>
                </div>
                <h2 className="mt-3 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-100/80">
                  {selected.role}
                </p>
              </div>

              {/* 왕관 + 화살표 아이콘 블럭 */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 rounded-3xl bg-black/30 blur-lg" />
                <div className="relative w-full h-full rounded-3xl border border-white/30 bg-black/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
                  <span className="text-2xl sm:text-3xl animate-pulse">
                    👑
                  </span>
                  <span className="text-xl sm:text-2xl -mt-1">
                    ⬆️
                  </span>
                  <span className="mt-1 text-[10px] sm:text-xs text-slate-100/80">
                    UP 코치
                  </span>
                </div>
              </div>
            </div>

            {/* 설명 박스 */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr,1fr]">
              <div className="rounded-2xl bg-black/35 border border-white/15 p-4 sm:p-5">
                <p className="text-sm sm:text-base leading-relaxed text-slate-50">
                  {selected.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selected.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-white/12 text-slate-50 border border-white/15"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* 색상 가이드 */}
              <div
                className={`rounded-2xl border border-white/20 ${selected.subColor} p-3 sm:p-4 flex flex-col gap-3`}
              >
                <div>
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide text-slate-100/70">
                    Color Guide
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-50/90">
                    핑크·퍼플 파스텔에 왕관·화살표 포인트를 넣은 톤앤매너예요.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-[11px] sm:text-xs text-slate-100/80">
                      Crown
                    </span>
                    <div className="flex gap-1.5">
                      <div className="h-7 flex-1 rounded-full bg-gradient-to-r from-amber-200 to-amber-400 border border-white/40" />
                      <div className="h-7 w-7 rounded-full bg-amber-300/90 border border-white/60 shadow-md shadow-amber-300/60" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-[11px] sm:text-xs text-slate-100/80">
                      Arrow
                    </span>
                    <div className="flex gap-1.5">
                      <div className="h-7 flex-1 rounded-full bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-400 border border-white/40" />
                      <div className="h-7 w-7 rounded-full bg-fuchsia-400/90 border border-white/60 shadow-md shadow-fuchsia-400/70" />
                    </div>
                  </div>
                </div>

                <div className="mt-1 text-[10px] sm:text-[11px] text-slate-100/70">
                  헤더에는 왕관 아이콘은 작게, 화살표는 얇고 길게 넣어서
                  “단단한데 귀여운” 느낌을 살리는 방향으로 사용하면 좋아요.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 - 헤더 미리보기 & 가이드 */}
        <div className="space-y-5">
          {/* 헤더 미리보기 */}
          <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-lg p-4 sm:p-5 shadow-lg shadow-purple-900/40">
            <p className="text-xs sm:text-sm font-semibold text-slate-200 mb-3">
              페이지 헤더 적용 미리보기
            </p>

            <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-pink-500/20 via-purple-600/20 to-slate-900/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-pink-500/40 blur-md" />
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-black/70 border border-white/30 flex items-center justify-center overflow-hidden">
                    <span className="text-lg sm:text-xl">👑⬆️</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-bold text-slate-50">
                      UPLOG
                    </span>
                    <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-black/40 text-pink-200 border border-white/15">
                      {selected.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-slate-100/80">
                    쉬었다 가도 돼, 바람이 부는 대로, 마음이 닿는 대로
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[11px] text-slate-100/80">
                  오늘의 UP 코칭
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-black/50 border border-pink-400/60 text-pink-200">
                  성장률 관리가 실력의 차이
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              각 페이지 헤더 오른쪽에 이 코치 블럭을 그대로 올려서, 캐릭터가
              대표님에게 상단에서 계속 말을 걸어주는 느낌으로 사용할 수 있어요.
            </p>
          </div>

          {/* 조합 가이드 */}
          <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-lg p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-semibold text-slate-200 mb-2">
              B + C 조합 가이드
            </p>
            <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-200/90 leading-relaxed">
              <li>
                • 기본 구조는 <span className="font-semibold">C 화살표</span>
                를 기준으로 하고,
                <span className="font-semibold text-pink-300">
                  {' '}
                  왕관은 포인트 아이콘
                </span>
                으로만 사용.
              </li>
              <li>
                • 파스텔 핑크 - 퍼플 - 바이올렛 그라데이션을 기본으로, 화면
                전체는 너무 번쩍이지 않게 카드 내부에만 강한 색을 사용.
              </li>
              <li>
                • 캐릭터 자체는 동글동글·단단한 실루엣으로, 각 페이지 헤더
                오른쪽 상단에 작게 들어가도록 설계.
              </li>
              <li>
                • 나중에 아이콘 세트 만들 때도, 이 페이지의 색상톤과 키워드를
                기준으로 맞추면 톤앤매너가 자연스럽게 이어짐.
              </li>
            </ul>

            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[11px] sm:text-xs text-slate-300">
                다음 단계에서는{' '}
                <span className="font-semibold text-pink-300">
                  각 페이지 헤더에 코치 버전
                </span>
                을 그대로 입히고, 그 다음에 메뉴 아이콘 세트를 만들면
                흐름이 예쁘게 이어질 거예요.
              </p>
            </div>
          </div>

          {/* 돌아가기 링크 예시 - 필요 없으면 지워도 됨 */}
          <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-[11px] sm:text-xs text-slate-300 flex items-center justify-between gap-2">
            <span>완성 후에는 메인 홈 · 마이 UP 관리에도 이 코치 헤더를 공통 적용</span>
            <Link
              href="/home"
              className="shrink-0 px-3 py-1.5 rounded-full bg-pink-500/80 hover:bg-pink-400 text-white font-semibold text-[11px]"
            >
              홈으로 가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
