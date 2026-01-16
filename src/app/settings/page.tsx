// ✅✅✅ 전체복붙: src/app/settings/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

// ✅ 프로필 이미지 src 안전 처리(스토리지 경로면 public url로 변환) + 캐시버스트
function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) return '';
  const v = avatarUrl.trim();
  if (!v) return '';

  if (v.startsWith('http://') || v.startsWith('https://')) {
    return `${v}${v.includes('?') ? '&' : '?'}v=${Date.now()}`;
  }

  try {
    let raw = v.replace(/^public\//, '').trim();
    raw = raw.startsWith('avatars/') ? raw.replace(/^avatars\//, '') : raw;

    const { data } = supabase.storage.from('avatars').getPublicUrl(raw);
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

  main_goal: string | null;
};

// ✅ 주소 키워드 매핑
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

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    const n = await fn();
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function safeRun<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** ✅ KPI 집계 */
async function calcCounts(uid: string) {
  const newCount = await safeCount(async () => {
    const { count, error } = await supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if (error) throw error;
    return count ?? 0;
  });

  const contractCount = await safeCount(async () => {
    const { count: c1, error: e1 } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .or(
        [
          'stage.ilike.계약%',
          'stage.ilike.%계약%',
          'stage.eq.계약',
          'stage.eq.계약1',
          'stage.eq.계약2',
          'stage.eq.계약3',
          'stage.eq.계약 1',
          'stage.eq.계약 2',
          'stage.eq.계약 3',
        ].join(',')
      );

    if (!e1 && (c1 ?? 0) > 0) return c1 ?? 0;

    const { count: c2, error: e2 } = await supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .or(['category.ilike.계약%', 'category.ilike.%계약%', 'title.ilike.%계약%'].join(','));
    if (e2) throw e2;
    return c2 ?? 0;
  });

  const posts = await safeCount(async () => {
    const { count, error } = await supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if (error) throw error;
    return count ?? 0;
  });

  const likeReceived = await safeCount(async () => {
    const { data: myPosts, error: pErr } = await supabase
      .from('community_posts')
      .select('id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(400);
    if (pErr) throw pErr;

    const ids = (myPosts || []).map((r: any) => r.id).filter(Boolean);
    if (ids.length === 0) return 0;

    const { count, error: lErr } = await supabase.from('post_likes').select('id', { count: 'exact', head: true }).in('post_id', ids);
    if (lErr) throw lErr;
    return count ?? 0;
  });

  const cheers = await safeCount(async () => {
    const { count, error } = await supabase.from('cheers').select('id', { count: 'exact', head: true }).eq('to_user_id', uid);
    if (!error) return count ?? 0;

    const { count: c2, error: e2 } = await supabase.from('cheer_logs').select('id', { count: 'exact', head: true }).eq('to_user_id', uid);
    if (e2) throw e2;
    return c2 ?? 0;
  });

  const feedbacks = await safeCount(async () => {
    const { count, error } = await supabase.from('objection_feedbacks').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if (error) throw error;
    return count ?? 0;
  });

  return { likes: likeReceived, posts, feedbacks, cheers, newCount, contractCount };
}

/** ✅ 이번달 활동 배지 */
async function calcActivityBadges(uid: string): Promise<{ monthLogDays: number; taskDone: number; taskTotal: number; scheduleCount: number }> {
  const now = new Date();
  const from = fmtYMD(startOfMonth(now));
  const to = fmtYMD(endOfMonth(now));

  const monthLogDays = await safeCount(async () => {
    const { data, error } = await supabase
      .from('up_logs')
      .select('log_date, mood, day_goal, week_goal, month_goal, good, bad, tomorrow, created_at')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to);

    if (error) throw error;

    const set = new Set<string>();
    (data || []).forEach((u: any) => {
      const d = String(u.log_date || '').slice(0, 10);
      if (!d) return;

      const hasAny =
        !!String(u.mood || '').trim() ||
        !!String(u.day_goal || '').trim() ||
        !!String(u.week_goal || '').trim() ||
        !!String(u.month_goal || '').trim() ||
        !!String(u.good || '').trim() ||
        !!String(u.bad || '').trim() ||
        !!String(u.tomorrow || '').trim();

      if (hasAny) set.add(d);
    });

    return set.size;
  });

  const taskStats = await safeRun(
    async () => {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('done, task_date')
        .eq('user_id', uid)
        .gte('task_date', from)
        .lte('task_date', to);

      if (error) throw error;
      const rows = (data || []) as any[];
      const total = rows.length;
      const done = rows.filter((r) => !!r.done).length;
      return { total, done };
    },
    { total: 0, done: 0 }
  );

  const scheduleCount = await safeCount(async () => {
    const { count, error } = await supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to);

    if (error) throw error;
    return count ?? 0;
  });

  return {
    monthLogDays,
    taskDone: taskStats.done ?? 0,
    taskTotal: taskStats.total ?? 0,
    scheduleCount,
  };
}

type BadgeItem = { name: string; emoji: string; isNew: boolean };

function emojiFromBadgeCode(code: string) {
  const c2 = (code || '').toLowerCase();
  if (c2.includes('top') || c2.includes('king') || c2.includes('mvp')) return '👑';
  if (c2.includes('attendance') || c2.includes('streak')) return '🔥';
  if (c2.includes('likes')) return '❤️';
  if (c2.includes('posts')) return '📝';
  if (c2.includes('amount')) return '💎';
  if (c2.includes('count')) return '📈';
  return '✨';
}

function buildActivityBadgeList(v: { monthLogDays: number; taskDone: number; taskTotal: number; scheduleCount: number }) {
  const list: { emoji: string; name: string }[] = [];

  if (v.monthLogDays >= 25) list.push({ emoji: '🗓️', name: `기록 마스터 (${v.monthLogDays}일)` });
  else if (v.monthLogDays >= 15) list.push({ emoji: '🗓️', name: `기록 중독자 (${v.monthLogDays}일)` });
  else if (v.monthLogDays >= 7) list.push({ emoji: '🗓️', name: `기록 루키 (${v.monthLogDays}일)` });
  else if (v.monthLogDays >= 1) list.push({ emoji: '🗓️', name: `첫 기록 시작 (${v.monthLogDays}일)` });

  const rate = v.taskTotal > 0 ? Math.round((v.taskDone / v.taskTotal) * 100) : 0;
  if (v.taskTotal >= 10 && rate >= 80) list.push({ emoji: '✅', name: `체크리스트 챔피언 (${rate}%)` });
  else if (v.taskTotal >= 5 && rate >= 50) list.push({ emoji: '✅', name: `체크 습관 ON (${rate}%)` });
  else if (v.taskTotal >= 1) list.push({ emoji: '✅', name: `체크 시작 (${v.taskDone}/${v.taskTotal})` });

  if (v.scheduleCount >= 40) list.push({ emoji: '📌', name: `스케줄 폭주 (${v.scheduleCount})` });
  else if (v.scheduleCount >= 20) list.push({ emoji: '📌', name: `스케줄 꾸준 (${v.scheduleCount})` });
  else if (v.scheduleCount >= 5) list.push({ emoji: '📌', name: `스케줄 러너 (${v.scheduleCount})` });
  else if (v.scheduleCount >= 1) list.push({ emoji: '📌', name: `첫 스케줄 (${v.scheduleCount})` });

  if (list.length === 0) list.push({ emoji: '✨', name: '이번달 첫 행동을 시작해요' });

  return list.slice(0, 6);
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
  const [mainGoal, setMainGoal] = useState('');

  // 경력
  const [careerSel, setCareerSel] = useState('');
  const [careerCustom, setCareerCustom] = useState('');

  // 주소
  const [addressText, setAddressText] = useState('');
  const mapped = useMemo(() => autoMapLatLon(addressText), [addressText]);

  // 이미지
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 활동량 KPI
  const [counts, setCounts] = useState({
    likes: 0,
    posts: 0,
    feedbacks: 0,
    cheers: 0,
    newCount: 0,
    contractCount: 0,
  });

  // 이번달 활동 배지
  const [activity, setActivity] = useState({ monthLogDays: 0, taskDone: 0, taskTotal: 0, scheduleCount: 0 });
  const activityBadges = useMemo(() => buildActivityBadgeList(activity), [activity]);

  // 수상 배지 + NEW
  const [badges, setBadges] = useState<BadgeItem[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }

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

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user) {
          router.replace('/login');
          return;
        }

        setMe({ user_id: user.id, email: user.email ?? null });

        // ✅ 프로필 row 없으면 생성되게 upsert
        await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              email: user.email ?? null,
            } as any,
            { onConflict: 'user_id' }
          );

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, nickname, name, phone, industry, company, department, team, career, avatar_url, address_text, lat, lon, main_goal')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pErr) {
          console.error('profile load error', pErr);
        }

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
          main_goal: (pr as any)?.main_goal ?? null,
        };

        setProfile(next);

        setNickname(next.nickname ?? '');
        setName(next.name ?? '');
        setPhone(next.phone ?? '');
        setIndustry(next.industry ?? '');
        setCompany(next.company ?? '');
        setDepartment(next.department ?? '');
        setTeam(next.team ?? '');
        setMainGoal(next.main_goal ?? '');

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

        setAvatarPreview(getAvatarSrc(next.avatar_url));

        const uid = user.id;
        setCounts(await calcCounts(uid));
        setActivity(await calcActivityBadges(uid));

        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        const collected: { name: string; code: string; ts: number }[] = [];

        await safeCount(async () => {
          const { data } = await supabase
            .from('monthly_badges')
            .select('badge_name, badge_code, month_start')
            .eq('winner_user_id', uid)
            .order('month_start', { ascending: false })
            .limit(12);

          (data || []).forEach((r: any) => {
            const t = r?.month_start ? new Date(r.month_start).getTime() : 0;
            collected.push({ name: r.badge_name || '월간 배지', code: r.badge_code || '', ts: t });
          });
          return (data || []).length;
        });

        await safeCount(async () => {
          const { data } = await supabase
            .from('weekly_badges')
            .select('badge_name, badge_code, week_start')
            .eq('winner_user_id', uid)
            .order('week_start', { ascending: false })
            .limit(12);

          (data || []).forEach((r: any) => {
            const t = r?.week_start ? new Date(r.week_start).getTime() : 0;
            collected.push({ name: r.badge_name || '주간 배지', code: r.badge_code || '', ts: t });
          });
          return (data || []).length;
        });

        const uniq = new Map<string, BadgeItem>();
        collected.forEach((b) => {
          const key = `${b.name}__${b.code}`;
          if (uniq.has(key)) return;
          const isNew = b.ts ? now - b.ts <= sevenDays : false;
          uniq.set(key, { name: b.name, emoji: emojiFromBadgeCode(b.code), isNew });
        });

        const arr = Array.from(uniq.values());
        arr.sort((a, b) => Number(b.isNew) - Number(a.isNew));
        setBadges(arr.slice(0, 12));
      } finally {
        setBooting(false);
      }
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
      const path = `${me.user_id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '0',
        upsert: true,
        contentType: file.type || 'image/png',
      });

      if (upErr) {
        console.error(upErr);
        showToast('❌ 이미지 업로드 실패');
        return;
      }

      // ✅ row 없을 수도 있으니 upsert로 고정
      const { error: pErr } = await supabase
        .from('profiles')
        .upsert({ user_id: me.user_id, avatar_url: path } as any, { onConflict: 'user_id' });

      if (pErr) {
        console.error(pErr);
        showToast('❌ 프로필 저장 실패');
        return;
      }

      setAvatarPreview(getAvatarSrc(path));
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
      const payload: any = {
        user_id: me.user_id, // ✅ upsert 필수
        nickname: nickname.trim() || null,
        name: name.trim() || null,
        phone: phone.trim() || null,
        industry: industry.trim() || null,
        company: company.trim() || null,
        department: department.trim() || null,
        team: team.trim() || null,
        career: careerFinal || null,

        address_text: addressText.trim() || null,
        lat: mapped.lat ?? null,
        lon: mapped.lon ?? null,

        main_goal: mainGoal.trim() || null,
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        console.error(error);
        showToast('❌ 저장 중 오류가 발생했어요.');
        return;
      }

      setProfile((prev) => (prev ? { ...prev, ...payload } : prev));

      setCounts(await calcCounts(me.user_id));
      setActivity(await calcActivityBadges(me.user_id));

      showToast('✅ 저장 완료!');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
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
    <ClientShell>
      <div className="set-root">
        <div className="set-wrap">
          <header className="set-head">
            <div className="set-title">설정</div>
            <div className="set-sub">{displayName} 님의 프로필, 메인목표, 활동량, 배지, 로그아웃/탈퇴를 관리해요.</div>
          </header>

          {toast && <div className="toast">{toast}</div>}

          <div className="grid">
            {/* LEFT */}
            <section className="card">
              <div className="cardTop">
                <div>
                  <div className="cardTitle">프로필 설정</div>
                </div>
              </div>

              <div className="profileTop">
                <div className="avatarBox">
                  <div className="avatarRing">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="avatar"
                      src={avatarPreview || '/upzzu1.png'}
                      alt="avatar"
                      onError={(e: any) => {
                        const cur = e.currentTarget?.src || '';
                        if (cur.includes('/upzzu1.png')) e.currentTarget.src = '/gogo.png';
                        else e.currentTarget.src = '/upzzu1.png';
                      }}
                    />
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

              <div className="goalCard">
                <div className="goalHead">
                  <div className="goalTitle">메인 목표</div>
                  <div className="goalPill">메인 표시</div>
                </div>
                <div className="goalSub">메인 화면에 표시되는 목표 문구예요.</div>
                <textarea
                  className="textarea"
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                  placeholder="예: 3개월 안에 월 계약 30건, 팀 TOP 1 달성"
                />
              </div>

              <div className="formGridWrap">
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
                    <div className="miniHint">
                      자동 매핑: <b>{mapped.region || '미매핑'}</b>
                      {mapped.lat && mapped.lon ? (
                        <>
                          {' '}
                          · ({mapped.lat.toFixed(4)}, {mapped.lon.toFixed(4)})
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="actionsBottom">
                <button className={`btn primary ${saving ? 'disabled' : ''}`} onClick={saveProfile} disabled={saving}>
                  {saving ? '저장 중…' : '저장하기'}
                </button>
              </div>
            </section>

            {/* RIGHT */}
            <section className="card side">
              <div className="cardTitle">배지 & 활동</div>
              <div className="cardSub">나의UP관리 기준 “이번달 활동 배지”와 수상 배지를 같이 보여줘요.</div>

              <div className="miniBlock">
                <div className="miniTitle">이번달 활동 배지</div>
                <div className="miniSub">
                  🗓 기록 <b>{activity.monthLogDays}</b> · ✅ 체크 <b>{activity.taskDone}</b>/{activity.taskTotal} · 📌 스케줄{' '}
                  <b>{activity.scheduleCount}</b>
                </div>

                <div className="badgeList2">
                  {activityBadges.map((b, idx) => (
                    <div key={`act-${idx}`} className="badge2">
                      <div className="badgeEmoji2">{b.emoji}</div>
                      <div className="badgeName2">{b.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div className="badgeBox">
                <div className="miniTitle">수상 배지</div>
                <div className="miniSub">최근 7일 이내 수상은 NEW로 표시돼요.</div>

                {badges.length === 0 ? (
                  <div className="empty">아직 표시할 배지가 없어요 ✨</div>
                ) : (
                  <div className="badgeList">
                    {badges.map((b, idx) => (
                      <div key={`${b.name}-${idx}`} className={`badge ${b.isNew ? 'new' : ''}`}>
                        <div className="badgeEmoji">{b.emoji}</div>
                        <div className="badgeName">{b.name}</div>
                        {b.isNew && <div className="badgeNew">NEW</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="divider" />

              <div className="miniActionRow">
                <button className="btn mini dangerMini" onClick={hardLogout}>
                  로그아웃
                </button>
                <button className="btn mini dangerMini2" onClick={deleteAccount}>
                  탈퇴
                </button>
              </div>
            </section>
          </div>
        </div>

        <style jsx>{styles}</style>
      </div>
    </ClientShell>
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
    radial-gradient(1100px 520px at 12% 6%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%),
    radial-gradient(900px 560px at 86% 14%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 62%),
    linear-gradient(180deg, #fff5fb 0%, #f6f2ff 42%, #eef8ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color:#201235;
}

.set-wrap{ max-width: 1020px; margin: 0 auto; }

.set-head{
  border-radius: 26px;
  padding: 18px 18px;
  background: linear-gradient(135deg, rgba(236,72,153,0.78), rgba(124,58,237,0.76));
  color:#fff;
  border: 1px solid rgba(255,255,255,0.36);
  box-shadow: 0 18px 32px rgba(0,0,0,0.14);
}
.set-title{ font-size: 24px; font-weight: 950; letter-spacing: -0.3px; }
.set-sub{ margin-top:6px; font-size: 14px; font-weight: 900; opacity: 0.92; line-height: 1.35; }

.toast{
  margin-top:12px;
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.94);
  border: 1px solid rgba(236,72,153,0.20);
  box-shadow: 0 14px 24px rgba(0,0,0,0.10);
  font-weight: 950;
  color: #3a1b5a;
}

.grid{
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1.35fr 0.8fr;
  gap: 14px;
}
@media (max-width: 980px){
  .grid{ grid-template-columns: 1fr; }
}

.card{
  border-radius: 22px;
  padding: 16px 16px;
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(229,221,255,0.85);
  box-shadow: 0 14px 26px rgba(0,0,0,0.10);
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

.cardTop{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
}

.cardTitle{ font-size: 20px; font-weight: 950; color: #5d3bdb; letter-spacing: -0.2px; }
.cardSub{ margin-top: 6px; font-size: 13px; color:#7a69c4; font-weight: 900; line-height: 1.35; }

.profileTop{
  margin-top: 14px;
  display: grid;
  grid-template-columns: 220px minmax(0,1fr);
  gap: 14px;
  align-items: start;
}
@media (max-width: 760px){
  .profileTop{ grid-template-columns: 1fr; }
}

.avatarBox{
  border-radius: 22px;
  padding: 14px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.88), rgba(243,232,255,0.56));
  border: 1px solid rgba(168,85,247,0.18);
  box-shadow: 0 16px 28px rgba(0,0,0,0.08);
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
}
.avatarRing{
  width: 150px;
  height: 150px;
  border-radius: 999px;
  padding: 5px;
  background: linear-gradient(135deg, rgba(236,72,153,0.96), rgba(124,58,237,0.92));
  box-shadow: 0 16px 28px rgba(236,72,153,0.18);
}
.avatar{
  width:100%;
  height:100%;
  border-radius: 999px;
  object-fit: cover;
  background:#fff;
}

.who{ padding: 2px 2px; min-width: 0; }
.whoName{ font-size: 24px; font-weight: 950; color:#241336; word-break: break-word; }
.whoEmail{ margin-top: 4px; font-size: 13px; font-weight: 900; color:#6a58b3; word-break: break-word; }

.kpis{
  margin-top: 10px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 10px;
}
.kpis2{
  margin-top: 10px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
}
@media (max-width: 520px){
  .kpis{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}

.kpi{
  border-radius: 16px;
  padding: 10px 10px;
  border: 1px solid rgba(124,58,237,0.12);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  min-width: 0;
}
.kpi.accent{
  border-color: rgba(236,72,153,0.22);
  box-shadow: 0 12px 20px rgba(236,72,153,0.10);
}
.kpiT{ font-size: 12px; font-weight: 950; color:#6a58b3; }
.kpiV{ margin-top: 4px; font-size: 18px; font-weight: 950; color:#e11d48; }

.goalCard{
  margin-top: 14px;
  border-radius: 20px;
  padding: 14px;
  border: 1px solid rgba(236,72,153,0.16);
  background: linear-gradient(180deg, rgba(255,247,252,0.96), rgba(246,240,255,0.92));
  box-shadow: 0 14px 22px rgba(255,120,190,0.10);
}
.goalHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.goalTitle{ font-size: 14px; font-weight: 950; color:#2a1236; }
.goalPill{
  font-size: 11px;
  font-weight: 950;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(124,58,237,0.12);
  border: 1px solid rgba(124,58,237,0.18);
  color:#5d3bdb;
}
.goalSub{ margin-top: 6px; font-size: 12px; font-weight: 900; color:#6a58b3; opacity: 0.92; }
.textarea{
  width: 100%;
  margin-top: 10px;
  min-height: 74px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(124,58,237,0.14);
  background: rgba(255,255,255,0.95);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  outline: none;
  font-size: 13px;
  font-weight: 900;
  color:#23123a;
  box-sizing:border-box;
  resize: vertical;
  line-height: 1.4;
}
.textarea::placeholder{ color: rgba(35,18,58,0.45); font-weight: 900; }

.formGridWrap{ margin-top: 14px; max-width: 680px; }
@media (max-width: 980px){
  .formGridWrap{ max-width: 100%; }
}
.formGrid{
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px 12px;
}
@media (max-width: 860px){
  .formGrid{ grid-template-columns: 1fr; }
}
.field{ min-width:0; }
.field.full{ grid-column: 1 / -1; }

.label{
  font-size: 13px;
  font-weight: 950;
  color:#3a1b5a;
}
.input{
  width: 100%;
  margin-top: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(124,58,237,0.14);
  background: rgba(255,255,255,0.95);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  outline: none;
  font-size: 13px;
  font-weight: 900;
  color:#23123a;
  box-sizing:border-box;
}
.input::placeholder{ color: rgba(35,18,58,0.45); font-weight: 900; }

.miniHint{
  margin-top: 8px;
  font-size: 12px;
  font-weight: 900;
  color:#6a58b3;
  opacity: 0.92;
}

.careerRow{
  display:flex;
  gap:10px;
  margin-top: 8px;
  align-items:center;
  min-width:0;
}
.select{
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(124,58,237,0.14);
  background: rgba(255,255,255,0.95);
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  outline: none;
  font-size: 13px;
  font-weight: 900;
  color:#23123a;
  appearance: none;
  box-sizing:border-box;
}

.actionsBottom{
  margin-top: 14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.btn{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(124,58,237,0.18);
  background: rgba(255,255,255,0.96);
  color:#2a1236;
  font-weight: 950;
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
  border-color: rgba(255,255,255,0.52);
}
.btn.ghost{
  background: rgba(17,24,39,0.64);
  color:#fff;
  border-color: rgba(255,255,255,0.22);
  width: 100%;
}
.btn.disabled{
  opacity: 0.6;
  pointer-events: none;
}

.divider{
  margin: 14px 0;
  height: 1px;
  background: rgba(124,58,237,0.12);
}

.miniBlock{
  margin-top: 12px;
  border-radius: 18px;
  padding: 12px;
  border: 1px solid rgba(124,58,237,0.12);
  background: rgba(255,255,255,0.94);
  box-shadow: 0 14px 20px rgba(40,10,70,0.08);
}
.miniTitle{ font-size: 14px; font-weight: 950; color:#2a1236; }
.miniSub{ margin-top: 6px; font-size: 12px; font-weight: 900; color:#6a58b3; opacity: 0.92; }

.badgeList2{
  margin-top: 10px;
  display:grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.badge2{
  display:flex;
  align-items:center;
  gap:10px;
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(124,58,237,0.10);
  background: linear-gradient(180deg, rgba(255,247,252,0.96), rgba(246,240,255,0.92));
  box-shadow: 0 12px 18px rgba(255,120,190,0.08);
}
.badgeEmoji2{
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(255,255,255,0.90);
  border: 1px solid rgba(236,72,153,0.14);
  font-size: 18px;
  flex: 0 0 auto;
}
.badgeName2{
  font-size: 13px;
  font-weight: 950;
  color:#241336;
  min-width:0;
  word-break: break-word;
}

.badgeBox{ margin-top: 12px; }
.badgeList{ margin-top: 10px; display:grid; grid-template-columns: 1fr; gap: 10px; }
.badge{
  position: relative;
  display:flex;
  align-items:center;
  gap:10px;
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(236,72,153,0.16);
  background: rgba(255,255,255,0.94);
  box-shadow: 0 12px 18px rgba(236,72,153,0.08);
  min-width:0;
}
.badge.new{
  border-color: rgba(236,72,153,0.30);
  box-shadow: 0 14px 22px rgba(236,72,153,0.12);
}
.badgeEmoji{
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, rgba(236,72,153,0.14), rgba(124,58,237,0.12));
  font-size: 20px;
  flex: 0 0 auto;
}
.badgeName{
  font-size: 14px;
  font-weight: 950;
  color:#241336;
  min-width:0;
  word-break: break-word;
}
.badgeNew{
  margin-left: auto;
  font-size: 11px;
  font-weight: 950;
  padding: 6px 10px;
  border-radius: 999px;
  color:#fff;
  background: linear-gradient(135deg, rgba(236,72,153,0.92), rgba(124,58,237,0.88));
  border: 1px solid rgba(255,255,255,0.50);
  box-shadow: 0 10px 16px rgba(236,72,153,0.14);
}

.empty{
  margin-top: 10px;
  border-radius: 16px;
  padding: 12px 12px;
  border: 1px dashed rgba(124,58,237,0.22);
  color:#6a58b3;
  font-weight: 950;
  background: rgba(255,255,255,0.86);
}

.miniActionRow{
  display:flex;
  gap:10px;
}
.btn.mini{
  height: 34px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 12px;
  box-shadow: 0 10px 16px rgba(0,0,0,0.10);
  flex: 1 1 0;
}
.dangerMini{
  background: linear-gradient(135deg, rgba(255,77,141,0.92), rgba(255,122,69,0.88));
  color:#fff;
  border-color: rgba(255,255,255,0.52);
}
.dangerMini2{
  background: linear-gradient(135deg, rgba(17,24,39,0.88), rgba(124,58,237,0.72));
  color:#fff;
  border-color: rgba(255,255,255,0.18);
}

.set-loading{
  max-width: 620px;
  margin: 80px auto;
  border-radius: 22px;
  padding: 18px;
  background: rgba(255,255,255,0.92);
  border:1px solid rgba(124,58,237,0.16);
  box-shadow: 0 16px 24px rgba(0,0,0,0.10);
  font-weight: 950;
  color:#241336;
}
`;
