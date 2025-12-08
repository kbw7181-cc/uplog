// src/app/sms-helper/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type HelperCategory =
  | 'first'
  | 'after'
  | 'thanks'
  | 'health'
  | 'season'
  | 'shipping'
  | 'problem'
  | 'comfort';

const CATEGORY_META: { id: HelperCategory; label: string }[] = [
  { id: 'first', label: '첫 통화 전·첫 통화 후' },
  { id: 'thanks', label: '감사·축하 인사' },
  { id: 'health', label: '건강 안부·응원' },
  { id: 'season', label: '계절·날씨 인사' },
  { id: 'shipping', label: '택배 발송·배송 안내' },
  { id: 'problem', label: '파손·지연·반품/교환' },
  { id: 'comfort', label: '위로·응원·기타' },
];

type SampleTemplate = {
  id: string;
  category: HelperCategory;
  title: string;
  content: string;
};

type MyTemplate = {
  id: string;
  category: HelperCategory;
  title: string;
  content: string;
  created_at: string;
};

const SAMPLE_TEMPLATES: SampleTemplate[] = [
  // 첫 통화 전·후
  {
    id: 'first-1',
    category: 'first',
    title: '첫 인사 + 통화 가능 시간 여쭙기',
    content:
      '안녕하세요, ○○님.\n잠시 인사드리고자 먼저 문자로 연락드립니다.\n편하신 통화 가능 시간 한 번만 알려주시면, 그때 맞춰 짧게 인사드리겠습니다.',
  },
  {
    id: 'first-2',
    category: 'first',
    title: '소개 후 첫 연락',
    content:
      '안녕하세요, ○○님.\n○○님의 지인분 소개로 연락드리는 ○○○입니다.\n혹시 오늘이나 내일 중 편하신 시간 있으실 때, 잠깐 통화 가능하실까요?\n시간 괜찮으실 때 짧게만 인사드리겠습니다.',
  },
  // 감사·축하
  {
    id: 'thanks-1',
    category: 'thanks',
    title: '상담 후 감사 인사',
    content:
      '오늘 귀한 시간 내어 이야기 나누어 주셔서 진심으로 감사합니다, ○○님.\n들려주신 말씀들 잘 기억해 두고, 도움이 될 수 있는 방향으로 다시 한 번 정리해 안내드리겠습니다.',
  },
  {
    id: 'thanks-2',
    category: 'thanks',
    title: '계약 후 감사 인사',
    content:
      '○○님, 오늘 함께 결정해 주셔서 진심으로 감사합니다.\n맡겨주신 믿음에 보답할 수 있도록, 이후 관리까지 꼼꼼히 챙기겠습니다.\n언제든 마음 쓰이시는 부분 있으시면 편하게 말씀 주세요.',
  },
  // 건강 안부·응원
  {
    id: 'health-1',
    category: 'health',
    title: '건강 안부 인사 기본형',
    content:
      '요즘 일도 많고 날씨도 변덕스럽죠, ○○님.\n몸은 많이 피곤하시지 않으신지 마음 쓰여 문자 한 통 드립니다.\n오늘도 식사 꼭 챙겨 드시고, 일과 후에는 푹 쉬시는 시간 되시길 바랄게요.',
  },
  {
    id: 'health-2',
    category: 'health',
    title: '힘든 시기 응원 문자',
    content:
      '요즘 여러 가지로 마음 쓰이는 일 많으시죠, ○○님.\n힘든 시기가 길게 느껴질 수 있지만, 조금씩이라도 나아지고 있다고 믿습니다.\n언제든 필요하실 때 이야기 나누러 오세요. 항상 응원하고 있습니다.',
  },
  // 계절·날씨
  {
    id: 'season-1',
    category: 'season',
    title: '추운 날씨 안부',
    content:
      '갑자기 날씨가 많이 추워졌어요, ○○님.\n외출하실 때 따뜻하게 챙겨 입으시고, 감기 조심하시라고 인사드립니다.\n오늘도 포근한 하루 되시길 바랍니다.',
  },
  {
    id: 'season-2',
    category: 'season',
    title: '비 오는 날 안부',
    content:
      '오늘 비가 많이 오네요, ○○님.\n혹시 이동하시다가 불편함은 없으셨는지 걱정되어 문자 드립니다.\n미끄러운 길 조심하시고, 돌아오는 길도 안전히 귀가하시길 바랄게요.',
  },
  // 택배 발송·배송 안내
  {
    id: 'shipping-1',
    category: 'shipping',
    title: '택배 발송 안내',
    content:
      '안녕하세요, ○○님.\n주문하신 상품이 오늘 발송되어 안내 문자 드립니다.\n택배사는 ○○택배, 운송장 번호는 ○○○-○○○○-○○○○ 입니다.\n상품 잘 받아보시고 불편한 점 있으시면 언제든 편하게 말씀 주세요.',
  },
  {
    id: 'shipping-2',
    category: 'shipping',
    title: '배송 완료 확인',
    content:
      '안녕하세요, ○○님.\n오늘 발송된 상품이 잘 도착하셨는지 확인차 연락드립니다.\n사용하시다가 궁금한 점이나 불편한 부분 있으시면 언제든 편하게 연락 주세요.',
  },
  // 파손·지연·반품/교환
  {
    id: 'problem-1',
    category: 'problem',
    title: '파손/불편 발생 시 사과',
    content:
      '○○님, 먼저 불편을 드리게 되어 진심으로 죄송합니다.\n말씀 주신 내용은 바로 확인 후, 최대한 빠르게 처리 도와드리겠습니다.\n조치 진행 상황도 하나씩 공유드릴게요. 다시 한 번 죄송하다는 말씀드립니다.',
  },
  {
    id: 'problem-2',
    category: 'problem',
    title: '배송 지연 안내',
    content:
      '안녕하세요, ○○님.\n택배사 사정으로 배송이 예상보다 조금 지연되고 있어 미리 안내드립니다.\n불편을 드려 정말 죄송하고, 도착 일정이 확정되는 대로 다시 한 번 연락드리겠습니다.',
  },
  // 위로·응원·기타
  {
    id: 'comfort-1',
    category: 'comfort',
    title: '마음 다독이는 위로 문자',
    content:
      '요즘 마음 쓰이는 일들이 많아 많이 지치셨을 것 같아요, ○○님.\n지금처럼 버티고 계신 것만으로도 정말 잘하고 계신 거예요.\n힘드실 때 언제든 편하게 이야기 나눌 수 있는 사람이 되었으면 합니다.',
  },
  {
    id: 'comfort-2',
    category: 'comfort',
    title: '작은 응원 한 마디',
    content:
      '오늘도 바쁜 하루 보내고 계시죠, ○○님.\n가끔은 “나 정말 잘하고 있나?” 싶을 때도 있지만,\n천천히, 꾸준히 걸어가는 지금 이 걸음이 꼭 좋은 곳으로 이어질 거라고 믿어요.\n언제나 응원하고 있습니다.',
  },
];

