// src/app/customers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type CustomerRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  customer_type: string | null;
  status: string | null;
  memo: string | null;
  gift_memo: string | null;
  next_contact_date: string | null; // YYYY-MM-DD
  next_contact_time: string | null; // HH:MM
};

export default function CustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 고객 목록 + 검색
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // 새/선택 고객 폼
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [memo, setMemo] = useState('');
  const [giftMemo, setGiftMemo] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');

  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // 반론 관련 상태
  const [objectionText, setObjectionText] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [friendFeedback, setFriendFeedback] = useState('');
  const [myScript, setMyScript] = useState('');
  const [savingRebuttal, setSavingRebuttal] = useState(false);

  // ----------------------------------------------------
  // 초기 로딩
  // ----------------------------------------------------
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
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, user_id, name, phone, customer_type, status, memo, gift_memo, next_contact_date, next_contact_time'
      )
      .eq('user_id', uid)
      .order('next_contact_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('customers load error', error);
      return;
    }

    setCustomers((data ?? []) as CustomerRow[]);
  };

  // ----------------------------------------------------
  // 고객 선택 시 폼에 채우기
  // ----------------------------------------------------
  useEffect(() => {
    if (!selectedCustomerId) {
      setName('');
      setPhone('');
      setCustomerType('');
      setStatus('');
      setMemo('');
      setGiftMemo('');
      setNextDate('');
      setNextTime('');
      // 반론 작성 칸도 초기화
      setObjectionText('');
      setAiFeedback('');
      setFriendFeedback('');
      setMyScript('');
      return;
    }

    const found = customers.find((c) => c.id === selectedCustomerId);
    if (!found) return;

    setName(found.name ?? '');
    setPhone(found.phone ?? '');
    setCustomerType(found.customer_type ?? '');
    setStatus(found.status ?? '');
    setMemo(found.memo ?? '');
    setGiftMemo(found.gift_memo ?? '');
    setNextDate(found.next_contact_date ?? '');
    setNextTime(found.next_contact_time ?? '');
  }, [selectedCustomerId, customers]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;

    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const target = [
        c.name,
        c.phone,
        c.memo,
        c.gift_memo,
        c.customer_type,
        c.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return target.includes(q);
    });
  }, [customers, search]);

  // ----------------------------------------------------
  // 고객 저장 (추가/수정 겸용)
  // ----------------------------------------------------
  const handleSaveCustomer = async () => {
    if (!userId) return;

    if (!name.trim()) {
      alert('이름은 꼭 입력해 주세요.');
      return;
    }

    setSavingCustomer(true);

    try {
      if (selectedCustomerId) {
        // 업데이트
        const { error } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            customer_type: customerType || null,
            status: status || null,
            memo: memo.trim() || null,
            gift_memo: giftMemo.trim() || null,
            next_contact_date: nextDate || null,
            next_contact_time: nextTime || null,
          })
          .eq('id', selectedCustomerId)
          .eq('user_id', userId);

        if (error) {
          console.error('customers update error', error);
          alert('고객 정보 수정 중 오류가 발생했어요.');
          return;
        }
      } else {
        // 신규
        const { data, error } = await supabase
          .from('customers')
          .insert({
            user_id: userId,
            name: name.trim(),
            phone: phone.trim() || null,
            customer_type: customerType || null,
            status: status || null,
            memo: memo.trim() || null,
            gift_memo: giftMemo.trim() || null,
            next_contact_date: nextDate || null,
            next_contact_time: nextTime || null,
          })
          .select('id')
          .single();

        if (error) {
          console.error('customers insert error', error);
          alert('고객 정보 저장 중 오류가 발생했어요.');
          return;
        }

        if (data?.id) {
          setSelectedCustomerId(data.id);
        }
      }

      await loadCustomers(userId);
      alert('고객 정보가 저장되었어요.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // ----------------------------------------------------
  // 고객 삭제
  // ----------------------------------------------------
  const handleDeleteCustomer = async () => {
    if (!userId || !selectedCustomerId) {
      alert('삭제할 고객을 먼저 선택해 주세요.');
      return;
    }

    if (!confirm('정말 이 고객을 삭제할까요?')) return;

    setDeletingCustomer(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomerId)
        .eq('user_id', userId);

      if (error) {
        console.error('customers delete error', error);
        alert('고객 삭제 중 오류가 발생했어요.');
        return;
      }

      setSelectedCustomerId(null);
      await loadCustomers(userId);
    } finally {
      setDeletingCustomer(false);
    }
  };

  // ----------------------------------------------------
  // 반론 아카이브 저장
  //  - 필수: 선택된 고객 + 반론 내용
  //  - AI/친구/스크립트는 비워도 저장 (null 로)
  // ----------------------------------------------------
  const handleSaveRebuttal = async () => {
    if (!userId) return;
    if (!selectedCustomerId) {
      alert('먼저 왼쪽에서 고객을 선택해 주세요.');
      return;
    }

    if (!objectionText.trim()) {
      alert('반론 내용(고객의 거절 멘트)은 꼭 적어 주세요.');
      return;
    }

    setSavingRebuttal(true);

    try {
      const { error } = await supabase.from('rebuttals').insert({
        user_id: userId,
        customer_id: selectedCustomerId,
        objection_text: objectionText.trim(),
        ai_feedback: aiFeedback.trim() || null,
        friend_feedback: friendFeedback.trim() || null,
        my_script: myScript.trim() || null,
      });

      if (error) {
        console.error('rebuttals insert error', error);
        alert('반론 아카이브에 저장 중 오류가 발생했어요.');
        return;
      }

      alert('반론 아카이브에 저장되었습니다.');
      // 저장 후 칸 비우기
      setObjectionText('');
      setAiFeedback('');
      setFriendFeedback('');
      setMyScript('');
    } finally {
      setSavingRebuttal(false);
    }
  };

  // ----------------------------------------------------
  // 렌더링
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="customers-root">
        <div className="customers-inner">
          <div className="loading-text">고객 정보를 불러오는 중입니다...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="customers-root">
      <div className="customers-inner">
        {/* 상단 헤더 */}
        <header className="page-header">
          <div>
            <h1 className="page-title">고객관리</h1>
            <p className="page-sub">
              고객 정보 · 상담 메모 · 선물 기록 · 다음 연락 날짜를 한 번에 관리해요.
            </p>
          </div>
          <button
            type="button"
            className="home-btn"
            onClick={() => router.push('/home')}
          >
            홈으로
          </button>
        </header>

        {/* TIP 바 */}
        <section className="tip-bar">
          <div className="tip-pill">TIP</div>
          <div className="tip-text">
            왼쪽에서 고객을 검색/선택하고, 가운데에서 기본 정보 · 선물 · 다음 연락을 크게
            입력해요.
            <br />
            오른쪽에서는 반론을 적으면 바로 반론 아카이브에 저장되고, 나중에 다시
            참고할 수 있어요.
          </div>
        </section>

        <main className="page-body">
          {/* 왼쪽: 고객 목록 */}
          <section className="customers-list-card">
            <div className="card-header-row">
              <h2 className="card-title">고객 목록</h2>
              <button
                type="button"
                className="add-btn"
                onClick={() => setSelectedCustomerId(null)}
              >
                + 새 고객
              </button>
            </div>

            <div className="search-box-row">
              <input
                type="text"
                placeholder="이름, 전화번호, 메모로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="customers-table-head">
              <span className="th name">이름</span>
              <span className="th type">유형</span>
              <span className="th status">상태</span>
              <span className="th next">다음 연락</span>
            </div>

            <div className="customers-table-body">
              {filteredCustomers.length === 0 ? (
                <div className="empty-list">
                  등록된 고객이 없거나
                  <br />
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = c.id === selectedCustomerId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={
                        'customer-row' + (isSelected ? ' customer-row-selected' : '')
                      }
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      <span className="td name">{c.name}</span>
                      <span className="td type">
                        {c.customer_type || '—'}
                      </span>
                      <span className="td status">{c.status || '—'}</span>
                      <span className="td next">
                        {c.next_contact_date || '—'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="list-footer">
              <span className="list-info">
                {customers.length === 0
                  ? '고객 정보가 아직 없습니다.'
                  : `총 ${customers.length}명`}
              </span>
              {selectedCustomerId && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={handleDeleteCustomer}
                  disabled={deletingCustomer}
                >
                  {deletingCustomer ? '삭제 중...' : '선택 고객 삭제'}
                </button>
              )}
            </div>
          </section>

          {/* 가운데: 새 고객 등록 / 수정 */}
          <section className="customer-form-card">
            <h2 className="card-title">새 고객 등록</h2>
            <p className="card-sub">
              이름 · 전화번호 · 선물 메모 · 다음 연락 날짜를 크게 입력해요.
            </p>

            <div className="form-row two">
              <div className="form-field">
                <label>
                  이름 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김가을"
                />
              </div>
              <div className="form-field">
                <label>전화번호</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 01012341234"
                />
              </div>
            </div>

            <div className="form-row two">
              <div className="form-field">
                <label>고객 유형</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  <option value="가망">가망</option>
                  <option value="VIP">VIP</option>
                  <option value="휴식">휴식</option>
                  <option value="주의">주의</option>
                </select>
              </div>
              <div className="form-field">
                <label>진행 상태</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  <option value="진행 중">진행 중</option>
                  <option value="계약 완료">계약 완료</option>
                  <option value="보류">보류</option>
                  <option value="거절">거절</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>고객 메모</label>
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="관심 상품, 가족 구성, 성향, 조심할 점 등을 적어두면 좋아요."
              />
            </div>

            <div className="form-field">
              <label>선물 · 기프티콘 메모</label>
              <textarea
                rows={3}
                value={giftMemo}
                onChange={(e) => setGiftMemo(e.target.value)}
                placeholder="예: 생일에 케이크 기프티콘 발송 / 아이들 간식세트 / 연말 캘리 엽서 + 선물 등"
              />
            </div>

            <div className="form-row two">
              <div className="form-field">
                <label>다음 연락 날짜</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>다음 연락 시간</label>
                <input
                  type="time"
                  value={nextTime}
                  onChange={(e) => setNextTime(e.target.value)}
                />
              </div>
            </div>

            <p className="form-notice">
              이 고객의 선물/기프티콘 메모와 다음 연락 날짜는
              <br />
              나중에 메인 달력 · 문자 도우미와도 이어줄 수 있어요.
            </p>

            <div className="form-footer-row">
              <div className="db-hint">
                DB 안내 · 고객 등록 중 오류가 발생했다면,
                <br />
                customers 테이블 컬럼이 맞는지, RLS 정책이 있는지 확인해 주세요.
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
              >
                {savingCustomer ? '저장 중...' : '고객 정보 저장'}
              </button>
            </div>
          </section>

          {/* 오른쪽: 반론 메모 · 피드백 */}
          <section className="rebuttal-card">
            <h2 className="card-title">고객별 반론 메모 · 피드백</h2>
            <p className="card-sub">
              선택한 고객의 거절 멘트와 나의 스크립트를 적으면 자동으로 반론
              아카이브에 저장돼요.
              <br />
              <span className="small-note">
                필수 입력은 <strong>반론 내용</strong> 뿐이고, AI/친구/스크립트는
                대표님이 필요할 때만 적어도 됩니다.
              </span>
            </p>

            <div className="rebuttal-field">
              <label>고객의 거절 멘트 (필수)</label>
              <textarea
                rows={3}
                value={objectionText}
                onChange={(e) => setObjectionText(e.target.value)}
                placeholder="예: 지금 보험이 너무 많아서 더는 필요 없어요."
              />
            </div>

            <div className="rebuttal-field">
              <label>AI 피드백/조언 (선택)</label>
              <textarea
                rows={3}
                value={aiFeedback}
                onChange={(e) => setAiFeedback(e.target.value)}
                placeholder="나중에는 AI로 자동 채울 수도 있어요. 지금은 대표님이 직접 메모해 두셔도 좋아요."
              />
            </div>

            <div className="rebuttal-field">
              <label>친구/동료 피드백 (선택)</label>
              <textarea
                rows={3}
                value={friendFeedback}
                onChange={(e) => setFriendFeedback(e.target.value)}
                placeholder="팀원이나 친구에게 받은 조언을 적어두면, 나중에 다시 참고하기 좋아요."
              />
            </div>

            <div className="rebuttal-field">
              <label>내가 만든 스크립트 (선택)</label>
              <textarea
                rows={3}
                value={myScript}
                onChange={(e) => setMyScript(e.target.value)}
                placeholder="다음에 다시 전화할 때 쓸 나만의 스크립트를 정리해 보세요."
              />
            </div>

            <button
              type="button"
              className="rebuttal-save-btn"
              onClick={handleSaveRebuttal}
              disabled={savingRebuttal}
            >
              {savingRebuttal ? '저장 중...' : '반론 아카이브에 저장하기'}
            </button>
          </section>
        </main>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.customers-root {
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, #ffd9ff 0, #472067 40%, #12041c 100%);
  color: #f8f4ff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.customers-inner {
  max-width: 1280px;
  margin: 0 auto;
}

/* 공통 카드 */

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffe9ff;
}

.card-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #cdbaff;
}

