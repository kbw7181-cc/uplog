// src/app/customers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import UpzzuHeaderCoach from '../components/UpzzuHeaderCoach';

// ===== 타입 =====
type CustomerRow = {
  id?: string;
  user_id: string;
  name: string;
  phone: string;
  birth?: string | null;
  address?: string | null;
  job?: string | null;
  married?: string | null;
  has_children?: string | null;
  feature1?: string | null;
  feature2?: string | null;
  feature3?: string | null;
  type?: string | null;
  memo?: string | null;
  gift_memo?: string | null;
  next_contact_date?: string | null;
  next_contact_time?: string | null;
  next_contact_note?: string | null;
  objection_memo?: string | null;
  created_at?: string | null;
};

type CustomerFormState = {
  name: string;
  phone: string;
  birth: string;
  address: string;
  job: string;
  married: string;
  has_children: string;
  feature1: string;
  feature2: string;
  feature3: string;
  type: string;
  memo: string;
  gift_memo: string;
  next_contact_date: string;
  next_contact_time: string;
  next_contact_note: string;
  objection_memo: string;
};

const EMPTY_FORM: CustomerFormState = {
  name: '',
  phone: '',
  birth: '',
  address: '',
  job: '',
  married: '미상',
  has_children: '미상',
  feature1: '',
  feature2: '',
  feature3: '',
  type: '신규',
  memo: '',
  gift_memo: '',
  next_contact_date: '',
  next_contact_time: '',
  next_contact_note: '',
  objection_memo: '',
};

const CUSTOMER_TYPES: string[] = [
  '신규',
  '가망1',
  '가망2',
  '가망3',
  '계약1',
  '계약2',
  '계약3',
  '소개1',
  '소개2',
  '사은품',
  '기타',
];

const GUIDE_TIPS: string[] = [
  '신규 고객에서 가망, 그리고 계약 1·2·3 단계로 나누면, 어느 단계에 몇 명이 있는지 한눈에 보입니다.',
  '고객 유형(신규/가망/계약1·2·3)을 카테고리로 나눠두면, “가망 고객만 보기”처럼 골라서 관리하기가 훨씬 쉬워져요.',
  '다음 연락 날짜·시간을 미리 적어 두면, 놓치지 않고 제때 연락할 수 있습니다.',
  '선물·사은품 기록을 남겨 두면, 다시 연락할 때 어떤 정성을 보냈는지 바로 기억나요.',
];

const getTypeClass = (t?: string | null) => {
  switch (t) {
    case '신규':
      return 'badge-type-new';
    case '가망1':
    case '가망2':
    case '가망3':
      return 'badge-type-prospect';
    case '계약1':
    case '계약2':
    case '계약3':
      return 'badge-type-contract';
    case '소개1':
    case '소개2':
      return 'badge-type-ref';
    case '사은품':
      return 'badge-type-gift';
    default:
      return 'badge-type-etc';
  }
};

