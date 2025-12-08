// src/app/message-helper/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

// ───────────────── 타입 정의 ─────────────────
type SmsCategory = string;

type SmsTemplate = {
  id: string;
  category: SmsCategory;
  name: string;
  content: string;
  favorite: boolean;
};

const STORAGE_KEY = 'uplog-sms-templates-v1';

// ───────────────── 카테고리 ─────────────────
const CATEGORY_OPTIONS: SmsCategory[] = [
  '첫 통화 전',
  '첫 통화 후',
  '감사 문자',
  '축하 문자',
  '건강 안부',
  '계절별 인사',
  '날씨별 인사',
  '선물/사은품 안내',
  '제품 사용 안내',
  '배송 안내',
  '배송 완료 안내',
  '파손/분실 안내',
  '반품/교환 안내',
  '배송 지연 위로',
  '위로/응원 문자',
  '기타',
];

// ───────────────── 예시 문자 목록 ─────────────────
const SAMPLE_TEMPLATES: {
  id: string;
  category: SmsCategory;
  name: string;
  content: string;
}[] = [
  // 첫 통화 전
  {
    id: 'sample-first-call-1',
    category: '첫 통화 전',
    name: '첫 인사 + 시간 괜찮은지',
    content:
      '안녕하세요, ○○님.\n\n잠시 통화 가능하신 시간을 여쭤보고자 문자 먼저 드립니다.\n괜찮으신 시간 알려주시면, 그때 맞춰서 짧게 인사드리겠습니다 :)',
  },
  {
    id: 'sample-first-call-2',
    category: '첫 통화 전',
    name: '지인 소개 받은 경우',
    content:
      '안녕하세요, ○○님.\n\n△△님 소개로 연락드리는 ○○○입니다.\n혹시 괜찮으시다면, 편하신 시간에 잠시 전화로 인사드려도 될까요?',
  },

  // 첫 통화 후
  {
    id: 'sample-after-call-1',
    category: '첫 통화 후',
    name: '상담 후 감사 인사',
    content:
      '오늘 통화로 귀한 시간 내주셔서 감사합니다, ○○님.\n\n말씀해 주신 내용 잘 정리해 두었고,\n도움이 될 수 있는 방향으로 다시 한 번 제안 드리겠습니다 :)',
  },
  {
    id: 'sample-after-call-2',
    category: '첫 통화 후',
    name: '추가 안내 예정',
    content:
      '오늘 통화 즐거웠습니다, ○○님.\n\n문의 주신 부분은 자료 정리 후 내일 중으로 다시 한 번 정리해서 안내드리겠습니다.',
  },

  // 감사 문자
  {
    id: 'sample-thanks-1',
    category: '감사 문자',
    name: '상담 후 감사',
    content:
      '오늘 바쁘신 와중에도 시간 내주셔서 진심으로 감사합니다, ○○님.\n\n말씀 들으면서 많이 배웠습니다. 더 도움이 될 수 있도록 준비 잘 해보겠습니다 :)',
  },
  {
    id: 'sample-thanks-2',
    category: '감사 문자',
    name: '재구매 감사',
    content:
      '다시 한 번 저를 믿고 선택해 주셔서 진심으로 감사드립니다, ○○님.\n\n앞으로도 오래 편안하게 사용하실 수 있도록 끝까지 챙기겠습니다.',
  },

  // 축하 문자
  {
    id: 'sample-cong-1',
    category: '축하 문자',
    name: '생일 축하',
    content:
      '○○님, 생일 진심으로 축하드립니다 🎂\n\n오늘만큼은 누구보다 행복한 하루 보내시길 바랍니다.\n늘 건강과 웃음이 함께하시길 응원합니다.',
  },
  {
    id: 'sample-cong-2',
    category: '축하 문자',
    name: '계약 성사 축하',
    content:
      '○○님, 소중한 결정을 저와 함께해 주셔서 감사합니다.\n\n앞으로 좋은 결과로 이어질 수 있도록 더 책임감 있게 챙기겠습니다. 다시 한 번 축하드립니다 :)',
  },

  // 건강 안부
  {
    id: 'sample-health-1',
    category: '건강 안부',
    name: '환절기 안부',
    content:
      '요즘 일교차가 많이 크죠, ○○님.\n\n감기 조심하시라고 안부 문자 드립니다.\n바쁘시더라도 식사, 수분, 휴식 꼭 챙기셨으면 좋겠습니다 :)',
  },
  {
    id: 'sample-health-2',
    category: '건강 안부',
    name: '컨디션 걱정될 때',
    content:
      '지난번에 많이 피곤하시다고 하셔서 문득 생각나 연락드립니다, ○○님.\n\n요즘 몸은 좀 괜찮으신가요? 무리하지 않으셨으면 하는 마음으로 응원 보냅니다.',
  },

  // 계절별 인사
  {
    id: 'sample-season-1',
    category: '계절별 인사',
    name: '봄 인사',
    content:
      '따뜻한 봄바람이 조금씩 느껴지는 요즘입니다.\n\n○○님께도 새싹처럼 좋은 일들이 많이 피어나길 바라며 인사 한 번 드립니다 :)',
  },
  {
    id: 'sample-season-2',
    category: '계절별 인사',
    name: '여름 인사',
    content:
      '무더운 여름 잘 보내고 계신가요, ○○님?\n\n더위에 지치지 않으시길 바라며, 시원한 하루 보내시라고 인사 남깁니다 :)',
  },
  {
    id: 'sample-season-3',
    category: '계절별 인사',
    name: '가을 인사',
    content:
      '하늘이 예쁜 가을입니다.\n\n○○님 하루에도 선선한 바람처럼 여유와 웃음이 함께하시길 바랍니다.',
  },
  {
    id: 'sample-season-4',
    category: '계절별 인사',
    name: '겨울 인사',
    content:
      '날씨가 많이 추워졌죠, ○○님.\n\n따뜻하게 입고 다니시고, 감기 조심하시라고 작은 안부 인사 드립니다 :)',
  },

  // 날씨별 인사
  {
    id: 'sample-weather-1',
    category: '날씨별 인사',
    name: '비 오는 날',
    content:
      '비가 많이 오는 하루입니다.\n\n외출 시 미끄럽지 않게 조심하시고, 따뜻한 음료 한 잔 하시면서 여유 있으셨으면 좋겠어요, ○○님.',
  },
  {
    id: 'sample-weather-2',
    category: '날씨별 인사',
    name: '눈 오는 날',
    content:
      '오늘은 눈이 많이 오네요, ○○님.\n\n길이 미끄러울 수 있으니 이동하실 때 조심하시고, 따뜻한 하루 보내세요 :)',
  },

  // 선물/사은품 안내
  {
    id: 'sample-gift-1',
    category: '선물/사은품 안내',
    name: '사은품 발송 안내',
    content:
      '○○님께 감사한 마음으로 준비한 작은 사은품을 오늘 발송했습니다.\n\n1~2일 내 도착 예정이며, 마음에 드셨으면 좋겠습니다 :)',
  },
  {
    id: 'sample-gift-2',
    category: '선물/사은품 안내',
    name: '지인 소개 감사 선물',
    content:
      '소중한 지인 소개해 주셔서 진심으로 감사합니다, ○○님.\n\n감사의 마음을 담아 작은 선물을 준비해 발송드렸습니다. 받아보시고 언제든 솔직한 의견 주셔도 좋습니다.',
  },

  // 제품 사용 안내
  {
    id: 'sample-howto-1',
    category: '제품 사용 안내',
    name: '사용 TIP 안내',
    content:
      '제품 처음 사용하실 때는 동봉된 안내문 순서대로 사용해 주시면 가장 좋습니다, ○○님.\n\n혹시 사용하시다 궁금한 점 있으시면 사진과 함께 편하게 톡 주세요 :)',
  },
  {
    id: 'sample-howto-2',
    category: '제품 사용 안내',
    name: '효과 체크 안내',
    content:
      '사용 후 1~2주 정도 지나면 변화가 조금씩 느껴지실 수 있습니다.\n\n그때 컨디션이나 느낌 한 번만 알려주시면, 더 잘 맞는 사용 방법 함께 조정해 보겠습니다, ○○님.',
  },

  // 배송 안내 / 완료
  {
    id: 'sample-ship-1',
    category: '배송 안내',
    name: '발송 안내 (기본형)',
    content:
      '안녕하세요, ○○님 :)\n\n오늘 주문해 주신 상품이 택배사로 발송되었습니다.\n1~2일 내 도착 예정이며, 도착 전후로 한 번 더 안내드리겠습니다.',
  },
  {
    id: 'sample-ship-2',
    category: '배송 완료 안내',
    name: '배송완료 확인',
    content:
      '오늘 발송된 상품이 잘 도착하셨는지 확인차 연락드립니다, ○○님.\n\n사용하시다가 불편한 점이나 궁금한 점 있으시면 언제든 편하게 말씀 주세요.',
  },

  // 파손/분실
  {
    id: 'sample-damage-1',
    category: '파손/분실 안내',
    name: '파손 재발송 안내',
    content:
      '배송 과정에서 제품 파손이 확인되어 먼저 사과의 말씀드립니다, ○○님.\n\n새 상품으로 바로 재발송 요청드렸으며, 불편함 없으시도록 끝까지 챙기겠습니다.',
  },
  {
    id: 'sample-damage-2',
    category: '파손/분실 안내',
    name: '분실 추적 안내',
    content:
      '택배 분실로 많이 당황하셨지요, ○○님. 정말 죄송합니다.\n\n현재 택배사와 함께 위치 추적 및 재발송 여부를 동시에 확인 중이며, 진행 상황은 바로바로 공유드리겠습니다.',
  },

  // 반품/교환
  {
    id: 'sample-return-1',
    category: '반품/교환 안내',
    name: '교환 절차 안내',
    content:
      '요청 주신 교환 건 접수 완료되었습니다, ○○님.\n\n기사님 방문 수거 후 새 제품으로 발송 도와드리겠습니다.\n교환 과정 중에도 불편함 없도록 계속 챙기겠습니다.',
  },
  {
    id: 'sample-return-2',
    category: '반품/교환 안내',
    name: '반품/환불 안내',
    content:
      '반품 요청 건 확인했습니다, ○○님.\n\n제품 회수 후 최대한 빠르게 환불 처리 도와드리겠습니다.\n혹시라도 개선되었으면 하는 점 있으시면 편하게 알려주세요.',
  },

  // 배송 지연 위로
  {
    id: 'sample-delay-1',
    category: '배송 지연 위로',
    name: '지연 사과',
    content:
      '배송이 예상보다 지연되어 많이 불편하실 텐데 죄송합니다, ○○님.\n\n현재 택배 물량 증가로 지연이 발생하고 있으며, 최대한 빠르게 받아보실 수 있도록 지속적으로 확인 중입니다.',
  },
  {
    id: 'sample-delay-2',
    category: '배송 지연 위로',
    name: '지연 위로 문구',
    content:
      '기다리게 해 드려 정말 죄송합니다, ○○님.\n\n혹시 일정에 지장이 생기지 않을까 마음이 쓰여 이렇게 먼저 연락드립니다.\n도착까지 계속 확인하면서 진행 상황 공유드리겠습니다.',
  },

  // 위로/응원
  {
    id: 'sample-cheer-1',
    category: '위로/응원 문자',
    name: '마음 위로',
    content:
      '요즘 여러 가지로 마음 쓰이는 일 많으시죠, ○○님.\n\n힘든 시기가 길게 느껴지실 수 있지만, 조금씩이라도 나아지고 있다고 믿습니다.\n언제든 편하게 이야기 나눠요. 항상 응원하고 있습니다.',
  },
  {
    id: 'sample-cheer-2',
    category: '위로/응원 문자',
    name: '고생 많으셨다는 한 마디',
    content:
      '요즘 누구보다 바쁘실 텐데, 정말 고생 많으십니다, ○○님.\n\n잠깐이라도 숨 고르실 수 있는 시간이 있으셨으면 좋겠습니다.\n멀리서 늘 응원하고 있습니다 :)',
  },

  // 기타
  {
    id: 'sample-etc-1',
    category: '기타',
    name: '그냥 안부 한 줄',
    content:
      '문득 ○○님 생각이 나서 안부 한 줄 남깁니다.\n\n오늘 하루도 너무 무리하지 마시고, 나를 위한 작은 여유 한 번은 꼭 챙기셨으면 좋겠습니다 :)',
  },
];