.small-note {
  font-size: 11px;
  color: #f6e8ff;
}

/* 헤더 */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 14px;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 3px;
}

.page-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #e5d4ff;
}

.home-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  box-shadow: 0 12px 24px rgba(0,0,0,0.7);
  cursor: pointer;
}

/* TIP 바 */

.tip-bar {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffcdf0, #b88eff);
  color: #3b0943;
  margin-bottom: 16px;
}

.tip-pill {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.16);
  font-size: 11px;
  font-weight: 700;
}

.tip-text {
  font-size: 11px;
}

/* 바디 그리드 */

.page-body {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 1.4fr;
  gap: 14px;
}

/* 왼쪽 고객 목록 카드 */

.customers-list-card {
  border-radius: 22px;
  padding: 12px 12px 10px;
  background: radial-gradient(circle at top left, #281339 0, #0b0212 70%);
  box-shadow: 0 18px 36px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.add-btn {
  border-radius: 999px;
  border: none;
  padding: 4px 12px;
  font-size: 11px;
  background: linear-gradient(135deg, #ff97c9, #a973ff);
  color: #fff;
  cursor: pointer;
}

.search-box-row {
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(7,1,14,0.9);
  color: #f8f2ff;
}

.customers-table-head {
  display: grid;
  grid-template-columns: 2.2fr 1.3fr 1.3fr 1.6fr;
  font-size: 11px;
  padding: 4px 4px;
  color: #e9ddff;
  border-bottom: 1px solid rgba(255,255,255,0.15);
}

.th {
  opacity: 0.9;
}

.customers-table-body {
  flex: 1;
  margin-top: 4px;
  overflow-y: auto;
}

.customer-row {
  width: 100%;
  border: none;
  background: transparent;
  display: grid;
  grid-template-columns: 2.2fr 1.3fr 1.3fr 1.6fr;
  font-size: 11px;
  padding: 4px 6px;
  text-align: left;
  border-radius: 10px;
  color: #f7ecff;
  cursor: pointer;
}

.customer-row:hover {
  background: rgba(255,255,255,0.04);
}

.customer-row-selected {
  background: linear-gradient(135deg, rgba(255,143,186,0.23), rgba(172,104,255,0.23));
  box-shadow: 0 0 0 1px rgba(255,200,255,0.6);
}

.td.next {
  font-size: 10px;
  color: #d7c5ff;
}

.empty-list {
  margin-top: 20px;
  font-size: 11px;
  text-align: center;
  color: #cdbbff;
}

.list-footer {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #cec2ff;
}

.delete-btn {
  border-radius: 999px;
  border: none;
  padding: 4px 10px;
  font-size: 10px;
  background: rgba(255,96,150,0.18);
  color: #ffd0e2;
  cursor: pointer;
}

/* 가운데 폼 카드 */

.customer-form-card {
  border-radius: 22px;
  padding: 12px 14px 12px;
  background: radial-gradient(circle at top left, #2a123c 0, #0c0215 70%);
  box-shadow: 0 18px 36px rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
}

.form-row.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
  margin-top: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.form-field label {
  font-size: 11px;
  color: #f3e6ff;
}

.required {
  color: #ffd3e6;
}

.form-field input,
.form-field select,
.form-field textarea {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.25);
  padding: 6px 8px;
  font-size: 12px;
  background: rgba(7,1,14,0.9);
  color: #f7f1ff;
}

.form-field textarea {
  resize: vertical;
}

.form-notice {
  margin-top: 8px;
  font-size: 11px;
  color: #d9c6ff;
}

.form-footer-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.db-hint {
  font-size: 10px;
  color: #c8b9ff;
}

.primary-btn {
  border-radius: 999px;
  border: none;
  padding: 7px 18px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff8fba, #a36dff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(0,0,0,0.9);
}

/* 오른쪽 반론 카드 */

.rebuttal-card {
  border-radius: 22px;
  padding: 12px 14px 14px;
  background: radial-gradient(circle at top left, #26143a 0, #0a020f 70%);
  box-shadow: 0 18px 36px rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
}

.rebuttal-field {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rebuttal-field label {
  font-size: 11px;
  color: #f4e5ff;
}

.rebuttal-field textarea {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.25);
  padding: 6px 8px;
  font-size: 12px;
  background: rgba(7,1,14,0.9);
  color: #f9f2ff;
  resize: vertical;
}

.rebuttal-save-btn {
  margin-top: 12px;
  width: 100%;
  border-radius: 999px;
  border: none;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff96c9, #a76eff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(0,0,0,0.95);
}

/* 로딩 */

.loading-text {
  margin-top: 120px;
  text-align: center;
  font-size: 16px;
}

/* 반응형 */

@media (max-width: 1100px) {
  .page-body {
    grid-template-columns: 1fr;
  }
}
`;
