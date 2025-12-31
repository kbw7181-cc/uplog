// ✅✅✅ 전체복붙: src/app/settings/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ✅ 프로필 이미지 src 안전 처리(스토리지 경로면 public url로 변환) + 캐시버스트
function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) return '';
  const v = avatarUrl.trim();
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return `${v}${v.includes('?') ? '&' : '?'}v=${Date.now()}`;
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(v);
    const u = data?.publicUrl || '';
    return u ? `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}` : '';
  } catch {
    return '';
  }
}

type Me = {
  user_id: string;
  email: string | null;
};

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  phone: string | null;
  industry: string | null;
  company: string | null;
  department: string | null;
  team: string | null;
  career: string | null;
  avatar_url: string | null;

  address_text: string | null;
  lat: number | null;
  lon: number | null;
};

type KpisRow = {
  month_start: string;
  month_end: string;

  contract_count_month?: number | null;
  contract_count_total?: number | null;

  cheer_count_month?: number | null;
  cheer_count_total?: number | null;

  like_received_month?: number | null;
  like_received_total?: number | null;

  posts_month?: number | null;
  posts_total?: number | null;
};

// ✅ 주소에 포함된 키워드로 자동 매핑(표시는 안 함)
const REGION_MAP: { keys: string[]; label: string; lat: number; lon: number }[] = [
  { keys: ['서울', '서울특별시'], label: '서울', lat: 37.5665, lon: 126.978 },
  { keys: ['부산', '부산광역시'], label: '부산', lat: 35.1796, lon: 129.0756 },
  { keys: ['대구', '대구광역시'], label: '대구', lat: 35.8714, lon: 128.6014 },
  { keys: ['인천', '인천광역시'], label: '인천', lat: 37.4563, lon: 126.7052 },
  { keys: ['광주', '광주광역시'], label: '광주', lat: 35.1595, lon: 126.8526 },
  { keys: ['대전', '대전광역시'], label: '대전', lat: 36.3504, lon: 127.3845 },
  { keys: ['울산', '울산광역시'], label: '울산', lat: 35.5384, lon: 129.3114 },
  { keys: ['세종', '세종특별자치시'], label: '세종', lat: 36.4801, lon: 127.289 },
  { keys: ['경기', '경기도'], label: '경기도', lat: 37.4138, lon: 127.5183 },
  { keys: ['강원', '강원도', '강원특별자치도'], label: '강원', lat: 37.8228, lon: 128.1555 },
  { keys: ['충북', '충청북도'], label: '충북', lat: 36.6357, lon: 127.4917 },
  { keys: ['충남', '충청남도'], label: '충남', lat: 36.6588, lon: 126.6728 },
  { keys: ['전북', '전라북도', '전북특별자치도'], label: '전북', lat: 35.7175, lon: 127.153 },
  { keys: ['전남', '전라남도'], label: '전남', lat: 34.8161, lon: 126.4629 },
  { keys: ['경북', '경상북도'], label: '경북', lat: 36.4919, lon: 128.8889 },
  { keys: ['경남', '경상남도'], label: '경남', lat: 35.4606, lon: 128.2132 },
  { keys: ['제주', '제주도', '제주특별자치도'], label: '제주', lat: 33.4996, lon: 126.5312 },
];

function autoMapLatLon(addressText: string) {
  const t = (addressText || '').replace(/\s+/g, ' ').trim();
  if (!t) return { lat: null as number | null, lon: null as number | null, region: '' };

  const hit = REGION_MAP.find((r) => r.keys.some((k) => t.includes(k)));
  if (!hit) return { lat: null, lon: null, region: '' };
  return { lat: hit.lat, lon: hit.lon, region: hit.label };
}

function pickName(p?: { nickname?: string | null; name?: string | null; email?: string | null }) {
  if (!p) return '대표님';
  return p.nickname || p.name || (p.email ? p.email.split('@')[0] : '대표님');
}

