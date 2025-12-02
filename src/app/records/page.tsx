// src/app/records/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type SalesLog = {
  id: string;
  log_date: string | null;
  customer_name: string | null;
  product_name: string | null;
  status: string | null;
  amount: number | null;
  memo: string | null;
};

const STATUS_OPTIONS = ['성공', '보류', '거절'];

export default function RecordsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [logDate, setLogDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [status, setStatus] = useState<string>('성공');
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState('');

  const [logs, setLogs] = useState<SalesLog[]>([]);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData.user;
      if (!u) {
        router.replace('/login');
        return;
      }
      setUserId(u.id);

      const { data, error } = await supabase
        .from('sales_logs')
        .select('*')
        .eq('user_id', u.id)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error(error);
        setErrorMsg(error.message);
      } else {
        setLogs((data as SalesLog[]) || []);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErrorMsg(null);

    const payload: any = {
      user_id: userId,
      log_date: logDate || new Date().toISOString().slice(0, 10),
      customer_name: customerName || null,
      product_name: productName || null,
      status,
      amount: amount ? Number(amount) : null,
      memo: memo || null,
    };

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('sales_logs')
        .insert(payload)
        .select('*')
        .single();

      if (insertError) throw insertError;

      if (inserted) {
        setLogs((prev) => [inserted as SalesLog, ...prev]);
      }

      // 이번 달 성공 실적 → goals.current_count / current_amount 업데이트
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      const { data: monthRows, error: aggError } = await supabase
        .from('sales_logs')
        .select('amount, status, log_date')
        .eq('user_id', userId)
        .gte('log_date', startStr)
        .lte('log_date', endStr);

      if (aggError) throw aggError;

      const successRows =
        monthRows?.filter((row: any) => row.status === '성공') ?? [];

      const successCount = successRows.length;
      const successAmount = successRows.reduce(
        (sum: number, row: any) => sum + (row.amount ?? 0),
        0
      );

      await supabase.from('goals').upsert(
        {
          user_id: userId,
          current_count: successCount,
          current_amount: successAmount,
        },
        { onConflict: 'user_id' }
      );

      // 폼 초기화
      setCustomerName('');
      setProductName('');
      setAmount('');
      setMemo('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#f5f5f5',
        }}
      >
        로딩 중...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#050505',
        color: '#f5f5f5',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            실적 입력
          </h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            오늘의 상담·계약을 간단히 기록하면, 대시보드에서 자동으로 성장
            그래프가 채워집니다.
          </p>
        </div>
        <button
          onClick={() => router.push('/home')}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #555',
            background: 'transparent',
            color: '#f5f5f5',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          대시보드
        </button>
      </header>

      {errorMsg && (
        <p style={{ color: 'salmon', fontSize: 12, marginBottom: 12 }}>
          {errorMsg}
        </p>
      )}

      {/* 입력 폼 */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
          marginBottom: 20,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr',
            gap: 8,
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <div>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              날짜
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              고객 이름
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 김OO"
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              상품/서비스
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 종신보험, 교육상품 등"
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              금액(만 원)
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 80"
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            />
          </div>

          <div>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              결과
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label
              style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'block' }}
            >
              메모(선택)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="상담 내용, 반응, 다음 액션 등"
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 8,
                border: '1px solid #444',
                background: '#181818',
                color: '#f5f5f5',
              }}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: 18,
                padding: '10px 16px',
                borderRadius: 999,
                border: 'none',
                background: '#24c868',
                color: '#050505',
                fontSize: 13,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중...' : '실적 저장'}
            </button>
          </div>
        </form>
      </section>

      {/* 최근 실적 리스트 */}
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>최근 실적</h2>
        {logs.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            아직 등록된 실적이 없습니다. 위에서 오늘의 첫 실적을 기록해 보세요.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.9fr 1.1fr 1.1fr 0.7fr 0.9fr',
              gap: 6,
              fontSize: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ opacity: 0.7 }}>날짜</div>
            <div style={{ opacity: 0.7 }}>고객</div>
            <div style={{ opacity: 0.7 }}>상품</div>
            <div style={{ opacity: 0.7 }}>결과</div>
            <div style={{ opacity: 0.7, textAlign: 'right' }}>금액(만)</div>

            {logs.map((log) => (
              <FragmentRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type RowProps = {
  log: SalesLog;
};

function FragmentRow({ log }: RowProps) {
  const dateLabel = log.log_date ?? '';
  const amt = log.amount ?? 0;

  return (
    <>
      <div>{dateLabel}</div>
      <div>{log.customer_name || '-'}</div>
      <div>{log.product_name || '-'}</div>
      <div>{log.status || '-'}</div>
      <div style={{ textAlign: 'right' }}>{amt ? amt.toLocaleString() : '-'}</div>
    </>
  );
}
