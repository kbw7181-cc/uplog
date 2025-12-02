// src/app/goals/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type GoalRow = {
  user_id: string;
  month_goal_count: number | null;
  month_goal_amount: number | null;
  current_count: number | null;
  current_amount: number | null;
};

export default function GoalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [monthGoalCount, setMonthGoalCount] = useState<string>('');
  const [monthGoalAmount, setMonthGoalAmount] = useState<string>('');
  const [currentCount, setCurrentCount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('');

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
        .from('goals')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setErrorMsg(error.message);
      }

      const row = data as GoalRow | null;

      if (row) {
        setMonthGoalCount(
          row.month_goal_count != null ? String(row.month_goal_count) : ''
        );
        setMonthGoalAmount(
          row.month_goal_amount != null ? String(row.month_goal_amount) : ''
        );
        setCurrentCount(
          row.current_count != null ? String(row.current_count) : ''
        );
        setCurrentAmount(
          row.current_amount != null ? String(row.current_amount) : ''
        );
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      user_id: userId,
      month_goal_count: monthGoalCount ? Number(monthGoalCount) : 0,
      month_goal_amount: monthGoalAmount ? Number(monthGoalAmount) : 0,
      current_count: currentCount ? Number(currentCount) : 0,
      current_amount: currentAmount ? Number(currentAmount) : 0,
    };

    try {
      const { data: exists } = await supabase
        .from('goals')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (exists) {
        const { error } = await supabase
          .from('goals')
          .update({
            month_goal_count: payload.month_goal_count,
            month_goal_amount: payload.month_goal_amount,
            current_count: payload.current_count,
            current_amount: payload.current_amount,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('goals').insert(payload);
        if (error) throw error;
      }
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
            성장 목표 설정
          </h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            이번 달 목표와 현재 실적을 입력하면, 대시보드에서 자동으로 달성률이
            계산됩니다.
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

      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid #333',
          background: '#111',
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        <form
          onSubmit={handleSave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontSize: 13,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>이번 달 목표</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}
                >
                  목표 건수
                </label>
                <input
                  type="number"
                  min={0}
                  value={monthGoalCount}
                  onChange={(e) => setMonthGoalCount(e.target.value)}
                  placeholder="예: 30"
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
                  style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}
                >
                  목표 금액(만 원)
                </label>
                <input
                  type="number"
                  min={0}
                  value={monthGoalAmount}
                  onChange={(e) => setMonthGoalAmount(e.target.value)}
                  placeholder="예: 1000"
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
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>현재까지 실적</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}
                >
                  달성 건수
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentCount}
                  onChange={(e) => setCurrentCount(e.target.value)}
                  placeholder="예: 3"
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
                  style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}
                >
                  달성 금액(만 원)
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="예: 240"
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
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8,
              padding: '10px 14px',
              borderRadius: 999,
              border: 'none',
              background: '#24c868',
              color: '#050505',
              fontSize: 13,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '저장 중...' : '목표 저장하기'}
          </button>
        </form>
      </section>
    </main>
  );
}
