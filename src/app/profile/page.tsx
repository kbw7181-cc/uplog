'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  id: string; // = user_id
  name: string | null;
  nickname: string | null;
  phone: string | null;
  industry: string | null;
  company: string | null;
  department: string | null;
  team: string | null;
  career: string | null; // 연차
  grade: string | null; // 직함/직급
  avatar_url: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // 폼 상태
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [career, setCareer] = useState('');
  const [grade, setGrade] = useState('');
  const [email, setEmail] = useState(''); // 표시만, DB에는 안 저장

  // 현재 로그인한 유저 + 프로필 로드
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      setEmail(user.email ?? '');

      // ✅ user_id 기준으로 조회 (없으면 null 허용)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(
          'user_id,name,nickname,phone,industry,company,department,team,career,grade,avatar_url'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError('프로필 정보를 불러오는 중 오류가 발생했어요.');
        setLoading(false);
        return;
      }

      const p: Profile = {
        id: (data as any)?.user_id ?? user.id,
        name: data?.name ?? '',
        nickname: data?.nickname ?? '',
        phone: data?.phone ?? '',
        industry: data?.industry ?? '',
        company: data?.company ?? '',
        department: data?.department ?? '',
        team: data?.team ?? '',
        career: data?.career ?? '',
        grade: data?.grade ?? '',
        avatar_url: data?.avatar_url ?? '',
      };

      setProfile(p);
      setName(p.name ?? '');
      setNickname(p.nickname ?? '');
      setPhone(p.phone ?? '');
      setIndustry(p.industry ?? '');
      setCompany(p.company ?? '');
      setDepartment(p.department ?? '');
      setTeam(p.team ?? '');
      setCareer(p.career ?? '');
      setGrade(p.grade ?? '');
      setAvatarPreview(p.avatar_url || null);

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  // 프로필 이미지 선택
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  // 저장
  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError('');
    setMessage('');

    let avatarUrl = profile.avatar_url;

    // 아바타 업로드
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const filePath = `avatars/${profile.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setError('프로필 이미지를 업로드하는 중 오류가 발생했어요.');
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      avatarUrl = publicUrl;
    }

    // ✅ RLS 통과를 위해 user_id를 꼭 같이 저장
    const { error: upsertError } = await supabase.from('profiles').upsert({
      user_id: profile.id,
      name,
      nickname,
      phone,
      industry,
      company,
      department,
      team,
      career,
      grade,
      avatar_url: avatarUrl,
    });

    if (upsertError) {
      console.error(upsertError);
      setError('프로필을 저장하는 중 문제가 생겼어요.');
      setSaving(false);
      return;
    }

    setMessage('프로필이 저장되었습니다.');
    setSaving(false);
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg,#B982FF,#9D60FF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        불러오는 중...
      </main>
    );
  }

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
          maxWidth: 720,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(18px)',
          padding: '32px 28px',
          borderRadius: 28,
          boxShadow: '0 22px 60px rgba(0,0,0,0.28)',
          color: '#fff',
        }}
      >
        {/* 헤더 + 아바타 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
              프로필 설정
            </h1>
            <p style={{ fontSize: 13, opacity: 0.9 }}>
              회원가입 시 입력한 기본 정보를 확인하고 프로필 이미지를 설정해
              보세요.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                overflow: 'hidden',
                marginBottom: 6,
                border: '3px solid rgba(255,255,255,0.8)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="프로필"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  🙂
                </div>
              )}
            </div>
            <label
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.5)',
                cursor: 'pointer',
              }}
            >
              이미지 변경
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* 기본 정보 */}
        <SectionTitle title="기본 정보" />
        <TwoCols>
          <Field label="이름" value={name} onChange={setName} />
          <Field label="닉네임" value={nickname} onChange={setNickname} />
        </TwoCols>
        <TwoCols>
          <Field
            label="전화번호"
            value={phone}
            onChange={setPhone}
            placeholder="예: 010-0000-0000"
          />
          <SelectField
            label="경력 (연차)"
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

        {/* 회사 / 조직 정보 */}
        <SectionTitle title="회사 / 조직 정보" />
        <TwoCols>
          <Field
            label="업종"
            value={industry}
            onChange={setIndustry}
            placeholder="예: 보험, 화장품, 교육, 건강식품 등"
          />
          <Field
            label="회사명"
            value={company}
            onChange={setCompany}
            placeholder="예: OO화장품, OO생명 등"
          />
        </TwoCols>
        <TwoCols>
          <Field
            label="부서명"
            value={department}
            onChange={setDepartment}
            placeholder="예: 영업1팀, 지점명 등"
          />
          <Field
            label="팀명"
            value={team}
            onChange={setTeam}
            placeholder="예: 드림팀, UP팀 등"
          />
        </TwoCols>
        {/* 직함/직급 */}
        <TwoCols>
          <SelectField
            label="직함 / 직급"
            value={grade}
            onChange={setGrade}
            options={[
              { value: '', label: '선택해주세요' },
              { value: '팀원', label: '팀원' },
              { value: '주임', label: '주임' },
              { value: '대리', label: '대리' },
              { value: '과장', label: '과장' },
              { value: '차장', label: '차장' },
              { value: '부장', label: '부장' },
              { value: '실장', label: '실장' },
              { value: '팀장', label: '팀장' },
              { value: '본부장', label: '본부장' },
            ]}
          />
          <div />
        </TwoCols>

        {/* 계정 정보 (표시만) */}
        <SectionTitle title="계정 정보" />
        <Field
          label="이메일 (로그인용)"
          value={email}
          onChange={() => {}}
          disabled
        />

        {/* 에러 / 성공 메시지 */}
        {error && (
          <p
            style={{
              marginTop: 10,
              marginBottom: 4,
              fontSize: 13,
              color: '#FFE0EA',
            }}
          >
            {error}
          </p>
        )}
        {message && !error && (
          <p
            style={{
              marginTop: 10,
              marginBottom: 4,
              fontSize: 13,
              color: '#E5FFEA',
            }}
          >
            {message}
          </p>
        )}

        {/* 버튼 */}
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: '14px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(90deg,#FF69C8,#FFB4EC)',
              color: '#4B1A6C',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: '0 10px 24px rgba(255,105,200,0.65)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중...' : '프로필 저장하기'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/home')}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.6)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            메인으로
          </button>
        </div>
      </div>
    </main>
  );
}

/* ---- 재사용 컴포넌트 ---- */

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        marginTop: 14,
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
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ textAlign: 'left' }}>
      <label style={{ fontSize: 13, opacity: 0.9 }}>{label}</label>
      <input
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: 'block',
          marginTop: 6,
          padding: '11px 14px',
          borderRadius: 12,
          border: 'none',
          background: disabled
            ? 'rgba(255,255,255,0.5)'
            : 'rgba(255,255,255,0.92)',
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
