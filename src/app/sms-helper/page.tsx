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

// ================================
//  예시 문자들 (카테고리별 풍부하게)
// ================================
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
  {
    id: 'first-3',
    category: 'first',
    title: '상담 예약 전, 미리 인사 남기기',
    content:
      '안녕하세요, ○○님.\n내일 예정된 상담과 관련하여 먼저 인사드리고자 문자 남깁니다.\n내일 ○시경에 짧게 연락드릴 예정인데, 혹시 시간 변경이 필요하시면 편하실 때 말씀만 남겨 주세요.',
  },
  {
    id: 'first-4',
    category: 'first',
    title: '통화 후, 다시 한 번 감사 + 재안내 예고',
    content:
      '조금 전 통화 시간 내어 주셔서 감사합니다, ○○님.\n말씀해 주신 내용들 기준으로 정리해서\n도움 되실 수 있는 방향으로 다시 한 번 안내 문자를 드리겠습니다.',
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
  {
    id: 'thanks-3',
    category: 'thanks',
    title: '지인 소개에 대한 감사',
    content:
      '안녕하세요, ○○님.\n소중한 지인분을 소개해 주셔서 진심으로 감사드립니다.\n○○님께서 믿고 맡겨 주신 만큼, 소개해 주신 분께도 최선을 다해 안내드리겠습니다.',
  },
  {
    id: 'thanks-4',
    category: 'thanks',
    title: '재구매/재계약 고객 감사 문자',
    content:
      '다시 한 번 저희를 선택해 주셔서 진심으로 감사합니다, ○○님.\n처음 인연 맺었을 때보다 더 든든하게 느껴지실 수 있도록,\n앞으로의 관리와 소통도 꼼꼼히 챙기겠습니다.',
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
  {
    id: 'health-3',
    category: 'health',
    title: '바쁜 직장인을 위한 건강 걱정 문자',
    content:
      '요즘 많이 바쁘신 걸로 알고 있어, 건강이 제일 먼저 걱정되었습니다, ○○님.\n식사 제때 챙겨 드시고, 잠은 조금이라도 깊게 주무셨으면 좋겠습니다.\n너무 무리하지 않으셨으면 하는 마음에 조심스레 문자 남겨요.',
  },
  {
    id: 'health-4',
    category: 'health',
    title: '가족 건강까지 함께 챙기는 안부',
    content:
      '안녕하세요, ○○님.\n○○님은 물론, 가족분들 모두 건강히 잘 지내고 계신지요.\n요즘 날씨가 오락가락해서 감기 걸리기 쉬운 때라 걱정되어 문자 드렸습니다.\n항상 건강 가장 먼저 챙기시길 바랄게요.',
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
  {
    id: 'season-3',
    category: 'season',
    title: '명절 인사',
    content:
      '○○님, 어느새 ○○ 명절이 찾아왔습니다.\n가족분들과 편안하고 따뜻한 시간 보내시길 바라며,\n오는 한 해도 건강과 행복이 가득하시길 진심으로 기원합니다.',
  },
  {
    id: 'season-4',
    category: 'season',
    title: '연말·새해 인사',
    content:
      '한 해 동안 함께해 주셔서 진심으로 감사드립니다, ○○님.\n다가오는 새해에는 더 건강하시고, 바라시는 일들 한 걸음씩 이뤄 가시는 한 해가 되시길 기원합니다.\n새해에도 잘 부탁드립니다.',
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
  {
    id: 'shipping-3',
    category: 'shipping',
    title: '체험/샘플 발송 안내',
    content:
      '안녕하세요, ○○님.\n요청 주신 체험용 상품이 오늘 발송되어 안내드립니다.\n실제 사용해 보시고 좋았던 점, 궁금하셨던 점 있으시면 편하게 말씀 남겨 주세요.\n피드백 주시면 안내에 더 많이 반영하겠습니다.',
  },
  {
    id: 'shipping-4',
    category: 'shipping',
    title: '재발송 안내 (주소/오배송 후)',
    content:
      '안녕하세요, ○○님.\n말씀 주신 내용 확인 후, 상품을 다시 발송해 드리기로 하여 안내드립니다.\n이번에는 불편 없으시도록 출고부터 배송까지 한 번 더 꼼꼼히 확인하겠습니다.',
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
  {
    id: 'problem-3',
    category: 'problem',
    title: '반품/교환 절차 안내',
    content:
      '○○님, 불편을 겪게 해 드려 진심으로 죄송합니다.\n말씀 주신 상품은 반품/교환 접수 도와드릴 수 있습니다.\n간단히 진행 절차와 택배 수거 방법 안내드리겠습니다. 순서대로 차근차근 도와드릴게요.',
  },
  {
    id: 'problem-4',
    category: 'problem',
    title: '사은품 누락/오배송 사과',
    content:
      '○○님, 보내드려야 할 사은품이 누락된 점에 대해 진심으로 사과드립니다.\n확인 즉시 누락된 사은품은 따로 발송해 드리도록 하겠습니다.\n불편을 드려 정말 죄송하고, 앞으로 동일한 일이 반복되지 않도록 내부적으로도 잘 점검하겠습니다.',
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
  {
    id: 'comfort-3',
    category: 'comfort',
    title: '가족 일로 마음 쓰이는 고객 위로',
    content:
      '최근에 가족 일로 마음 고생이 크셨을 것 같아, 조심스레 문자 남깁니다, ○○님.\n말씀해 주신 것만으로도 얼마나 큰 일인지 짐작이 됩니다.\n조금이라도 마음 내려놓으실 시간이 생기시길 진심으로 바라고 있습니다.',
  },
  {
    id: 'comfort-4',
    category: 'comfort',
    title: '병원/검사 앞둔 고객 응원',
    content:
      '곧 검사를 앞두고 계셔서 긴장도 되실 것 같습니다, ○○님.\n기다리는 시간이 더 길게 느껴지실 수 있지만,\n좋은 결과 있으시길 진심으로 기도하는 마음으로 응원하고 있겠습니다.',
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

  // 내 문자함 삭제
  async function handleDeleteTemplate(id: string) {
    const ok = window.confirm('이 문구를 내 문자함에서 삭제하시겠습니까?');
    if (!ok) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인 후 삭제할 수 있습니다.');
        return;
      }

      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('SMS_TEMPLATE_DELETE_ERROR', error);
        alert('삭제 중 오류가 발생했습니다.');
      } else {
        // 화면에서도 바로 제거
        setMyTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error(e);
      alert('삭제 중 알 수 없는 오류가 발생했습니다.');
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
          gap: 28,
        }}
      >
        {/* 상단 배너 */}
        <section
          style={{
            borderRadius: 24,
            padding: '24px 28px',
            background:
              'linear-gradient(90deg,#ffe4f5 0%,#e0f2fe 40%,#f5f3ff 100%)',
            border: '1px solid rgba(199,210,254,0.9)',
            boxShadow: '0 12px 28px rgba(148,163,184,0.28)',
          }}
        >
          <p
            style={{
              fontSize: 13,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              margin: 0,
              color: '#ec4899',
              fontWeight: 700,
            }}
          >
            UPLOG · MESSAGE HELPER
          </p>
          <h1
            style={{
              margin: '12px 0 6px',
              fontSize: 30,
              fontWeight: 800,
              color: '#111827',
            }}
          >
            문자 도우미
          </h1>

          {/* 헤더 밑 가이드 배너 */}
          <div
            style={{
              margin: '10px 0 14px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.85)',
                boxShadow: '0 6px 16px rgba(148,163,184,0.35)',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background:
                    'linear-gradient(90deg,#ec4899,#a855f7)',
                  color: '#ffffff',
                }}
              >
                가이드
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4b5563',
                }}
              >
                상황별 예시 → 입력창으로 담기 → 대표님 말투로 수정 →
                내 문자함에 저장 순서로 쓰시면 됩니다.
              </span>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.8,
              color: '#111827',
            }}
          >
            첫 통화 전 인사 · 상담 후 감사 · 택배 발송/배송 안내 · 파손/반품/지연
            안내 · 위로/응원 문자까지,&nbsp;
            <span style={{ fontWeight: 700, color: '#db2777' }}>
              자주 쓰는 문구를 카테고리별로 모아서
            </span>
            &nbsp;대표님 말투로 고쳐 복붙할 수 있도록 도와주는 공간입니다.
          </p>
        </section>

        {/* 문자 가이드 / 만들기 */}
        <section
          style={{
            borderRadius: 24,
            padding: '24px 26px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color: '#111827',
            }}
          >
            문자 가이드
          </h2>
          <p
            style={{
              marginTop: 10,
              marginBottom: 20,
              fontSize: 15,
              lineHeight: 1.8,
              color: '#374151',
            }}
          >
            ① 아래{' '}
            <span
              style={{
                fontWeight: 700,
                color: '#db2777',
              }}
            >
              상황별 예시
            </span>
            에서 마음에 드는 문장을{' '}
            <span
              style={{
                fontWeight: 700,
                color: '#db2777',
              }}
            >
              “입력창으로 담기”
            </span>
            로 불러오고,&nbsp;
            <span style={{ fontWeight: 700 }}>대표님 말투</span>로 수정한 뒤<br />
            ② 자주 쓰는 문장은{' '}
            <span
              style={{
                fontWeight: 700,
                color: '#db2777',
              }}
            >
              “내 문자함에 저장”
            </span>
            으로 모아두시면 됩니다.
          </p>

          {/* 카테고리 */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 700,
                color: '#374151',
                marginBottom: 6,
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
                borderRadius: 10,
                border: '1px solid #d1d5db',
                padding: '11px 13px',
                fontSize: 15,
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
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 700,
                color: '#374151',
                marginBottom: 6,
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
                borderRadius: 10,
                border: '1px solid #d1d5db',
                padding: '11px 13px',
                fontSize: 15,
                color: '#111827',
              }}
            />
          </div>

          {/* 내용 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 700,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              문자 내용
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={7}
              placeholder="예시 문구를 선택해서 담아두고, 대표님 말투로 수정해 보세요."
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                padding: '11px 13px',
                fontSize: 15,
                color: '#111827',
                lineHeight: 1.8,
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              onClick={handleCopyCurrent}
              style={{
                padding: '9px 15px',
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
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
                padding: '9px 20px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(90deg,#ec4899,#a855f7)',
                fontSize: 14,
                fontWeight: 700,
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
              marginTop: 10,
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            현재 카테고리:{' '}
            <span style={{ fontWeight: 700, color: '#4f46e5' }}>
              {currentCategoryLabel}
            </span>
          </p>
        </section>

        {/* 문자 보기 (상황별 예시) */}
        <section
          style={{
            borderRadius: 24,
            padding: '24px 26px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color: '#111827',
            }}
          >
            문자 보기{' '}
            <span style={{ fontSize: 16, color: '#9ca3af' }}>(상황별 예시)</span>
          </h2>
          <p
            style={{
              marginTop: 10,
              marginBottom: 16,
              fontSize: 15,
              lineHeight: 1.8,
              color: '#374151',
            }}
          >
            위에 있는 버튼에서{' '}
            <span style={{ fontWeight: 700, color: '#db2777' }}>
              상황별 카테고리
            </span>
            를 고르고, 밑의 카드들에서 예시 문장을 살펴볼 수 있습니다. 카드의{' '}
            <span style={{ fontWeight: 700, color: '#db2777' }}>“복사”</span>는
            바로 사용,{' '}
            <span style={{ fontWeight: 700, color: '#db2777' }}>
              “입력창으로 담기”
            </span>
            는 위 가이드 영역으로 올려서 수정용으로 쓰는 버튼입니다.
          </p>

          {/* 카테고리 버튼들 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20,
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
                    padding: '8px 15px',
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    border: active ? 'none' : '1px solid #e5e7eb',
                    background: active
                      ? 'linear-gradient(90deg,#fb7185,#e879f9,#a855f7)'
                      : '#ffffff',
                    color: active ? '#ffffff' : '#374151',
                    boxShadow: active
                      ? '0 0 14px rgba(244,114,182,0.65)'
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredSamples.map((tpl) => (
              <article
                key={tpl.id}
                style={{
                  borderRadius: 18,
                  padding: '16px 19px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 7px 16px rgba(148,163,184,0.32)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      margin: 0,
                      color: '#111827',
                    }}
                  >
                    {tpl.title}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      fontWeight: 500,
                    }}
                  >
                    예시 문자
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.9,
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
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => copyText(tpl.content)}
                    style={{
                      padding: '7px 13px',
                      borderRadius: 999,
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      fontSize: 13,
                      fontWeight: 500,
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
                      padding: '7px 13px',
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: '#fce7f3',
                      fontSize: 13,
                      fontWeight: 600,
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
            padding: '24px 26px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color: '#111827',
            }}
          >
            내 문자함
          </h2>
          <p
            style={{
              marginTop: 10,
              marginBottom: 16,
              fontSize: 15,
              lineHeight: 1.8,
              color: '#374151',
            }}
          >
            위에서{' '}
            <span style={{ fontWeight: 700, color: '#db2777' }}>
              “내 문자함에 저장”
            </span>
            한 문장들이 여기 모입니다. 카드에서 바로{' '}
            <span style={{ fontWeight: 700 }}>복사</span>하거나,{' '}
            <span style={{ fontWeight: 700 }}>입력창으로 불러오기</span>를 눌러
            조금씩 수정해서 다시 저장할 수 있습니다.
          </p>

          {loadingMy ? (
            <div
              style={{
                padding: '26px 0',
                fontSize: 15,
                color: '#6b7280',
              }}
            >
              내 문자함을 불러오는 중입니다…
            </div>
          ) : myTemplates.length === 0 ? (
            <div
              style={{
                padding: '26px 0',
                fontSize: 15,
                color: '#6b7280',
              }}
            >
              아직 저장된 문자가 없습니다. 위의 문자 가이드에서 문구를 만든 뒤{' '}
              <span style={{ fontWeight: 700 }}>“내 문자함에 저장”</span>을 눌러
              보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {myTemplates.map((tpl) => {
                const catLabel =
                  CATEGORY_META.find((c) => c.id === tpl.category)?.label ?? '';
                return (
                  <article
                    key={tpl.id}
                    style={{
                      borderRadius: 18,
                      padding: '15px 17px',
                      background: 'linear-gradient(135deg,#fdf2ff,#eff6ff)',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 7px 16px rgba(148,163,184,0.32)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
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
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                            fontWeight: 600,
                          }}
                        >
                          {catLabel}
                        </span>
                        <h3
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            margin: 0,
                            color: '#111827',
                          }}
                        >
                          {tpl.title}
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#9ca3af',
                        }}
                      >
                        {new Date(tpl.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.9,
                        color: '#111827',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {tpl.content}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 12,
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        style={{
                          padding: '6px 11px',
                          borderRadius: 999,
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#b91c1c',
                          cursor: 'pointer',
                        }}
                      >
                        삭제
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => copyText(tpl.content)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            fontSize: 13,
                            fontWeight: 500,
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
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: 'none',
                            backgroundColor: '#fef2ff',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#a21caf',
                            cursor: 'pointer',
                          }}
                        >
                          입력창으로 불러오기
                        </button>
                      </div>
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
