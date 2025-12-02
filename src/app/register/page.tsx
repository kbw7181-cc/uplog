'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();

  const [industry, setIndustry] = useState('');      // 업종
  const [company, setCompany] = useState('');       // 회사명
  const [department, setDepartment] = useState(''); // 부서명
  const [team, setTeam] = useState('');             // 팀명
  const [name, setName] = useState('');             // 이름
  const [nickname, setNickname] = useState('');     // 닉네임
  const [phone, setPhone] = useState('');           // 전화번호
  const [email, setEmail] = useState('');           // 이메일
  const [career, setCareer] = useState('');         // 경력(0~1년 등)
  const [password, setPassword] = useState('');     // 비밀번호
  const [passwordConfirm, setPasswordConfirm] = useState(''); // 비번 확인

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setDone(false);

    if (!email || !password || !passwordConfirm || !name) {
      setError('필수 항목(이름, 이메일, 비밀번호)을 모두 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    // 회원가입 (user_metadata에 기본 정보 같이 저장)
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
          career,
        },
      },
    });

    if (signUpError) {
      console.error(signUpError);
      setError('회원가입 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);

    // 회원가입 후 바로 로그인 화면으로 이동 (몇 초 뒤 이동해도 되고 바로 이동해도 OK)
    router.push('/login');
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#B982FF,#9D60FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(18px)',
          padding: '32px 28px 28px',
          borderRadius: 28,
          boxShadow: '0 22px 60px rgba(0,0,0,0.28)',
          color: '#fff',
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            UPLOG 회원가입
          </h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>
            영업 기록과 나의 U P 를 한 곳에서 관리해보세요.
          </p>
        </div>

        {/* 섹션: 기본 정보 */}
        <SectionTitle title="기본 정보" />
        <TwoCols>
          <Field
            label="이름"
            placeholder="예: 홍길동"
            value={name}
            onChange={setName}
          />
          <Field
            label="닉네임"
            placeholder="예: 열정영업왕"
            value={nickname}
            onChange={setNickname}
          />
        </TwoCols>
        <TwoCols>
          <Field
            label="전화번호"
            placeholder="예: 010-0000-0000"
            value={phone}
            onChange={setPhone}
          />
          <SelectField
            label="경력"
            value={career}
            onChange={setCareer}
            options={[
              { value: '', label: '선택해주세요' },
              { value: '0-1', label: '0~1년' },
              { value: '2', label: '2년' },
              { value: '3', label: '3년' },
              { value: '4-5', label: '4~5년' },
              { value: '6-9', label: '6~9년' },
              { value: '10+', label: '10년 이상' },
            ]}
          />
        </TwoCols>

        {/* 섹션: 회사 / 조직 정보 */}
        <SectionTitle title="회사 / 조직 정보" />
        <TwoCols>
          <Field
            label="업종"
            placeholder="예: 보험, 화장품, 교육, 건강식품 등"
            value={industry}
            onChange={setIndustry}
          />
          <Field
            label="회사명"
            placeholder="예: OO화장품, OO생명 등"
            value={company}
            onChange={setCompany}
          />
        </TwoCols>
        <TwoCols>
          <Field
            label="부서명"
            placeholder="예: 영업1팀, 지점명 등"
            value={department}
            onChange={setDepartment}
          />
          <Field
            label="팀명"
            placeholder="예: 드림팀, UP팀 등"
            value={team}
            onChange={setTeam}
          />
        </TwoCols>

        {/* 섹션: 계정 정보 */}
        <SectionTitle title="계정 정보" />
        <Field
          label="이메일"
          placeholder="로그인에 사용할 이메일"
          value={email}
          onChange={setEmail}
        />
        <TwoCols>
          <Field
            label="비밀번호"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={setPassword}
            type="password"
          />
          <Field
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            type="password"
          />
        </TwoCols>

        {/* 에러 / 완료 메시지 */}
        {error && (
          <p
            style={{
              marginTop: 10,
              marginBottom: 6,
              fontSize: 13,
              color: '#FFE0EA',
            }}
          >
            {error}
          </p>
        )}
        {done && !error && (
          <p
            style={{
              marginTop: 10,
              marginBottom: 6,
              fontSize: 13,
              color: '#E5FFEA',
            }}
          >
            회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.
          </p>
        )}

        {/* 버튼 영역 */}
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
              color: '#4B1A6C',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: '0 10px 24px rgba(255,105,200,0.65)',
              marginBottom: 10,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '가입 처리 중...' : '회원가입 완료'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.6)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            이미 계정이 있으신가요? 로그인하기
          </button>
        </div>
      </div>
    </main>
  );
}

/* --------- 재사용 작은 컴포넌트들 --------- */

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        marginTop: 12,
        marginBottom: 8,
        opacity: 0.9,
      }}
    >
      {title}
    </h2>
  );
}

function TwoCols({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(0,1fr))',
        gap: 12,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
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
    <div style={{ textAlign: 'left' }}>
      <label style={{ fontSize: 13, opacity: 0.9 }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: 'block',
          marginTop: 6,
          padding: '11px 14px',
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.92)',
          fontSize: 14,
          color: '#333',
          outline: 'none',
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ textAlign: 'left' }}>
      <label style={{ fontSize: 13, opacity: 0.9 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: 'block',
          marginTop: 6,
          padding: '11px 14px',
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.92)',
          fontSize: 14,
          color: '#333',
          outline: 'none',
          appearance: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