async function safeCount(fn: () => Promise<number>) {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export default function SettingsPage() {
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');
  const toastTimer = useRef<any>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // 입력 상태
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');

  // 경력: 드롭다운 + 기타 직접입력
  const [careerSel, setCareerSel] = useState('');
  const [careerCustom, setCareerCustom] = useState('');

  // 주소 입력만 → lat/lon 자동(표시 X)
  const [addressText, setAddressText] = useState('');
  const mapped = useMemo(() => autoMapLatLon(addressText), [addressText]);

  // 이미지 업로드
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 활동량
  const [counts, setCounts] = useState({
    likes: 0, // ✅ 받은 좋아요(총)
    posts: 0, // ✅ 작성글(총)
    feedbacks: 0,
    cheers: 0, // ✅ 받은 응원(총)
    newCount: 0,
    contractCount: 0, // ✅ 계약(총) = schedules 고객관리/계약
  });

  // 배지
  const [badges, setBadges] = useState<{ name: string; emoji: string }[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }

  // ✅ 하드 로그아웃(대표님 기존 로직 유지)
  const hardLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut error', e);
    }

    try {
      if (typeof window !== 'undefined') {
        const wipe = (s: Storage) => {
          for (let i = s.length - 1; i >= 0; i--) {
            const k = s.key(i);
            if (!k) continue;
            if (k.startsWith('sb-') || k.includes('supabase')) s.removeItem(k);
          }
        };
        wipe(localStorage);
        wipe(sessionStorage);
      }
    } catch (e) {
      console.error('wipe token error', e);
    }

    window.location.href = '/login';
  };

  const fetchKpis = async (uid: string): Promise<KpisRow | null> => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const p_today = `${yyyy}-${mm}-${dd}`;

    const tries: any[] = [
      { p_uid: uid, p_today },
      { uid, today: p_today },
    ];

    for (const args of tries) {
      const { data, error } = await supabase.rpc('get_user_kpis', args);
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        return (row as any) as KpisRow;
      }
    }
    return null;
  };

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setMe({ user_id: user.id, email: user.email ?? null });

      // ✅ profile 로드
      const { data: p } = await supabase
        .from('profiles')
        .select(
          'user_id, nickname, name, phone, industry, company, department, team, career, avatar_url, address_text, lat, lon'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      const pr = (p as any) as ProfileRow | null;

      const next: ProfileRow = {
        user_id: user.id,
        nickname: pr?.nickname ?? null,
        name: pr?.name ?? null,
        phone: pr?.phone ?? null,
        industry: pr?.industry ?? null,
        company: pr?.company ?? null,
        department: pr?.department ?? null,
        team: pr?.team ?? null,
        career: pr?.career ?? null,
        avatar_url: pr?.avatar_url ?? null,
        address_text: pr?.address_text ?? null,
        lat: pr?.lat ?? null,
        lon: pr?.lon ?? null,
      };

      setProfile(next);

      // 입력값 초기화
      setNickname(next.nickname ?? '');
      setName(next.name ?? '');
      setPhone(next.phone ?? '');
      setIndustry(next.industry ?? '');
      setCompany(next.company ?? '');
      setDepartment(next.department ?? '');
      setTeam(next.team ?? '');

      // 경력 분리
      const cv = (next.career ?? '').trim();
      const preset = ['0-1', '2', '3', '4-5', '6-9', '10+', '5+', '1+', '신입', '기타'];
      if (!cv) {
        setCareerSel('');
        setCareerCustom('');
      } else if (preset.includes(cv)) {
        setCareerSel(cv);
        setCareerCustom('');
      } else {
        setCareerSel('기타');
        setCareerCustom(cv);
      }

      setAddressText(next.address_text ?? '');

      const avatarSrc = getAvatarSrc(next.avatar_url);
      setAvatarPreview(avatarSrc);

      const uid = user.id;

      // ✅ KPI 함수 기준으로 "계약/받은좋아요/받은응원/작성글" 통일
      const kpis = await fetchKpis(uid);

      // ✅ 나머지 지표는 기존 안전집계 유지(없으면 0)
      const feedbacks = await safeCount(async () => {
        const { count } = await supabase
          .from('objection_feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid);
        return count ?? 0;
      });

      const newCount = await safeCount(async () => {
        const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        return count ?? 0;
      });

      setCounts({
        likes: Number(kpis?.like_received_total ?? 0),
        posts: Number(kpis?.posts_total ?? 0),
        feedbacks,
        cheers: Number(kpis?.cheer_count_total ?? 0),
        newCount,
        contractCount: Number(kpis?.contract_count_total ?? 0),
      });

      // ✅ 배지
      const badgeRows: { name: string; code: string }[] = [];

      await safeCount(async () => {
        const { data } = await supabase
          .from('monthly_badges')
          .select('badge_name, badge_code')
          .eq('winner_user_id', uid)
          .order('month_start', { ascending: false });
        (data || []).forEach((r: any) => badgeRows.push({ name: r.badge_name || '월간 배지', code: r.badge_code || '' }));
        return (data || []).length;
      });

      await safeCount(async () => {
        const { data } = await supabase
          .from('weekly_badges')
          .select('badge_name, badge_code')
          .eq('winner_user_id', uid)
          .order('week_start', { ascending: false })
          .limit(6);
        (data || []).forEach((r: any) => badgeRows.push({ name: r.badge_name || '주간 배지', code: r.badge_code || '' }));
        return (data || []).length;
      });

      const emojiFromCode = (code: string) => {
        const c = (code || '').toLowerCase();
        if (c.includes('top') || c.includes('king') || c.includes('mvp')) return '👑';
        if (c.includes('attendance') || c.includes('streak')) return '🔥';
        if (c.includes('likes')) return '❤️';
        if (c.includes('posts')) return '📝';
        if (c.includes('amount')) return '💎';
        if (c.includes('count')) return '📈';
        return '✨';
      };

      const uniq = new Map<string, { name: string; emoji: string }>();
      badgeRows.forEach((b) => {
        const key = `${b.name}`;
        if (!uniq.has(key)) uniq.set(key, { name: b.name, emoji: emojiFromCode(b.code) });
      });
      setBadges(Array.from(uniq.values()).slice(0, 12));

      setBooting(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const careerFinal = useMemo(() => {
    if (careerSel === '기타') return careerCustom.trim();
    return careerSel.trim();
  }, [careerSel, careerCustom]);

  const onPickAvatar = async (file?: File | null) => {
    if (!file || !me?.user_id) return;

    try {
      setAvatarUploading(true);

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `avatars/${me.user_id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png',
      });

      if (upErr) {
        console.error(upErr);
        showToast('❌ 이미지 업로드 실패');
        return;
      }

      const { error: pErr } = await supabase.from('profiles').update({ avatar_url: path }).eq('user_id', me.user_id);
      if (pErr) {
        console.error(pErr);
        showToast('❌ 프로필 저장 실패');
        return;
      }

      const src = getAvatarSrc(path);
      setAvatarPreview(src);
      setProfile((prev) => (prev ? { ...prev, avatar_url: path } : prev));
      showToast('✅ 이미지 변경 완료');
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!me?.user_id) return;

    setSaving(true);
    try {
      const nextLat = mapped.lat ?? null;
      const nextLon = mapped.lon ?? null;

      const payload: any = {
        nickname: nickname.trim() || null,
        name: name.trim() || null,
        phone: phone.trim() || null,
        industry: industry.trim() || null,
        company: company.trim() || null,
        department: department.trim() || null,
        team: team.trim() || null,
        career: careerFinal || null,

        address_text: addressText.trim() || null,
        lat: nextLat,
        lon: nextLon,
      };

      const { error } = await supabase.from('profiles').update(payload).eq('user_id', me.user_id);
      if (error) {
        console.error(error);
        showToast('❌ 저장 중 오류가 발생했어요.');
        return;
      }

      setProfile((prev) => (prev ? { ...prev, ...payload } : prev));
      showToast('✅ 저장 완료!');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    // 요청형(대표님 기존 방향 유지)
    showToast('⚠️ 탈퇴 요청이 접수되도록 연결이 필요해요.');
  };

  if (booting) {
    return (
      <div className="set-root">
        <div className="set-loading">설정을 불러오는 중…</div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const displayName = pickName({ nickname, name, email: me?.email ?? null });

  return (
    <div className="set-root">
      <div className="set-wrap">
        <header className="set-head">
          <div className="set-title">설정</div>
          <div className="set-sub">{displayName} 님의 프로필, 활동량, 배지, 로그아웃/탈퇴를 관리해요.</div>
        </header>

        {toast && <div className="toast">{toast}</div>}

        <div className="grid">
          {/* 좌측: 프로필/입력 */}
          <section className="card">
            <div className="cardTitle">프로필 설정</div>
            <div className="cardSub">닉네임/개인정보/주소를 저장하면 날씨 지역도 자동으로 바뀝니다.</div>

            <div className="profileTop">
              <div className="avatarBox">
                <div className="avatarRing">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="avatar" src={avatarPreview || '/assets/upzzu1.png'} alt="avatar" />
                </div>

                <label className={`btn ghost ${avatarUploading ? 'disabled' : ''}`}>
                  {avatarUploading ? '업로드 중…' : '이미지 변경'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickAvatar(e.target.files?.[0])}
                    style={{ display: 'none' }}
                    disabled={avatarUploading}
                  />
                </label>
              </div>

              <div className="who">
                <div className="whoName">{displayName}</div>
                <div className="whoEmail">{me?.email || '-'}</div>

                <div className="kpis">
                  <Kpi title="좋아요" value={counts.likes} />
                  <Kpi title="게시글" value={counts.posts} />
                  <Kpi title="피드백" value={counts.feedbacks} />
                  <Kpi title="응원" value={counts.cheers} />
                </div>
                <div className="kpis2">
                  <Kpi title="신규" value={counts.newCount} accent />
                  <Kpi title="계약" value={counts.contractCount} accent />
                </div>
              </div>
            </div>

            <div className="formGrid">
              <Field label="닉네임" value={nickname} onChange={setNickname} placeholder="예: 신입입니다" />
              <Field label="이름" value={name} onChange={setName} placeholder="예: 강보원" />
              <Field label="전화번호" value={phone} onChange={setPhone} placeholder="예: 010-0000-0000" />
              <Field label="업종" value={industry} onChange={setIndustry} placeholder="예: 뷰티/보험/교육…" />
              <Field label="회사명" value={company} onChange={setCompany} placeholder="예: 올무" />
              <Field label="부서명" value={department} onChange={setDepartment} placeholder="예: UP" />
              <Field label="팀명" value={team} onChange={setTeam} placeholder="예: 1팀" />

              <div className="field">
                <div className="label">경력</div>
                <div className="careerRow">
                  <select className="select" value={careerSel} onChange={(e) => setCareerSel(e.target.value)}>
                    <option value="">선택해주세요</option>
                    <option value="신입">신입</option>
                    <option value="0-1">0~1년</option>
                    <option value="2">2년</option>
                    <option value="3">3년</option>
                    <option value="4-5">4~5년</option>
                    <option value="6-9">6~9년</option>
                    <option value="10+">10년 이상</option>
                    <option value="기타">기타(직접입력)</option>
                  </select>

                  {careerSel === '기타' && (
                    <input
                      className="input"
                      value={careerCustom}
                      onChange={(e) => setCareerCustom(e.target.value)}
                      placeholder="예: 12년 / 2년6개월 / 프리랜서"
                    />
                  )}
                </div>
              </div>

              <div className="field full">
                <div className="label">주소(날씨 지역)</div>
                <input
                  className="input"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="예: 대전시 서구 / 서울특별시 강남구 / 부산 해운대구"
                />
              </div>
            </div>

            <div className="actions">
              <button className={`btn primary ${saving ? 'disabled' : ''}`} onClick={saveProfile} disabled={saving}>
                {saving ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </section>

          {/* 우측: 배지/로그아웃/탈퇴 */}
          <section className="card side">
            <div className="cardTitle">배지 & 활동</div>
            <div className="cardSub">배지 이름과 이모지를 구분해서 깔끔하게 보여줘요.</div>

            <div className="badgeBox">
              {badges.length === 0 ? (
                <div className="empty">아직 표시할 배지가 없어요 ✨</div>
              ) : (
                <div className="badgeList">
                  {badges.map((b, idx) => (
                    <div key={`${b.name}-${idx}`} className="badge">
                      <div className="badgeEmoji">{b.emoji}</div>
                      <div className="badgeName">{b.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="cardTitle">로그아웃</div>
            <div className="cardSub">이 기기에서 세션/토큰까지 정리하고 로그아웃합니다.</div>
            <button className="btn danger" onClick={hardLogout}>
              로그아웃
            </button>

            <div className="divider" />

            <div className="cardTitle">탈퇴하기</div>
            <div className="cardSub">탈퇴 요청 형태로 연결합니다.</div>
            <button className="btn danger2" onClick={deleteAccount}>
              탈퇴하기(요청)
            </button>
          </section>
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function Kpi({ title, value, accent }: { title: string; value: number; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? 'accent' : ''}`}>
      <div className="kpiT">{title}</div>
      <div className="kpiV">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

const styles = `
.set-root{
  min-height:100vh;
  padding:22px;
  box-sizing:border-box;
  background:
    radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(900px 560px at 82% 18%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 64%),
    linear-gradient(180deg, #fff3fb 0%, #f6f2ff 45%, #eef8ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color:#201235;
}
.set-wrap{ max-width:1060px; margin:0 auto; }
.set-head{
  border-radius:24px;
  padding:18px 18px;
  background: linear-gradient(135deg, rgba(236,72,153,0.74), rgba(124,58,237,0.70));
  color:#fff;
  box-shadow: 0 16px 28px rgba(0,0,0,0.14);
  border:1px solid rgba(255,255,255,0.35);
}
.set-title{ font-size:24px; font-weight:950; letter-spacing:-0.3px; }
.set-sub{ margin-top:6px; font-size:15px; font-weight:900; opacity:0.92; }

.toast{
  margin-top:12px;
  border-radius:16px;
  padding:12px 14px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(236,72,153,0.22);
  box-shadow: 0 14px 22px rgba(0,0,0,0.10);
  font-weight:950;
  color:#3a1b5a;
}

.grid{
  margin-top:14px;
  display:grid;
  grid-template-columns: 1.5fr 0.8fr;
  gap:14px;
}
@media (max-width: 980px){
  .grid{ grid-template-columns:1fr; }
}

.card{
  border-radius:22px;
  padding:16px 16px;
  background: rgba(255,255,255,0.96);
  box-shadow: 0 14px 26px rgba(0,0,0,0.10);
  border: 1px solid rgba(229,221,255,0.85);
  min-width: 0;
}
.card.side{
  position: sticky;
  top: 14px;
  align-self: start;
}
@media (max-width: 980px){
  .card.side{ position: static; }
}

.cardTitle{ font-size:20px; font-weight:950; color:#5d3bdb; letter-spacing:-0.2px; }
.cardSub{ margin-top:6px; font-size:14px; color:#7a69c4; font-weight:900; line-height:1.35; }

.profileTop{
  margin-top:14px;
  display:grid;
  grid-template-columns: 220px minmax(0,1fr);
  gap:14px;
  align-items:start;
}
@media (max-width: 760px){
  .profileTop{ grid-template-columns: 1fr; }
}

.avatarBox{
  border-radius:22px;
  padding:14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(243,232,255,0.55));
  border: 1px solid rgba(168,85,247,0.22);
  box-shadow: 0 16px 28px rgba(0,0,0,0.08);
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
}
.avatarRing{
  width: 156px;
  height: 156px;
  border-radius: 999px;
  padding: 5px;
  background: linear-gradient(135deg, rgba(236,72,153,0.95), rgba(124,58,237,0.90));
  box-shadow: 0 14px 26px rgba(236,72,153,0.20);
}
.avatar{
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  background: #fff;
}
.who{ padding: 4px 2px; min-width: 0; }
.whoName{ font-size:24px; font-weight:950; color:#241336; word-break: break-word; }
.whoEmail{ margin-top:4px; font-size:13px; font-weight:900; color:#6a58b3; word-break: break-word; }

.kpis{
  margin-top:10px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap:10px;
}
.kpis2{
  margin-top:10px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap:10px;
}
@media (max-width: 520px){
  .kpis{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}

.kpi{
  border-radius:16px;
  padding:10px 10px;
  border: 1px solid rgba(124,58,237,0.14);
  background: rgba(255,255,255,0.90);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  min-width: 0;
}
.kpi.accent{
  border-color: rgba(236,72,153,0.24);
  box-shadow: 0 12px 22px rgba(236,72,153,0.10);
}
.kpiT{ font-size:12px; font-weight:950; color:#6a58b3; }
.kpiV{ margin-top:4px; font-size:18px; font-weight:950; color:#e11d48; }

.formGrid{
  margin-top:14px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap:12px 12px;
}
@media (max-width: 860px){
  .formGrid{ grid-template-columns: 1fr; }
}
.field{ min-width: 0; }
.field.full{ grid-column: 1 / -1; }

.label{
  font-size:14px;
  font-weight:950;
  color:#3a1b5a;
}
.input{
  width:100%;
  margin-top:8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(124,58,237,0.16);
  background: rgba(255,255,255,0.94);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  outline: none;
  font-size: 14px;
  font-weight: 900;
  color: #23123a;
  box-sizing: border-box;
}
.input::placeholder{ color: rgba(35,18,58,0.45); font-weight:900; }

.careerRow{
  display:flex;
  gap:10px;
  margin-top:8px;
  align-items:center;
  min-width: 0;
}
.select{
  width:100%;
  height:38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(124,58,237,0.16);
  background: rgba(255,255,255,0.94);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  outline: none;
  font-size: 14px;
  font-weight: 900;
  color: #23123a;
  appearance: none;
  box-sizing: border-box;
}

.actions{
  margin-top:14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.btn{
  height:42px;
  padding:0 16px;
  border-radius:999px;
  border:1px solid rgba(124,58,237,0.22);
  background:#fff;
  color:#2a1236;
  font-weight:950;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  box-shadow: 0 12px 18px rgba(0,0,0,0.10);
  transition: transform .14s ease, box-shadow .14s ease, filter .14s ease;
}
.btn:hover{
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(0,0,0,0.14);
  filter: brightness(1.01);
}
.btn.primary{
  background: linear-gradient(135deg, rgba(244,114,182,0.92), rgba(168,85,247,0.90));
  color:#fff;
  border-color: rgba(255,255,255,0.55);
}
.btn.ghost{
  background: rgba(0,0,0,0.55);
  color:#fff;
  border-color: rgba(255,255,255,0.25);
  width: 100%;
}
.btn.danger{
  width:100%;
  background: linear-gradient(135deg, rgba(255,77,141,0.92), rgba(255,122,69,0.88));
  color:#fff;
  border-color: rgba(255,255,255,0.55);
}
.btn.danger2{
  width:100%;
  background: linear-gradient(135deg, rgba(17,24,39,0.88), rgba(124,58,237,0.72));
  color:#fff;
  border-color: rgba(255,255,255,0.20);
}
.btn.disabled{
  opacity: 0.6;
  pointer-events: none;
}

.divider{
  margin: 14px 0;
  height:1px;
  background: rgba(124,58,237,0.12);
}

.badgeBox{
  margin-top:12px;
}
.badgeList{
  display:grid;
  grid-template-columns: 1fr;
  gap:10px;
}
.badge{
  display:flex;
  align-items:center;
  gap:10px;
  border-radius:16px;
  padding:12px 12px;
  border:1px solid rgba(236,72,153,0.18);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 12px 18px rgba(236,72,153,0.08);
  min-width: 0;
}
.badgeEmoji{
  width:40px;
  height:40px;
  border-radius:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, rgba(236,72,153,0.16), rgba(124,58,237,0.14));
  font-size:20px;
  flex: 0 0 auto;
}
.badgeName{
  font-size:15px;
  font-weight:950;
  color:#241336;
  min-width: 0;
  word-break: break-word;
}
.empty{
  border-radius:16px;
  padding:12px 12px;
  border:1px dashed rgba(124,58,237,0.22);
  color:#6a58b3;
  font-weight:950;
  background: rgba(255,255,255,0.80);
}

.set-loading{
  max-width: 620px;
  margin: 80px auto;
  border-radius: 22px;
  padding: 18px;
  background: rgba(255,255,255,0.92);
  border:1px solid rgba(124,58,237,0.16);
  box-shadow: 0 16px 24px rgba(0,0,0,0.10);
  font-weight:950;
  color:#241336;
}
`;
