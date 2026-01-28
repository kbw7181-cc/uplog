// ✅✅✅ 전체복붙: src/app/customers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

/* =========================
   타입 / 유틸
========================= */
type CustomerRow = {
  id: string;
  user_id: string;

  // ✅ 기본정보
  name: string | null;
  phone: string | null;
  address?: string | null;
  birth?: string | null;
  email?: string | null;

  // ✅ 상태/속성
  stage?: string | null;
  grade?: string | null;
  propensity?: number | null;

  gender?: string | null;
  married?: boolean | null;
  student?: boolean | null;
  children?: boolean | null;

  job?: string | null;
  medical?: string | null;

  memo?: string | null;
  notes_json?: any | null;
  created_at?: string | null;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  title: string;
  schedule_date: string;
  schedule_time?: string | null;
  category?: string | null;
  created_at?: string | null;
};

type DealRow = {
  id: string;
  user_id: string;
  customer_id: string;

  deal_date: string; // YYYY-MM-DD
  deal_type: string; // sale/contract/renewal/referral/aftercare...
  amount_int: number; // ✅ 통계용
  amount_text: string | null; // ✅ "무이자 10개월" 등
  gift_text: string | null;
  discount_text: string | null;
  followup_type: string | null; // 재판매/소개/지속관리
  delivery_status: string | null; // 발송/배송완료/제품확인/오배송/파손/교환...
  memo: string | null;

  created_at: string | null;
};

function fmtYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ymdFromISO(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return fmtYMD(d);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function normPhone(s: string) {
  return (s || '').replace(/[^0-9]/g, '');
}
function fmtMoney(n: number) {
  try {
    return new Intl.NumberFormat('ko-KR').format(n);
  } catch {
    return String(n);
  }
}
function moneyToNumber(s: string) {
  // ✅ 빈칸이면 0 (저장 시만 숫자화)
  return Number((s || '').replace(/[^0-9]/g, '')) || 0;
}
function formatMoneyInput(s: string) {
  // ✅✅✅ 금액 입력란 "0 고정" 제거: 빈칸이면 빈칸 유지
  const raw = (s || '').trim();
  if (!raw) return '';
  const n = moneyToNumber(raw);
  if (!n) return '';
  return new Intl.NumberFormat('ko-KR').format(n);
}

function yn(v: boolean | null | undefined) {
  if (v === true) return '예';
  if (v === false) return '아니오';
  return '-';
}
function shortAddr(s: string | null | undefined) {
  const t = (s || '').trim();
  if (!t) return '-';
  if (t.length <= 16) return t;
  return t.slice(0, 16) + '…';
}

/* =========================
   페이지 컴포넌트
========================= */
export default function CustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // ✅ 고객 검색(이름/전화)
  const [q, setQ] = useState('');

  const monthLabel = useMemo(
    () => monthCursor.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    [monthCursor]
  );

  /* =========================
     초기 로드
  ========================= */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;

      if (error || !data?.user) {
        router.replace('/login');
        return;
      }

      const uid = data.user.id;
      setUserId(uid);

      const { data: c, error: ce } = await supabase.from('customers').select('*').eq('user_id', uid);

      const { data: s, error: se } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', uid)
        .gte('schedule_date', fmtYMD(startOfMonth(monthCursor)))
        .lte('schedule_date', fmtYMD(endOfMonth(monthCursor)));

      if (!alive) return;

      if (ce) setErr(ce.message);
      if (se) setErr(se.message);

      setCustomers((c || []) as CustomerRow[]);
      setSchedules((s || []) as ScheduleRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, monthCursor]);

  const gridDays = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const offset = start.getDay();
    const s = new Date(start);
    s.setDate(start.getDate() - offset);
    return Array.from({ length: 42 }).map((_, i) => addDays(s, i));
  }, [monthCursor]);

  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const s of schedules) {
      if (!map[s.schedule_date]) map[s.schedule_date] = [];
      map[s.schedule_date].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const at = (a.schedule_time || '').localeCompare(b.schedule_time || '');
        if (at !== 0) return at;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
    }
    return map;
  }, [schedules]);

  // ✅ customersByDate는 별도 useMemo로 (중첩 Hook 방지)
  const customersByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of customers || []) {
      const key = ymdFromISO(c.created_at || null);
      if (!key) continue;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [customers]);

  const selectedYMD = fmtYMD(selectedDate);
  const prevMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const pickDay = (d: Date) => setSelectedDate(d);

  /* =========================
     고객 CRUD + 모달
  ========================= */
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyCustomer: CustomerRow = {
    id: '',
    user_id: '',
    name: '',
    phone: '',
    address: '',
    birth: '',
    email: '',
    stage: '신규',
    grade: '일반',
    propensity: 0,
    gender: '',
    married: null,
    student: null,
    children: null,
    job: '',
    medical: '',
    memo: '',
    notes_json: {},
    created_at: null,
  };

  const [form, setForm] = useState<CustomerRow>(emptyCustomer);

  // ✅ notes_json 확장(스키마 변경 없이 개인정보 필드 추가 저장)
  type Notes = {
    callLogs?: { date: string; text: string }[];
    checks?: { date: string; items: { label: string; done: boolean }[] }[];
    profile?: {
      jobType?: string | null; // 직장인/자영업/프리랜서/무직/기타
      jobCategory?: string | null; // 사무/영업/현장/전문직/서비스/제조/교육/의료/공공/기타
      jobDetail?: string | null; // 직업 상세
    };
  };

  const notes = useMemo<Notes>(() => (form.notes_json || {}) as Notes, [form.notes_json]);
  const setNotes = (next: Notes) => setForm((p) => ({ ...p, notes_json: next }));
  const profileNote = useMemo(() => (notes.profile || {}) as NonNullable<Notes['profile']>, [notes.profile]);

  const setProfileNote = (patch: Partial<NonNullable<Notes['profile']>>) => {
    const next: Notes = {
      ...notes,
      profile: {
        ...(notes.profile || {}),
        ...patch,
      },
    };
    setNotes(next);
  };

  const [deals, setDeals] = useState<DealRow[]>([]);

  const loadDealsForCustomer = async (customerId: string) => {
    if (!userId) return;
    setErr(null);
    const { data, error } = await supabase
      .from('customer_deals')
      .select('*')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .order('deal_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setErr(error.message);
      setDeals([]);
      return;
    }
    setDeals((data || []) as DealRow[]);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      ...emptyCustomer,
      user_id: userId || '',
      notes_json: { profile: { jobType: null, jobCategory: null, jobDetail: null } },
    });
    setDeals([]);
    setIsOpen(true);
  };

  const [callText, setCallText] = useState('');

  /* =========================
     customer_deals 입력 (금액 0 고정 제거)
  ========================= */
  const [dealDate, setDealDate] = useState(() => fmtYMD(new Date()));
  const [dealType, setDealType] = useState<string>('sale');
  const [amountInt, setAmountInt] = useState<string>(''); // ✅ 기본 빈칸
  const [amountText, setAmountText] = useState<string>('');
  const [giftText, setGiftText] = useState<string>('');
  const [discountText, setDiscountText] = useState<string>('');
  const [followupType, setFollowupType] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<string>('');
  const [dealMemo, setDealMemo] = useState<string>('');

  const resetDealInputs = () => {
    setDealDate(fmtYMD(new Date()));
    setDealType('sale');
    setAmountInt('');
    setAmountText('');
    setGiftText('');
    setDiscountText('');
    setFollowupType('');
    setDeliveryStatus('');
    setDealMemo('');
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyCustomer);
    setDeals([]);
    setErr(null);
    setCallText('');
    resetDealInputs();
  };

  const openEdit = async (c: CustomerRow) => {
    setEditingId(c.id);
    setForm({
      ...emptyCustomer,
      ...c,
      notes_json: c.notes_json && typeof c.notes_json === 'object' ? c.notes_json : {},
    });

    setIsOpen(true);
    await loadDealsForCustomer(c.id);
  };

  const upsertCustomer = async () => {
    if (!userId) return;
    setErr(null);

    const payload: any = {
      user_id: userId,

      name: (form.name || '').trim() || null,
      phone: (form.phone || '').trim() || null,

      address: (form.address || '').trim() || null,
      birth: (form.birth || '').trim() || null,
      email: (form.email || '').trim() || null,

      stage: form.stage || null,
      grade: form.grade || null,
      propensity: typeof form.propensity === 'number' ? form.propensity : null,

      gender: (form.gender || '').trim() || null,
      married: form.married ?? null,
      student: form.student ?? null,
      children: form.children ?? null,

      job: (form.job || '').trim() || null,
      medical: (form.medical || '').trim() || null,

      memo: (form.memo || '').trim() || null,
      notes_json: form.notes_json ?? {},
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from('customers').insert(payload).select('id').single();
        if (error) throw error;

        if (ins?.id) {
          setEditingId(ins.id);
          await loadDealsForCustomer(ins.id);
        }
      }

      const { data: c, error: ce } = await supabase.from('customers').select('*').eq('user_id', userId);
      if (ce) throw ce;
      setCustomers((c || []) as CustomerRow[]);
    } catch (e: any) {
      setErr(e?.message || '저장 중 오류');
    }
  };

  const removeCustomer = async (id: string) => {
    if (!userId) return;
    if (!confirm('삭제할까요?')) return;
    setErr(null);
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;

      setCustomers((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) closeModal();
    } catch (e: any) {
      setErr(e?.message || '삭제 중 오류');
    }
  };

  /* =========================
     스케줄 CRUD (달력)
  ========================= */
  const [schedTitle, setSchedTitle] = useState('');
  const [schedTime, setSchedTime] = useState<string>('');
  const [schedCategory, setSchedCategory] = useState<string>('체크');

  const daySchedules = useMemo(() => schedulesByDate[selectedYMD] || [], [schedulesByDate, selectedYMD]);

  const addSchedule = async () => {
    if (!userId) return;
    const title = schedTitle.trim();
    if (!title) return;

    const payload: any = {
      user_id: userId,
      title,
      schedule_date: selectedYMD,
      schedule_time: schedTime || null,
      category: schedCategory || null,
    };

    setErr(null);
    try {
      const { error } = await supabase.from('schedules').insert(payload);
      if (error) throw error;

      const { data: s, error: se } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .gte('schedule_date', fmtYMD(startOfMonth(monthCursor)))
        .lte('schedule_date', fmtYMD(endOfMonth(monthCursor)));

      if (se) throw se;

      setSchedules((s || []) as ScheduleRow[]);
      setSchedTitle('');
      setSchedTime('');
      setSchedCategory('체크');
    } catch (e: any) {
      setErr(e?.message || '일정 저장 오류');
    }
  };

  const removeSchedule = async (id: string) => {
    if (!userId) return;
    if (!confirm('이 일정을 삭제할까요?')) return;

    setErr(null);
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;

      setSchedules((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message || '일정 삭제 오류');
    }
  };

  /* =========================
     notes_json 편집 helpers
  ========================= */
  const addCallLog = () => {
    const text = callText.trim();
    if (!text) return;
    const next: Notes = {
      ...notes,
      callLogs: [{ date: selectedYMD, text }, ...(notes.callLogs || [])],
    };
    setNotes(next);
    setCallText('');
  };

  const toggleCheck = (groupIdx: number, itemIdx: number) => {
    const groups = [...(notes.checks || [])];
    const g = groups[groupIdx];
    if (!g) return;
    const items = [...(g.items || [])];
    const it = items[itemIdx];
    if (!it) return;
    items[itemIdx] = { ...it, done: !it.done };
    groups[groupIdx] = { ...g, items };
    setNotes({ ...notes, checks: groups });
  };

  const ensureTodayCheckGroup = () => {
    const groups = [...(notes.checks || [])];
    const idx = groups.findIndex((x) => x.date === selectedYMD);
    if (idx !== -1) return idx;

    const base = [
      { label: '체크', done: false },
      { label: '통화', done: false },
      { label: '문자', done: false },
      { label: '방문', done: false },
      { label: '계약', done: false },
    ];
    groups.unshift({ date: selectedYMD, items: base });
    setNotes({ ...notes, checks: groups });
    return 0;
  };

  const addDealRow = async () => {
    if (!userId) return;
    if (!editingId) {
      setErr('먼저 고객을 저장해야 기록을 추가할 수 있어요. (고객 저장 후 다시 추가)');
      return;
    }
    setErr(null);

    const n = moneyToNumber(amountInt);

    const payload: any = {
      user_id: userId,
      customer_id: editingId,
      deal_date: (dealDate || '').trim() || fmtYMD(new Date()),
      deal_type: (dealType || 'sale').trim() || 'sale',
      amount_int: n,
      amount_text: amountText.trim() || null,

      gift_text: giftText.trim() || null,
      discount_text: discountText.trim() || null,
      followup_type: followupType.trim() || null,

      delivery_status: deliveryStatus.trim() || null,
      memo: dealMemo.trim() || null,
    };

    try {
      const { error } = await supabase.from('customer_deals').insert(payload);
      if (error) throw error;

      await loadDealsForCustomer(editingId);
      resetDealInputs();
    } catch (e: any) {
      setErr(e?.message || '기록 추가 오류');
    }
  };

  const removeDealRow = async (id: string) => {
    if (!userId) return;
    if (!editingId) return;
    if (!confirm('이 기록을 삭제할까요?')) return;

    setErr(null);
    try {
      const { error } = await supabase.from('customer_deals').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      await loadDealsForCustomer(editingId);
    } catch (e: any) {
      setErr(e?.message || '기록 삭제 오류');
    }
  };

  const dealsByDate = useMemo(() => {
    const map: Record<string, DealRow[]> = {};
    for (const d of deals) {
      const key = d.deal_date || 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
    return map;
  }, [deals]);

  /* =========================
     고객 검색 필터(이름/전화)
  ========================= */
  const filteredCustomers = useMemo(() => {
    const raw = (q || '').trim();
    if (!raw) return customers;

    const qLower = raw.toLowerCase();
    const qPhone = normPhone(raw);

    return (customers || []).filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = normPhone(c.phone || '');
      const hitName = name.includes(qLower);
      const hitPhone = qPhone ? phone.includes(qPhone) : false;
      return hitName || hitPhone;
    });
  }, [customers, q]);

  /* =========================
     작은 UI 유틸
  ========================= */
  const isSameDay = (a: Date, b: Date) => fmtYMD(a) === fmtYMD(b);
  const isSameMonth = (a: Date, monthBase: Date) =>
    a.getFullYear() === monthBase.getFullYear() && a.getMonth() === monthBase.getMonth();

  // ✅ 도트 색상(선명 유지)
  const catMeta = (cat?: string | null) => {
    const c = (cat || '').trim();

    if (c === '고객') return { dot: '•', color: '#ff9a3d' };
    if (c === '통화') return { dot: '•', color: '#ff4fa8' };
    if (c === '문자') return { dot: '•', color: '#9b5cff' };
    if (c === '방문') return { dot: '•', color: '#25c37a' };
    if (c === '계약') return { dot: '•', color: '#ff3b6b' };
    if (c === '체크') return { dot: '•', color: 'rgba(42,15,58,0.86)' };

    return { dot: '•', color: 'rgba(42,15,58,0.70)' };
  };

  // ✅ 달력 도트: 도트만 표시(텍스트/숫자 최소화)
  const getDayDotCats = (ymd: string) => {
    const list = schedulesByDate[ymd] || [];
    const set = new Set<string>();

    for (const s of list) {
      const key = (s.category || '체크').trim() || '체크';
      set.add(key);
    }

    const newC = customersByDate[ymd] || 0;
    if (newC > 0) set.add('고객');

    const order = ['체크', '통화', '문자', '방문', '계약', '고객'];
    const cats = order.filter((k) => set.has(k));
    const extra = [...set].filter((k) => !order.includes(k));
    return [...cats, ...extra];
  };

  /* =========================
     스타일 (✅ 빨간줄 원인: 중복키/객체 끊김 제거 + 정렬/짤림 방지)
  ========================= */
  const S: Record<string, any> = {
    page: { maxWidth: 980, margin: '0 auto', padding: '14px 14px 40px', boxSizing: 'border-box' },

    top: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
    titleWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
    title: { fontSize: 22, fontWeight: 950, letterSpacing: -0.4, color: '#231127' },
    sub: { fontSize: 12, fontWeight: 900, color: 'rgba(35,17,39,0.65)' },

    saveBtn: {
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(255,80,170,0.45)',
      background: 'linear-gradient(135deg, rgba(255,80,170,0.18), rgba(170,90,255,0.16))',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },

    card: {
      marginTop: 12,
      borderRadius: 18,
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(255,80,170,0.18)',
      boxShadow: '0 10px 30px rgba(30,10,40,0.10)',
      padding: 14,
      boxSizing: 'border-box',
      overflow: 'hidden',
    },

    sectionTitle: { fontSize: 14, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.2 },
    sectionSub: { fontSize: 12, fontWeight: 850, color: 'rgba(42,15,58,0.55)', marginTop: 4 },

    headerCard: {
      marginTop: 12,
      borderRadius: 18,
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(255,80,170,0.18)',
      boxShadow: '0 10px 30px rgba(30,10,40,0.10)',
      padding: 14,
      boxSizing: 'border-box',
      overflow: 'hidden',
    },

    // ✅ 말풍선/마스코트: 모바일에서도 치우침/짤림 없게 (기본 세로, 넓으면 2열은 CSS에서)
    coachRow: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' },
    bubble: {
      borderRadius: 18,
      border: '1px solid rgba(255,80,170,0.22)',
      background: 'linear-gradient(135deg, rgba(255,80,170,0.10), rgba(170,90,255,0.10))',
      padding: 12,
      boxSizing: 'border-box',
    },
    bubbleTitle: { fontSize: 14, fontWeight: 950, color: '#5b1a5b', letterSpacing: -0.2 },
    bubbleBody: { marginTop: 6, fontSize: 13, fontWeight: 900, color: '#2a0f3a', lineHeight: 1.35, wordBreak: 'keep-all' },
    bubbleTip: {
      marginTop: 8,
      padding: '8px 10px',
      borderRadius: 14,
      border: '1px dashed rgba(255,80,170,0.35)',
      background: 'rgba(255,80,170,0.07)',
      color: '#6b1140',
      fontSize: 12,
      fontWeight: 900,
      lineHeight: 1.35,
    },

    mascotWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    // ✅ 업쮸(고고) 안 보이는 경우: frame이 투명/overflow 영향 -> 안전한 배경 + 중앙 정렬
    mascotFrame: {
  width: 160,
  height: 160,
  borderRadius: 22,

  /* ❌ 테두리/배경/그림자 제거 */
  border: 'none',
  background: 'transparent',
  boxShadow: 'none',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'uplogFloat 3.2s ease-in-out infinite',
  transform: 'translateZ(0)',
  willChange: 'transform',
  boxSizing: 'border-box',
  overflow: 'visible', // ← 이미지 잘림 방지
},

    mascotImg: { width: 150, height: 150, objectFit: 'contain', filter: 'drop-shadow(0 8px 14px rgba(30,10,40,0.18))' },

    listRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '10px 10px',
      borderRadius: 14,
      border: '1px solid rgba(20,10,30,0.06)',
      background: 'rgba(255,255,255,0.78)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      minWidth: 0,
    },
    listLeft: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 },
    name: { fontSize: 14, fontWeight: 950, color: '#221126', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    meta: { fontSize: 12, fontWeight: 850, color: 'rgba(34,17,38,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

    rowBtns: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
    ghostBtn: {
      padding: '8px 10px',
      borderRadius: 12,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.65)',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    dangerBtn: {
      padding: '8px 10px',
      borderRadius: 12,
      border: '1px solid rgba(255,60,120,0.25)',
      background: 'rgba(255,60,120,0.08)',
      color: '#8a1240',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },

    searchRow: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.80)',
      outline: 'none',
      fontSize: 13,
      fontWeight: 900,
      color: '#2a0f3a',
      boxSizing: 'border-box',
    },
    searchHint: { fontSize: 12, fontWeight: 850, color: 'rgba(42,15,58,0.55)' },

    calTop: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
    pill: {
      padding: '8px 10px',
      borderRadius: 999,
      border: '1px solid rgba(170,90,255,0.25)',
      background: 'rgba(170,90,255,0.10)',
      fontWeight: 950,
      color: '#2a0f3a',
      fontSize: 12,
      whiteSpace: 'nowrap',
    },
    calBtn: {
      padding: '9px 10px',
      borderRadius: 12,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.72)',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },

    // ✅ 달력 도트 안내(달력 스케줄 글귀 밑으로 이동)
    dotLegendWrap: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 16,
      border: '1px solid rgba(255,80,170,0.18)',
      background: 'rgba(255,255,255,0.78)',
      boxShadow: '0 10px 24px rgba(30,10,40,0.06)',
      boxSizing: 'border-box',
    },
    dotLegendTitle: { fontSize: 12, fontWeight: 950, color: '#2a0f3a' },
    dotLegendRow: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 },
    dotLegendItem: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid rgba(60,20,80,0.10)',
      background: 'rgba(255,255,255,0.72)',
      fontSize: 12,
      fontWeight: 900,
      color: 'rgba(42,15,58,0.80)',
      whiteSpace: 'nowrap',
    },

    calGridWrap: { marginTop: 10, width: '100%', overflowX: 'hidden' },
    weekHead: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 },
    weekCell: { fontSize: 12, fontWeight: 950, color: 'rgba(42,15,58,0.65)', textAlign: 'center', padding: '6px 0' },

    calGrid: { marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 },

    // ✅ 셀: 높이 고정 + 내부는 2줄 구조(짤림 방지)
    dayCell: (active: boolean, inMonth: boolean) => ({
      borderRadius: 16,
      border: active ? '1px solid rgba(255,80,170,0.38)' : '1px solid rgba(20,10,30,0.06)',
      background: active ? 'rgba(255,80,170,0.08)' : inMonth ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.50)',
      padding: 8,
      cursor: 'pointer',
      userSelect: 'none',
      boxSizing: 'border-box',
      height: 62, // ✅ 고정
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      minWidth: 0,
    }),
    dayTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minWidth: 0 },
    dayNum: (inMonth: boolean) => ({
      fontSize: 12,
      fontWeight: 950,
      color: inMonth ? '#2a0f3a' : 'rgba(42,15,58,0.35)',
      lineHeight: 1,
      minWidth: 16,
    }),
    dotRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      flexWrap: 'wrap',
      maxWidth: 46,
      overflow: 'hidden',
    },
    dot: (color: string) => ({
      width: 8,
      height: 8,
      borderRadius: 99,
      background: color,
      display: 'inline-block',
      flexShrink: 0,
    }),
    dayBottom: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
    dayCount: {
      fontSize: 11,
      fontWeight: 950,
      color: 'rgba(42,15,58,0.55)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
    },

    mobileHint: { marginTop: 8, fontSize: 12, fontWeight: 900, color: 'rgba(42,15,58,0.55)' },

    stack: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 },

    box: {
      borderRadius: 18,
      border: '1px solid rgba(20,10,30,0.06)',
      background: 'rgba(255,255,255,0.84)',
      padding: 12,
      boxShadow: '0 10px 24px rgba(30,10,40,0.06)',
      boxSizing: 'border-box',
      overflow: 'hidden',
    },
    boxTitle: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    boxSub: { marginTop: 4, fontSize: 12, fontWeight: 850, color: 'rgba(42,15,58,0.55)' },

    hr: { height: 1, background: 'rgba(30,10,40,0.08)', border: 'none', margin: '10px 0' },

    formRow: { marginTop: 10 },
    miniLabel: { fontSize: 12, fontWeight: 950, color: 'rgba(42,15,58,0.75)' },

    // ✅ 입력줄: auto-fit로 좁으면 아래로 자연스럽게
    addRow: { marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'center' },

    input: {
      width: '100%',
      padding: '9px 10px',
      borderRadius: 12,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.80)',
      outline: 'none',
      fontSize: 13,
      fontWeight: 900,
      color: '#2a0f3a',
      boxSizing: 'border-box',
      minWidth: 0,
    },
    select: {
      width: '100%',
      padding: '9px 10px',
      borderRadius: 12,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.80)',
      outline: 'none',
      fontSize: 13,
      fontWeight: 900,
      color: '#2a0f3a',
      boxSizing: 'border-box',
      minWidth: 0,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.80)',
      outline: 'none',
      fontSize: 13,
      fontWeight: 900,
      color: '#2a0f3a',
      boxSizing: 'border-box',
      minHeight: 92,
      resize: 'vertical',
      lineHeight: 1.35,
    },

    errBox: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,120,0.22)',
      background: 'rgba(255,60,120,0.08)',
      color: '#7a1038',
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.35,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
      boxSizing: 'border-box',
    },

    // ✅ 모달
    modalBack: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(10,6,14,0.42)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      zIndex: 9999,
      boxSizing: 'border-box',
    },
    modal: {
      width: 'min(980px, 100%)',
      maxHeight: 'min(92vh, 980px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(255,80,170,0.20)',
      boxShadow: '0 24px 60px rgba(10,6,14,0.35)',
      padding: 14,
      boxSizing: 'border-box',
    },
    modalTop: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
    modalTitle: { fontSize: 18, fontWeight: 950, color: '#231127', letterSpacing: -0.3 },
    modalSub: { fontSize: 12, fontWeight: 900, color: 'rgba(35,17,39,0.60)', marginTop: 4 },
    modalBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },

    primaryBtn: {
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(255,80,170,0.45)',
      background: 'linear-gradient(135deg, rgba(255,80,170,0.22), rgba(170,90,255,0.18))',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    closeBtn: {
      padding: '10px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,20,80,0.12)',
      background: 'rgba(255,255,255,0.72)',
      color: '#2a0f3a',
      fontWeight: 950,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },

    // ✅ 모달 내부 그리드: 기본 1열(짤림 방지), 넓으면 2열은 CSS에서
    modalGrid: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 },
    modalCol: { display: 'flex', flexDirection: 'column', gap: 10 },

    fieldGrid2: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 },
    fieldGrid3: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 },

    label: { fontSize: 12, fontWeight: 950, color: 'rgba(42,15,58,0.75)', marginBottom: 6 },

    logRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginTop: 10 },
    logList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
    logItem: {
      padding: '10px 10px',
      borderRadius: 14,
      border: '1px solid rgba(20,10,30,0.06)',
      background: 'rgba(255,255,255,0.74)',
      boxSizing: 'border-box',
    },
    logDate: { fontSize: 11, fontWeight: 950, color: 'rgba(42,15,58,0.60)' },
    logText: { marginTop: 4, fontSize: 13, fontWeight: 900, color: '#2a0f3a', lineHeight: 1.35 },

    checkGrid: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 },
    checkBtn: (done: boolean) => ({
      padding: '10px 10px',
      borderRadius: 14,
      border: done ? '1px solid rgba(37,195,122,0.35)' : '1px solid rgba(60,20,80,0.12)',
      background: done ? 'rgba(37,195,122,0.12)' : 'rgba(255,255,255,0.70)',
      color: done ? '#137a4b' : 'rgba(42,15,58,0.78)',
      fontWeight: 950,
      fontSize: 12,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      textAlign: 'center' as const,
      boxSizing: 'border-box',
    }),

    dealForm: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, alignItems: 'center' },
    dealForm2: { marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 },
    dealForm3: { marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 },

    dealList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 },
    dealDay: {
      borderRadius: 18,
      border: '1px solid rgba(20,10,30,0.06)',
      background: 'rgba(255,255,255,0.76)',
      padding: 10,
      boxSizing: 'border-box',
      overflow: 'hidden',
    },
    dealDayTitle: { fontSize: 12, fontWeight: 950, color: 'rgba(42,15,58,0.72)' },
    dealItem: {
      marginTop: 8,
      padding: '10px 10px',
      borderRadius: 14,
      border: '1px solid rgba(60,20,80,0.10)',
      background: 'rgba(255,255,255,0.72)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      boxSizing: 'border-box',
      overflow: 'hidden',
      minWidth: 0,
    },
    dealLeft: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 },
    dealTopLine: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
    dealTag: (bg: string, color: string) => ({
      padding: '5px 8px',
      borderRadius: 999,
      border: '1px solid rgba(0,0,0,0.06)',
      background: bg,
      color,
      fontWeight: 950,
      fontSize: 12,
      whiteSpace: 'nowrap',
    }),
    dealMoney: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    dealMeta: { fontSize: 12, fontWeight: 850, color: 'rgba(42,15,58,0.55)', lineHeight: 1.35, wordBreak: 'break-word' as const },

    mobileHint2: { marginTop: 8, fontSize: 12, fontWeight: 900, color: 'rgba(42,15,58,0.55)' },
  };

  /* =========================
     렌더 유틸
  ========================= */
  const dotLegend = [
    { label: '체크', color: catMeta('체크').color },
    { label: '통화', color: catMeta('통화').color },
    { label: '문자', color: catMeta('문자').color },
    { label: '방문', color: catMeta('방문').color },
    { label: '계약', color: catMeta('계약').color },
    { label: '고객', color: catMeta('고객').color },
  ];

  const dealTypeMeta = (t: string) => {
    const x = (t || '').trim();
    if (x === 'contract') return { label: '계약', bg: 'rgba(255,59,107,0.12)', color: '#b0133a' };
    if (x === 'sale') return { label: '판매', bg: 'rgba(255,80,170,0.12)', color: '#7a1038' };
    if (x === 'renewal') return { label: '재구매', bg: 'rgba(37,195,122,0.12)', color: '#137a4b' };
    if (x === 'referral') return { label: '소개', bg: 'rgba(155,92,255,0.12)', color: '#4a1d9a' };
    if (x === 'aftercare') return { label: '사후', bg: 'rgba(42,15,58,0.10)', color: '#2a0f3a' };
    return { label: x || '기록', bg: 'rgba(42,15,58,0.10)', color: '#2a0f3a' };
  };

  const renderDealMetaLine = (d: DealRow) => {
    const parts: string[] = [];
    if (d.amount_text) parts.push(`조건: ${d.amount_text}`);
    if (d.gift_text) parts.push(`사은품: ${d.gift_text}`);
    if (d.discount_text) parts.push(`할인: ${d.discount_text}`);
    if (d.followup_type) parts.push(`후속: ${d.followup_type}`);
    if (d.delivery_status) parts.push(`배송: ${d.delivery_status}`);
    if (d.memo) parts.push(`메모: ${d.memo}`);
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <ClientShell>
        <div style={S.page}>
          <div style={S.title}>고객관리</div>
          <div style={S.sub}>불러오는 중…</div>
        </div>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <style>{`
        @keyframes uplogFloat {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }

        /* ✅ 넓은 화면에서만 2열로(모바일은 1열 고정) */
        @media (min-width: 860px) {
          .coachRowWide {
            display: grid !important;
            grid-template-columns: 1fr 170px !important;
            align-items: center !important;
            gap: 12px !important;
          }
          .modalGridWide {
            display: grid !important;
            grid-template-columns: 1.05fr 0.95fr !important;
            gap: 12px !important;
            align-items: start !important;
          }
        }
      `}</style>

      <div style={S.page}>
        {/* 상단 */}
        <div style={S.top}>
          <div style={S.titleWrap}>
            <div style={S.title}>고객관리</div>
            <div style={S.sub}>고객 정보 + 일정 + 통화/체크 + 계약(기록)까지 한 화면에서 관리</div>
          </div>

          <button type="button" style={S.saveBtn} onClick={openNew}>
            + 고객 추가
          </button>
        </div>

        {err ? <div style={S.errBox}>{err}</div> : null}

        {/* 말풍선/마스코트 (✅ 업쮸 이미지 복구) */}
        <div style={S.headerCard}>
          <div className="coachRowWide" style={S.coachRow}>
            <div style={S.bubble}>
              <div style={S.bubbleTitle}>업쮸 코치</div>
              <div style={S.bubbleBody}>
                고객을 추가하고, 달력에서 날짜를 눌러 일정(체크/통화/문자/방문/계약)을 쌓아보세요.
                <br />
                계약/판매 기록은 고객 상세에서 바로 남길 수 있어요.
              </div>
              <div style={S.bubbleTip}>팁) 달력은 “도트 색상”만 보여요. 날짜를 눌러 아래에서 상세를 확인해요.</div>
            </div>

            <div style={S.mascotWrap}>
              <div style={S.mascotFrame}>
                <img
                  src="/upzzu6.png"
                  alt="upzzu"
                  style={S.mascotImg}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = '/upzzu6.png';
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 고객 리스트 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>고객 목록</div>
          <div style={S.sectionSub}>이름/전화로 빠르게 찾고, 눌러서 바로 편집하세요</div>

          <div style={S.searchRow}>
            <input style={S.searchInput} placeholder="고객 검색 (이름 / 전화번호)" value={q} onChange={(e) => setQ(e.target.value)} />
            <div style={S.searchHint}>전화는 숫자만 입력해도 검색됩니다. 예) 0101234</div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredCustomers.length === 0 ? (
              <div style={S.sub}>고객이 없습니다. 우측 상단 “+ 고객 추가”로 시작해요.</div>
            ) : (
              filteredCustomers
                .slice()
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map((c) => (
                  <div key={c.id} style={S.listRow}>
                    <div style={S.listLeft}>
                      <div style={S.name}>{c.name || '(이름 없음)'}</div>
                      <div style={S.meta}>
                        {c.phone || '-'} · {shortAddr(c.address)} · {c.stage || '-'} · {c.grade || '-'} · 결혼 {yn(c.married)} · 자녀 {yn(c.children)}
                      </div>
                    </div>

                    <div style={S.rowBtns}>
                      <button type="button" style={S.ghostBtn} onClick={() => openEdit(c)}>
                        보기/수정
                      </button>
                      <button type="button" style={S.dangerBtn} onClick={() => removeCustomer(c.id)}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* 달력 + 선택날짜 일정 */}
        <div style={S.card}>
          <div style={S.calTop}>
            <div>
              <div style={S.sectionTitle}>달력 스케줄</div>
              <div style={S.sectionSub}>날짜별로 체크/통화/문자/방문/계약(및 고객 추가)을 도트로 표시</div>

              {/* ✅✅✅ 달력도트색상안내: “달력 스케줄 글귀 밑”으로 이동 */}
              <div style={S.dotLegendWrap}>
                <div style={S.dotLegendTitle}>달력 도트 색상 안내</div>
                <div style={S.dotLegendRow}>
                  {dotLegend.map((x) => (
                    <div key={x.label} style={S.dotLegendItem}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: x.color, display: 'inline-block' }} />
                      {x.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" style={S.calBtn} onClick={prevMonth}>
                ◀ 이전달
              </button>
              <span style={S.pill}>{monthLabel}</span>
              <button type="button" style={S.calBtn} onClick={nextMonth}>
                다음달 ▶
              </button>
            </div>
          </div>

          <div style={S.calGridWrap}>
            <div style={S.weekHead}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} style={S.weekCell}>
                  {w}
                </div>
              ))}
            </div>

            <div style={S.calGrid}>
              {gridDays.map((d) => {
                const inMonth = isSameMonth(d, monthCursor);
                const active = isSameDay(d, selectedDate);
                const ymd = fmtYMD(d);

                const cats = getDayDotCats(ymd);
                const list = schedulesByDate[ymd] || [];
                const cnt = list.length + (customersByDate[ymd] || 0);

                return (
                  <div key={ymd} style={S.dayCell(active, inMonth)} onClick={() => pickDay(d)}>
                    <div style={S.dayTop}>
                      <div style={S.dayNum(inMonth)}>{d.getDate()}</div>
                      <div style={S.dotRow}>
                        {cats.slice(0, 6).map((cat) => (
                          <span key={cat} style={S.dot(catMeta(cat).color)} />
                        ))}
                      </div>
                    </div>

                    <div style={S.dayBottom}>
                      <div style={S.dayCount}>{cnt > 0 ? `기록 ${cnt}` : ''}</div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(42,15,58,0.35)' }}>{active ? '선택' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={S.mobileHint}>달력이 작아도 셀 밖으로 내용이 튀지 않게 “고정 높이 + 도트 중심”으로 구성했습니다.</div>
          </div>

          {/* 선택 날짜 상세 + 추가 */}
          <div style={S.stack}>
            <div style={S.box}>
              <div style={S.boxTitle}>선택 날짜: {selectedYMD}</div>
              <div style={S.boxSub}>이 날짜에 저장된 일정 목록(시간순)</div>

              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {daySchedules.length === 0 ? (
                  <div style={S.sub}>아직 일정이 없습니다. 아래에서 바로 추가해요.</div>
                ) : (
                  daySchedules.map((s) => (
                    <div key={s.id} style={S.listRow}>
                      <div style={S.listLeft}>
                        <div style={S.name}>{s.title}</div>
                        <div style={S.meta}>
                          {(s.schedule_time || '시간없음')} ·{' '}
                          <span style={{ color: catMeta(s.category).color, fontWeight: 950 }}>{s.category || '체크'}</span>
                        </div>
                      </div>
                      <div style={S.rowBtns}>
                        <button type="button" style={S.dangerBtn} onClick={() => removeSchedule(s.id)}>
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <hr style={S.hr} />

              <div style={S.formRow}>
                <div style={S.miniLabel}>일정 추가</div>
                <div style={S.addRow}>
                  <input
                    style={S.input}
                    placeholder="예: 체크 / 통화 / 방문 / 계약 등"
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                  />
                  <input style={S.input} placeholder="시간(선택)" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                  <select style={S.select} value={schedCategory} onChange={(e) => setSchedCategory(e.target.value)}>
                    {['체크', '통화', '문자', '방문', '계약'].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  <button type="button" style={S.primaryBtn} onClick={addSchedule}>
                    + 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 */}
        {isOpen ? (
          <div style={S.modalBack} onMouseDown={(e) => e.currentTarget === e.target && closeModal()}>
            <div style={S.modal}>
              <div style={S.modalTop}>
                <div>
                  <div style={S.modalTitle}>{editingId ? '고객 수정' : '고객 추가'}</div>
                  <div style={S.modalSub}>기본 정보 + 개인정보 + 체크/통화 기록 + 계약/판매 기록까지</div>
                </div>
                <div style={S.modalBtns}>
                  <button type="button" style={S.primaryBtn} onClick={upsertCustomer}>
                    저장
                  </button>
                  {editingId ? (
                    <button type="button" style={S.dangerBtn} onClick={() => removeCustomer(editingId)}>
                      고객 삭제
                    </button>
                  ) : null}
                  <button type="button" style={S.closeBtn} onClick={closeModal}>
                    닫기
                  </button>
                </div>
              </div>

              {err ? <div style={S.errBox}>{err}</div> : null}

              <div className="modalGridWide" style={S.modalGrid}>
                {/* 좌측: 고객 정보 / 개인정보 / 메모 */}
                <div style={S.modalCol}>
                  <div style={S.box}>
                    <div style={S.boxTitle}>기본 정보</div>

                    <div style={S.fieldGrid2}>
                      <div>
                        <div style={S.label}>이름</div>
                        <input style={S.input} value={form.name || ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <div style={S.label}>전화번호</div>
                        <input
                          style={S.input}
                          value={form.phone || ''}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="예: 010-1234-5678"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={S.label}>주소</div>
                      <input
                        style={S.input}
                        value={form.address || ''}
                        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="예: 서울시 강남구…"
                      />
                    </div>

                    <div style={S.fieldGrid3}>
                      <div>
                        <div style={S.label}>생일</div>
                        <input
                          style={S.input}
                          value={form.birth || ''}
                          onChange={(e) => setForm((p) => ({ ...p, birth: e.target.value }))}
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                      <div>
                        <div style={S.label}>이메일</div>
                        <input
                          style={S.input}
                          value={form.email || ''}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="(선택)"
                        />
                      </div>
                      <div>
                        <div style={S.label}>성별</div>
                        <select style={S.select} value={form.gender || ''} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                          <option value="">-</option>
                          <option value="남">남</option>
                          <option value="여">여</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={S.box}>
                    <div style={S.boxTitle}>상태/속성</div>

                    <div style={S.fieldGrid3}>
                      <div>
                        <div style={S.label}>단계(stage)</div>
                        <select style={S.select} value={form.stage || '신규'} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}>
                          {['신규', '진행', '완료', '취소'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>등급(grade)</div>
                        <select style={S.select} value={form.grade || '일반'} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}>
                          {['일반', '관심', '핵심', 'VIP'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>성향(propensity)</div>
                        <input
                          style={S.input}
                          type="number"
                          value={String(form.propensity ?? 0)}
                          onChange={(e) => setForm((p) => ({ ...p, propensity: Number(e.target.value || 0) }))}
                        />
                      </div>
                    </div>

                    <div style={S.fieldGrid3}>
                      <div>
                        <div style={S.label}>결혼</div>
                        <select
                          style={S.select}
                          value={form.married === null ? '' : form.married ? '1' : '0'}
                          onChange={(e) => setForm((p) => ({ ...p, married: e.target.value === '' ? null : e.target.value === '1' }))}
                        >
                          <option value="">-</option>
                          <option value="1">예</option>
                          <option value="0">아니오</option>
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>학생</div>
                        <select
                          style={S.select}
                          value={form.student === null ? '' : form.student ? '1' : '0'}
                          onChange={(e) => setForm((p) => ({ ...p, student: e.target.value === '' ? null : e.target.value === '1' }))}
                        >
                          <option value="">-</option>
                          <option value="1">예</option>
                          <option value="0">아니오</option>
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>자녀</div>
                        <select
                          style={S.select}
                          value={form.children === null ? '' : form.children ? '1' : '0'}
                          onChange={(e) => setForm((p) => ({ ...p, children: e.target.value === '' ? null : e.target.value === '1' }))}
                        >
                          <option value="">-</option>
                          <option value="1">예</option>
                          <option value="0">아니오</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={S.box}>
                    <div style={S.boxTitle}>직업(확장: notes_json.profile)</div>
                    <div style={S.boxSub}>스키마 변경 없이 notes_json 안에 저장됩니다</div>

                    <div style={S.fieldGrid3}>
                      <div>
                        <div style={S.label}>직업 타입</div>
                        <select style={S.select} value={profileNote.jobType || ''} onChange={(e) => setProfileNote({ jobType: e.target.value || null })}>
                          <option value="">-</option>
                          {['직장인', '자영업', '프리랜서', '무직', '기타'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={S.label}>직업 카테고리</div>
                        <select
                          style={S.select}
                          value={profileNote.jobCategory || ''}
                          onChange={(e) => setProfileNote({ jobCategory: e.target.value || null })}
                        >
                          <option value="">-</option>
                          {['사무', '영업', '현장', '전문직', '서비스', '제조', '교육', '의료', '공공', '기타'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={S.label}>직업 상세</div>
                        <input
                          style={S.input}
                          value={profileNote.jobDetail || ''}
                          onChange={(e) => setProfileNote({ jobDetail: e.target.value || null })}
                          placeholder="예: 보험설계사 / 학원강사 / 공무원…"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={S.box}>
                    <div style={S.boxTitle}>추가 메모</div>
                    <textarea
                      style={S.textarea}
                      value={form.memo || ''}
                      onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                      placeholder="성향/관심사/가족상황/다음 액션 등"
                    />
                  </div>
                </div>

                {/* 우측: 체크/통화 기록 + 계약/판매 기록 */}
                <div style={S.modalCol}>
                  <div style={S.box}>
                    <div style={S.boxTitle}>오늘 체크(선택 날짜 기준)</div>
                    <div style={S.boxSub}>체크/통화/문자/방문/계약을 토글로 관리</div>

                    {(() => {
                      const idx = ensureTodayCheckGroup();
                      const g = (notes.checks || [])[idx];
                      const items = g?.items || [];
                      return (
                        <div style={S.checkGrid}>
                          {items.map((it, i) => (
                            <button key={it.label} type="button" style={S.checkBtn(!!it.done)} onClick={() => toggleCheck(idx, i)}>
                              {it.done ? '✓ ' : ''}
                              {it.label}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={S.box}>
                    <div style={S.boxTitle}>통화/메모 로그</div>
                    <div style={S.boxSub}>선택 날짜에 한 줄로 기록해두면, 다음 액션이 빨라집니다</div>

                    <div style={S.logRow}>
                      <input
                        style={S.input}
                        value={callText}
                        onChange={(e) => setCallText(e.target.value)}
                        placeholder="예: 3시에 다시 전화 / 고민중이라 자료 발송"
                      />
                      <button type="button" style={S.primaryBtn} onClick={addCallLog}>
                        + 기록
                      </button>
                    </div>

                    <div style={S.logList}>
                      {(notes.callLogs || []).slice(0, 10).map((x, i) => (
                        <div key={`${x.date}-${i}`} style={S.logItem}>
                          <div style={S.logDate}>{x.date}</div>
                          <div style={S.logText}>{x.text}</div>
                        </div>
                      ))}
                      {(notes.callLogs || []).length === 0 ? <div style={S.sub}>아직 로그가 없습니다.</div> : null}
                    </div>
                  </div>

                  <div style={S.box}>
                    <div style={S.boxTitle}>계약/판매 기록(customer_deals)</div>
                    <div style={S.boxSub}>고객 저장 후에 기록 추가 가능 (금액 입력은 빈칸 유지 가능)</div>

                    <div style={S.dealForm}>
                      <div>
                        <div style={S.label}>날짜</div>
                        <input style={S.input} value={dealDate} onChange={(e) => setDealDate(e.target.value)} placeholder="YYYY-MM-DD" />
                      </div>
                      <div>
                        <div style={S.label}>유형</div>
                        <select style={S.select} value={dealType} onChange={(e) => setDealType(e.target.value)}>
                          <option value="sale">판매</option>
                          <option value="contract">계약</option>
                          <option value="renewal">재구매</option>
                          <option value="referral">소개</option>
                          <option value="aftercare">사후관리</option>
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>금액(숫자)</div>
                        <input
                          style={S.input}
                          value={amountInt}
                          onChange={(e) => setAmountInt(formatMoneyInput(e.target.value))}
                          placeholder="예: 1,200,000 (빈칸 가능)"
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                                        <div style={S.dealForm2}>
                      <div>
                        <div style={S.label}>조건/메모(텍스트)</div>
                        <input
                          style={S.input}
                          value={amountText}
                          onChange={(e) => setAmountText(e.target.value)}
                          placeholder='예: 무이자 10개월 / 현금할인 / 카드사 이벤트'
                        />
                      </div>
                      <div>
                        <div style={S.label}>사은품</div>
                        <input
                          style={S.input}
                          value={giftText}
                          onChange={(e) => setGiftText(e.target.value)}
                          placeholder="예: 필터 2개 / 사은품 없음"
                        />
                      </div>
                      <div>
                        <div style={S.label}>할인</div>
                        <input
                          style={S.input}
                          value={discountText}
                          onChange={(e) => setDiscountText(e.target.value)}
                          placeholder="예: 10% / 30,000원"
                        />
                      </div>
                    </div>

                    <div style={S.dealForm3}>
                      <div>
                        <div style={S.label}>후속(재판매/소개/지속관리)</div>
                        <input
                          style={S.input}
                          value={followupType}
                          onChange={(e) => setFollowupType(e.target.value)}
                          placeholder="예: 재판매 / 소개 / 지속관리"
                        />
                      </div>
                      <div>
                        <div style={S.label}>배송/진행 상태</div>
                        <input
                          style={S.input}
                          value={deliveryStatus}
                          onChange={(e) => setDeliveryStatus(e.target.value)}
                          placeholder="예: 발송 / 배송완료 / 제품확인 / 교환"
                        />
                      </div>
                      <div>
                        <div style={S.label}>메모</div>
                        <input
                          style={S.input}
                          value={dealMemo}
                          onChange={(e) => setDealMemo(e.target.value)}
                          placeholder="예: 다음주 재방문 / 소개자 OOO"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" style={S.primaryBtn} onClick={addDealRow}>
                        + 기록 추가
                      </button>
                      <button type="button" style={S.closeBtn} onClick={resetDealInputs}>
                        입력 초기화
                      </button>
                      {!editingId ? <div style={S.mobileHint2}>※ 고객을 먼저 저장해야 기록을 추가할 수 있어요.</div> : null}
                    </div>

                    <div style={S.dealList}>
                      {Object.keys(dealsByDate).length === 0 ? (
                        <div style={S.sub}>아직 기록이 없습니다.</div>
                      ) : (
                        Object.keys(dealsByDate)
                          .slice()
                          .sort((a, b) => b.localeCompare(a))
                          .map((day) => (
                            <div key={day} style={S.dealDay}>
                              <div style={S.dealDayTitle}>{day}</div>

                              {(dealsByDate[day] || []).map((d) => {
                                const t = dealTypeMeta(d.deal_type);
                                const metaLine = renderDealMetaLine(d);
                                return (
                                  <div key={d.id} style={S.dealItem}>
                                    <div style={S.dealLeft}>
                                      <div style={S.dealTopLine}>
                                        <span style={S.dealTag(t.bg, t.color)}>{t.label}</span>
                                        <span style={S.dealMoney}>
                                          {d.amount_int && d.amount_int > 0 ? `${fmtMoney(d.amount_int)}원` : '금액 없음'}
                                        </span>
                                      </div>
                                      {metaLine ? <div style={S.dealMeta}>{metaLine}</div> : <div style={S.dealMeta}>상세 메모 없음</div>}
                                    </div>

                                    <div style={S.rowBtns}>
                                      <button type="button" style={S.dangerBtn} onClick={() => removeDealRow(d.id)}>
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ 모달 하단 안내 */}
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 900, color: 'rgba(42,15,58,0.55)' }}>
                저장 버튼을 누르면 고객 정보/개인정보/체크/통화 로그/직업(확장)까지 함께 저장됩니다.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ClientShell>
  );
}
