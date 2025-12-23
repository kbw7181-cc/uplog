// ✅ 파일: src/app/profile/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getAvatarSrc } from '@/lib/getAvatarSrc';

type ProfileRow = {
  user_id: string;
  name: string | null;
  nickname: string | null;
  industry: string | null;
  grade: string | null;
  career: string | null;
  company: string | null;
  department: string | null;
  team: string | null;
  avatar_url: string | null;
  main_goal: string | null;
};

type ProfileStats = {
  givenFeedback: number;
  receivedFeedback: number;
  likeCount: number;
  cheerCount: number;
  communityPostCount: number;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [hasProfile, setHasProfile] = useState(false);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [industry, setIndustry] = useState('');
  const [grade, setGrade] = useState('');
  const [career, setCareer] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mainGoal, setMainGoal] = useState('');

  const [stats, setStats] = useState<ProfileStats>({
    givenFeedback: 0,
    receivedFeedback: 0,
    likeCount: 0,
    cheerCount: 0,
    communityPostCount: 0,
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'user_id, name, nickname, industry, grade, career, company, department, team, avatar_url, main_goal'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        const p = profile as ProfileRow;
        setHasProfile(true);

        setName(p.name ?? '');
        setNickname(p.nickname ?? p.name ?? user.email?.split('@')[0] ?? '');
        setIndustry(p.industry ?? '');
        setGrade(p.grade ?? '');
        setCareer(p.career ?? '');
        setCompany(p.company ?? '');
        setDepartment(p.department ?? '');
        setTeam(p.team ?? '');
        setAvatarUrl(p.avatar_url ?? null);
        setMainGoal(p.main_goal ?? '');
      } else {
        setNickname(user.email?.split('@')[0] ?? '');
      }

      setStats({
        givenFeedback: 0,
        receivedFeedback: 0,
        likeCount: 0,
        cheerCount: 0,
        communityPostCount: 0,
      });

      setLoading(false);
    };

    init();
  }, [router]);
  

  // ✅✅✅ 여기! avatarUrl을 안전 src로 변환 (http면 그대로 / storage 경로면 publicUrl로)
  const safeAvatarSrc = getAvatarSrc(avatarUrl);

  const buildPayload = () => ({
    name: name || null,
    nickname: nickname || null,
    industry: industry || null,
    grade: grade || null,
    career: career || null,
    company: company || null,
    department: department || null,
    team: team || null,
    avatar_url: avatarUrl || null,
    main_goal: mainGoal || null,
  });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    try {
      const payload = buildPayload();

      let error = null;

      if (hasProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('user_id', userId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: userId,
          ...payload,
        });
        error = insertError;
        if (!insertError) setHasProfile(true);
      }

      if (error) {
        console.error('profile save error', error);
        alert('프로필 저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }

      alert('프로필이 저장되었습니다 ✨');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!userId) return;
      const file = event.target.files?.[0];
      if (!file) return;

      setAvatarUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('avatar upload error', uploadError);
        alert('이미지 업로드 중 오류가 발생했어요.');
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      let error = null;

      if (hasProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('user_id', userId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: userId,
          avatar_url: publicUrl,
        });
        error = insertError;
        if (!insertError) setHasProfile(true);
      }

      if (error) {
        console.error('avatar url save error', error);
        alert('프로필 이미지 저장 중 오류가 발생했어요.');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const avatarInitial =
    nickname && nickname.length > 0 ? nickname.trim()[0]?.toUpperCase() : 'U';

  if (loading) {
    return (
      <div className="profile-root">
        <div className="profile-inner">
          <div className="loading">프로필 정보를 불러오는 중입니다...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="profile-root">
      <div className="profile-inner">
        <header className="top-header">
          <div className="top-header-left">
            <button type="button" className="back-btn" onClick={() => router.push('/home')}>
              ◀ 메인으로
            </button>
            <div className="title-wrap">
              <h1 className="page-title">프로필 설정</h1>
              <p className="page-sub">
                나의 정보와 동기부여 U P 문장을 정리하고, 프로필 이미지를 예쁘게 꾸며보세요.
              </p>
            </div>
          </div>
          {email && (
            <div className="top-header-right">
              <span className="label">계정</span>
              <span className="email">{email}</span>
            </div>
          )}
        </header>

        <main className="profile-main">
          <section className="card left-card">
            <h2 className="card-title">기본 정보 · 나의 U P 소개</h2>
            <p className="card-sub">
              메인 화면 상단에 보여지는 정보예요. 닉네임과 목표를 설정해 두면 동기부여에 더 도움이 됩니다.
            </p>

            <form className="form" onSubmit={handleSave}>
              <div className="profile-row">
                <div className="avatar-block">
                  <div className="avatar-circle">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={safeAvatarSrc || '/assets/upzzu1.png'}
                        alt="프로필"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/upzzu1.png';
                        }}
                      />
                    ) : (
                      <span>{avatarInitial}</span>
                    )}
                  </div>

                  <label className="avatar-upload-btn">
                    {avatarUploading ? '업로드 중...' : '프로필 이미지 변경'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                  </label>
                  <p className="avatar-hint">정사각형 이미지를 추천합니다. (최대 5MB)</p>
                </div>

                <div className="profile-text-block">
                  <div className="field">
                    <label>이름</label>
                    <input
                      type="text"
                      placeholder="실제 이름 (선택)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>닉네임</label>
                    <input
                      type="text"
                      placeholder="메인 화면에 노출될 이름"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-grid">
                    <div className="field">
                      <label>업종</label>
                      <input
                        type="text"
                        placeholder="예: TM · 뷰티 · 보험 · 교육 등"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>직급 / 역할</label>
                      <input
                        type="text"
                        placeholder="예: 사원, 대리, 팀장..."
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>경력</label>
                      <select value={career} onChange={(e) => setCareer(e.target.value)}>
                        <option value="">선택 안 함</option>
                        <option value="0-1">0~1년</option>
                        <option value="2">2년</option>
                        <option value="3">3년</option>
                        <option value="4-5">4~5년</option>
                        <option value="6-9">6~9년</option>
                        <option value="10+">10년 이상</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-grid">
                    <div className="field">
                      <label>회사 / 조직명</label>
                      <input
                        type="text"
                        placeholder="예: OO보험, OO교육센터"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>부서</label>
                      <input
                        type="text"
                        placeholder="예: 영업1팀, 교육팀"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>팀명</label>
                      <input
                        type="text"
                        placeholder="예: 드림팀, 1본부 A조"
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="field-full">
                <label>최종 목표 · 나의 동기부여 U P 문장</label>
                <p className="field-help">
                  메인 화면 · 나의 U P 관리에서 강조해서 보여줄 문장입니다.
                  <br />
                  예) <span className="quote">언젠가는 1등 먹는다. 거절은 숫자일 뿐이다.</span>
                </p>
                <textarea
                  rows={4}
                  placeholder="대표님만의 목표, 다짐, 동기부여 문장을 자유롭게 적어 보세요."
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                />
              </div>

              <div className="form-footer">
                <button type="button" className="secondary-btn" onClick={() => router.push('/home')}>
                  취소
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? '저장 중...' : '프로필 저장하기'}
                </button>
              </div>
            </form>
          </section>

          <section className="card right-card">
            <h2 className="card-title">나의 활동 통계</h2>
            <p className="card-sub">
              UPLOG 안에서 대표님의 활동을 한눈에 볼 수 있는 공간입니다.
              <br />
              지금은 기본값으로 표시되며, 차후 실제 데이터와 연결할 수 있습니다.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">내가 준 피드백</div>
                <div className="stat-value">{stats.givenFeedback}</div>
                <div className="stat-desc">다른 영업인들에게 남긴 조언/피드백</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">받은 피드백</div>
                <div className="stat-value accent">{stats.receivedFeedback}</div>
                <div className="stat-desc">내 반론/글에 달린 피드백</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">좋아요 받은 수</div>
                <div className="stat-value accent">{stats.likeCount}</div>
                <div className="stat-desc">커뮤니티 글과 댓글에 눌린 좋아요</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">응원 받은 수</div>
                <div className="stat-value">{stats.cheerCount}</div>
                <div className="stat-desc">친구/동료에게 받은 응원 횟수</div>
              </div>

              <div className="stat-card wide">
                <div className="stat-label">커뮤니티 작성 글 수</div>
                <div className="stat-value">{stats.communityPostCount}</div>
                <div className="stat-desc">
                  영업 노하우/거절 경험/멘탈 관리 등 대표님이 남긴 글의 개수
                </div>
              </div>
            </div>

            <div className="stats-footer">
              <p>
                위 지표들은 향후 커뮤니티, 반론 아카이브, 채팅 등 활동과 연동해서
                <br />
                <span className="highlight">“나의 성장 그래프 & 배지 시스템”</span>으로 확장될 수 있습니다.
              </p>
              <p className="small">
                (※ 현재는 디자인·구조용 기본값이며, 테이블/뷰 연결은 나중에 안전하게 붙이면 됩니다.)
              </p>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.profile-root {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, #ffe6f7 0, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1b1030;
  font-size: 15px;
}

