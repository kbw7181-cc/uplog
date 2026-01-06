'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  /** 저장 성공 후 부모가 새로고침/리스트 갱신하고 싶으면 콜백 */
  onCreated?: () => void;
};

type CustomerFormState = {
  name: string;
  phone: string;
  stage: string;
  grade: string;
  memo: string;
};

export default function CustomerQuickForm({ onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormState>({
    name: '',
    phone: '',
    stage: 'new',
    grade: '',
    memo: '',
  });

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setMsg(null);
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;
        if (!uid) {
          if (alive) {
            setMeId(null);
            setMsg('로그인이 필요합니다.');
          }
          return;
        }
        if (alive) setMeId(uid);
      } catch {
        if (alive) setMsg('세션 확인 중 오류가 발생했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!meId) return false;
    if (saving) return false;
    const name = form.name.trim();
    // 이름만 필수, 나머지는 선택 (기존 규칙 몰라서 안전하게 최소만)
    return name.length >= 1;
  }, [meId, saving, form.name]);

  async function createCustomer() {
    if (!canSubmit) return;

    setSaving(true);
    setMsg(null);

    try {
      const payload: any = {
        user_id: meId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        stage: form.stage || null,
        grade: form.grade.trim() || null,
        memo: form.memo.trim() || null,
      };

      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        setMsg(error.message);
        return;
      }

      setForm({
        name: '',
        phone: '',
        stage: 'new',
        grade: '',
        memo: '',
      });

      setMsg('저장 완료 ✅');
      onCreated?.();
    } catch {
      setMsg('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="cqf">
      <div className="cqf-card">
        <div className="cqf-title">고객 빠른 추가</div>

        <div className="cqf-grid">
          <label className="cqf-field">
            <span className="cqf-label">이름</span>
            <input
              className="cqf-input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 김영업"
              autoComplete="off"
            />
          </label>

          <label className="cqf-field">
            <span className="cqf-label">연락처</span>
            <input
              className="cqf-input"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="예: 010-1234-5678"
              autoComplete="off"
            />
          </label>

          <label className="cqf-field">
            <span className="cqf-label">단계</span>
            <select
              className="cqf-input"
              value={form.stage}
              onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
            >
              <option value="new">신규</option>
              <option value="contact">연락중</option>
              <option value="meet">미팅</option>
              <option value="contract1">계약1</option>
              <option value="contract2">계약2</option>
              <option value="contract3">계약3</option>
            </select>
          </label>

          <label className="cqf-field">
            <span className="cqf-label">등급</span>
            <input
              className="cqf-input"
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
              placeholder="예: A / VIP"
              autoComplete="off"
            />
          </label>

          <label className="cqf-field cqf-field-wide">
            <span className="cqf-label">메모</span>
            <textarea
              className="cqf-textarea"
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="간단 메모"
              rows={3}
            />
          </label>
        </div>

        {msg && <div className="cqf-msg">{msg}</div>}

        <button className="cqf-btn" onClick={createCustomer} disabled={!canSubmit}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      <style jsx>{`
        .cqf {
          width: 100%;
        }
        .cqf-card {
          border-radius: 18px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(168, 85, 247, 0.25);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
          color: #20112b;
        }
        .cqf-title {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 12px;
        }
        .cqf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .cqf-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cqf-field-wide {
          grid-column: 1 / -1;
        }
        .cqf-label {
          font-size: 13px;
          font-weight: 800;
          color: rgba(32, 17, 43, 0.7);
        }
        .cqf-input {
          width: 100%;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(168, 85, 247, 0.25);
          padding: 0 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }
        .cqf-textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(168, 85, 247, 0.25);
          padding: 10px 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          resize: vertical;
        }
        .cqf-msg {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(124, 58, 237, 0.9);
        }
        .cqf-btn {
          margin-top: 12px;
          width: 100%;
          height: 44px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 900;
          font-size: 15px;
          color: #fff;
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(168, 85, 247, 0.95));
          box-shadow: 0 10px 22px rgba(168, 85, 247, 0.22);
        }
        .cqf-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 860px) {
          .cqf-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