// ───────────────── 컴포넌트 ─────────────────
export default function MessageHelperPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);

  const [category, setCategory] = useState<SmsCategory>('배송 안내');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  // 저장된 템플릿 불러오기
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SmsTemplate[];
      if (Array.isArray(parsed)) setTemplates(parsed);
    } catch (e) {
      console.error('SMS_TEMPLATE_LOAD_ERROR', e);
    }
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('SMS_TEMPLATE_SAVE_ERROR', e);
    }
  }, [templates]);

  const filteredTemplates = useMemo(
    () => (showFavoriteOnly ? templates.filter((t) => t.favorite) : templates),
    [templates, showFavoriteOnly],
  );

  const handleApplySampleCategory = () => {
    const sample = SAMPLE_TEMPLATES.find((s) => s.category === category);
    if (!sample) {
      alert(
        '이 카테고리는 준비된 예시가 아직 없습니다.\n아래 예시 카드에서 골라서 가져와 주세요 :)',
      );
      return;
    }
    setName(sample.name);
    setContent(sample.content);
  };

  const handleApplySampleCard = (id: string) => {
    const sample = SAMPLE_TEMPLATES.find((s) => s.id === id);
    if (!sample) return;
    setCategory(sample.category);
    setName(sample.name);
    setContent(sample.content);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveTemplate = () => {
    if (!content.trim()) {
      alert('문자 내용을 입력해 주세요.');
      return;
    }

    const newTemplate: SmsTemplate = {
      id: String(Date.now()),
      category,
      name: name.trim() || `${category} 템플릿`,
      content: content.trim(),
      favorite: false,
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setName('');
    setContent('');
  };

  const handleDeleteTemplate = (id: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('해당 템플릿을 삭제하시겠습니까?');
      if (!ok) return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)),
    );
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('문구가 복사되었습니다. 문자 앱에 붙여넣기 해 주세요.');
    } catch {
      alert('복사가 잘 안 되면, 드래그해서 직접 복사해 주세요.');
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{
        background:
          'radial-gradient(circle at top, #4c1d95 0, #020016 55%, #000 100%)',
        color: '#f9fafb',
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 상단 타이틀 */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-pink-300 uppercase font-semibold">
              UPLOG · MESSAGE HELPER
            </p>
            <h1 className="mt-2 text-3xl font-bold">문자 도우미</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              택배 발송 / 배송완료 / 파손·분실 / 반품·교환 / 위로·응원 문자까지
              자주 쓰는 문구를 템플릿으로 저장해 두고, 한 번에 복사해서 사용할 수
              있도록 모아두는 공간입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFavoriteOnly((v) => !v)}
            className="self-start rounded-full border px-4 py-2 text-xs font-medium"
            style={{
              borderColor: '#fb923c',
              backgroundColor: showFavoriteOnly ? '#fb923c' : 'transparent',
              color: showFavoriteOnly ? '#111827' : '#fed7aa',
            }}
          >
            {showFavoriteOnly ? '전체 문구 보기' : '즐겨찾기만 보기'}
          </button>
        </header>

        {/* 1. 새 템플릿 저장 */}
        <section
          className="rounded-3xl border shadow-lg px-6 py-6 space-y-4"
          style={{
            background: 'rgba(15,23,42,0.92)',
            borderColor: 'rgba(244,114,182,0.4)',
          }}
        >
          <h2 className="text-xl font-semibold">새 문자 템플릿 저장</h2>

          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-slate-200">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2"
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid #4b5563',
                  color: '#f9fafb',
                }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleApplySampleCategory}
              className="text-xs rounded-full border px-3 py-2"
              style={{
                borderColor: '#9ca3af',
                backgroundColor: '#020617',
                color: '#e5e7eb',
                whiteSpace: 'nowrap',
              }}
            >
              이 카테고리 예시 불러오기
            </button>
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-200">
              템플릿 이름
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 배송완료 확인 문자 (기본형)"
              className="w-full text-sm rounded-xl px-3 py-2"
              style={{
                backgroundColor: '#020617',
                border: '1px solid #4b5563',
                color: '#f9fafb',
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-200">
              문자 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="예: 안녕하세요, ○○님. 오늘 발송된 상품이 잘 도착하셨는지 확인차 연락드립니다..."
              className="w-full text-sm rounded-xl px-3 py-2 resize-vertical"
              style={{
                backgroundColor: '#020617',
                border: '1px solid #4b5563',
                color: '#f9fafb',
              }}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="rounded-full px-5 py-2 text-sm font-semibold shadow"
              style={{
                background:
                  'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
                color: '#fff',
              }}
            >
              문자 템플릿 저장
            </button>
          </div>
        </section>

        {/* 2. 예시 문자 바둑판 */}
        <section
          className="rounded-3xl border shadow-lg px-6 py-6 space-y-3"
          style={{
            background: 'rgba(15,23,42,0.9)',
            borderColor: 'rgba(165,180,252,0.4)',
          }}
        >
          <div>
            <h2 className="text-xl font-semibold mb-1">예시 문자 모음</h2>
            <p className="text-xs text-slate-300">
              카테고리별로 자주 쓰게 될 것 같은 문구들을 모아두었습니다. 카드에서{' '}
              <b>복사</b>하거나, <b>입력창에 가져오기</b> 버튼으로 위 템플릿 영역으로
              바로 가져와서 대표님 스타일대로 수정해 저장하실 수 있습니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SAMPLE_TEMPLATES.map((sample) => (
              <div
                key={sample.id}
                className="flex flex-col justify-between rounded-2xl border px-3 py-3"
                style={{
                  backgroundColor: '#020617',
                  borderColor: '#4b5563',
                  minHeight: 150,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: '#111827',
                        border: '1px solid #4b5563',
                      }}
                    >
                      {sample.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      예시 템플릿
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1">
                    {sample.name}
                  </div>
                  <p
                    className="text-xs text-slate-100"
                    style={{
                      whiteSpace: 'pre-line',
                      lineHeight: 1.6,
                      maxHeight: 96,
                      overflow: 'hidden',
                    }}
                  >
                    {sample.content}
                  </p>
                </div>

                <div className="mt-3 flex justify-end gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleCopy(sample.content)}
                    className="rounded-full px-3 py-1 border"
                    style={{
                      borderColor: '#9ca3af',
                      backgroundColor: 'transparent',
                    }}
                  >
                    복사
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySampleCard(sample.id)}
                    className="rounded-full px-3 py-1 border font-semibold"
                    style={{
                      borderColor: '#f9a8d4',
                      background:
                        'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)',
                    }}
                  >
                    입력창에 가져오기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 내 템플릿 목록 */}
        <section
          className="rounded-3xl border shadow-lg px-6 py-6 space-y-4 mb-10"
          style={{
            background: 'rgba(15,23,42,0.92)',
            borderColor: 'rgba(148,163,184,0.6)',
          }}
        >
          <h2 className="text-xl font-semibold">내 문자 템플릿</h2>

          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-slate-300">
              아직 저장된 문자가 없습니다. 위에서 템플릿을 만들거나, 예시 카드에서
              가져와서 저장해 보세요.
              {showFavoriteOnly && (
                <>
                  <br />
                  (지금은 즐겨찾기만 보기 상태입니다. 전체 문구를 보려면 위의
                  버튼을 눌러 주세요.)
                </>
              )}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: '#020617',
                    borderColor: '#4b5563',
                  }}
                >
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <div>
                      <div className="text-[11px] text-indigo-300 mb-0.5">
                        {tpl.category}
                      </div>
                      <div className="text-sm font-semibold">{tpl.name}</div>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(tpl.id)}
                        className="rounded-full px-3 py-1 border"
                        style={{
                          borderColor: '#fbbf24',
                          backgroundColor: tpl.favorite
                            ? '#fbbf24'
                            : 'transparent',
                          color: tpl.favorite ? '#111827' : '#fde68a',
                        }}
                      >
                        {tpl.favorite ? '★ 즐겨찾기' : '☆ 즐겨찾기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(tpl.content)}
                        className="rounded-full px-3 py-1 border"
                        style={{
                          borderColor: '#9ca3af',
                        }}
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="rounded-full px-3 py-1 border"
                        style={{
                          borderColor: '#ef4444',
                          color: '#fecaca',
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <p
                    className="text-sm text-slate-100"
                    style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}
                  >
                    {tpl.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
