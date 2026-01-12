// ✅✅✅ 전체복붙: src/app/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* =========================================================
   ✅ Home 올인원(달력/채팅 흐름 유지)
   - ✅ 친구목록: 목업 제거 → "내 계정" 기준 DB에서 불러오기(다른계정 가입해도 안 섞임)
   - ✅ 관리자 버튼: profiles.role === 'admin' 이면 표시(메인에서 다시 보이게)
   - ✅ 메뉴버튼: 모바일에서 3개 + 2개(넘어가지 않게)
   - ✅ 채팅(/chats/open?to=UID) 유지
   - ✅ 말풍선 안에 "최종 목표" 문구/표시 절대 없음(완전 제거)
   - ✅ "월·주·일 목표" 카드에서도 "최종 목표" 문구/표시 완전 제거
   - ✅ 달력 DOT/숫자 pill 밀림(오른쪽 튐) 방지 + 보기 좋은 정렬
   - ✅ 친구 검색(닉네임) 확실히 동작(입력/필터/가드)
   - ✅ 이미지 경로: public 기준 (/gogo.png, /upzzu1.png) ✅ assets 금지
   - ✅ [1번] 메인 달력 DOT "테두리/링/외곽선" 완전 제거(순수 색상 DOT)
   - ✅ [2번] 상세영역(선택한 날짜 상세)에 "기분"이 눈에 띄게 표시(칩 + 큰 이모지)
   - ✅ (추가) 말풍선/글씨가 기기마다 커지지 않게 text-size-adjust 강제 고정
   - ✅ (추가) 별(✨) 제거해서 마스코트 눈 가림 방지
   - Supabase ENV 필요:
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
========================================================= */

/** ✅ Supabase (올인원) */
let _supabase: SupabaseClient;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    console.warn('[HOME] Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _supabase = createClient(url, key);
  return _supabase;
}

/** ✅ Storage avatar public URL 만들기 */
function getAvatarSrc(pathOrUrl: string) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl);
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const sb = getSupabase();
  try {
    const { data } = sb.storage.from('avatars').getPublicUrl(raw);
    return data?.publicUrl || '';
  } catch {
    return '';
  }
}

/** ✅ Weather types */
type WeatherSlot = { time: string; temp: number; desc: string };

/** ✅ 프로필로 지역/좌표 해석 */
function resolveRegionFromProfile(p: any): { label: string; lat: number; lon: number } {
  const lat = Number(p?.lat);
  const lon = Number(p?.lon);
  const addressText = String(p?.address_text || '').trim();

  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001) {
    return { label: addressText || '설정한 지역', lat, lon };
  }

  const txt = addressText;
  const presets: Record<string, { label: string; lat: number; lon: number }> = {
    서울: { label: '서울', lat: 37.5665, lon: 126.978 },
    경기: { label: '경기', lat: 37.4138, lon: 127.5183 },
    인천: { label: '인천', lat: 37.4563, lon: 126.7052 },
    대전: { label: '대전', lat: 36.3504, lon: 127.3845 },
    대구: { label: '대구', lat: 35.8714, lon: 128.6014 },
    부산: { label: '부산', lat: 35.1796, lon: 129.0756 },
    광주: { label: '광주', lat: 35.1595, lon: 126.8526 },
    울산: { label: '울산', lat: 35.5384, lon: 129.3114 },
    세종: { label: '세종', lat: 36.48, lon: 127.289 },
    제주: { label: '제주', lat: 33.4996, lon: 126.5312 },
  };

  for (const k of Object.keys(presets)) {
    if (txt.includes(k)) return presets[k];
  }
  return { label: '서울', lat: 37.5665, lon: 126.978 };
}