.profile-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 상단 헤더 */
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 22px;
  border-radius: 24px;
  background: linear-gradient(135deg, #ff89bd, #a45bff);
  color: #fffdfd;
  box-shadow: 0 18px 36px rgba(0,0,0,0.24);
  margin-bottom: 18px;
}

.top-header-left {
  display: flex;
  gap: 18px;
  align-items: center;
}

.back-btn {
  border-radius: 999px;
  border: none;
  padding: 8px 14px;
  font-size: 14px;
  background: rgba(0,0,0,0.18);
  color: #fff;
  cursor: pointer;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}

.page-sub {
  margin: 0;
  font-size: 14px;
  color: #fde6ff;
}

.top-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 13px;
}

.top-header-right .label {
  opacity: 0.85;
}

.top-header-right .email {
  font-weight: 600;
}

/* 메인 레이아웃 */
.profile-main {
  display: grid;
  grid-template-columns: minmax(0, 3.5fr) minmax(0, 2.5fr);
  gap: 16px;
}

.card {
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(0,0,0,0.12);
  border: 1px solid #e3dafb;
  padding: 16px 18px 18px;
}

.card-title {
  font-size: 19px;
  font-weight: 800;
  color: #6b41ff;
  margin-bottom: 4px;
}

.card-sub {
  font-size: 14px;
  color: #7d6bc9;
  margin-bottom: 12px;
}

