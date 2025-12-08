// src/app/templates/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type MyTemplate = {
  id: string;
  category: HelperCategory;
  title: string;
  content: string;
  created_at: string;
};

export default function SmsTemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<MyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // 내 문자함 불러오기
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setTemplates([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('SMS_TEMPLATES_FETCH_ERROR', error);
          setTemplates([]);
        } else {
          setTemplates((data || []) as MyTemplate[]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  async function copyText(text: string) {
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert('문구가 복사되었습니다.');
      } catch {
        alert('복사 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } else {
      alert('복사를 지원하지 않는 브라우저입니다.');
    }
  }

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
            UPLOG · MESSAGE BOX
          </p>
          <h1
            style={{
              margin: '8px 0 4px',
              fontSize: 26,
              fontWeight: 800,
              color: '#111827',
            }}
          >
            내 문자함
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#111827',
            }}
          >
            문자 도우미에서 저장한 템플릿들이 모여 있는 공간입니다.
            자주 쓰는 문장을 한 번에 확인하고, 복사해서 바로 사용해 보세요.
          </p>

          <button
            type="button"
            onClick={() => router.push('/sms-helper')}
            style={{
              marginTop: 12,
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              background:
                'linear-gradient(90deg,#ec4899,#a855f7)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            문자 도우미로 이동
          </button>
        </section>

        {/* 내 문자 리스트 */}
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
            내가 저장한 문자 템플릿
          </h2>
          <p
            style={{
              marginTop: 8,
              marginBottom: 16,
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.6,
            }}
          >
            카드에서 <span style={{ fontWeight: 600 }}>복사</span> 버튼을 누르면
            바로 문자 앱에 붙여 넣어 사용할 수 있습니다.
          </p>

          {loading ? (
            <div
              style={{
                padding: '24px 0',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              내 문자함을 불러오는 중입니다…
            </div>
          ) : templates.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              아직 저장된 문자가 없습니다.
              <br />
              <span style={{ fontWeight: 600 }}>문자 도우미</span>에서 예시를
              고쳐서 ‘내 문자함에 저장’을 눌러 보세요.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {templates.map((tpl) => {
                const catLabel =
                  CATEGORY_META.find((c) => c.id === tpl.category)?.label ??
                  '';
                return (
                  <article
                    key={tpl.id}
                    style={{
                      borderRadius: 16,
                      padding: '12px 14px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 6px 14px rgba(148,163,184,0.18)',
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
                        marginTop: 4,
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
