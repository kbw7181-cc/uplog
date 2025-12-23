'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/home');
    })();
  }, [router]);

  async function onLogin() {
    setMsg(null);
    if (!email.trim() || !pw.trim()) {
      setMsg('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw.trim(),
      });
      if (error) {
        setMsg(error.message || '로그인에 실패했습니다.');
        return;
      }
      router.replace('/home');
    } catch (e: any) {
      setMsg(e?.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.top}>
          <div style={S.brandRow}>
            <div style={S.brandDot} />
            <div style={S.h1}>UPLOG 로그인</div>
          </div>
          <div style={S.sub}>오늘도 나를 UP시키다</div>
        </div>

        <div style={S.form}>
          <div style={S.field}>
            <label style={S.label}>이메일</label>
            <input
              style={S.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>비밀번호</label>
            <input
              style={S.input}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {msg ? <div style={S.msg}>{msg}</div> : null}

          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            style={{
              ...S.btn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div style={S.row}>
            <span style={S.gray}>계정이 없으신가요?</span>
            <Link href="/register" style={S.link}>
              회원가입
            </Link>
          </div>

          <button type="button" onClick={() => router.push('/')} style={S.backBtn}>
            ← 메인으로
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '34px 18px', // ✅ 바깥 여유 더
    background:
      'radial-gradient(1200px 600px at 15% 18%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%),' +
      'radial-gradient(1200px 700px at 78% 22%, rgba(243,232,255,0.85) 0%, rgba(255,255,255,0) 60%),' +
      'linear-gradient(180deg, #f8f4ff 0%, #f5f9ff 50%, #f8f4ff 100%)',
  },

  card: {
    width: 'min(620px, 100%)', // ✅ 약간 넓게
    background: 'rgba(255,255,255,0.93)',
    borderRadius: 28,
    border: '1px solid rgba(90,40,120,0.14)',
    boxShadow: '0 26px 70px rgba(40,10,70,0.14)',
    padding: 22, // ✅ 카드 패딩 더
  },

  top: {
    padding: '10px 10px 18px', // ✅ 상단 여유 더
  },

  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  brandDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: 'linear-gradient(90deg,#ff4fa1,#a855f7)',
    boxShadow: '0 10px 18px rgba(168,85,247,0.25)',
  },

  h1: {
    fontSize: 28,
    fontWeight: 950,
    letterSpacing: -0.5,
    color: '#2a1236',
    lineHeight: 1.1,
  },

  sub: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: 850,
    color: 'rgba(42,18,54,0.70)',
    lineHeight: 1.35,
  },

  form: {
  padding: '8px 10px 6px',
  maxWidth: 520,      // ✅ 핵심
},


  field: {
    marginTop: 16, // ✅ 필드 간격 핵심
  },

  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 900,
    color: 'rgba(42,18,54,0.78)',
    marginBottom: 10, // ✅ 라벨-인풋 간격
  },

  input: {
    width: '100%',
    height: 56, // ✅ 입력 높이 ↑
    padding: '0 16px',
    borderRadius: 18,
    border: '1px solid rgba(90,40,120,0.18)',
    outline: 'none',
    fontSize: 15,
    fontWeight: 800,
    color: '#2a1236',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 12px 26px rgba(40,10,70,0.08)',
  },

  msg: {
    marginTop: 16,
    padding: '12px 14px',
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 900,
    color: '#7a1239',
    background: 'rgba(255,79,161,0.12)',
    border: '1px solid rgba(255,79,161,0.22)',
    lineHeight: 1.35,
  },

  btn: {
    width: '100%',
    height: 62, // ✅ 버튼 높이 ↑
    marginTop: 24, // ✅ 버튼 위 여유
    borderRadius: 20,
    border: 0,
    cursor: 'pointer',
    fontSize: 19,
    fontWeight: 950,
    color: '#fff',
    background: 'linear-gradient(90deg,#ff4fa1,#a855f7)',
    boxShadow: '0 18px 40px rgba(168,85,247,0.26)',
  },

  row: {
    marginTop: 18, // ✅ 링크 영역 여유
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontSize: 14,
    fontWeight: 800,
  },

  gray: {
    color: 'rgba(42,18,54,0.62)',
  },

  link: {
    color: '#a855f7',
    textDecoration: 'none',
    fontWeight: 950,
  },

  backBtn: {
    width: '100%',
    height: 54,
    marginTop: 16,
    borderRadius: 18,
    border: '1px solid rgba(90,40,120,0.18)',
    background: 'rgba(255,255,255,0.92)',
    color: '#2a1236',
    fontWeight: 900,
    cursor: 'pointer',
  },
};