/** ✅ Open-Meteo로 3시간 단위 오늘 슬롯 만들기 */
async function fetchLiveWeatherSlots(lat: number, lon: number): Promise<WeatherSlot[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&hourly=temperature_2m,weathercode` +
      `&timezone=Asia%2FSeoul`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();

    const times: string[] = j?.hourly?.time || [];
    const temps: number[] = j?.hourly?.temperature_2m || [];
    const codes: number[] = j?.hourly?.weathercode || [];

    const codeToDesc = (c: number) => {
      if (c === 0) return '맑음';
      if ([1, 2].includes(c)) return '약간 구름';
      if (c === 3) return '구름';
      if ([45, 48].includes(c)) return '안개';
      if ([51, 53, 55, 56, 57].includes(c)) return '이슬비';
      if ([61, 63, 65, 66, 67].includes(c)) return '비';
      if ([71, 73, 75, 77].includes(c)) return '눈';
      if ([80, 81, 82].includes(c)) return '소나기';
      if ([95, 96, 99].includes(c)) return '뇌우';
      return '흐림';
    };

    const now = new Date();
    const todayYMD = now.toISOString().slice(0, 10);
    const slots: WeatherSlot[] = [];

    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (!String(t).startsWith(todayYMD)) continue;

      const hh = Number(String(t).slice(11, 13));
      if (![0, 3, 6, 9, 12, 15, 18, 21].includes(hh)) continue;

      slots.push({
        time: `${String(hh).padStart(2, '0')}:00`,
        temp: Number(temps[i] ?? 0),
        desc: codeToDesc(Number(codes[i] ?? 0)),
      });

      if (slots.length >= 6) break;
    }

    if (slots.length === 0) {
      for (let i = 0; i < Math.min(6, times.length); i++) {
        const hh = String(times[i]).slice(11, 13);
        slots.push({
          time: `${hh}:00`,
          temp: Number(temps[i] ?? 0),
          desc: codeToDesc(Number(codes[i] ?? 0)),
        });
      }
    }

    return slots;
  } catch (e) {
    console.warn('[HOME] weather fetch fail', e);
    return [];
  }
}

/** ✅ 관리자 버튼 (profiles.role === 'admin' 기준) */
function AdminEntryButton({ label = '관리자', size = 'sm' }: { label?: string; size?: 'sm' | 'md' }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;

        const { data: prof } = await sb.from('profiles').select('role').eq('user_id', uid).maybeSingle();
        setIsAdmin(String((prof as any)?.role ?? '') === 'admin');
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  if (!isAdmin) return null;

  return (
    <button
      type="button"
      className={'admin-btn ' + (size === 'md' ? 'admin-btn-md' : 'admin-btn-sm')}
      onClick={() => router.push('/admin')}
      aria-label="관리자 진입"
      title="관리자"
    >
      {label}
    </button>
  );
}

/** ✅ 홈 메뉴(이모지 없음 / 1줄 고정 / UPLOG채팅 버튼 감성) */
type HomeMenuItem = { label: string; href: string };
function HomeMenuRow({ items }: { items: HomeMenuItem[] }) {
  return (
    <nav className="home-menu-row" aria-label="홈 메뉴">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="hm-item" aria-label={it.label} title={it.label}>
          <span className="hm-label">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const EMO_QUOTES: string[] = [
  '반가워요, 저는 업쮸예요. 오늘도 대표님의 하루를 같이 기록할게요.',
  '관리의 차이가 성장률의 차이입니다.',
  '중요한 건 빈 날을 줄여가는 것이에요.',
  '거절은 숫자일 뿐, 대표님의 실력은 계속 쌓이고 있어요.',
  '오늘 1건의 계약도 내일 10건의 씨앗이 됩니다.',
];

type Friend = { user_id: string; nickname: string; online: boolean; role?: string | null; avatar_url?: string | null };

type FriendProfileData = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  career: string | null;
  company: string | null;
  team: string | null;
  grade: string | null;
  avatar_url: string | null;
  badges: { code: string; name: string }[];
  counts: { likes: number; posts: number; feedback: number };
};

type ScheduleRow = {
  id: string;
  title: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time?: string | null;
  category?: string | null;
  customer_id?: string | null;
};

type DaySummary = { date: string; count: number };
type LatestGoals = { day_goal: string | null; week_goal: string | null; month_goal: string | null };
type RebuttalSummary = { id: string; category: string | null; content: string | null };
type DailyTask = { id: string; content: string; done: boolean; task_date: string };

type ContractLevel = 'new' | 'contract1' | 'contract2' | 'contract3';
type ContractDay = { date: string; newCount: number; c1: number; c2: number; c3: number };

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}
function getKoreanWeekday(date: Date) {
  return date.toLocaleDateString('ko-KR', { weekday: 'long' });
}
function weatherEmoji(desc: string) {
  if (!desc) return '🌤';
  if (desc.includes('맑')) return '☀️';
  if (desc.includes('비')) return '🌧️';
  if (desc.includes('눈')) return '❄️';
  if (desc.includes('구름')) return '⛅';
  if (desc.includes('흐') || desc.includes('안개')) return '☁️';
  return '🌤';
}

type ScheduleCategoryKind = 'work' | 'attendance' | 'etc';
type ScheduleCategoryMeta = { label: string; badgeClass: string; kind: ScheduleCategoryKind };
function getScheduleCategoryMeta(category: string | null | undefined): ScheduleCategoryMeta {
  const c = (category ?? '').toLowerCase();
  if (c === 'consult' || c === '상담') return { label: '상담', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'visit' || c === '방문') return { label: '방문', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'happy' || c === '해피콜') return { label: '해피콜', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'gift' || c === 'present' || c === '선물' || c === '사은품')
    return { label: '사은품', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'delivery' || c === '택배' || c === '배송') return { label: '배송', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'meeting' || c === '회의') return { label: '회의', badgeClass: 'schedule-cat-work', kind: 'work' };
  if (c === 'edu' || c === 'education' || c === '교육') return { label: '교육', badgeClass: 'schedule-cat-edu', kind: 'work' };
  if (c === 'event' || c === '행사' || c === '행사/이벤트') return { label: '행사/이벤트', badgeClass: 'schedule-cat-event', kind: 'work' };
  if (c === 'absent' || c === 'late' || c === 'early' || c === 'out' || c === 'close' || c === '근태') {
    return { label: '근태', badgeClass: 'schedule-cat-attend', kind: 'attendance' };
  }
  return { label: '기타', badgeClass: 'schedule-cat-etc', kind: 'etc' };
}

function getMoodEmoji(code: string | null | undefined): string {
  if (!code) return '';
  if (code === '🙂' || code === '😎' || code === '🔥' || code === '😭' || code === '😔' || code === '😐') return code;
  switch (code) {
    case 'tired':
      return '😭';
    case 'down':
      return '😔';
    case 'smile':
      return '🙂';
    case 'focus':
      return '😐';
    case 'fire':
      return '🔥';
    case 'confident':
      return '😎';
    default:
      return '🙂';
  }
}
function getCareerLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case '0-1':
      return '0~1년';
    case '2':
      return '2년';
    case '3':
      return '3년';
    case '4-5':
      return '4~5년';
    case '6-9':
      return '6~9년';
    case '10+':
      return '10년 이상';
    default:
      return code;
  }
}

function pickContractLevel(statusRaw: any): ContractLevel | null {
  const s = String(statusRaw ?? '').replace(/\s/g, '').toLowerCase();
  if (!s) return null;
  if (s.includes('신규') || s === 'new') return 'new';
  if (s.includes('계약3') || s === 'contract3') return 'contract3';
  if (s.includes('계약2') || s === 'contract2') return 'contract2';
  if (s.includes('계약1') || s === 'contract1') return 'contract1';
  if (s.includes('계약') || s.includes('contract')) return 'contract1';
  return null;
}

function lsGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}
function lsSetJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const MENU_ITEMS: HomeMenuItem[] = [
  { label: '나의 U P 관리', href: '/my-up' },
  { label: '고객관리', href: '/customers' },
  { label: '반론 아카이브', href: '/rebuttal' },
  { label: '커뮤니티', href: '/community' },
  { label: '문자 도우미', href: '/sms-helper' },
];

export default function HomePage() {
  const router = useRouter();
  const sb = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [nickname, setNickname] = useState<string>('영업인');
  const [email, setEmail] = useState<string | null>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [careerYears, setCareerYears] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));

  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [todayWeather, setTodayWeather] = useState<WeatherSlot[]>([]);
  const [latestGoals, setLatestGoals] = useState<LatestGoals | null>(null);
  const [recentRebuttals, setRecentRebuttals] = useState<RebuttalSummary[]>([]);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [contractDays, setContractDays] = useState<ContractDay[]>([]);
  const [moodByDate, setMoodByDate] = useState<Record<string, string>>({});
  const [weatherLabel, setWeatherLabel] = useState<string>('서울');
  const [weatherLat, setWeatherLat] = useState<number>(37.5665);
  const [weatherLon, setWeatherLon] = useState<number>(126.978);

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // ✅ avatar cache bust
  const [avatarVer, setAvatarVer] = useState<number>(0);
  useEffect(() => {
    if (!profileImage) return;
    setAvatarVer(Date.now());
  }, [profileImage]);

  const avatarSrc = useMemo(() => {
    const v = avatarVer ? `?v=${avatarVer}` : '';
    if (!profileImage) return '';
    const raw = String(profileImage);
    if (raw.startsWith('http://') || raw.startsWith('https://')) return `${raw}${v}`;
    const publicUrl = getAvatarSrc(raw);
    return publicUrl ? `${publicUrl}${v}` : '';
  }, [profileImage, avatarVer]);

  const [badgeOpen, setBadgeOpen] = useState(false);
  const [myBadges, setMyBadges] = useState<{ code: string; name: string }[]>([]);

  const [emotionIndex, setEmotionIndex] = useState(0);

  // ✅✅✅ 친구목록: 목업 제거하고 DB에서 내 친구만 로드
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [friendQuery, setFriendQuery] = useState('');

  // ✅✅✅ 검색 확실히: 닉네임 / 공백/가드
  const filteredFriends = useMemo(() => {
    const q = (friendQuery ?? '').trim().toLowerCase();
    if (!q) return friends;
    return (friends ?? []).filter((f) => {
      const nn = String(f?.nickname ?? '').toLowerCase();
      return nn.includes(q);
    });
  }, [friendQuery, friends]);

  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [cheerPopKey, setCheerPopKey] = useState<string | null>(null);

  const [fpOpen, setFpOpen] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpData, setFpData] = useState<FriendProfileData | null>(null);
  const [fpError, setFpError] = useState<string | null>(null);

  const badgeIcon = (code: string) => {
    const c = (code || '').toLowerCase();
    if (c.includes('top')) return '👑';
    if (c.includes('streak')) return '🔥';
    if (c.includes('likes')) return '💖';
    if (c.includes('mvp')) return '🏆';
    if (c.includes('amount')) return '💎';
    if (c.includes('attendance')) return '📅';
    if (c.includes('posts')) return '📝';
    return '✨';
  };

  const loadMyMonthlyBadges = async (uid: string) => {
    try {
      const today = formatDate(new Date());
      const { data, error } = await sb
        .from('monthly_badges')
        .select('badge_code, badge_name, month_start, month_end')
        .eq('winner_user_id', uid)
        .lte('month_start', today)
        .gte('month_end', today);

      if (error) {
        console.error('monthly_badges error', error);
        setMyBadges([]);
        return;
      }

      const rows = (data ?? []) as any[];
      setMyBadges(
        rows
          .map((r) => ({ code: String(r.badge_code ?? ''), name: String(r.badge_name ?? '') }))
          .filter((x) => x.code || x.name),
      );
    } catch (e) {
      console.error('loadMyMonthlyBadges fatal', e);
      setMyBadges([]);
    }
  };

  useEffect(() => {
    const savedCounts = lsGetJson<Record<string, number>>('uplog_cheer_counts', {});
    setCheerCounts(savedCounts);
  }, []);

  const persistCheerCounts = (next: Record<string, number>) => {
    setCheerCounts(next);
    lsSetJson('uplog_cheer_counts', next);
  };

  const getDailyKey = () => `uplog_cheer_daily_${todayStr}`;
  const getDailyMap = () => lsGetJson<Record<string, number>>(getDailyKey(), {});
  const setDailyMap = (m: Record<string, number>) => lsSetJson(getDailyKey(), m);

  const canCheerToday = (toUid: string) => {
    const m = getDailyMap();
    return (m[toUid] ?? 0) < 3;
  };
  const incDaily = (toUid: string) => {
    const m = getDailyMap();
    m[toUid] = (m[toUid] ?? 0) + 1;
    setDailyMap(m);
  };

  // ✅ 채팅 라우트 유지
  const goDirectChat = (toUid: string) => {
    if (!toUid) return;
    router.push(`/chats/open?to=${encodeURIComponent(toUid)}`);
  };

  const handleCheerRemote = async (toUid: string) => {
    if (!toUid) return;

    const limitKey = `LIMIT_${toUid}`;
    if (!canCheerToday(toUid)) {
      setCheerPopKey(limitKey);
      window.setTimeout(() => setCheerPopKey((cur) => (cur === limitKey ? null : cur)), 650);
      return;
    }

    const prevCounts = cheerCounts ?? {};
    const optimisticCounts = { ...prevCounts, [toUid]: (prevCounts[toUid] ?? 0) + 1 };
    persistCheerCounts(optimisticCounts);
    incDaily(toUid);

    setCheerPopKey(toUid);
    window.setTimeout(() => setCheerPopKey((cur) => (cur === toUid ? null : cur)), 520);

    try {
      const { data, error } = await sb.rpc('cheer_friend', { p_to: toUid });
      if (error || !(data as any)?.ok) console.warn('cheer_friend rpc skipped/fail', error, data);
    } catch (e) {
      console.warn('cheer_friend rpc fatal (ignored)', e);
    }
  };

  const openFriendProfile = async (targetUserId: string) => {
    if (!targetUserId) return;

    setFpOpen(true);
    setFpLoading(true);
    setFpError(null);
    setFpData(null);

    const timeout = window.setTimeout(() => {
      setFpLoading(false);
      setFpError('프로필 정보를 불러오지 못했어요.');
    }, 6000);

    try {
      const { data: prof } = await sb
        .from('profiles')
        .select('user_id, nickname, name, career, company, team, grade, avatar_url')
        .eq('user_id', targetUserId)
        .maybeSingle();

      const today = formatDate(new Date());
      const { data: bData } = await sb
        .from('monthly_badges')
        .select('badge_code, badge_name, month_start, month_end')
        .eq('winner_user_id', targetUserId)
        .lte('month_start', today)
        .gte('month_end', today);

      const { count: postsCount } = await sb.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId);

      let feedbackCount = 0;
      try {
        const { count } = await sb.from('objection_feedbacks').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId);
        feedbackCount = count ?? 0;
      } catch {
        feedbackCount = 0;
      }

      let likesCount = 0;
      try {
        const { count } = await sb.from('post_likes').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId);
        likesCount = count ?? 0;
      } catch {
        likesCount = 0;
      }

      const row: any =
        prof ??
        ({
          user_id: targetUserId,
          nickname: null,
          name: null,
          career: null,
          company: null,
          team: null,
          grade: null,
          avatar_url: null,
        } as any);

      const badges = (bData ?? []).map((x: any) => ({ code: String(x.badge_code ?? ''), name: String(x.badge_name ?? '') })).filter((x) => x.code || x.name);

      setFpData({
        user_id: row.user_id,
        nickname: row.nickname ?? null,
        name: row.name ?? null,
        career: row.career ?? null,
        company: row.company ?? null,
        team: row.team ?? null,
        grade: row.grade ?? null,
        avatar_url: row.avatar_url ?? null,
        badges,
        counts: { likes: likesCount ?? 0, posts: postsCount ?? 0, feedback: feedbackCount ?? 0 },
      });

      setFpLoading(false);
    } catch (e) {
      console.warn('openFriendProfile fatal', e);
      setFpLoading(false);
      setFpError('프로필 정보를 불러오지 못했어요.');
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const newRebuttalCount = useMemo(() => recentRebuttals.length, [recentRebuttals]);
  const newScheduleCountToday = useMemo(() => schedules.filter((s) => s.schedule_date === todayStr).length, [schedules, todayStr]);

  useEffect(() => {
    if (EMO_QUOTES.length === 0) return;
    const timer = setInterval(() => setEmotionIndex((prev) => (prev + 1) % EMO_QUOTES.length), 5000);
    return () => clearInterval(timer);
  }, []);
  const loadDashboardData = async (uid: string, baseMonth: Date, lat: number, lon: number) => {
    const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0, 23, 59, 59);

    const from = formatDate(monthStart);
    const to = formatDate(monthEnd);
    const fromISO = monthStart.toISOString();
    const toISO = monthEnd.toISOString();

    const moodMap: Record<string, string> = {};
    const contractByDate: Record<string, { newCount: number; c1: number; c2: number; c3: number }> = {};

    const { data: scheduleRows, error: scheduleError } = await sb
      .from('schedules')
      .select('id, title, schedule_date, schedule_time, category, customer_id')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to)
      .order('schedule_date', { ascending: true });

    if (scheduleError) throw scheduleError;

    const safeSchedules: ScheduleRow[] = (scheduleRows ?? []) as ScheduleRow[];
    setSchedules(safeSchedules);

    const summaryMap: Record<string, number> = {};
    safeSchedules.forEach((row) => {
      summaryMap[row.schedule_date] = (summaryMap[row.schedule_date] ?? 0) + 1;
    });
    setDaySummaries(Object.entries(summaryMap).map(([date, count]) => ({ date, count })));

    const { data: upRows } = await sb
      .from('up_logs')
      .select('id, day_goal, week_goal, month_goal, log_date, mood')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to)
      .order('log_date', { ascending: true });

    if (upRows && upRows.length > 0) {
      const last = upRows[upRows.length - 1] as any;
      setLatestGoals({
        day_goal: last.day_goal ?? null,
        week_goal: last.week_goal ?? null,
        month_goal: last.month_goal ?? null,
      });

      (upRows as any[]).forEach((row) => {
        if (!row.log_date) return;
        const raw = row.log_date;
        const str = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
        if (row.mood) moodMap[str] = row.mood as string;
      });
    } else {
      setLatestGoals(null);
    }

    // 고객(실적) 집계: customers.status 기반 (new/contract1/2/3)
    try {
      const { data: customerRows } = await sb
        .from('customers')
        .select('id, status, created_at')
        .eq('user_id', uid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO);

      if (customerRows) {
        (customerRows as any[]).forEach((row) => {
          const raw = (row as any).created_at;
          if (!raw) return;
          const dateStr = typeof raw === 'string' ? raw.slice(0, 10) : formatDate(new Date(raw));
          const level = pickContractLevel((row as any).status);
          if (!level) return;

          if (!contractByDate[dateStr]) contractByDate[dateStr] = { newCount: 0, c1: 0, c2: 0, c3: 0 };
          if (level === 'new') contractByDate[dateStr].newCount += 1;
          if (level === 'contract1') contractByDate[dateStr].c1 += 1;
          if (level === 'contract2') contractByDate[dateStr].c2 += 1;
          if (level === 'contract3') contractByDate[dateStr].c3 += 1;
        });
      }
    } catch (err) {
      console.error('customers fatal error', err);
    }

    const lastDay = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0).getDate();
    const list: ContractDay[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const cur = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), d);
      const ds = formatDate(cur);
      const obj = contractByDate[ds] ?? { newCount: 0, c1: 0, c2: 0, c3: 0 };
      list.push({ date: ds, newCount: obj.newCount, c1: obj.c1, c2: obj.c2, c3: obj.c3 });
    }
    setContractDays(list);

    setMoodByDate(moodMap);

    const { data: rebutRows } = await sb.from('rebuttals').select('id, category, content').eq('user_id', uid).order('id', { ascending: false }).limit(3);
    setRecentRebuttals((rebutRows ?? []) as RebuttalSummary[]);

    const today = formatDate(new Date());
    const { data: taskRows } = await sb
      .from('daily_tasks')
      .select('id, task_date, content, done')
      .eq('user_id', uid)
      .eq('task_date', today)
      .order('id', { ascending: true });

    if (taskRows) {
      setTodayTasks(
        taskRows.map((t: any) => ({
          id: t.id,
          task_date: t.task_date,
          content: t.content ?? '',
          done: !!t.done,
        })),
      );
    } else {
      setTodayTasks([]);
    }

    try {
      const live = await fetchLiveWeatherSlots(lat, lon);
      setTodayWeather(Array.isArray(live) ? live : []);
    } catch (e) {
      console.error('weather live error', e);
      setTodayWeather([]);
    }
  };

  /** ✅✅✅ 내 친구 로드: friends 테이블이 있으면 사용(없거나 RLS로 막히면 빈 목록) */
  const loadMyFriends = async (uid: string) => {
    setFriendsLoading(true);
    try {
      const { data: relRows, error: relErr } = await sb
        .from('friends')
        .select('user_id, friend_user_id, status, created_at')
        .or(`user_id.eq.${uid},friend_user_id.eq.${uid}`)
        .limit(200);

      if (relErr) {
        console.warn('[HOME] friends table read blocked/missing:', relErr);
        setFriends([]);
        setFriendsLoading(false);
        return;
      }

      const rel = (relRows ?? []) as any[];

      const accepted = rel.filter((r) => {
        const s = String(r?.status ?? '').toLowerCase().trim();
        if (!s) return true;
        return s === 'accepted' || s === 'friend' || s === 'ok';
      });

      const ids = Array.from(
        new Set(
          accepted
            .map((r) => {
              const a = String(r?.user_id ?? '');
              const b = String(r?.friend_user_id ?? '');
              if (!a || !b) return '';
              return a === uid ? b : a;
            })
            .filter(Boolean),
        ),
      );

      if (ids.length === 0) {
        setFriends([]);
        setFriendsLoading(false);
        return;
      }

      const { data: profs, error: profErr } = await sb.from('profiles').select('user_id, nickname, name, role, avatar_url').in('user_id', ids);

      if (profErr) {
        console.warn('[HOME] profiles for friends blocked:', profErr);
        setFriends(ids.map((id) => ({ user_id: id, nickname: '친구', online: false })));
        setFriendsLoading(false);
        return;
      }

      const map = new Map<string, any>();
      (profs ?? []).forEach((p: any) => map.set(String(p.user_id), p));

      const list: Friend[] = ids.map((id) => {
        const p = map.get(id);
        const nick = String(p?.nickname ?? '').trim() || String(p?.name ?? '').trim() || '친구';
        return {
          user_id: id,
          nickname: nick,
          online: false,
          role: p?.role ? String(p.role) : null,
          avatar_url: p?.avatar_url ? String(p.avatar_url) : null,
        };
      });

      setFriends(list);
      setFriendsLoading(false);
    } catch (e) {
      console.warn('[HOME] loadMyFriends fatal', e);
      setFriends([]);
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data, error: userError } = await sb.auth.getUser();
      const user = data?.user;

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: profile } = await sb
        .from('profiles')
        .select('name, nickname, industry, grade, career, company, department, team, avatar_url, address_text, lat, lon')
        .eq('user_id', user.id)
        .maybeSingle();

      let lat = weatherLat;
      let lon = weatherLon;
      let label = weatherLabel;

      if (profile) {
        const p: any = profile;

        if (p.nickname) setNickname(p.nickname);
        else if (p.name) setNickname(p.name);
        else if (user.email) setNickname(user.email.split('@')[0]);

        if (p.industry) setIndustry(p.industry);
        if (p.grade) setGrade(p.grade);
        if (p.career) setCareerYears(getCareerLabel(p.career));
        if (p.company) setCompany(p.company);
        if (p.department) setDepartment(p.department);
        if (p.team) setTeam(p.team);

        const region = resolveRegionFromProfile(p);
        label = region.label;
        lat = region.lat;
        lon = region.lon;
        setWeatherLabel(label);
        setWeatherLat(lat);
        setWeatherLon(lon);

        if (p.avatar_url) setProfileImage(String(p.avatar_url));
      } else if (user.email) {
        setNickname(user.email.split('@')[0]);
      }

      await loadDashboardData(user.id, currentMonth, lat, lon);
      await loadMyMonthlyBadges(user.id);
      await loadMyFriends(user.id);

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sb]);

  useEffect(() => {
    if (!userId) return;
    loadDashboardData(userId, currentMonth, weatherLat, weatherLon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, userId, weatherLat, weatherLon]);

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const days: Date[] = [];
    const startWeekday = firstDay.getDay();

    for (let i = 0; i < startWeekday; i++) {
      days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - (startWeekday - i)));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }, [currentMonth]);

  const selectedDateSchedules = useMemo(() => {
    const list = schedules.filter((s) => s.schedule_date === selectedDate);
    return [...list].sort((a, b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));
  }, [schedules, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }, [selectedDate]);

  const selectedDateContract = useMemo(() => {
    const row = contractDays.find((x) => x.date === selectedDate);
    if (!row) return { total: 0, newCount: 0, c1: 0, c2: 0, c3: 0 };
    const total = row.newCount + row.c1 + row.c2 + row.c3;
    return { total, newCount: row.newCount, c1: row.c1, c2: row.c2, c3: row.c3 };
  }, [contractDays, selectedDate]);

  // ✅✅✅ [2번] 상세영역: 선택한 날짜 기분 표시(칩 + 큰 이모지)
  const selectedMoodEmoji = useMemo(() => {
    const raw = moodByDate?.[selectedDate];
    return raw ? getMoodEmoji(raw) : '';
  }, [moodByDate, selectedDate]);

  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const handleToggleTask = async (task: DailyTask) => {
    if (!userId) return;
    const nextDone = !task.done;

    setTodayTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)));

    const { error } = await sb.from('daily_tasks').update({ done: nextDone }).eq('id', task.id).eq('user_id', userId);
    if (error) {
      setTodayTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      console.error('toggle daily_task error', error);
    }
  };

  const monthLegendCounts = useMemo(() => {
    let work = 0;
    let attend = 0;
    let etc = 0;

    (schedules ?? []).forEach((s) => {
      const meta = getScheduleCategoryMeta(s.category);
      if (meta.kind === 'attendance') attend += 1;
      else if (meta.kind === 'work') work += 1;
      else etc += 1;
    });

    const newContracts = (contractDays ?? []).reduce((acc, d) => acc + (d?.newCount ?? 0), 0);
    return { work, attend, etc, newContracts };
  }, [schedules, contractDays]);

  if (loading) {
    return (
      <div className="home-root">
        <div className="home-inner">
          <div className="home-loading">대시보드를 불러오는 중입니다...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const avatarInitial = nickname && nickname.length > 0 ? nickname.trim()[0]?.toUpperCase() : 'U';
  const careerCombined = grade && careerYears ? `${grade} · ${careerYears}` : grade ? grade : careerYears ? careerYears : '경력/직함 미설정';
  const orgCombined = [company, department, team].filter(Boolean).join(' / ') || '조직/팀 미설정';

  return (
    <div className="home-root">
      <div className="home-inner">
        <header className="home-header">
          <div className="home-header-top">
            <div className="home-header-left">
              <div className="home-logo-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gogo.png" alt="UPLOG 로고" className="home-logo" />
                <div className="home-logo-text-wrap">
                  <div className="wave-text" aria-label="UPLOG">
                    {'UPLOG'.split('').map((ch, i) => (
                      <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                  <div className="home-logo-sub">오늘도 나를 UP시키다</div>
                </div>

                <AdminEntryButton label="관리자" size="sm" />
              </div>

              <div className="home-date">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </div>
            </div>

            <div className="home-header-profile">
              <div className="profile-box">
                <button type="button" className="profile-settings-btn" onClick={() => router.push('/settings')} aria-label="설정">
                  <span className="ps-gear">⚙</span>
                  <span className="ps-text">설정</span>
                </button>

                <button type="button" className="profile-click" onClick={() => setBadgeOpen(true)} aria-label="프로필 열기">
                  <div className="profile-main">
                    <div className="profile-avatar">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt="프로필"
                          onError={(e) => {
                            console.warn('[HOME] avatar img error:', profileImage, avatarSrc);
                            setProfileImage(null);
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        avatarInitial
                      )}
                    </div>
                    <div className="profile-main-text">
                      <div className="profile-name">{nickname}</div>
                      {email && <div className="profile-email">{email}</div>}
                    </div>
                  </div>

                  <div className="badge-icons" aria-label="내 배지 아이콘">
                    {(myBadges.length > 0
                      ? myBadges.slice(0, 6)
                      : [
                          { code: 'monthly_top', name: '월간 1등' },
                          { code: 'streak_month_king', name: '연속왕' },
                          { code: 'most_likes_month', name: '좋아요왕' },
                          { code: 'mvp_count_month', name: '실적건수 MVP' },
                          { code: 'mvp_amount_month', name: '실적금액 MVP' },
                          { code: 'attendance_month_mvp', name: '출석 MVP' },
                        ]
                    ).map((b, i) => (
                      <span key={`${b.code}-${i}`} className={`badge-icon badge-${(b.code || 'etc').toLowerCase()}`} title={b.name}>
                        {badgeIcon(b.code)}
                      </span>
                    ))}
                  </div>

                  <div className="profile-meta">
                    <span className="profile-pill">{industry ?? '업종 미설정'}</span>
                    <span className="profile-pill">{careerCombined}</span>
                    <span className="profile-pill">{orgCombined}</span>
                  </div>

                  <div className="profile-stats">
                    <span className="profile-stat-pill">
                      친구 <strong>{friends.length}명</strong>
                    </span>
                    <span className="profile-stat-pill">
                      새 피드백 <strong>{newRebuttalCount}건</strong>
                    </span>
                    <span className="profile-stat-pill">
                      오늘 스케줄 <strong>{newScheduleCountToday}건</strong>
                    </span>
                  </div>
                </button>

                {badgeOpen && (
                  <div className="mp-backdrop" onClick={() => setBadgeOpen(false)}>
                    <div className="mp-panel" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="mp-close" onClick={() => setBadgeOpen(false)}>
                        ✕
                      </button>
                      <div className="mp-title">내 배지</div>
                      <div className="mp-sub">이번 달 기준으로 보여드려요.</div>

                      {myBadges.length === 0 ? (
                        <div className="mp-empty">아직 이번 달 수상 배지가 없어요. 그래도 오늘의 기록이 쌓이면 바로 바뀝니다</div>
                      ) : (
                        <ul className="mp-list">
                          {myBadges.map((b, idx) => (
                            <li key={`${b.code}-${idx}`} className="mp-item">
                              <span className="mp-emoji">{badgeIcon(b.code)}</span>
                              <span className="mp-name">{b.name || b.code}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅✅✅ 말풍선/마스코트: "최종 목표" 절대 표시 안 함 */}
          <div className="home-header-bottom">
            <div className="coach-row">
              <div className="coach-bubble-panel" aria-live="polite">
                <div className="coach-topline">
                  <div className="coach-pill">오늘의 U P 한마디</div>

                  <div className="coach-goal-mini" aria-label="목표 요약">
                    <span className="cg-chip">
                      <span className="cg-tag">월</span>
                      <span className="cg-txt">{latestGoals?.month_goal || '이달엔 30건 이상 계약하기'}</span>
                    </span>
                    <span className="cg-chip">
                      <span className="cg-tag">주</span>
                      <span className="cg-txt">{latestGoals?.week_goal || '신규고객 3명 이상'}</span>
                    </span>
                    <span className="cg-chip cg-strong">
                      <span className="cg-tag">오늘</span>
                      <span className="cg-txt">{latestGoals?.day_goal || '가망고객 안부 문자인사하기'}</span>
                    </span>
                  </div>
                </div>

                <div className="coach-text">{EMO_QUOTES[emotionIndex] ?? ''}</div>
              </div>

              <div className="coach-mascot-wrap" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="coach-mascot-img" src="/upzzu1.png" alt="" />
                {/* ✅ 별(✨) 제거 완료 */}
              </div>
            </div>
          </div>
        </header>

        <HomeMenuRow items={MENU_ITEMS} />

        <section className="weather-wide">
          <div className="weather-panel">
            <div className="weather-panel-header">
              <div>
                <div className="section-title">오늘 날씨</div>
                <div className="section-sub">{weatherLabel} · 외근/미팅 계획 세울 때 참고하세요.</div>
              </div>
            </div>

            <div className="weather-strip">
              {(Array.isArray(todayWeather) ? todayWeather : []).map((w, idx) => (
                <div key={idx} className="weather-slot">
                  <div className="weather-time">
                    {weatherEmoji(w.desc)} {w.time}
                  </div>
                  <div className="weather-temp">{w.temp}°C</div>
                  <div className="weather-desc">{w.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <main className="home-main">
          <section className="home-top-summary">
            <div className="summary-card goals-card">
              <h3 className="summary-title">월 · 주 · 일 목표</h3>

              <div className="goal-inline">
                <span className="goal-tag">이번 달</span>
                <span className="goal-text">{latestGoals?.month_goal || '이달엔 30건 이상 계약하기'}</span>
                <span className="goal-divider">|</span>
                <span className="goal-tag">이번 주</span>
                <span className="goal-text">{latestGoals?.week_goal || '신규고객 3명 이상'}</span>
                <span className="goal-divider">|</span>
                <span className="goal-tag">오늘</span>
                <span className="goal-text-strong">{latestGoals?.day_goal || '가망고객 안부 문자인사하기'}</span>
              </div>

              <div className="tiny-note fill-note">
                ※ 목표/체크 항목 입력은 <strong>나의 U P 관리</strong>에서만 합니다. 홈에서는 체크만 가능해요.
              </div>
            </div>

            <div className="summary-card todo-card">
              <h3 className="summary-title">오늘 할 일</h3>
              <p className="summary-desc">
                <strong>나의 U P 관리</strong>에서 입력한 체크항목을 여기에서 한 번에 체크할 수 있어요.
              </p>

              {todayTasks.length === 0 ? (
                <div className="todo-empty big">
                  <div className="todo-empty-title">아직 등록된 할 일이 없어요.</div>
                  <div className="todo-empty-sub">
                    오늘의 할 일은 <strong>나의 U P 관리</strong>에서 추가해 주세요.
                  </div>
                </div>
              ) : (
                <ul className="todo-list big">
                  {todayTasks.map((task) => (
                    <li key={task.id} className="todo-item big">
                      <button
                        type="button"
                        className={'todo-check ' + (task.done ? 'todo-check-done' : '')}
                        onClick={() => handleToggleTask(task)}
                        aria-label="체크"
                      >
                        {task.done ? '✓' : ''}
                      </button>
                      <span className={'todo-text ' + (task.done ? 'todo-text-done' : '')}>{task.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="home-section calendar-section">
            <div className="section-header">
              <div>
                <div className="section-title">CALENDAR &amp; PERFORMANCE</div>
                <div className="section-sub">달력에서 근태/스케줄/실적을 한눈에 보고, 아래에서 상세를 확인해요.</div>
              </div>

              <div className="month-nav">
                <button type="button" className="nav-btn" onClick={() => moveMonth(-1)}>
                  ◀
                </button>
                <div className="month-label">{getMonthLabel(currentMonth)}</div>
                <button type="button" className="nav-btn" onClick={() => moveMonth(1)}>
                  ▶
                </button>
              </div>
            </div>

            <div className="calendar-legend" aria-label="달력 표시 가이드">
              <div className="legend-item">
                <span className="legend-dot dot-attend" />
                <span className="legend-label">
                  근태 <b className="legend-n">{monthLegendCounts.attend}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-work" />
                <span className="legend-label">
                  업무 <b className="legend-n">{monthLegendCounts.work}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-etc" />
                <span className="legend-label">
                  기타 <b className="legend-n">{monthLegendCounts.etc}</b>
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-new" />
                <span className="legend-label">
                  신규계약 <b className="legend-n">{monthLegendCounts.newContracts}</b>
                </span>
              </div>
              <div className="legend-item legend-hint">※ 달력 안 표시는 “DOT + 개수”만 표시되고, 기분은 상세에서 확인해요</div>
            </div>

            <div className="calendar-layout">
              <div className="calendar-left">
                <div className="calendar-board" role="grid" aria-label="월간 달력">
                  {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                    <div key={w} className="calendar-weekday-cell" role="columnheader">
                      {w}
                    </div>
                  ))}

                  {daysInMonth.map((d, index) => {
                    const dStr = formatDate(d);
                    const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                    const isToday = dStr === todayStr;
                    const isSelected = dStr === selectedDate;

                    const schedulesForDay = schedules.filter((s) => s.schedule_date === dStr);
                    const cd = contractDays.find((x) => x.date === dStr);
                    const newPerf = cd ? cd.newCount : 0;

                    let workN = 0;
                    let attendN = 0;
                    let etcN = 0;
                    schedulesForDay.forEach((s) => {
                      const meta = getScheduleCategoryMeta(s.category);
                      if (meta.kind === 'attendance') attendN += 1;
                      else if (meta.kind === 'work') workN += 1;
                      else etcN += 1;
                    });

                    return (
                      <button
                        key={`${dStr}-${index}`}
                        type="button"
                        role="gridcell"
                        className={[
                          'calendar-cell',
                          !isCurrentMonth ? 'calendar-cell-out' : '',
                          isToday ? 'calendar-cell-today' : '',
                          isSelected ? 'calendar-cell-selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setSelectedDate(dStr)}
                        aria-label={`${d.getDate()}일`}
                      >
                        <div className="cell-top">
                          <div className="cell-date">{d.getDate()}</div>
                        </div>

                        {(attendN > 0 || workN > 0 || etcN > 0 || newPerf > 0) && (
                          <div className="cell-bottom" aria-label="카테고리별 개수">
                            {attendN > 0 && (
                              <span className="cell-pill" title="근태">
                                <span className="cell-dot dot-attend" />
                                <span className="cell-num">{attendN}</span>
                              </span>
                            )}
                            {workN > 0 && (
                              <span className="cell-pill" title="업무">
                                <span className="cell-dot dot-work" />
                                <span className="cell-num">{workN}</span>
                              </span>
                            )}
                            {etcN > 0 && (
                              <span className="cell-pill" title="기타">
                                <span className="cell-dot dot-etc" />
                                <span className="cell-num">{etcN}</span>
                              </span>
                            )}
                            {newPerf > 0 && (
                              <span className="cell-pill" title="신규계약">
                                <span className="cell-dot dot-new" />
                                <span className="cell-num">{newPerf}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-footer">
                  <span>
                    오늘은 <strong>{getKoreanWeekday(new Date())}</strong> 입니다.
                  </span>
                </div>
              </div>

              <div className="calendar-right">
                <div className="right-card calendar-selected-card">
                  <div className="right-card-header">
                    <div>
                      <div className="section-title">선택한 날짜 상세</div>
                      <div className="section-sub">
                        {selectedDateLabel}
                        {' · '}스케줄 {selectedDateSchedules.length}개
                        {' · '}실적 {selectedDateContract.total}건
                      </div>

                      {/* ✅✅✅ [2번] 기분 표시: 눈에 띄게(칩 + 큰 이모지) */}
                      <div className="mood-row">
  <span className={'mood-chip ' + (selectedMoodEmoji ? 'is-active' : '')}>
    <span className="mood-label">기분</span>
    <span className="mood-emoji">{selectedMoodEmoji || '미선택'}</span>
  </span>
  <span className="mood-hint">기분 입력은 ‘나의 U P 관리’에서 해요</span>
</div>

                    </div>
                  </div>

                  {selectedDateSchedules.length === 0 ? (
                    <div className="empty-text">
                      아직 등록된 일정이 없어요.
                      <br />
                      스케줄 추가/수정은 <strong>나의 U P 관리 · 고객관리</strong>에서 할 수 있어요.
                    </div>
                  ) : (
                    <ul className="schedule-list">
                      {selectedDateSchedules.map((s) => {
                        const meta = getScheduleCategoryMeta(s.category);
                        const timeText = s.schedule_time ? s.schedule_time.slice(0, 5) : '--:--';
                        return (
                          <li key={s.id} className="schedule-item">
                            <div className="schedule-time">{timeText}</div>
                            <div className="schedule-content">
                              <span className={'schedule-category ' + meta.badgeClass}>{meta.label}</span>
                              <span className="schedule-title">{s.title}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ 친구 영역 */}
            <div className="friends-card">
              <div className="friends-head">
                <div className="friends-title">
                  친구 목록 <span className="friends-hint">이름을 누르면 바로 1:1 채팅으로 이동해요</span>
                </div>

                <div className="friends-right">
                  <button type="button" className="uplog-chat-btn" onClick={() => router.push('/chats')}>
                    UPLOG채팅
                  </button>

                  <div className="friends-search-wrap">
                    <input
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      className="friends-search"
                      placeholder="닉네임 검색"
                      aria-label="친구 검색"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              <div className="friends-list">
                {friendsLoading ? (
                  <div className="friends-empty">친구 목록 불러오는 중...</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="friends-empty">아직 친구가 없거나, 검색 결과가 없어요.</div>
                ) : (
                  filteredFriends.map((f) => {
                    const cheerN = cheerCounts?.[f.user_id] ?? 0;
                    const pop = cheerPopKey === f.user_id;
                    const limitPop = cheerPopKey === `LIMIT_${f.user_id}`;

                    return (
                      <div key={f.user_id} className="friend-row">
                        <button type="button" className="friend-name-btn" onClick={() => goDirectChat(f.user_id)}>
                          <span className={'friend-dot ' + (f.online ? 'on' : 'off')} />
                          <span className="friend-nick">
                            {f.nickname} {f.role ? <span className="friend-role">{f.role}</span> : null}
                          </span>
                          <span className="friend-sub">이름 클릭 = 1:1 채팅</span>
                        </button>

                        <div className="friend-actions">
                          <button type="button" className="fa-pill fa-profile" onClick={() => openFriendProfile(f.user_id)} title="프로필">
                            🙂 <span className="fa-txt">프로필</span>
                          </button>

                          <button type="button" className="fa-pill fa-chat" onClick={() => goDirectChat(f.user_id)} title="채팅">
                            💬 <span className="fa-txt">채팅</span>
                          </button>

                          <button
                            type="button"
                            className={'fa-pill fa-cheer ' + (limitPop ? 'fa-limit' : '')}
                            onClick={() => handleCheerRemote(f.user_id)}
                            title="응원"
                          >
                            <span className="fa-heart">❤️</span>
                            <span className="fa-txt">응원</span>
                            <span className="fa-cheer-n">{cheerN}</span>
                            {pop && <span className="fa-pop">팡!</span>}
                            {limitPop && <span className="fa-pop fa-pop-limit">오늘 3회</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {fpOpen && (
                <div className="fp-backdrop" onClick={() => setFpOpen(false)}>
                  <div className="fp-panel" onClick={(e) => e.stopPropagation()}>
                    <button className="fp-close" type="button" onClick={() => setFpOpen(false)}>
                      ✕
                    </button>

                    <div className="fp-title">프로필</div>

                    {fpLoading && <div className="fp-loading">불러오는 중...</div>}
                    {!fpLoading && fpError && <div className="fp-error">{fpError}</div>}

                    {!fpLoading && !fpError && fpData && (
                      <div className="fp-body">
                        <div className="fp-top">
                          <div className="fp-avatar">
                            {fpData.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`${getAvatarSrc(fpData.avatar_url)}?v=${Date.now()}`} alt="프로필" />
                            ) : (
                              (fpData.nickname || fpData.name || 'U')[0]
                            )}
                          </div>

                          <div className="fp-main">
                            <div className="fp-name">{fpData.nickname || fpData.name || '익명 영업인'}</div>
                            <div className="fp-sub">{(fpData.grade || '직함 미설정') + ' · ' + (getCareerLabel(fpData.career) || '경력 미설정')}</div>
                            <div className="fp-sub">{[fpData.company, fpData.team].filter(Boolean).join(' / ') || '회사/팀 미설정'}</div>
                          </div>
                        </div>

                        <div className="fp-badges">
                          <div className="fp-sec-title">배지</div>
                          {fpData.badges.length === 0 ? (
                            <div className="fp-muted">이번 달 배지가 없어요.</div>
                          ) : (
                            <div className="fp-badge-row">
                              {fpData.badges.slice(0, 8).map((b, i) => (
                                <span key={`${b.code}-${i}`} className="fp-badge" title={b.name}>
                                  {badgeIcon(b.code)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="fp-counts">
                          <div className="fp-count-pill">
                            좋아요 <b>{fpData.counts.likes}</b>
                          </div>
                          <div className="fp-count-pill">
                            게시글 <b>{fpData.counts.posts}</b>
                          </div>
                          <div className="fp-count-pill">
                            피드백 <b>{fpData.counts.feedback}</b>
                          </div>
                        </div>

                        <div className="fp-actions">
                          <button type="button" className="fp-btn ghost" onClick={() => goDirectChat(fpData.user_id)}>
                            💬 채팅하기
                          </button>
                          <button type="button" className="fp-btn pink" onClick={() => handleCheerRemote(fpData.user_id)}>
                            ❤️ 응원하기
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ✅ 문의하기(실시간 채팅) 플로팅: 블루 원형 테두리 버전 */}
        <button type="button" onClick={() => router.push('/support')} className="floating-support-btn" aria-label="문의하기">
          <span>문의하기</span>
          <span> 채팅</span>
        </button>

        <style jsx>{styles}</style>
      </div>
    </div>
  );
}

const styles = `
:root{
  --uplog-accent-pink:#f472b6;
  --uplog-accent-purple:#a855f7;
  --soft-ink:#201235;
  --soft-sub:#6f60b8;
  --soft-shadow:0 14px 26px rgba(0,0,0,0.10);

  /* ✅ 말풍선/마스코트 "고정 규격" */
  --uplog-bubble-h:148px;
  --uplog-bubble-radius:22px;
  --uplog-bubble-pad:14px 16px;
  --uplog-bubble-pill-size:13px;
  --uplog-bubble-text-size:16px;
  --uplog-mascot-size:180px;
  --uplog-font:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
html,body{margin:0;padding:0;}
a{color:inherit;text-decoration:none;}
*{box-sizing:border-box;}

/* ✅ iOS/모바일 자동 글자 확대 방지(말풍선/메뉴 겹침 원인) */
.coach-bubble-panel,
.coach-bubble-panel *{
  -webkit-text-size-adjust:100%;
  text-size-adjust:100%;
}

.home-root{
  min-height:100vh;
  padding:24px;
  font-size:16px;
  background:
    radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(900px 560px at 82% 18%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 64%),
    linear-gradient(180deg,#fff3fb 0%, #f6f2ff 45%, #eef8ff 100%);
  font-family:var(--uplog-font);
  color:var(--soft-ink);
}
.home-inner{max-width:1200px;margin:0 auto;}
.section-title{font-size:18px;font-weight:900;color:#5d3bdb;}
.section-sub{font-size:14px;margin-top:4px;color:var(--soft-sub);}
.home-loading{margin-top:120px;text-align:center;font-size:20px;}

/* Header */
.home-header{
  display:flex;
  flex-direction:column;
  gap:12px;
  padding:22px 26px 38px;
  border-radius:26px;
  background:
    radial-gradient(900px 520px at 20% 20%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%),
    linear-gradient(135deg, rgba(236,72,153,0.75), rgba(124,58,237,0.72));
  box-shadow:0 16px 28px rgba(0,0,0,0.18);
  margin-bottom:14px;
  color:#fff;
  overflow:hidden;
}
.home-header-top{
  display:grid;
  grid-template-columns:1fr minmax(0, clamp(320px, 36vw, 420px));
  gap:16px;
  align-items:start;
}
@media (max-width:980px){
  .home-header-top{grid-template-columns:1fr;}
  .home-header-profile{justify-content:flex-start;}
  .profile-box{max-width:520px;height:auto;}
}
.home-logo-row{display:flex;align-items:center;gap:12px;}
.home-logo{
  width:70px;height:70px;border-radius:22px;padding:8px;
  background:rgba(255,255,255,0.16);
  box-shadow:0 10px 18px rgba(0,0,0,0.14);
}
.home-logo-text-wrap{display:flex;flex-direction:column;gap:4px;}
.wave-text{display:inline-flex;gap:2px;}
.wave-text span{
  display:inline-block;
  font-size:36px;
  font-weight:900;
  letter-spacing:5px;
  color:rgba(255,255,255,0.96);
  animation: uplogBounce 2.2s ease-in-out infinite;
  transform-origin:center bottom;
  text-shadow:0 2px 10px rgba(0,0,0,0.18);
}
@keyframes uplogBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
.home-logo-sub{font-size:16px;font-weight:900;color:rgba(255,255,255,0.92);text-shadow:0 2px 8px rgba(0,0,0,0.18);}
.home-date{font-size:18px;font-weight:900;margin-top:10px;color:rgba(255,255,255,0.92);text-shadow:0 2px 10px rgba(0,0,0,0.18);}

.admin-btn{
  margin-left:10px;
  border:1px solid rgba(255,255,255,0.65);
  background:rgba(255,255,255,0.16);
  color:#fff;
  font-weight:950;
  border-radius:999px;
  cursor:pointer;
  box-shadow:0 10px 18px rgba(0,0,0,0.12);
}
.admin-btn-sm{height:34px;padding:0 12px;font-size:12px;}
.admin-btn-md{height:40px;padding:0 14px;font-size:13px;}

/* Profile */
.home-header-profile{display:flex;justify-content:flex-end;align-items:flex-start;}
.profile-box{
  width:100%;
  max-width:420px;
  min-width:0;
  height:220px;
  background:rgba(255,255,255,0.96);
  border-radius:22px;
  padding:12px 14px;
  box-shadow:0 14px 26px rgba(0,0,0,0.12);
  display:flex;
  flex-direction:column;
  gap:6px;
  border:2px solid rgba(227,218,251,0.95);
  color:#211437;
  position:relative;
}
@media (max-width:980px){.profile-box{height:auto;padding-bottom:14px;}}
.profile-settings-btn{
  position:absolute;top:10px;right:10px;height:30px;padding:0 10px;border-radius:999px;
  border:1px solid rgba(217,204,255,0.75);
  background:linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,240,255,0.92));
  color:#3a1f62;font-weight:950;font-size:12px;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  cursor:pointer;box-shadow:0 8px 14px rgba(0,0,0,0.10);
}
.profile-click{border:none;background:transparent;padding:0;text-align:left;cursor:pointer;width:100%;}
.profile-main{display:flex;align-items:center;gap:12px;padding-right:86px;margin-top:2px;}
.profile-main-text{min-width:0;}
.profile-avatar{
  width:72px;height:72px;border-radius:999px;
  background:radial-gradient(circle at top left, rgba(244,114,182,0.85) 0, rgba(168,85,247,0.78) 60%);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:22px;overflow:hidden;flex-shrink:0;
  box-shadow:0 8px 16px rgba(168,85,247,0.22);
}
.profile-avatar img{width:100%;height:100%;object-fit:cover;}
.profile-name{font-size:18px;font-weight:950;line-height:1.15;}
.profile-email{font-size:13px;color:#7b6ac4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;}

.badge-icons{display:flex;gap:8px;padding:6px 0 2px;flex-wrap:wrap;}
.badge-icon{
  width:34px;height:34px;border-radius:999px;
  display:inline-flex;align-items:center;justify-content:center;
  background:#fff;border:2px solid rgba(180,160,255,0.50);
  box-shadow:0 10px 16px rgba(0,0,0,0.06), 0 0 12px rgba(168,85,247,0.12);
}

.profile-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:12px;}
.profile-pill{font-size:12px;padding:4px 9px;border-radius:999px;background:#f4f0ff;color:#352153;}
.profile-stats{display:flex;gap:8px;margin-top:6px;font-size:11px;overflow:hidden;flex-wrap:wrap;}
.profile-stat-pill{
  font-size:11px;padding:3px 9px;border-radius:999px;background:#f7f2ff;color:#352153;
  border:1px solid #e0d4ff;white-space:nowrap;
}
.profile-stat-pill strong{color:#ff4f9f;}

/* Badge Modal */
.mp-backdrop{position:fixed;inset:0;background:rgba(15,23,42,0.50);display:flex;align-items:center;justify-content:center;z-index:60;}
.mp-panel{
  width:380px;max-width:92vw;border-radius:26px;background:#fff;box-shadow:0 24px 54px rgba(15,23,42,0.38);
  padding:18px 18px 16px;position:relative;border:1px solid rgba(226,232,240,0.9);
}
.mp-close{position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:999px;border:none;background:#f3f4ff;color:#4b2d7a;cursor:pointer;font-size:14px;}
.mp-title{font-size:18px;font-weight:950;color:#1b1030;}
.mp-sub{margin-top:4px;font-size:13px;color:#7a69c4;}
.mp-empty{margin-top:12px;border-radius:16px;padding:12px;background:#faf7ff;border:1px dashed rgba(165,148,230,0.9);font-size:14px;color:#7461be;line-height:1.5;}
.mp-list{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.mp-item{display:flex;align-items:center;gap:10px;border-radius:14px;padding:10px;background:#faf7ff;border:1px solid rgba(212,200,255,0.9);}
.mp-emoji{width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #eadcff;}
.mp-name{font-size:15px;font-weight:900;color:#2a1236;}

/* Coach */
.home-header-bottom{margin-top:6px;}
.coach-row{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;}
@media (max-width:980px){.coach-row{flex-direction:column;align-items:stretch;}}
.coach-bubble-panel{
  flex:1;
  background:rgba(255,255,255,0.16);
  border:1px solid rgba(255,255,255,0.26);
  border-radius:var(--uplog-bubble-radius);
  padding:var(--uplog-bubble-pad);
  box-shadow:0 14px 26px rgba(0,0,0,0.14);
  min-height:var(--uplog-bubble-h);
  max-height:var(--uplog-bubble-h);
  display:flex;
  flex-direction:column;
  justify-content:center;
  overflow:hidden;
}
.coach-pill{
  display:inline-flex;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.18);
  border:1px solid rgba(255,255,255,0.28);
  font-size:var(--uplog-bubble-pill-size);font-weight:950;align-self:flex-start;
}
.coach-text{
  margin-top:10px;
  font-size:var(--uplog-bubble-text-size);
  font-weight:950;
  line-height:1.35;
  text-shadow:0 2px 10px rgba(0,0,0,0.18);
  letter-spacing:-0.2px;
  min-height:72px;
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
  word-break:keep-all;
}
.coach-topline{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.coach-goal-mini{display:flex;align-items:center;gap:8px;flex:0 0 auto;max-width:56%;overflow:hidden;}
.cg-chip{
  display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;
  background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.26);
  font-size:12px;font-weight:900;white-space:nowrap;max-width:180px;overflow:hidden;
}
.cg-chip.cg-strong{background:rgba(255,255,255,0.22);border-color:rgba(255,255,255,0.34);box-shadow:0 10px 18px rgba(0,0,0,0.10);}
.cg-tag{padding:3px 8px;border-radius:999px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.22);font-size:11px;font-weight:950;flex:0 0 auto;}
.cg-txt{display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}
@media (max-width:920px){.coach-goal-mini{display:none;}}
.coach-mascot-wrap{
  width:var(--uplog-mascot-size);
  height:var(--uplog-mascot-size);
  flex:0 0 var(--uplog-mascot-size);
  position:relative;
  display:flex;
  align-items:flex-end;
  justify-content:flex-end;
  margin-bottom:-10px;
  animation: floaty 2.8s ease-in-out infinite;
}
@keyframes floaty{0%,100%{transform:translateY(8px);}50%{transform:translateY(-2px);}}
.coach-mascot-img{width:var(--uplog-mascot-size);height:var(--uplog-mascot-size);object-fit:contain;filter:drop-shadow(0 18px 22px rgba(0,0,0,0.22));}

/* ✅ 홈 메뉴 (모바일 3개 + 2개) */
.home-menu-row{
  margin:18px 0 16px;
  display:grid;
  grid-template-columns:repeat(5, minmax(0, 1fr));
  gap:12px;
  width:100%;
  align-items:stretch;
}
@media (max-width:760px){
  .home-root{padding:16px;}
  .home-menu-row{grid-template-columns:repeat(6, minmax(0, 1fr));gap:10px;}
  .home-menu-row .hm-item{grid-column:span 2;}
  .home-menu-row .hm-item:nth-child(4){grid-column:2 / span 2;}
  .home-menu-row .hm-item:nth-child(5){grid-column:4 / span 2;}
}
.hm-item{
  width:100%;
  height:44px;
  padding:0 10px;
  border-radius:999px;
  background:linear-gradient(135deg,#f472b6,#a855f7);
  color:#fff;
  font-weight:950;
  font-size:15px;
  letter-spacing:-0.2px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 10px 26px rgba(168,85,247,0.45), inset 0 0 0 1px rgba(255,255,255,0.28);
  transition:transform .2s ease, box-shadow .2s ease, filter .2s ease;
  white-space:nowrap;
  will-change:transform;
  animation: menuFloat 3.6s ease-in-out infinite;
}
@keyframes menuFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-2px);}}
.hm-item:hover{
  transform:translateY(-4px) scale(1.01);
  filter:brightness(1.08);
  box-shadow:0 16px 42px rgba(168,85,247,0.75), 0 0 18px rgba(236,72,153,0.92), 0 0 30px rgba(168,85,247,0.85);
}
.hm-label{white-space:nowrap;}

/* Weather */
.weather-wide{margin-bottom:10px;}
.weather-panel{border-radius:18px;background:rgba(255,255,255,0.96);padding:10px 14px;box-shadow:var(--soft-shadow);border:1px solid #e3dafb;color:#241336;}
.weather-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
.weather-strip::-webkit-scrollbar{display:none;}
.weather-slot{min-width:100px;border-radius:12px;background:#f7f3ff;padding:6px;font-size:13px;}
.weather-time{font-weight:800;margin-bottom:2px;}
.weather-temp{font-size:20px;font-weight:950;color:rgba(243,95,166,0.95);}
.weather-desc{font-size:13px;color:#7a68c4;}

/* Main */
.home-main{display:flex;flex-direction:column;gap:14px;}

/* Summary */
.home-top-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
@media (max-width:860px){.home-top-summary{grid-template-columns:1fr;}}
.summary-card{
  border-radius:20px;
  padding:18px 18px;
  background:rgba(255,255,255,0.96);
  box-shadow:var(--soft-shadow);
  border:1px solid #e5ddff;
  color:#211437;
  display:flex;
  flex-direction:column;
}
.summary-title{font-size:20px;font-weight:950;margin-bottom:10px;color:#5d3bdb;}
.summary-desc{font-size:15px;color:#7a69c4;margin:0 0 10px;}
.tiny-note{margin-top:10px;font-size:12px;color:#7a69c4;}
.fill-note{margin-top:auto;padding-top:12px;}
.goal-inline{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px;font-size:17px;font-weight:950;}
.goal-tag{padding:5px 11px;border-radius:999px;background:#ede9ff;color:#5b21b6;font-size:13px;}
.goal-text-strong{font-size:19px;color:#ec4899;}
.goal-text{font-size:17px;color:#372153;}
.goal-divider{opacity:.35;font-weight:900;}

.todo-empty{margin-top:10px;border-radius:16px;padding:10px 12px;background:#faf7ff;border:1px dashed rgba(165,148,230,0.9);font-size:14px;color:#7461be;line-height:1.5;}
.todo-empty.big{margin-top:12px;padding:16px 14px;min-height:110px;display:flex;flex-direction:column;justify-content:center;gap:6px;}
.todo-empty-title{font-size:16px;font-weight:950;color:#5b21b6;}
.todo-empty-sub{font-size:14px;color:#7a69c4;}
.todo-list{margin:10px 0 0;padding:0;list-style:none;}
.todo-list.big{margin-top:12px;}
.todo-item{display:flex;align-items:center;gap:10px;padding:4px 0;font-size:15px;}
.todo-item.big{padding:6px 0;font-size:16px;}
.todo-check{width:22px;height:22px;border-radius:8px;border:1.5px solid rgba(241,83,170,0.85);background:#fff;font-size:13px;font-weight:950;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.todo-check-done{background:linear-gradient(135deg, rgba(241,83,170,0.92), rgba(163,109,255,0.90));box-shadow:0 0 10px rgba(241,83,170,0.30);color:#fff;}
.todo-text{color:#2b163e;}
.todo-text-done{color:#a39ad3;text-decoration:line-through;}

/* Calendar section */
.home-section{border-radius:22px;background:rgba(255,255,255,0.96);border:1px solid #e5ddff;box-shadow:var(--soft-shadow);padding:16px;}
.section-header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px;}
@media (max-width:860px){.section-header{flex-direction:column;align-items:flex-start;gap:10px;}}
.month-nav{display:flex;align-items:center;gap:10px;}
.nav-btn{height:34px;width:34px;border-radius:999px;border:1px solid #eadcff;background:#fff;color:#5b21b6;font-weight:950;cursor:pointer;box-shadow:0 10px 16px rgba(0,0,0,0.06);}
.month-label{font-weight:950;color:#2a1236;}

.calendar-legend{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0 12px;}
.legend-item{display:flex;align-items:center;gap:8px;background:#f7f2ff;border:1px solid #eadcff;border-radius:999px;padding:6px 10px;font-size:12px;color:#3a1f62;}
.legend-dot{
  width:10px;height:10px;border-radius:999px;display:inline-block;
  border:none !important; outline:none !important; box-shadow:none !important; /* ✅ 링/외곽선 완전 제거 */
}
.legend-n{color:#ec4899;}
.legend-hint{background:transparent;border:none;padding:0;color:#7a69c4;}

.dot-attend{background:#f59e0b;}
.dot-work{background:#22c55e;}
.dot-etc{background:#a78bfa;}
.dot-new{background:#ef4444;}

.calendar-layout{display:grid;grid-template-columns:minmax(0, 1.25fr) minmax(0, .9fr);gap:14px;align-items:start;}
@media (max-width:980px){.calendar-layout{grid-template-columns:1fr;}}
.calendar-board{
  display:grid;
  grid-template-columns:repeat(7, minmax(0, 1fr));
  gap:8px;
}
.calendar-weekday-cell{
  text-align:center;
  font-weight:950;
  color:#5b21b6;
  font-size:13px;
  padding:8px 0;
}
.calendar-cell{
  border:none;
  width:100%;
  border-radius:16px;
  background:#fbf9ff;
  box-shadow:0 10px 18px rgba(0,0,0,0.06);
  cursor:pointer;
  padding:10px 10px 8px;
  min-height:78px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  transition:transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
.calendar-cell:hover{transform:translateY(-2px);filter:brightness(1.02);box-shadow:0 14px 26px rgba(0,0,0,0.09);}
.calendar-cell-out{opacity:0.42;}
.calendar-cell-today{outline:2px solid rgba(236,72,153,0.70);}
.calendar-cell-selected{outline:2px solid rgba(91,33,182,0.60);background:#f5f1ff;}
.cell-top{display:flex;justify-content:space-between;align-items:center;}
.cell-date{font-weight:950;color:#2a1236;font-size:14px;}

/* ✅✅✅ DOT/숫자 pill "오른쪽 튐/밀림" 방지 */
.cell-bottom{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-items:center;
  justify-content:flex-start;
  padding-top:6px;
}
.cell-pill{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:4px 7px;
  border-radius:999px;
  background:rgba(243,232,255,0.85);
  border:1px solid rgba(226,215,255,0.95);
  font-size:12px;
  font-weight:950;
  color:#2a1236;
  line-height:1;
  white-space:nowrap;
}
.cell-dot{
  width:9px;height:9px;border-radius:999px;
  border:none !important; outline:none !important; box-shadow:none !important; /* ✅ 링/외곽선 완전 제거 */
  display:inline-block;
  flex:0 0 9px;
}
.cell-num{
  min-width:12px;
  text-align:center;
  font-variant-numeric:tabular-nums;
}

.calendar-footer{
  margin-top:10px;
  padding:10px 12px;
  border-radius:14px;
  background:#faf7ff;
  border:1px solid #eadcff;
  color:#3a1f62;
  font-weight:900;
}

/* Right side */
.right-card{
  border-radius:20px;
  background:#fbf9ff;
  border:1px solid #eadcff;
  box-shadow:0 12px 22px rgba(0,0,0,0.07);
  padding:14px;
}
.right-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;}
.empty-text{
  border-radius:16px;
  padding:14px 14px;
  background:#ffffff;
  border:1px dashed rgba(165,148,230,0.9);
  color:#7a69c4;
  font-weight:800;
  line-height:1.5;
}

/* ✅✅✅ [2번] 기분 표시: 칩 + 큰 이모지 (중복 선언 금지, 1세트만) */
.mood-row{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:10px;
  flex-wrap:wrap;
}

.mood-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:999px;
  background:linear-gradient(135deg, rgba(244,114,182,0.18), rgba(168,85,247,0.18));
  border:1px solid rgba(217,204,255,0.85);
  color:#2a1236;
  font-weight:950;
  font-size:12px;
  line-height:1.2;
}

.mood-label{
  font-size:12px;
  font-weight:950;
  color:#5b21b6;
}

/* 기본(미선택) */
.mood-emoji{
  font-size:16px;
  font-weight:900;
  opacity:0.55;
  line-height:1;
}

/* 선택된 경우만 크게 */
.mood-chip.is-active .mood-emoji{
  font-size:24px;
  opacity:1;
  filter:drop-shadow(0 6px 10px rgba(0,0,0,0.15));
}

/* 선택된 칩 배경도 살짝 강조 */
.mood-chip.is-active{
  border-color:rgba(168,85,247,0.95);
  background:linear-gradient(135deg, rgba(244,114,182,0.28), rgba(168,85,247,0.28));
}

.mood-hint{
  font-size:12px;
  color:#7a69c4;
  font-weight:850;
}


/* Schedule list */
.schedule-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.schedule-item{
  display:grid;
  grid-template-columns:70px minmax(0,1fr);
  gap:10px;
  align-items:center;
  padding:10px 10px;
  border-radius:16px;
  background:#ffffff;
  border:1px solid rgba(234,220,255,0.95);
  box-shadow:0 10px 16px rgba(0,0,0,0.05);
}
.schedule-time{font-weight:950;color:#5b21b6;font-variant-numeric:tabular-nums;}
.schedule-content{min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.schedule-title{font-weight:900;color:#2a1236;min-width:0;word-break:keep-all;}
.schedule-category{
  display:inline-flex;align-items:center;justify-content:center;
  padding:4px 9px;border-radius:999px;
  font-size:12px;font-weight:950;
  border:1px solid rgba(226,215,255,0.95);
  background:#f7f2ff;
  color:#3a1f62;
  flex:0 0 auto;
}
.schedule-cat-work{background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.30);color:#166534;}
.schedule-cat-attend{background:rgba(245,158,11,0.14);border-color:rgba(245,158,11,0.34);color:#92400e;}
.schedule-cat-etc{background:rgba(167,139,250,0.16);border-color:rgba(167,139,250,0.36);color:#4c1d95;}
.schedule-cat-edu{background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.30);color:#1e40af;}
.schedule-cat-event{background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.30);color:#9d174d;}

/* Friends */
.friends-card{
  margin-top:14px;
  border-radius:22px;
  background:rgba(255,255,255,0.96);
  border:1px solid #e5ddff;
  box-shadow:var(--soft-shadow);
  padding:14px 14px 12px;
}
.friends-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:10px;
}
.friends-title{
  font-size:16px;
  font-weight:950;
  color:#2a1236;
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.friends-hint{font-size:12px;color:#7a69c4;font-weight:850;}
.friends-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}

.uplog-chat-btn{
  height:38px;
  padding:0 14px;
  border-radius:999px;
  border:1px solid rgba(168,85,247,0.45);
  background:
    radial-gradient(80px 40px at 30% 30%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(135deg, rgba(244,114,182,0.90), rgba(168,85,247,0.92));
  color:#fff;
  font-weight:950;
  cursor:pointer;
  box-shadow:0 14px 28px rgba(168,85,247,0.35), 0 0 14px rgba(236,72,153,0.35);
  transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;
  white-space:nowrap;
}
.uplog-chat-btn:hover{
  transform:translateY(-2px);
  filter:brightness(1.06);
  box-shadow:0 18px 40px rgba(168,85,247,0.45), 0 0 20px rgba(236,72,153,0.55);
}

.friends-search-wrap{display:flex;align-items:center;}
.friends-search{
  height:38px;
  width:180px;
  max-width:70vw;
  border-radius:999px;
  border:1px solid rgba(226,215,255,0.95);
  background:#fbf9ff;
  padding:0 12px;
  font-size:13px;
  font-weight:850;
  outline:none;
  color:#2a1236;
  box-shadow:0 10px 16px rgba(0,0,0,0.05);
}
.friends-search:focus{border-color:rgba(236,72,153,0.55);box-shadow:0 0 0 3px rgba(236,72,153,0.14), 0 10px 16px rgba(0,0,0,0.05);}

.friends-list{display:flex;flex-direction:column;gap:10px;}
.friends-empty{
  border-radius:16px;
  padding:12px 12px;
  background:#faf7ff;
  border:1px dashed rgba(165,148,230,0.9);
  color:#7a69c4;
  font-weight:850;
}

.friend-row{
  border-radius:18px;
  background:#fbf9ff;
  border:1px solid rgba(234,220,255,0.95);
  box-shadow:0 12px 22px rgba(0,0,0,0.06);
  padding:10px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
@media (max-width:720px){
  .friend-row{flex-direction:column;align-items:stretch;}
}

.friend-name-btn{
  border:none;
  background:transparent;
  text-align:left;
  cursor:pointer;
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
  flex:1;
}
.friend-dot{width:10px;height:10px;border-radius:999px;display:inline-block;box-shadow:none;}
.friend-dot.on{background:#22c55e;}
.friend-dot.off{background:#cbd5e1;}
.friend-nick{
  font-weight:950;
  color:#2a1236;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.friend-role{
  margin-left:6px;
  font-size:11px;
  font-weight:950;
  padding:3px 8px;
  border-radius:999px;
  border:1px solid rgba(226,215,255,0.95);
  background:#f7f2ff;
  color:#5b21b6;
}
.friend-sub{font-size:12px;color:#7a69c4;font-weight:850;white-space:nowrap;}

.friend-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
.fa-pill{
  height:34px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(226,215,255,0.95);
  background:#ffffff;
  color:#2a1236;
  font-weight:950;
  font-size:12px;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:6px;
  box-shadow:0 10px 16px rgba(0,0,0,0.05);
  transition:transform .16s ease, filter .16s ease, box-shadow .16s ease;
  white-space:nowrap;
}
.fa-pill:hover{transform:translateY(-2px);filter:brightness(1.02);box-shadow:0 14px 22px rgba(0,0,0,0.07);}
.fa-profile{background:linear-gradient(135deg, rgba(59,130,246,0.10), rgba(168,85,247,0.10));}
.fa-chat{background:linear-gradient(135deg, rgba(34,197,94,0.10), rgba(59,130,246,0.10));}
.fa-cheer{
  min-width:124px; /* ✅ 폭 고정(튐 방지) */
  justify-content:center;
  background:linear-gradient(135deg, rgba(244,114,182,0.12), rgba(168,85,247,0.12));
  position:relative;
  overflow:hidden;
}
.fa-cheer-n{
  margin-left:2px;
  font-variant-numeric:tabular-nums;
  color:#ec4899;
  font-size:13px;
}
.fa-heart{filter:drop-shadow(0 8px 12px rgba(236,72,153,0.20));}
.fa-pop{
  position:absolute;
  top:-10px;
  right:10px;
  font-size:12px;
  font-weight:950;
  color:#ff3fa3;
  background:#fff;
  border:1px solid rgba(236,72,153,0.35);
  padding:4px 8px;
  border-radius:999px;
  box-shadow:0 12px 18px rgba(0,0,0,0.10);
  animation: popUp .55s ease-out forwards;
  pointer-events:none;
}
.fa-pop-limit{color:#7c3aed;border-color:rgba(124,58,237,0.35);}
@keyframes popUp{0%{transform:translateY(10px);opacity:0;}40%{opacity:1;}100%{transform:translateY(0);opacity:0;}}

.fa-limit{border-color:rgba(124,58,237,0.55);box-shadow:0 0 0 3px rgba(124,58,237,0.12), 0 10px 16px rgba(0,0,0,0.05);}

/* Friend Profile Modal */
.fp-backdrop{position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:70;padding:16px;}
.fp-panel{
  width:420px;
  max-width:92vw;
  border-radius:26px;
  background:#fff;
  box-shadow:0 24px 54px rgba(15,23,42,0.40);
  padding:18px 18px 16px;
  position:relative;
  border:1px solid rgba(226,232,240,0.9);
}
.fp-close{
  position:absolute;top:10px;right:12px;
  width:32px;height:32px;border-radius:999px;border:none;
  background:#f3f4ff;color:#4b2d7a;cursor:pointer;font-size:14px;
}
.fp-title{font-size:18px;font-weight:950;color:#1b1030;}
.fp-loading,.fp-error{margin-top:10px;font-size:14px;color:#7a69c4;font-weight:850;}
.fp-body{margin-top:12px;display:flex;flex-direction:column;gap:12px;}
.fp-top{display:flex;align-items:center;gap:12px;}
.fp-avatar{
  width:64px;height:64px;border-radius:999px;
  background:radial-gradient(circle at top left, rgba(244,114,182,0.85) 0, rgba(168,85,247,0.78) 60%);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:950;font-size:22px;overflow:hidden;flex-shrink:0;
  box-shadow:0 12px 22px rgba(168,85,247,0.22);
}
.fp-avatar img{width:100%;height:100%;object-fit:cover;}
.fp-main{min-width:0;}
.fp-name{font-size:18px;font-weight:950;color:#2a1236;line-height:1.15;}
.fp-sub{font-size:13px;color:#7a69c4;font-weight:850;margin-top:2px;}

.fp-badges{border-radius:18px;background:#faf7ff;border:1px solid rgba(226,215,255,0.95);padding:10px 10px;}
.fp-sec-title{font-size:13px;font-weight:950;color:#5b21b6;margin-bottom:8px;}
.fp-badge-row{display:flex;gap:8px;flex-wrap:wrap;}
.fp-badge{
  width:34px;height:34px;border-radius:999px;
  display:flex;align-items:center;justify-content:center;
  background:#fff;border:1px solid rgba(226,215,255,0.95);
  box-shadow:0 10px 16px rgba(0,0,0,0.05);
}
.fp-muted{font-size:13px;color:#7a69c4;font-weight:850;}

.fp-counts{display:flex;gap:8px;flex-wrap:wrap;}
.fp-count-pill{
  padding:6px 10px;border-radius:999px;
  background:#fbf9ff;border:1px solid rgba(226,215,255,0.95);
  font-size:13px;color:#2a1236;font-weight:900;
}
.fp-count-pill b{color:#ec4899;font-weight:950;}

.fp-actions{display:flex;gap:10px;flex-wrap:wrap;}
.fp-btn{
  height:40px;
  padding:0 14px;
  border-radius:999px;
  border:1px solid rgba(226,215,255,0.95);
  background:#fff;
  color:#2a1236;
  font-weight:950;
  cursor:pointer;
  box-shadow:0 12px 18px rgba(0,0,0,0.06);
}
.fp-btn.ghost{background:linear-gradient(135deg, rgba(59,130,246,0.10), rgba(168,85,247,0.10));}
.fp-btn.pink{background:linear-gradient(135deg, rgba(244,114,182,0.22), rgba(168,85,247,0.22));}

/* ✅ 문의하기(실시간 채팅) 플로팅 버튼: "블루 원형 테두리" 버전 */
.floating-support-btn{
  position:fixed;
  right:18px;
  bottom:18px;
  width:72px;
  height:72px;
  border-radius:999px;
  cursor:pointer;
  z-index:80;

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;

  color:#ffffff;
  font-weight:950;
  font-size:11px;
  line-height:1.05;
  letter-spacing:-0.2px;

  /* ✅ 블루 그라데이션 + 하이라이트 */
  background:
    radial-gradient(60px 60px at 30% 25%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #1d4ed8 100%);

  /* ✅ "원형 테두리" 느낌 */
  border:2px solid rgba(255,255,255,0.70);
  box-shadow:
    0 16px 32px rgba(37,99,235,0.35),
    0 0 18px rgba(56,189,248,0.45),
    inset 0 0 0 2px rgba(0,0,0,0.10);

  transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;
}
.floating-support-btn:hover{
  transform:translateY(-3px) scale(1.02);
  filter:brightness(1.06);
  box-shadow:
    0 22px 44px rgba(37,99,235,0.45),
    0 0 26px rgba(56,189,248,0.70),
    inset 0 0 0 2px rgba(0,0,0,0.12);
}

/* Small screens */
@media (max-width:520px){
  .coach-text{font-size:15px;}
  .home-logo{width:62px;height:62px;border-radius:20px;}
  .wave-text span{font-size:32px;letter-spacing:4px;}
  .friends-search{width:150px;}
  .floating-support-btn{right:14px;bottom:14px;}
}
  
`;
