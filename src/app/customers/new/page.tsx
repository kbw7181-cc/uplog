'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type Form = {
  name: string;
  phone: string;
  stage: string;
  grade: string;
  memo: string;
};

export default function CustomerNewPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    name: '',
    phone: '',
    stage: '신규',
    grade: 'A',
    memo: '',
  });

  const canSave = useMemo(() => {
    return form.name.trim().length >= 1;
  }, [form.name]);

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
            <button className="btn ghost" onClick={() => router.push('/customers')}>
              목록
            </button>
            <button className="btn primary" onClick={onSave} disabled={!canSave || saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </header>

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
                placeholder="특이사항/관심사/반응 등"
              />
            </label>
          </div>
        </section>

        <style jsx>{`
          /* ✅ 혹시 다른 페이지에서 쓰던 “하단 고정 덩어리”가 전역으로 살아있으면 여기선 강제 숨김 */
          :global(.bottomBar),
          :global(.bottom-bar),
          :global(.modalBottomBar),
          :global(.customerBottomBar),
          :global(.customer-bottom-bar),
          :global(.bottomDock),
          :global(.bottom-dock) {
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
            /* ✅ 80px 때문에 “맨밑 네모 덩어리”처럼 보일 수 있어서 제거 */
            padding: 18px 16px 18px;
          }
          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
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
          }
          .btn {
            border: 0;
            cursor: pointer;
            border-radius: 999px;
            padding: 10px 14px;
            font-weight: 800;
            font-size: 14px;
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
