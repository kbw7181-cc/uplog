'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

import DealCard, { type DealData } from '../DealCard';

type Form = {
  name: string;
  phone: string;
  stage: string;
  grade: string;
  memo: string;

  deal: DealData;
};

function isDealMeaningful(deal: DealData) {
  const hasProduct = (deal.product || '').trim().length > 0;
  const hasIssue = (deal.issue || '').trim().length > 0;
  const hasAmount = typeof deal.amount === 'number' && !Number.isNaN(deal.amount) && deal.amount > 0;
  const hasManage = (deal.manageNote || '').trim().length > 0;
  return hasProduct || hasIssue || hasAmount || hasManage;
}

export default function CustomerNewPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    name: '',
    phone: '',
    stage: '신규',
    grade: 'A',
    memo: '',
    deal: {
      product: '',
      issue: '',
      amount: undefined,
      manageNote: '',
    },
  });

  const canSave = useMemo(() => form.name.trim().length >= 1, [form.name]);

  const onSave = async () => {
    if (saving) return;
    if (!canSave) return;

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        router.replace('/login');
        return;
      }

      const payload: any = {
        user_id: userId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        stage: form.stage,
        grade: form.grade,
        memo: form.memo.trim() || null,
      };

      // ✅ deal 한 덩어리로 notes_json에 저장
      if (isDealMeaningful(form.deal)) {
        payload.notes_json = {
          deal: {
            product: (form.deal.product || '').trim(),
            issue: (form.deal.issue || '').trim(),
            amount: typeof form.deal.amount === 'number' ? form.deal.amount : null,
            manageNote: (form.deal.manageNote || '').trim(),
          },
        };
      }

      const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
      if (error) throw error;

      if (data?.id) router.replace(`/customers/${data.id}`);
      else router.replace('/customers');
    } catch (e) {
      console.error(e);
      alert('저장 실패: customers 테이블/컬럼(RLS 포함) 확인 필요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClientShell>
      <main className="page">
        <header className="top">
          <div className="brand">
            <div className="dot" aria-hidden="true" />
            <div className="title">고객 추가</div>
          </div>

          <div className="actions">
            <button className="btn ghost" type="button" onClick={() => router.push('/customers')}>
              목록
            </button>
            <button className="btn primary" type="button" onClick={onSave} disabled={!canSave || saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </header>

        {/* ✅ 기본정보 */}
        <section className="card">
          <div className="grid">
            <label className="field">
              <span className="label">이름 *</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="고객 이름"
              />
            </label>

            <label className="field">
              <span className="label">전화번호</span>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </label>

            <label className="field">
              <span className="label">단계</span>
              <select
                className="select"
                value={form.stage}
                onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
              >
                <option value="신규">신규</option>
                <option value="상담중">상담중</option>
                <option value="제안중">제안중</option>
                <option value="계약1">계약1</option>
                <option value="계약2">계약2</option>
                <option value="계약3">계약3</option>
                <option value="보류">보류</option>
              </select>
            </label>

            <label className="field">
              <span className="label">등급</span>
              <select
                className="select"
                value={form.grade}
                onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </label>

            <label className="field full">
              <span className="label">메모</span>
              <textarea
                className="textarea"
                value={form.memo}
                onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                placeholder="일반 메모(선택)"
              />
            </label>
          </div>
        </section>

        {/* ✅ 계약/상품/관리 (합쳐진 카드) */}
        <section className="card dealWrap">
          <DealCard value={form.deal} onChange={(d) => setForm((p) => ({ ...p, deal: d }))} />
          <div className="dealHint">※ 상품/금액/이슈/상담내역은 고객 저장 시 함께 저장됩니다.</div>
        </section>

        <style jsx>{`
          :global(.bottomBar),
          :global(.bottom-bar),
          :global(.modalBottomBar),
          :global(.customerBottomBar),
          :global(.customer-bottom-bar),
          :global(.bottomDock),
          :global(.bottom-dock),
          :global(.bottom_actions),
          :global([data-bottom-actions]),
          :global([data-bottom-bar]) {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
          }

          .page {
            max-width: 1100px;
            margin: 0 auto;
            padding: 18px 16px 18px;
          }

          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .dot {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            background: linear-gradient(180deg, #ff6bd6, #a855f7);
            box-shadow: 0 10px 24px rgba(168, 85, 247, 0.25);
          }

          .title {
            font-size: 22px;
            font-weight: 800;
            color: #2b1b3a;
          }

          .actions {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .btn {
            border: 0;
            cursor: pointer;
            border-radius: 999px;
            padding: 10px 14px;
            font-weight: 800;
            font-size: 14px;
            white-space: nowrap;
          }

          .btn.ghost {
            background: rgba(255, 255, 255, 0.75);
            color: #5b2b77;
            box-shadow: 0 10px 22px rgba(16, 24, 40, 0.12);
          }

          .btn.primary {
            background: linear-gradient(180deg, #ff4fd1, #a855f7);
            color: #fff;
            box-shadow: 0 12px 26px rgba(168, 85, 247, 0.28);
          }

          .btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .card {
            background: rgba(255, 255, 255, 0.78);
            border: 1.5px solid rgba(255, 90, 200, 0.22);
            border-radius: 24px;
            padding: 16px;
            box-shadow: 0 18px 40px rgba(16, 24, 40, 0.12);
          }

          .card + .card {
            margin-top: 12px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .field.full {
            grid-column: 1 / -1;
          }

          .label {
            font-size: 14px;
            font-weight: 800;
            color: #4a235f;
          }

          .input,
          .select,
          .textarea {
            width: 100%;
            border-radius: 16px;
            border: 1px solid rgba(168, 85, 247, 0.22);
            background: rgba(255, 255, 255, 0.9);
            padding: 12px 12px;
            font-size: 16px;
            outline: none;
            color: #1f1030;
          }

          .textarea {
            min-height: 110px;
            resize: vertical;
          }

          .input:focus,
          .select:focus,
          .textarea:focus {
            border-color: rgba(255, 79, 209, 0.55);
            box-shadow: 0 0 0 4px rgba(255, 79, 209, 0.14);
          }

          .dealWrap {
            padding: 14px;
          }

          .dealHint {
            margin-top: 10px;
            font-size: 12px;
            font-weight: 800;
            color: rgba(70, 30, 95, 0.7);
            padding-left: 2px;
          }

          @media (max-width: 720px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
    </ClientShell>
  );
}
