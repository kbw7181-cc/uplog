// src/app/customers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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

export default function CustomersPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      await loadCustomers(user.id);
      setLoading(false);
    };

    init();
  }, [router]);

  const loadCustomers = async (uid: string) => {
  setListLoading(true);

  const { data, error } = await supabase
    .from('customers')
    // 🔧 일단 * 로 전부 가져오기 (없는 컬럼 때문에 400 나는 것 방지)
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  setListLoading(false);

  if (error) {
    console.error('customers load error', error);
    alert('고객 목록을 불러오는 중 오류가 발생했어요.');
    return;
  }

  setCustomers((data as CustomerRow[]) ?? []);
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
        '고객 저장 중 오류가 발생했어요.\n\nSupabase customers 테이블에 새 컬럼들이 모두 있는지 확인해 주세요.'
      );
      return;
    }

    setForm(EMPTY_FORM);
    if (userId) {
      await loadCustomers(userId);
    }
    alert('고객 정보가 저장되었습니다.');
  };

  if (loading) {
    return (
      <div className="cust-root">
        <div className="cust-inner">
          <div className="cust-loading">고객 관리 화면을 불러오는 중입니다…</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const totalCount = customers.length;

  return (
    <div className="cust-root">
      <div className="cust-inner">
        {/* 헤더 히어로 (나의 U P 관리랑 같은 톤) */}
        <section className="cust-hero">
          <div className="cust-hero-left">
            <div className="cust-tag">UPLOG · CUSTOMER</div>
            <h1 className="cust-title">고객 관리</h1>
            <p className="cust-sub">
              고객 정보, 스케줄, 반론 메모까지 한 번에 관리하는 대표님만의 고객
              노트입니다.
              <br />
              오늘 연락해야 할 고객과, 나중에 다시 봐야 할 고객을 한눈에 정리해
              보세요.
            </p>
          </div>
          <div className="cust-hero-summary">
            <div className="cust-hero-label">지금 등록된 고객</div>
            <div className="cust-hero-count">{totalCount}명</div>
            <p className="cust-hero-caption">
              신규 고객이 생길 때마다
              <br />
              아래 폼에서 바로 등록할 수 있어요.
            </p>
          </div>
        </section>

        {/* 등록 폼 */}
        <section className="cust-section">
          <h2 className="cust-section-title">고객 등록</h2>
          <p className="cust-section-caption">
            필수 정보(이름, 연락처)를 먼저 입력하고, 나머지는 필요할 때 천천히
            채워 넣어도 괜찮아요.
          </p>

          <form className="cust-form-card" onSubmit={handleSubmit}>
            {/* 기본 정보 */}
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
                  <input
                    type="date"
                    className="cust-input"
                    value={form.birth}
                    onChange={(e) => handleChange('birth', e.target.value)}
                  />
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
                  <select
                    className="cust-select"
                    value={form.married}
                    onChange={(e) => handleChange('married', e.target.value)}
                  >
                    <option value="미상">모름 / 아직 확인 전</option>
                    <option value="미혼">미혼</option>
                    <option value="기혼">기혼</option>
                  </select>
                </div>
                <div className="cust-field">
                  <label className="cust-label">자녀 유무</label>
                  <select
                    className="cust-select"
                    value={form.has_children}
                    onChange={(e) =>
                      handleChange('has_children', e.target.value)
                    }
                  >
                    <option value="미상">모름 / 아직 확인 전</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div className="cust-field">
                  <label className="cust-label">고객 유형</label>
                  <select
                    className="cust-select"
                    value={form.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                  >
                    {CUSTOMER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 특징 · 메모 */}
            <div className="cust-form-block">
              <h3 className="cust-block-title">고객 특징 · 메모</h3>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">특징 1</label>
                  <input
                    className="cust-input"
                    placeholder="예) 아침 통화 선호, 말 빠른 편"
                    value={form.feature1}
                    onChange={(e) => handleChange('feature1', e.target.value)}
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">특징 2</label>
                  <input
                    className="cust-input"
                    placeholder="예) 가족 건강 걱정 많음"
                    value={form.feature2}
                    onChange={(e) => handleChange('feature2', e.target.value)}
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">특징 3</label>
                  <input
                    className="cust-input"
                    placeholder="예) 특정 요일/시간 피하기"
                    value={form.feature3}
                    onChange={(e) => handleChange('feature3', e.target.value)}
                  />
                </div>
              </div>

              <div className="cust-grid-2">
                <div className="cust-field">
                  <label className="cust-label">관심 상품 / 메모</label>
                  <textarea
                    className="cust-textarea"
                    rows={3}
                    placeholder="관심 상품, 가족 정보, 주의할 점 등을 자유롭게 적어 주세요."
                    value={form.memo}
                    onChange={(e) => handleChange('memo', e.target.value)}
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">선물 / 사은품 메모</label>
                  <textarea
                    className="cust-textarea"
                    rows={3}
                    placeholder="기프티콘, 사은품, 선물 발송 내역 등을 기록해 두면 좋아요."
                    value={form.gift_memo}
                    onChange={(e) => handleChange('gift_memo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 다음 연락 일정 & 반론 메모 */}
            <div className="cust-form-block">
              <h3 className="cust-block-title">다음 연락 일정 · 반론 메모</h3>

              <div className="cust-grid-3">
                <div className="cust-field">
                  <label className="cust-label">다음 연락 날짜</label>
                  <input
                    type="date"
                    className="cust-input"
                    value={form.next_contact_date}
                    onChange={(e) =>
                      handleChange('next_contact_date', e.target.value)
                    }
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">다음 연락 시간</label>
                  <input
                    type="time"
                    className="cust-input"
                    value={form.next_contact_time}
                    onChange={(e) =>
                      handleChange('next_contact_time', e.target.value)
                    }
                  />
                </div>
                <div className="cust-field">
                  <label className="cust-label">다음 연락 내용</label>
                  <input
                    className="cust-input"
                    placeholder="예) 상품 설명 마무리, 서류 안내 등"
                    value={form.next_contact_note}
                    onChange={(e) =>
                      handleChange('next_contact_note', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="cust-field">
                <label className="cust-label">반론 / 특이사항 메모</label>
                <textarea
                  className="cust-textarea"
                  rows={3}
                  placeholder="반론 내용이나 특이사항을 정리해 두면, 나중에 반론 아카이브와 연결하기 좋습니다."
                  value={form.objection_memo}
                  onChange={(e) =>
                    handleChange('objection_memo', e.target.value)
                  }
                />
              </div>
            </div>

            <div className="cust-submit-row">
              <button
                type="submit"
                className="cust-submit-btn"
                disabled={saving}
              >
                {saving ? '저장 중…' : '고객 정보 저장하기'}
              </button>
            </div>
          </form>
        </section>

        {/* 고객 목록 */}
        <section className="cust-section">
          <h2 className="cust-section-title">등록된 고객 목록</h2>
          <p className="cust-section-caption">
            입력일, 생년월일, 주소, 고객 유형, 특징까지 한 번에 확인할 수 있어요.
          </p>

          <div className="cust-list-card">
            {listLoading && (
              <p className="cust-list-empty">목록을 불러오는 중입니다…</p>
            )}

            {!listLoading && customers.length === 0 && (
              <p className="cust-list-empty">
                아직 등록된 고객이 없어요.
                <br />
                위의 <strong>고객 등록 폼</strong>에서 첫 고객을 남겨 보세요.
              </p>
            )}

            {!listLoading && customers.length > 0 && (
              <ul className="cust-list">
                {customers.map((c) => (
                  <li key={c.id} className="cust-item">
                    <div className="cust-item-main">
                      <div>
                        <div className="cust-item-name-row">
                          <span className="cust-item-name">{c.name}</span>
                          <span
                            className={`cust-type-badge ${getTypeClass(
                              c.type
                            )}`}
                          >
                            {c.type ?? '미분류'}
                          </span>
                        </div>
                        <div className="cust-item-phone">{c.phone}</div>
                      </div>
                      <div className="cust-item-date">
                        입력일{' '}
                        {c.created_at
                          ? formatDateOnly(c.created_at)
                          : '기록 없음'}
                      </div>
                    </div>

                    <div className="cust-item-tags">
                      {c.birth && (
                        <span className="cust-tag">
                          생년월일 · {formatDateOnly(c.birth)}
                        </span>
                      )}
                      {c.address && (
                        <span className="cust-tag">주소 · {c.address}</span>
                      )}
                      {c.job && (
                        <span className="cust-tag">직업 · {c.job}</span>
                      )}
                      {c.married && (
                        <span className="cust-tag">결혼 · {c.married}</span>
                      )}
                      {c.has_children && (
                        <span className="cust-tag">
                          자녀 · {c.has_children}
                        </span>
                      )}
                      {c.feature1 && (
                        <span className="cust-tag">특징1 · {c.feature1}</span>
                      )}
                      {c.feature2 && (
                        <span className="cust-tag">특징2 · {c.feature2}</span>
                      )}
                      {c.feature3 && (
                        <span className="cust-tag">특징3 · {c.feature3}</span>
                      )}
                    </div>

                    {(c.next_contact_date ||
                      c.next_contact_time ||
                      c.next_contact_note) && (
                      <div className="cust-next-row">
                        <span className="cust-next-label">다음 연락</span>
                        <span className="cust-next-text">
                          {c.next_contact_date
                            ? formatDateOnly(c.next_contact_date)
                            : ''}
                          {c.next_contact_time
                            ? ` ${c.next_contact_time.slice(0, 5)}`
                            : ''}
                          {c.next_contact_note
                            ? ` · ${c.next_contact_note}`
                            : ''}
                        </span>
                      </div>
                    )}

                    {c.objection_memo && (
                      <div className="cust-objection-row">
                        <span className="cust-next-label">반론/메모</span>
                        <span className="cust-objection-text">
                          {c.objection_memo}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

/* ===== 스타일: 나의 U P 관리 페이지와 같은 파스텔 톤 ===== */
const styles = `
.cust-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
}

.cust-inner {
  max-width: 1160px;
  margin: 0 auto 80px;
}

/* 공통 제목 */
.cust-section-title {
  font-size: 18px;
  font-weight: 800;
  color: #6b41ff;
}

.cust-section-caption {
  margin-top: 6px;
  font-size: 14px;
  color: #7a69c4;
}

/* 로딩 */
.cust-loading {
  margin-top: 120px;
  text-align: center;
  font-size: 18px;
}

/* 헤더 히어로 - my-up과 통일 */
.cust-hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 20px;
  padding: 24px 24px;
  border-radius: 32px;
  background: radial-gradient(circle at top left, #ffb3dd 0, #a45bff 45%, #5f2b9f 100%);
  color: #fff;
  box-shadow: 0 26px 50px rgba(0,0,0,0.28);
  margin-bottom: 24px;
}

.cust-hero-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.cust-tag {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.9;
}

.cust-title {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.cust-sub {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.96;
  line-height: 1.6;
}

.cust-hero-summary {
  width: 240px;
  padding: 14px 16px;
  border-radius: 24px;
  background: rgba(255,255,255,0.96);
  color: #2a1440;
  box-shadow: 0 22px 40px rgba(0,0,0,0.32);
  backdrop-filter: blur(14px);
  align-self: center;
  margin-right: 12px;
}

.cust-hero-label {
  font-size: 14px;
  font-weight: 800;
  color: #6b41ff;
}

.cust-hero-count {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 900;
  color: #f153aa;
}

.cust-hero-caption {
  margin-top: 6px;
  font-size: 13px;
  color: #4b335f;
}

/* 섹션 공통 */
.cust-section {
  margin-bottom: 26px;
}

/* 폼 카드 - 하얀 카드 */
.cust-form-card {
  margin-top: 14px;
  border-radius: 26px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  padding: 20px 22px 18px;
  color: #241336;
  box-sizing: border-box;
  font-size: 14px;
}

.cust-form-block + .cust-form-block {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #e5ddff;
}

.cust-block-title {
  font-size: 16px;
  font-weight: 800;
  color: #6b41ff;
  margin-bottom: 10px;
}

/* 그리드 */
.cust-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}

.cust-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 12px;
}

/* 필드 */
.cust-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cust-label {
  font-size: 14px;
  font-weight: 700;
  color: #3b2457;
}

.cust-required {
  color: #f153aa;
  margin-left: 2px;
}

/* 인풋 공통 - my-up 디테일 인풋과 동일 톤 */
.cust-input,
.cust-select,
.cust-textarea {
  width: 100%;
  border-radius: 999px;
  border: 1px solid #d6c7ff;
  padding: 9px 13px;
  font-size: 14px;
  background: #faf7ff;
  color: #241336;
  box-sizing: border-box;
}

.cust-input::placeholder,
.cust-textarea::placeholder {
  color: #aa97e0;
}

.cust-textarea {
  border-radius: 18px;
  resize: vertical;
  line-height: 1.6;
}

.cust-select {
  appearance: none;
}

/* 제출 버튼 - my-up 저장 버튼과 톤 맞춤 */
.cust-submit-row {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.cust-submit-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 22px;
  font-size: 14px;
  font-weight: 800;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a35dff 70%);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 16px 30px rgba(0,0,0,0.32);
}

/* 목록 카드 - 하얀 카드 */
.cust-list-card {
  margin-top: 14px;
  border-radius: 26px;
  background: #ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.12);
  padding: 14px 16px 16px;
  box-sizing: border-box;
  color: #111827;
}

.cust-list-empty {
  font-size: 14px;
  color: #7a69c4;
  line-height: 1.6;
}

.cust-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cust-item {
  padding: 10px 4px 10px;
  border-bottom: 1px dashed #e5ddff;
  font-size: 14px;
}

.cust-item:last-child {
  border-bottom: none;
}

.cust-item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.cust-item-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cust-item-name {
  font-size: 16px;
  font-weight: 800;
  color: #241336;
}

.cust-item-phone {
  margin-top: 2px;
  font-size: 14px;
  color: #4b5563;
}

.cust-item-date {
  font-size: 12px;
  color: #7e6fd6;
}

/* 유형 배지 */
.cust-type-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge-type-new       { background:#e0f2fe; color:#0369a1; }
.badge-type-prospect  { background:#fef9c3; color:#854d0e; }
.badge-type-contract  { background:#dcfce7; color:#166534; }
.badge-type-ref       { background:#fef3c7; color:#92400e; }
.badge-type-gift      { background:#fce7f3; color:#be185d; }
.badge-type-etc       { background:#e5e7eb; color:#374151; }

/* 태그 */
.cust-item-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cust-tag {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 12px;
  background: #f3f4f6;
  color: #4b5563;
}

/* 다음 연락 / 반론 */
.cust-next-row,
.cust-objection-row {
  margin-top: 6px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.cust-next-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b41ff;
  margin-right: 4px;
}

.cust-next-text,
.cust-objection-text {
  font-size: 13px;
  color: #374151;
}

.cust-objection-text {
  white-space: pre-wrap;
}

/* 반응형 */
@media (max-width: 960px) {
  .cust-root {
    padding: 16px;
  }
  .cust-hero {
    flex-direction: column;
  }
  .cust-hero-summary {
    width: 100%;
    margin-right: 0;
  }
  .cust-grid-2,
  .cust-grid-3 {
    grid-template-columns: minmax(0,1fr);
  }
}
`;
