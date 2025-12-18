'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type GuardState =
  | { status: 'checking'; msg: string }
  | { status: 'blocked'; msg: string; detail?: string }
  | { status: 'ok' };

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>({ status: 'checking', msg: '검사 중…' });

  useEffect(() => {
    let alive = true;

    async function run() {
      setState({ status: 'checking', msg: '세션 확인 중…' });

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (!alive) return;

      const uid = auth?.user?.id;

      if (authErr || !uid) {
        setState({
          status: 'blocked',
          msg: '로그인이 필요합니다.',
          detail: authErr?.message || '세션 없음',
        });
        return;
      }

      setState({ status: 'checking', msg: '관리자 권한 확인 중…' });

      const r = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      if (r.error) {
        // ✅ 여기서 절대 router.replace 하지 않음 (원인 화면 고정)
        setState({
          status: 'blocked',
          msg: '관리자 확인 실패 (RLS/권한/컬럼 문제 가능)',
          detail: r.error.message,
        });
        console.log('[AdminGuard] profile role fetch error:', r.error);
        return;
      }

      const role = (r.data?.role ?? 'user').toLowerCase();

      if (role !== 'admin') {
        setState({
          status: 'blocked',
          msg: '관리자만 접근 가능합니다. (현재 role이 admin이 아님)',
          detail: `현재 role: ${role}`,
        });
        return;
      }

      setState({ status: 'ok' });
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'ok') return <>{children}</>;

  const isChecking = state.status === 'checking';
  const title = isChecking ? '관리자 접근 검사' : '접근 차단됨';

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 560,
          margin: '40px auto',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(60,30,90,0.14)',
          borderRadius: 18,
          boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
          padding: 18,
          color: '#230b35',
          fontWeight: 900,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>

        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          {state.msg}
        </div>

        {'detail' in state && state.detail ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(60,30,90,0.12)',
              background: 'rgba(245, 245, 255, 0.7)',
              fontSize: 12,
              fontWeight: 900,
              color: 'rgba(40,10,70,0.85)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {state.detail}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button
            onClick={() => router.push('/login')}
            style={btn('pink')}
          >
            로그인으로
          </button>
          <button
            onClick={() => router.push('/home')}
            style={btn('sky')}
          >
            홈으로
          </button>
          <button
            onClick={() => window.location.reload()}
            style={btn('white')}
          >
            새로고침
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          ✅ 이제 안 튕기고 “왜 막혔는지(detail)”가 그대로 남습니다.
        </div>
      </div>
    </div>
  );
}

function btn(kind: 'pink' | 'sky' | 'white'): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 42,
    padding: '0 14px',
    borderRadius: 999,
    fontWeight: 950,
    border: '1px solid rgba(60,30,90,0.14)',
    boxShadow: '0 12px 24px rgba(40,10,70,0.08)',
    color: '#230b35',
    background: 'rgba(255,255,255,0.9)',
  };

  if (kind === 'pink') {
    base.background = 'linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.16))';
    base.border = '1px solid rgba(255,79,216,0.24)';
  }
  if (kind === 'sky') {
    base.background = 'linear-gradient(135deg, rgba(73,183,255,0.16), rgba(143,215,255,0.12))';
    base.border = '1px solid rgba(73,183,255,0.22)';
  }
  return base;
}