export default function SmsHelperPage() {
  const [formCategory, setFormCategory] = useState<HelperCategory>('first');
  const [formTitle, setFormTitle] = useState('첫 통화 후 감사 인사 (기본형)');
  const [formContent, setFormContent] = useState(
    '예시 문구를 선택해서 담아두고, 대표님 말투로 수정해 보세요.'
  );

  const [activeCategory, setActiveCategory] = useState<HelperCategory>('first');

  // 내 문자함
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentCategoryLabel =
    CATEGORY_META.find((c) => c.id === formCategory)?.label ?? '';

  // 내 문자함 불러오기
  async function loadMyTemplates() {
    setLoadingMy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMyTemplates([]);
        setLoadingMy(false);
        return;
      }

      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SMS_TEMPLATE_FETCH_ERROR', error);
        setMyTemplates([]);
      } else {
        setMyTemplates((data || []) as MyTemplate[]);
      }
    } finally {
      setLoadingMy(false);
    }
  }

  useEffect(() => {
    loadMyTemplates();
  }, []);

  function fillFromTemplate(tpl: {
    category: HelperCategory;
    title: string;
    content: string;
  }) {
    setFormCategory(tpl.category);
    setFormTitle(tpl.title);
    setFormContent(tpl.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyText(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert('문구가 클립보드에 복사되었습니다.');
      } catch {
        alert('복사 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } else {
      alert('복사를 지원하지 않는 브라우저입니다.');
    }
  }

  async function handleCopyCurrent() {
    await copyText(formContent);
  }

  async function handleSaveMyTemplate() {
    if (!formTitle.trim() || !formContent.trim()) {
      alert('문자 제목과 내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인 후 저장할 수 있습니다.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('sms_templates').insert({
        user_id: user.id,
        category: formCategory,
        title: formTitle,
        content: formContent,
      });

      if (error) {
        console.error('SMS_TEMPLATE_SAVE_ERROR', error);
        alert('저장 중 오류가 발생했습니다.');
      } else {
        alert('내 문자함에 저장되었습니다.');
        await loadMyTemplates(); // 저장 후 새로고침
      }
    } finally {
      setSaving(false);
    }
  }

  const filteredSamples = SAMPLE_TEMPLATES.filter(
    (tpl) => tpl.category === activeCategory
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        color: '#111827',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* 상단 배너 */}
        <section
          style={{
            borderRadius: 24,
            padding: '20px 24px',
            background:
              'linear-gradient(90deg,#ffe4f5 0%,#e0f2fe 40%,#f5f3ff 100%)',
            border: '1px solid rgba(199,210,254,0.8)',
            boxShadow: '0 10px 25px rgba(148,163,184,0.25)',
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              margin: 0,
              color: '#ec4899',
              fontWeight: 600,
            }}
          >
            UPLOG · MESSAGE HELPER
          </p>
          <h1
            style={{
              margin: '8px 0 4px',
              fontSize: 26,
              fontWeight: 800,
              color: '#111827',
            }}
          >
            문자 도우미
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#111827',
            }}
          >
            첫 통화 전 인사 · 상담 후 감사 · 택배 발송/배송 안내 · 파손/반품/지연
            안내 · 위로/응원 문자까지, 자주 쓰는 문구를 카테고리별로 모아서
            대표님 말투로 고쳐 복붙할 수 있도록 도와주는 공간입니다.
          </p>
        </section>

        {/* 문자 만들기 */}
        <section
          style={{
            borderRadius: 24,
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              color: '#111827',
            }}
          >
            문자 만들기
          </h2>
          <p
            style={{
              marginTop: 8,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#374151',
            }}
          >
            아래 예시에서 마음에 드는 문장을{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>
              “입력창으로 담기”
            </span>
            로 불러온 뒤, 대표님 말투로 고쳐서 사용하실 수 있습니다. 자주 쓰는
            문장은{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>
              “내 문자함에 저장”
            </span>
            으로 보관해 두세요.
          </p>

          {/* 카테고리 */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 4,
              }}
            >
              카테고리
            </label>
            <select
              value={formCategory}
              onChange={(e) =>
                setFormCategory(e.target.value as HelperCategory)
              }
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: '8px 10px',
                fontSize: 13,
                color: '#111827',
                backgroundColor: '#ffffff',
              }}
            >
              {CATEGORY_META.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 제목 */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 4,
              }}
            >
              문자 제목(이름)
            </label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="예: 첫 통화 후 감사 인사 (기본형)"
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: '8px 10px',
                fontSize: 13,
                color: '#111827',
              }}
            />
          </div>

          {/* 내용 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 4,
              }}
            >
              문자 내용
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={6}
              placeholder="예시 문구를 선택해서 담아두고, 대표님 말투로 수정해 보세요."
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: '8px 10px',
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={handleCopyCurrent}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: 12,
                color: '#4b5563',
                cursor: 'pointer',
              }}
            >
              이 내용 복사하기
            </button>
            <button
              type="button"
              onClick={handleSaveMyTemplate}
              disabled={saving}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                border: 'none',
                background:
                  'linear-gradient(90deg,#ec4899,#a855f7)',
                fontSize: 12,
                fontWeight: 600,
                color: '#ffffff',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중…' : '내 문자함에 저장'}
            </button>
          </div>

          <p
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#6b7280',
            }}
          >
            현재 카테고리:{' '}
            <span style={{ fontWeight: 600 }}>{currentCategoryLabel}</span>
          </p>
        </section>

        {/* 문자 보기 (상황별 예시) */}
        <section
          style={{
            borderRadius: 24,
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              color: '#111827',
            }}
          >
            문자 보기 (상황별 예시)
          </h2>
          <p
            style={{
              marginTop: 8,
              marginBottom: 12,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#374151',
            }}
          >
            위에 있는 버튼에서{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>
              상황별 카테고리
            </span>
            를 고르고, 밑의 카드들에서 예시 문장을 살펴볼 수 있습니다. 카드의{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>“복사”</span>는
            바로 사용,{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>
              “입력창으로 담기”
            </span>
            는 위로 올려서 수정용으로 쓰는 버튼입니다.
          </p>

          {/* 카테고리 버튼들 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {CATEGORY_META.map((c) => {
              const active = c.id === activeCategory;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    border: active
                      ? 'none'
                      : '1px solid #e5e7eb',
                    background: active
                      ? 'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)'
                      : '#ffffff',
                    color: active ? '#ffffff' : '#374151',
                    boxShadow: active
                      ? '0 0 12px rgba(244,114,182,0.55)'
                      : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* 예시 카드 리스트 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredSamples.map((tpl) => (
              <article
                key={tpl.id}
                style={{
                  borderRadius: 18,
                  padding: '14px 16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 6px 14px rgba(148,163,184,0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      margin: 0,
                      color: '#111827',
                    }}
                  >
                    {tpl.title}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                    }}
                  >
                    예시 문자
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: '#111827',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {tpl.content}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => copyText(tpl.content)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      fontSize: 11,
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    복사
                  </button>
                  <button
                    type="button"
                    onClick={() => fillFromTemplate(tpl)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: '#fce7f3',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#be185d',
                      cursor: 'pointer',
                    }}
                  >
                    입력창으로 담기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 내 문자함 */}
        <section
          style={{
            borderRadius: 24,
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
              color: '#111827',
            }}
          >
            내 문자함
          </h2>
          <p
            style={{
              marginTop: 8,
              marginBottom: 12,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#374151',
            }}
          >
            위에서{' '}
            <span style={{ fontWeight: 600, color: '#db2777' }}>
              “내 문자함에 저장”
            </span>
            한 문장들이 여기 모입니다. 카드에서 바로{' '}
            <span style={{ fontWeight: 600 }}>복사</span>하거나,{' '}
            <span style={{ fontWeight: 600 }}>입력창으로 불러오기</span>를 눌러
            조금씩 수정해서 다시 저장할 수 있습니다.
          </p>

          {loadingMy ? (
            <div
              style={{
                padding: '24px 0',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              내 문자함을 불러오는 중입니다…
            </div>
          ) : myTemplates.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              아직 저장된 문자가 없습니다. 위의 문자 만들기에서 문구를 만든 뒤
              “내 문자함에 저장”을 눌러 보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTemplates.map((tpl) => {
                const catLabel =
                  CATEGORY_META.find((c) => c.id === tpl.category)?.label ?? '';
                return (
                  <article
                    key={tpl.id}
                    style={{
                      borderRadius: 18,
                      padding: '12px 14px',
                      background:
                        'linear-gradient(135deg,#fdf2ff,#eff6ff)',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 6px 14px rgba(148,163,184,0.3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 999,
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                          }}
                        >
                          {catLabel}
                        </span>
                        <h3
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            margin: 0,
                            color: '#111827',
                          }}
                        >
                          {tpl.title}
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9ca3af',
                        }}
                      >
                        {new Date(tpl.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: '#111827',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {tpl.content}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => copyText(tpl.content)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          fontSize: 11,
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        onClick={() => fillFromTemplate(tpl)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: 'none',
                          backgroundColor: '#fef2ff',
                          fontSize: 11,
                          fontWeight: 500,
                          color: '#a21caf',
                          cursor: 'pointer',
                        }}
                      >
                        입력창으로 불러오기
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