/* 왼쪽 카드: 프로필 */
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-row {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 18px;
  align-items: flex-start;
}

/* 아바타 */
.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-circle {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: radial-gradient(circle at top left, #ff9ed5 0, #a855f7 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 42px;
  font-weight: 800;
  overflow: hidden;
  box-shadow:
    0 0 0 4px rgba(255,255,255,0.9),
    0 16px 30px rgba(148, 60, 180, 0.6);
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload-btn {
  margin-top: 4px;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #f973c9, #a855f7);
  color: #fffdfd;
  box-shadow: 0 10px 18px rgba(148, 60, 180, 0.5);
  position: relative;
  overflow: hidden;
}

.avatar-upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.avatar-hint {
  font-size: 12px;
  color: #8b80c9;
  text-align: center;
}

/* 필드 공통 */
.profile-text-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 14px;
  font-weight: 700;
  color: #6341b8;
}

.field input,
.field select,
.field textarea {
  border-radius: 12px;
  border: 1px solid #d7c9ff;
  padding: 9px 11px;
  font-size: 15px;
  outline: none;
  background: #faf7ff;
  color: #241336;
}

.field input::placeholder,
.field textarea::placeholder {
  color: #b1a1e0;
}

.field select {
  background: #faf7ff;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.field-full {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-full label {
  font-size: 14px;
  font-weight: 700;
  color: #6341b8;
}

.field-full textarea {
  border-radius: 16px;
  border: 1px solid #d7c9ff;
  padding: 10px 12px;
  font-size: 15px;
  background: #faf7ff;
  resize: vertical;
}

.field-help {
  font-size: 13px;
  color: #8b80c9;
}

.quote {
  color: #f153aa;
  font-weight: 600;
}

/* 버튼 영역 */
.form-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.primary-btn,
.secondary-btn {
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #f973c9, #a855f7);
  color: #fffdfd;
  box-shadow: 0 10px 20px rgba(148, 60, 180, 0.5);
}

.primary-btn:disabled {
  opacity: 0.8;
  cursor: default;
}

.secondary-btn {
  background: #f5f3ff;
  color: #6b41ff;
  border: 1px solid #d7c9ff;
}

/* 오른쪽 카드: 통계 */
.stats-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
}

.stat-card {
  border-radius: 16px;
  padding: 10px 12px;
  background: radial-gradient(circle at top left, #fff7ff 0, #f4edff 60%, #f1f5ff 100%);
  border: 1px solid rgba(203, 186, 255, 0.9);
  box-shadow: 0 10px 18px rgba(0,0,0,0.08);
}

.stat-card.wide {
  grid-column: 1 / -1;
}

.stat-label {
  font-size: 13px;
  color: #7b6ac3;
}

.stat-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 900;
  color: #31215a;
}

.stat-value.accent {
  color: #f153aa;
}

.stat-desc {
  margin-top: 2px;
  font-size: 12px;
  color: #8f83cf;
}

.stats-footer {
  margin-top: 14px;
  font-size: 13px;
  color: #7c6bc7;
}

.stats-footer .highlight {
  color: #f153aa;
  font-weight: 700;
}

.stats-footer .small {
  margin-top: 3px;
  font-size: 12px;
  color: #a093da;
}

/* 로딩 */
.loading {
  margin-top: 120px;
  text-align: center;
  font-size: 18px;
  color: #4b2d7a;
}

/* 반응형 */
@media (max-width: 1024px) {
  .profile-root { padding: 16px; }
  .profile-main { grid-template-columns: minmax(0, 1fr); }
  .profile-row { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 640px) {
  .top-header { flex-direction: column; }
  .top-header-left { flex-direction: column; align-items: flex-start; }
  .field-grid { grid-template-columns: minmax(0,1fr); }
}
`;
