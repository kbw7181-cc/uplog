'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();

  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [career, setCareer] = useState(''); // ✅ 선택값 or 직접입력 결과값
  const [careerMode, setCareerMode] = useState<'select' | 'custom'>('select'); // ✅ 추가
  const [careerCustom, setCareerCustom] = useState(''); // ✅ 추가
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setDone(false);

    // ✅ career 최종값 확정
    const finalCareer = careerMode === 'custom' ? careerCustom.trim() : career;

    if (!email || !password || !passwordConfirm || !name) {
      setError('필수 항목(이름, 이메일, 비밀번호)을 모두 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (careerMode === 'custom' && !finalCareer) {
      setError('경력(직접입력)을 작성해주세요.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          nickname,
          phone,
          industry,
          company,
          department,
          team,
          career: finalCareer, // ✅ 최종값 저장
        },
      },
    });

    if (signUpError || !data.user) {
      setError('회원가입 중 오류가 발생했어요.');
      setLoading(false);
      return;
    }

    // ✅ profiles에 주소 문자열 저장
    await supabase.from('profiles').upsert({
      user_id: data.user.id,
      address_text: address || null,
    });

    setLoading(false);
    setDone(true);
    router.push('/login');
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        {/* 헤더 */}
        <div style={styles.header}>
          <h1 style={styles.title}>UPLOG 회원가입</h1>
          <p style={styles.subtitle}>영업 기록과 나의 U P 를 한 곳에서 관리해보세요.</p>
        </div>

        {/* 기본 정보 */}
        <SectionTitle title="기본 정보" />
        <TwoCols>
          <Field label="이름" placeholder="예: 홍길동" value={name} onChange={setName} />
          <Field label="닉네임" placeholder="예: 열정영업왕" value={nickname} onChange={setNickname} />
        </TwoCols>

        <TwoCols>
          <Field label="전화번호" placeholder="예: 010-0000-0000" value={phone} onChange={setPhone} />

          {/* ✅ 경력: 선택 + 직접입력 */}
          <div>
            <label style={styles.label}>경력</label>

            <select
              value={careerMode === 'custom' ? '__custom__' : career}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__custom__') {
                  setCareerMode('custom');
                  setCareer('');
                } else {
                  setCareerMode('select');
                  setCareer(v);
                  setCareerCustom('');
                }
              }}
              style={styles.input}
            >
              <option value="">선택해주세요</option>
              <option value="0-1">0~1년</option>
              <option value="2">2년</option>
              <option value="3">3년</option>
              <option value="4-5">4~5년</option>
              <option value="6-9">6~9년</option>
              <option value="10+">10년 이상</option>
              <option value="__custom__">직접 입력</option>
            </select>

            {careerMode === 'custom' && (
              <input
                value={careerCustom}
                onChange={(e) => setCareerCustom(e.target.value)}
                placeholder="예: 1년 6개월 / 신입 / 12년차 등"
                style={{ ...styles.input, marginTop: 10 }}
              />
            )}
          </div>
        </TwoCols>

        {/* 회사 / 조직 정보 */}
        <SectionTitle title="회사 / 조직 정보" />
        <TwoCols>
          <Field label="업종" placeholder="예: 보험, 화장품, 교육, 건강식품 등" value={industry} onChange={setIndustry} />
          <Field label="회사명" placeholder="예: OO화장품, OO생명 등" value={company} onChange={setCompany} />
        </TwoCols>

        <TwoCols>
          <Field label="부서명" placeholder="예: 영업1팀, 지점명 등" value={department} onChange={setDepartment} />
          <Field label="팀명" placeholder="예: 드림팀, UP팀 등" value={team} onChange={setTeam} />
        </TwoCols>

        {/* 지역 정보 */}
        <SectionTitle title="지역 정보" />
        <Field
          label="주소 (지역 날씨 제공용)"
          placeholder="예: 서울특별시 강남구"
          value={address}
          onChange={setAddress}
        />

        {/* 계정 정보 */}
        <SectionTitle title="계정 정보" />
        <Field label="이메일" placeholder="로그인에 사용할 이메일" value={email} onChange={setEmail} />
        <TwoCols>
          <Field type="password" label="비밀번호" placeholder="비밀번호를 입력하세요" value={password} onChange={setPassword} />
          <Field
            type="password"
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
          />
        </TwoCols>

        {/* 메시지 */}
        {error && <Msg color="#FFE0EA">{error}</Msg>}
        {done && !error && <Msg color="#E5FFEA">회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.</Msg>}

        {/* 버튼 */}
        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={handleSubmit} disabled={loading} style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? '가입 처리 중...' : '회원가입 완료'}
          </button>

          <button type="button" onClick={() => router.push('/login')} style={styles.subBtn}>
            이미 계정이 있으신가요? 로그인하기
          </button>
        </div>
      </div>
    </main>
  );
}

/* ---------- UI 컴포넌트 ---------- */

function SectionTitle({ title }: { title: string }) {
  return <h2 style={styles.sectionTitle}>{title}</h2>;
}

function TwoCols({ children }: { children: React.ReactNode }) {
  return <div style={styles.twoCols}>{children}</div>;
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </div>
  );
}

function Msg({ color, children }: { color: string; children: React.ReactNode }) {
  return <p style={{ marginTop: 12, fontSize: 14, color, fontWeight: 700 }}>{children}</p>;
}

/* ---------- 스타일 ---------- */

const styles: Record<string, any> = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#B982FF,#9D60FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(18px)',
    padding: '36px 30px 30px',
    borderRadius: 28,
    boxShadow: '0 22px 60px rgba(0,0,0,0.28)',
    color: '#fff',
  },
  header: { textAlign: 'center', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: -0.4 },
  subtitle: { opacity: 0.92, fontSize: 15, lineHeight: 1.35 },

  // ✅ 섹션 간격 확 키움
  sectionTitle: {
    fontSize: 15,
    fontWeight: 900,
    marginTop: 22,
    marginBottom: 12,
    opacity: 0.95,
  },

  // ✅ 두 칼럼: rowGap(세로)도 넉넉히
  twoCols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
    columnGap: 14,
    rowGap: 16,
    marginBottom: 14,
  },

  // ✅ 라벨/입력 폰트도 살짝 키움
  label: { fontSize: 14, fontWeight: 800, opacity: 0.95 },

  // ✅ 입력창 높이 조금 줄이고(덜 두껍게) 여백은 확보
  input: {
    width: '100%',
    marginTop: 8,
    padding: '10px 14px',
    borderRadius: 14,
    border: 'none',
    fontSize: 14,
    fontWeight: 700,
    background: 'rgba(255,255,255,0.95)',
    color: '#333',
    outline: 'none',
    boxSizing: 'border-box',
  },

  primaryBtn: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
    color: '#4B1A6C',
    fontWeight: 900,
    fontSize: 16,
    boxShadow: '0 10px 24px rgba(255,105,200,0.65)',
    marginBottom: 10,
  },
  subBtn: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.6)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 14,
  },
};
