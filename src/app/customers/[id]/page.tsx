'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type CustomerRow = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  stage: string | null;
  grade: string | null;
  memo: string | null;
  created_at?: string | null;
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<CustomerRow | null>(null);

  const canSave = useMemo(() => {
    return !!row?.name?.trim();
  }, [row?.name]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        setLoading(true);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          router.replace('/login');
          return;
        }

        if (!id) {
          router.replace('/customers');
          return;
        }

        const { data, error } = await supabase
          .from('customers')
          .select('id,user_id,name,phone,stage,grade,memo,created_at')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!alive) return;
        setRow(data as any);
      } catch (e) {
        console.error(e);
        alert('불러오기 실패: customers RLS/컬럼 확인 필요');
        router.replace('/customers');
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [id, router]);

  const onSave = async () => {
    if (!row || saving) return;
    if (!canSave) return;

    setSaving(true);
    try {
      const payload: any = {
        name: row.name?.trim() || null,
        phone: row.phone?.trim() || null,
        stage: row.stage || null,
        grade: row.grade || null,
        memo: row.memo?.trim() || null,
      };

      const { error } = await supabase.from('customers').update(payload).eq('id', row.id);
      if (error) throw error;

      alert('저장 완료');
    } catch (e) {
      console.error(e);
      alert('저장 실패: customers RLS/컬럼 확인 필요');
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
            <div className="title">고객 상세</div>
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

        {loading ? (
          <section className="card">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </section>
        ) : (
          <section className="card">
            <div className="grid">
              <label className="field">
                <span className="label">이름 *</span>
                <input
                  className="input"
                  value={row?.name ?? ''}
                  onChange={(e) => setRow((p) => (p ? { ...p, name: e.target.value } : p))}
                />
              </label>

              <label className="field">
                <span className="label">전화번호</span>
                <input
                  className="input"
                  value={row?.phone ?? ''}
                  onChange={(e) => setRow((p) => (p ? { ...p, phone: e.target.value } : p))}
                />
              </label>

              <label className="field">
                <span className="label">단계</span>
                <select
                  className="select"
                  value={row?.stage ?? '신규'}
                  onChange={(e) => setRow((p) => (p ? { ...p, stage: e.target.value } : p))}
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
                  value={row?.grade ?? 'A'}
                  onChange={(e) => setRow((p) => (p ? { ...p, grade: e.target.value } : p))}
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
                  value={row?.memo ?? ''}
                  onChange={(e) => setRow((p) => (p ? { ...p, memo: e.target.value } : p))}
                />
              </label>
            </div>
          </section>
        )}

        <style jsx>{`
          /* ✅✅✅ [응급 차단] 다른 컴포넌트가 하단 고정바를 깔아도 이 페이지에서는 무조건 숨김 */
          :global(.bottomBar),
          :global(.bottom-bar),
          :global(.bottom_actions),
          :global([data-bottom-actions]),
          :global([data-bottom-bar]) {
            display: none !important;
          }

          .page {
            max-width: 1100px;
            margin: 0 auto;
            /* ✅ 아래 네모 덩어리처럼 보이는 여백 줄임 */
            padding: 18px 16px 24px;
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

          .skeleton {
            height: 18px;
            border-radius: 10px;
            background: rgba(168, 85, 247, 0.12);
            margin: 10px 0;
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