function formatDateOnly(dateStr?: string | null) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}
function safeTimeOnly(timeStr?: string | null) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export default function CustomersPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('전체');

  const [guideIndex, setGuideIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      await loadCustomers(user.id);
      if (alive) setBootLoading(false);
    };

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  const loadCustomers = async (uid: string) => {
    setListLoading(true);

    const first = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (first.error) {
      console.error('customers load error (1st)', first.error);

      const second = await supabase.from('customers').select('*').eq('user_id', uid);

      setListLoading(false);

      if (second.error) {
        console.error('customers load error (2nd)', second.error);
        alert(
          '고객 목록을 불러오는 중 오류가 발생했어요.\n\nSupabase customers 테이블 컬럼/정렬을 확인해 주세요.'
        );
        return;
      }

      const list = ((second.data as CustomerRow[]) ?? []).slice();
      list.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setCustomers(list);
      return;
    }

    setListLoading(false);
    setCustomers(((first.data as CustomerRow[]) ?? []) as CustomerRow[]);
  };

  const handleChange = (field: keyof CustomerFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!form.name.trim() || !form.phone.trim()) {
      alert('이름과 연락처는 필수입니다.');
      return;
    }

    setSaving(true);

    const payload: CustomerRow = {
      user_id: userId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      birth: form.birth || null,
      address: form.address || null,
      job: form.job || null,
      married: form.married || null,
      has_children: form.has_children || null,
      feature1: form.feature1 || null,
      feature2: form.feature2 || null,
      feature3: form.feature3 || null,
      type: form.type || null,
      memo: form.memo || null,
      gift_memo: form.gift_memo || null,
      next_contact_date: form.next_contact_date || null,
      next_contact_time: form.next_contact_time || null,
      next_contact_note: form.next_contact_note || null,
      objection_memo: form.objection_memo || null,
    };

    const { error } = await supabase.from('customers').insert(payload);

    setSaving(false);

    if (error) {
      console.error('customers insert error', error);
      alert(
        '고객 저장 중 오류가 발생했어요.\n\n(1) customers 테이블 컬럼 존재\n(2) RLS 정책 insert 허용\n(3) user_id 타입(UUID) 일치\n확인해 주세요.'
      );
      return;
    }

    setForm(EMPTY_FORM);
    await loadCustomers(userId);
    alert('고객 정보가 저장되었습니다.');
  };

  const handleDelete = async (id?: string) => {
    if (!userId || !id) return;

    const ok = confirm('이 고객을 삭제할까요? (되돌릴 수 없습니다)');
    if (!ok) return;

    const { error } = await supabase.from('customers').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      console.error('customers delete error', error);
      alert('삭제 중 오류가 발생했어요. (RLS / 권한 / id 확인)');
      return;
    }
    await loadCustomers(userId);
  };

  const totalCount = customers.length;
  const recentCustomer = customers[0] ?? null;

  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (typeFilter !== '전체') {
      list = list.filter((c) => (c.type ?? '') === typeFilter);
    }

    if (!search.trim()) return list;

    const q = search.toLowerCase();

    return list.filter((c) => {
      const target = [
        c.name,
        c.phone,
        c.address,
        c.memo,
        c.type,
        c.feature1,
        c.feature2,
        c.feature3,
        c.next_contact_note,
        c.gift_memo,
        c.objection_memo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return target.includes(q);
    });
  }, [customers, search, typeFilter]);

  const handlePrevTip = () => setGuideIndex((prev) => (prev - 1 + GUIDE_TIPS.length) % GUIDE_TIPS.length);
  const handleNextTip = () => setGuideIndex((prev) => (prev + 1) % GUIDE_TIPS.length);

  const toggleExpand = (id?: string) => {
    if (!id) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (bootLoading) {
    return (
      <div className="cust-root">
        <div className="cust-inner">
          <div className="cust-loading">고객 관리 화면을 불러오는 중입니다…</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="cust-root">
      <div className="cust-inner">
        {/* ===== 헤더 ===== */}
        <header className="cust-hero">
          <div className="cust-hero-top">
            <div className="cust-hero-tag">UPLOG · CUSTOMER</div>
            <h1 className="cust-hero-title">고객 관리</h1>
          </div>

          {/* ✅ 말풍선 꼬리 제거: wrapper에 no-tail 클래스 */}
          <div className="cust-coach-line cust-coach-noTail">
  <UpzzuHeaderCoach
    mascotSrc="/assets/upzzu9.png"
    text={GUIDE_TIPS[guideIndex]}
    tag="오늘의 U P 고객 가이드"
    sizePx={150}
  />
</div>


         
        </header>

        {/* ===== 요약 카드 ===== */}
        <section className="cust-summary-card">
          <div className="cust-summary-left">
            <div className="cust-summary-title">나의 총 고객</div>
            <div className="cust-summary-count">{totalCount}명</div>
            <p className="cust-summary-sub">
              최근 등록 고객 ·{' '}
              {recentCustomer ? `${recentCustomer.name} · ${recentCustomer.type ?? '유형 미정'}` : '아직 등록된 고객이 없습니다.'}
            </p>
            <p className="cust-summary-caption">신규 고객이 생길 때마다 아래 폼에서 바로 추가해 보세요.</p>
          </div>
        </section>

        {/* ===== 고객 등록 ===== */}
        <section className="cust-section">
          <h2 className="cust-section-title">고객 등록</h2>
          <p className="cust-section-caption">필수 정보(이름, 연락처)를 먼저 입력하고, 나머지는 필요할 때 천천히 채워 넣어도 괜찮아요.</p>

          <form className="cust-form-card" onSubmit={handleSubmit}>
            <div className="cust-form-block">
              <h3 className="cust-block-title">기본 정보</h3>

              <div className="cust-grid-2">
                <div className="cust-field">
                  <label className="cust-label">
                    이름 <span className="cust-required">*</span>
                  </label>
                  <input
                    className="cust-input"
                    placeholder="예) 김고객"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="cust-field">
                  <label className="cust-label">
                    연락처 <span className="cust-required">*</span>
                  </label>
                  <input
                    className="cust-input"
                    placeholder="예) 010-0000-0000"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">생년월일</label>
                  <input type="date" className="cust-input" value={form.birth} onChange={(e) => handleChange('birth', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">주소</label>
                  <input
                    className="cust-input"
                    placeholder="간단하게만 적어도 괜찮아요."
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">직업 / 업종</label>
                  <input
                    className="cust-input"
                    placeholder="예) 자영업, 공무원, 회사원 등"
                    value={form.job}
                    onChange={(e) => handleChange('job', e.target.value)}
                  />
                </div>
              </div>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">결혼 유무</label>
                  <select className="cust-select" value={form.married} onChange={(e) => handleChange('married', e.target.value)}>
                    <option value="미상">모름 / 아직 확인 전</option>
                    <option value="미혼">미혼</option>
                    <option value="기혼">기혼</option>
                  </select>
                </div>

                <div className="cust-field">
                  <label className="cust-label">자녀 유무</label>
                  <select className="cust-select" value={form.has_children} onChange={(e) => handleChange('has_children', e.target.value)}>
                    <option value="미상">모름 / 아직 확인 전</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>

                <div className="cust-field">
                  <label className="cust-label">고객 유형</label>
                  <select className="cust-select" value={form.type} onChange={(e) => handleChange('type', e.target.value)}>
                    {CUSTOMER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="cust-form-block">
              <h3 className="cust-block-title">고객 특징 · 메모</h3>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">특징 1</label>
                  <input className="cust-input" placeholder="예) 아침 통화 선호, 말 빠른 편" value={form.feature1} onChange={(e) => handleChange('feature1', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">특징 2</label>
                  <input className="cust-input" placeholder="예) 가족 건강 걱정 많음" value={form.feature2} onChange={(e) => handleChange('feature2', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">특징 3</label>
                  <input className="cust-input" placeholder="예) 특정 요일/시간 피하기" value={form.feature3} onChange={(e) => handleChange('feature3', e.target.value)} />
                </div>
              </div>

              <div className="cust-grid-2">
                <div className="cust-field">
                  <label className="cust-label">관심 상품 / 메모</label>
                  <textarea className="cust-textarea" rows={3} placeholder="관심 상품, 가족 정보, 주의할 점 등을 자유롭게 적어 주세요." value={form.memo} onChange={(e) => handleChange('memo', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">선물 / 사은품 메모</label>
                  <textarea className="cust-textarea" rows={3} placeholder="기프티콘, 사은품, 선물 발송 내역 등을 기록해 두면 좋아요." value={form.gift_memo} onChange={(e) => handleChange('gift_memo', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="cust-form-block">
              <h3 className="cust-block-title">다음 연락 일정 · 반론 메모</h3>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">다음 연락 날짜</label>
                  <input type="date" className="cust-input" value={form.next_contact_date} onChange={(e) => handleChange('next_contact_date', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">다음 연락 시간</label>
                  <input type="time" className="cust-input" value={form.next_contact_time} onChange={(e) => handleChange('next_contact_time', e.target.value)} />
                </div>
                <div className="cust-field">
                  <label className="cust-label">다음 연락 내용</label>
                  <input className="cust-input" placeholder="예) 상품 설명 마무리, 서류 안내 등" value={form.next_contact_note} onChange={(e) => handleChange('next_contact_note', e.target.value)} />
                </div>
              </div>

              <div className="cust-field">
                <label className="cust-label">반론 / 특이사항 메모</label>
                <textarea className="cust-textarea" rows={3} placeholder="반론 내용이나 특이사항을 정리해 두면, 나중에 반론 아카이브와 연결하기 좋습니다." value={form.objection_memo} onChange={(e) => handleChange('objection_memo', e.target.value)} />
              </div>
            </div>

            <div className="cust-submit-row">
              <button type="submit" className="cust-submit-btn" disabled={saving}>
                {saving ? '저장 중…' : '고객 정보 저장하기'}
              </button>
            </div>
          </form>
        </section>

        {/* ===== 목록 ===== */}
        <section className="cust-section">
          <div className="cust-section-header-row">
            <div>
              <h2 className="cust-section-title">등록된 고객 목록</h2>
              <p className="cust-section-caption">입력일, 생년월일, 주소, 고객 유형, 특징까지 한 번에 확인할 수 있어요.</p>
            </div>

            <div className="cust-search-row">
              <div className="cust-search-controls">
                <select className="cust-search-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="전체">전체 유형</option>
                  {CUSTOMER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <div className="cust-search-input-wrap">
                  <input className="cust-search-input" placeholder="이름·연락처·메모 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <button type="button" className="cust-search-btn" onClick={() => setSearch((prev) => prev.trim())}>
                    검색
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="cust-list-card">
            {listLoading && <p className="cust-list-empty">목록을 불러오는 중입니다…</p>}

            {!listLoading && filteredCustomers.length === 0 && (
              <p className="cust-list-empty">
                검색 결과가 없어요.
                <br />
                검색어나 고객 유형을 바꿔서 다시 시도해 주세요.
              </p>
            )}

            {!listLoading && filteredCustomers.length > 0 && (
              <ul className="cust-list">
                {filteredCustomers.map((c) => {
                  const isExpanded = expandedId === c.id;

                  return (
                    <li key={c.id} className="cust-item">
                      <div className="cust-item-main">
                        <div className="cust-item-left">
                          <button type="button" className="cust-item-name-row" onClick={() => toggleExpand(c.id)}>
                            <span className="cust-item-name">{c.name}</span>
                            <span className={`cust-type-badge ${getTypeClass(c.type)}`}>{c.type ?? '미분류'}</span>
                            <span className="cust-expand-label">{isExpanded ? '접기' : '상세'}</span>
                          </button>
                          <div className="cust-item-phone">{c.phone}</div>
                        </div>

                        <div className="cust-item-right">
                          <div className="cust-item-date">입력일 {c.created_at ? formatDateOnly(c.created_at) : '기록 없음'}</div>
                          <button type="button" className="cust-del-btn" onClick={() => handleDelete(c.id)}>
                            삭제
                          </button>
                        </div>
                      </div>

                      <div className="cust-item-tags">
                        {c.birth && <span className="cust-tag">생년월일 · {formatDateOnly(c.birth)}</span>}
                        {c.address && <span className="cust-tag">주소 · {c.address}</span>}
                        {c.job && <span className="cust-tag">직업 · {c.job}</span>}
                        {c.married && <span className="cust-tag">결혼 · {c.married}</span>}
                        {c.has_children && <span className="cust-tag">자녀 · {c.has_children}</span>}
                        {c.feature1 && <span className="cust-tag">특징1 · {c.feature1}</span>}
                        {c.feature2 && <span className="cust-tag">특징2 · {c.feature2}</span>}
                        {c.feature3 && <span className="cust-tag">특징3 · {c.feature3}</span>}
                      </div>

                      {(c.next_contact_date || c.next_contact_time || c.next_contact_note) && (
                        <div className="cust-next-row">
                          <span className="cust-next-label">다음 연락</span>
                          <span className="cust-next-text">
                            {c.next_contact_date ? formatDateOnly(c.next_contact_date) : ''}
                            {c.next_contact_time ? ` ${safeTimeOnly(c.next_contact_time)}` : ''}
                            {c.next_contact_note ? ` · ${c.next_contact_note}` : ''}
                          </span>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="cust-item-detail">
                          {c.memo && (
                            <div className="cust-detail-row">
                              <span className="cust-detail-label">관심 상품·메모</span>
                              <span className="cust-detail-text">{c.memo}</span>
                            </div>
                          )}
                          {c.gift_memo && (
                            <div className="cust-detail-row">
                              <span className="cust-detail-label">선물·사은품</span>
                              <span className="cust-detail-text">{c.gift_memo}</span>
                            </div>
                          )}
                          {c.objection_memo && (
                            <div className="cust-detail-row">
                              <span className="cust-detail-label">반론 / 특이사항</span>
                              <span className="cust-detail-text">{c.objection_memo}</span>
                            </div>
                          )}

                          {!c.memo && !c.gift_memo && !c.objection_memo && (
                            <div className="cust-detail-row">
                              <span className="cust-detail-text">아직 상세 메모가 없어요. 위의 고객 등록 폼에서 메모를 추가해 보세요.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.cust-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}
.cust-inner { max-width: 1160px; margin: 0 auto 80px; }
.cust-loading { margin-top: 120px; text-align:center; font-size:18px; font-weight:800; color:#372153; }

/* ✅✅✅ 고객관리에서만: 말풍선 꼬리(화살표) 완전 제거 */
.cust-coach-noTail :global(.upzzu-tail){
  display: none !important;
}
.cust-coach-noTail :global(.upzzu-bubble)::before,
.cust-coach-noTail :global(.upzzu-bubble)::after{
  content: none !important;
  display: none !important;
}

/* ===== HERO (나의UP관리 톤으로 통일) ===== */
.cust-hero{
  border-radius: 40px;
  background: radial-gradient(circle at top left, #ff8ac8 0, #a855f7 40%, #5b21ff 100%);
  box-shadow: 0 28px 60px rgba(0,0,0,0.45);
  color:#fff;
  padding: 48px 52px 40px;
  margin-bottom: 18px;
}
.cust-hero-top{ display:flex; flex-direction:column; gap:6px; }
.cust-hero-tag{ font-size:14px; letter-spacing:0.18em; font-weight:700; opacity:0.95; }
.cust-hero-title{ margin:0; font-size:34px; font-weight:900; }
.cust-coach-line{ margin-top: 16px; padding-top: 10px; overflow: visible; }

/* ✅✅ 말풍선 꼬리(화살표) 강제 제거: UpzzuHeaderCoach 내부 구조 몰라도 잡히게 */
.no-tail :global(*[class*="tail"]),
.no-tail :global(*[class*="Tail"]),
.no-tail :global(*[class*="arrow"]),
.no-tail :global(*[class*="Arrow"]),
.no-tail :global(.bubbleTail),
.no-tail :global(.speechTail),
.no-tail :global(.upzzu-tail),
.no-tail :global(.coach-tail) {
  display: none !important;
  content: none !important;
}
.no-tail :global(*[class*="bubble"])::before,
.no-tail :global(*[class*="bubble"])::after,
.no-tail :global(*[class*="Bubble"])::before,
.no-tail :global(*[class*="Bubble"])::after,
.no-tail :global(*[class*="speech"])::before,
.no-tail :global(*[class*="speech"])::after,
.no-tail :global(*[class*="Speech"])::before,
.no-tail :global(*[class*="Speech"])::after {
  content: none !important;
  display: none !important;
}



/* ===== 요약 카드 ===== */
.cust-summary-card{
  margin-top:10px;
  margin-bottom:24px;
  padding:18px 22px;
  border-radius:26px;
  background:#fff;
  border:1px solid #e5ddff;
  box-shadow:0 20px 40px rgba(0,0,0,0.12);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
}
.cust-summary-title{ font-size:16px; font-weight:900; color:#6b41ff; }
.cust-summary-count{ font-size:26px; font-weight:900; color:#f153aa; }
.cust-summary-sub{ font-size:15px; font-weight:800; color:#433155; margin:0; }
.cust-summary-caption{ font-size:14px; font-weight:800; color:#7a69c4; margin:0; }

/* 섹션 */
.cust-section{ margin-bottom:26px; }
.cust-section-title{ font-size:20px; font-weight:900; color:#6b41ff; margin:0; }
.cust-section-caption{ margin-top:8px; font-size:15px; font-weight:800; color:#7a69c4; }

/* 섹션 헤더 + 검색 */
.cust-section-header-row{ display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
.cust-search-controls{ display:flex; align-items:center; gap:8px; }
.cust-search-select{
  border-radius:999px;
  border:1px solid #d6c7ff;
  padding:8px 12px;
  font-size:14px;
  font-weight:900;
  background:#faf7ff;
  color:#4b2966;
}
.cust-search-input-wrap{ display:flex; align-items:center; gap:6px; max-width:260px; width:100%; }
.cust-search-input{
  flex:1;
  border-radius:999px;
  border:1px solid #d6c7ff;
  padding:8px 12px;
  font-size:14px;
  font-weight:900;
  background:#faf7ff;
  color:#241336;
}
.cust-search-btn{
  border:none;
  border-radius:999px;
  padding:8px 14px;
  font-size:13px;
  font-weight:900;
  background: linear-gradient(135deg, #f973b8, #a855f7);
  color:#fff;
  cursor:pointer;
  box-shadow:0 10px 22px rgba(0,0,0,0.18);
}

/* 폼 카드 */
.cust-form-card{
  margin-top:14px;
  border-radius:26px;
  background:#fff;
  border:1px solid #e5ddff;
  box-shadow:0 20px 40px rgba(0,0,0,0.12);
  padding:22px 22px 18px;
  color:#241336;
  font-size:15px;
}
.cust-form-block + .cust-form-block{ margin-top:18px; padding-top:16px; border-top:1px dashed #e5ddff; }
.cust-block-title{ font-size:17px; font-weight:900; color:#6b41ff; margin:0 0 10px 0; }
.cust-grid-2{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.cust-grid-3{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.cust-field{ display:flex; flex-direction:column; gap:6px; }
.cust-label{ font-size:14px; font-weight:900; color:#3b2457; }
.cust-required{ color:#f153aa; margin-left:2px; }

.cust-input,.cust-select,.cust-textarea{
  width:100%;
  border-radius:999px;
  border:1px solid #d6c7ff;
  padding:10px 14px;
  font-size:14px;
  font-weight:900;
  background:#faf7ff;
  color:#241336;
  box-sizing:border-box;
}
.cust-textarea{ border-radius:18px; resize:vertical; line-height:1.6; }
.cust-submit-row{ margin-top:18px; display:flex; justify-content:flex-end; }
.cust-submit-btn{
  border-radius:999px;
  border:none;
  padding:11px 22px;
  font-size:15px;
  font-weight:900;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a35dff 70%);
  color:#fff;
  cursor:pointer;
  box-shadow:0 16px 30px rgba(0,0,0,0.28);
}

/* 목록 */
.cust-list-card{
  margin-top:14px;
  border-radius:26px;
  background:#fff;
  border:1px solid #e5ddff;
  box-shadow:0 18px 32px rgba(0,0,0,0.12);
  padding:14px 16px 16px;
}
.cust-list-empty{ font-size:15px; font-weight:900; color:#7a69c4; line-height:1.6; }
.cust-list{ list-style:none; margin:0; padding:0; }
.cust-item{ padding:12px 4px 12px; border-bottom:1px dashed #e5ddff; font-size:14px; }
.cust-item:last-child{ border-bottom:none; }
.cust-item-main{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
.cust-item-right{ display:flex; align-items:center; gap:10px; flex-shrink:0; }
.cust-item-name-row{ display:inline-flex; align-items:center; gap:8px; padding:0; margin:0; border:none; background:transparent; cursor:pointer; text-align:left; }
.cust-item-name{ font-size:17px; font-weight:900; color:#241336; }
.cust-item-phone{ margin-top:3px; font-size:15px; font-weight:900; color:#4b5563; }
.cust-item-date{ font-size:12px; font-weight:900; color:#7e6fd6; }
.cust-expand-label{ font-size:12px; font-weight:900; padding:3px 10px; border-radius:999px; background:#f5f3ff; color:#7c3aed; }
.cust-del-btn{ border:none; border-radius:999px; padding:8px 12px; font-size:12px; font-weight:900; cursor:pointer; background:linear-gradient(135deg,#ff5aa5,#a855f7); color:#fff; box-shadow:0 10px 22px rgba(0,0,0,0.18); }
.cust-type-badge{ padding:4px 11px; border-radius:999px; font-size:12px; font-weight:900; }
.badge-type-new{background:#e0f2fe;color:#0369a1;}
.badge-type-prospect{background:#fef9c3;color:#854d0e;}
.badge-type-contract{background:#dcfce7;color:#166534;}
.badge-type-ref{background:#fef3c7;color:#92400e;}
.badge-type-gift{background:#fce7f3;color:#be185d;}
.badge-type-etc{background:#e5e7eb;color:#374151;}

.cust-item-tags{ margin-top:7px; display:flex; flex-wrap:wrap; gap:7px; }
.cust-tag{ border-radius:999px; padding:5px 10px; font-size:12px; font-weight:900; background:#f3f4f6; color:#4b5563; }
.cust-next-row{ margin-top:7px; display:flex; align-items:flex-start; gap:6px; }
.cust-next-label{ font-size:13px; font-weight:900; color:#6b41ff; margin-right:4px; }
.cust-next-text{ font-size:14px; font-weight:900; color:#374151; }
.cust-item-detail{ margin-top:10px; padding:12px 12px; border-radius:16px; background:#f9fafb; border:1px solid #e5e7eb; }
.cust-detail-label{ display:inline-block; margin-bottom:3px; font-size:12px; font-weight:900; color:#6b21a8; }
.cust-detail-text{ display:block; font-size:14px; font-weight:900; color:#111827; white-space:pre-wrap; }

/* 반응형 */
@media (max-width: 960px){
  .cust-root{ padding:16px; }
  .cust-hero{ padding:32px 24px 30px; }
  .cust-section-header-row{ flex-direction:column; align-items:flex-start; }
  .cust-search-controls{ width:100%; }
  .cust-search-input-wrap{ max-width:none; }
  .cust-grid-2,.cust-grid-3{ grid-template-columns:minmax(0,1fr); }
}
`;
