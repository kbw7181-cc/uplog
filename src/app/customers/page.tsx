// ✅✅✅ 전체복붙: src/app/customers/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type CustomerRow = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  stage?: string | null;
  grade?: string | null;
  propensity?: number | null;

  address?: string | null;
  birth?: string | null;
  gender?: string | null;
  married?: boolean | null;
  children?: boolean | null;
  family?: string | null;
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

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfCalendarGrid(d: Date) {
  const first = startOfMonth(d);
  const dow = first.getDay();
  const s = new Date(first);
  s.setDate(first.getDate() - dow);
  return s;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameYMD(a: Date, b: Date) {
  return fmtYMD(a) === fmtYMD(b);
}

function stageEmoji(stage: string) {
  const s = (stage || '').trim();
  if (s.includes('신규')) return '🌱';
  if (s.includes('가망')) return '🔮';
  if (s.includes('계약')) return '🧾';
  if (s.includes('소개')) return '🤝';
  return '✨';
}
function gradeEmoji(grade: string) {
  const g = (grade || '').trim().toUpperCase();
  if (g === 'VIP') return '💎';
  if (g === 'A') return '👑';
  if (g === 'B') return '🔥';
  if (g === 'C') return '🌿';
  return '⭐';
}
function safeJsonParse<T>(raw: any, fallback: T): T {
  try {
    if (raw == null) return fallback;
    if (typeof raw === 'string') return (JSON.parse(raw) ?? fallback) as T;
    return (raw ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function buildScheduleTitle(customerName: string, kindLabel: string, extra?: string) {
  const base = `${customerName} · ${kindLabel}`;
  return extra ? `${base} · ${extra}` : base;
}
function isColumnishError(msg: string) {
  const m = (msg || '').toLowerCase();
  return m.includes('42703') || m.includes('column') || m.includes('does not exist') || m.includes('schema cache');
}

const META_TAG = '\n\n[UPLOGMETA]';

function splitMemoAndMeta(rawMemo: any) {
  const s = String(rawMemo ?? '');
  const idx = s.indexOf(META_TAG);
  if (idx < 0) return { memoOnly: s, meta: null as any };
  const memoOnly = s.slice(0, idx).trimEnd();
  const metaRaw = s.slice(idx + META_TAG.length).trim();
  const meta = safeJsonParse<any>(metaRaw, null);
  return { memoOnly, meta };
}

function attachMetaToMemo(memoOnly: string, meta: any) {
  const base = String(memoOnly || '').trim();
  const metaStr = JSON.stringify(meta ?? {});
  if (!metaStr || metaStr === '{}' || metaStr === 'null') return base || null;
  return `${base}${META_TAG}${metaStr}`;
}

function nowISO() {
  return new Date().toISOString();
}
function fmtKoreanDT(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function todayYMD() {
  return fmtYMD(new Date());
}
function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function isYMD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isHHMM(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

type CustomerCols = {
  stage: boolean;
  grade: boolean;
  propensity: boolean;
  address: boolean;
  birth: boolean;
  gender: boolean;
  married: boolean;
  children: boolean;
  family: boolean;
  job: boolean;
  medical: boolean;
  memo: boolean;
  notes_json: boolean;
  created_at: boolean;
};

async function detectCustomerCols(): Promise<CustomerCols> {
  async function hasCol(col: string) {
    try {
      const { error } = await supabase.from('customers').select(col).limit(1);
      if (!error) return true;
      const msg = String(error.message || error);
      if (isColumnishError(msg)) return false;
      return false;
    } catch {
      return false;
    }
  }

  const [
    stage,
    grade,
    propensity,
    address,
    birth,
    gender,
    married,
    children,
    family,
    job,
    medical,
    memo,
    notes_json,
    created_at,
  ] = await Promise.all([
    hasCol('stage'),
    hasCol('grade'),
    hasCol('propensity'),
    hasCol('address'),
    hasCol('birth'),
    hasCol('gender'),
    hasCol('married'),
    hasCol('children'),
    hasCol('family'),
    hasCol('job'),
    hasCol('medical'),
    hasCol('memo'),
    hasCol('notes_json'),
    hasCol('created_at'),
  ]);

  return {
    stage,
    grade,
    propensity,
    address,
    birth,
    gender,
    married,
    children,
    family,
    job,
    medical,
    memo,
    notes_json,
    created_at,
  };
}

async function safeSaveCustomer(
  mode: 'insert' | 'update',
  uid: string,
  payload: Record<string, any>,
  id?: string
): Promise<{ ok: boolean; row?: CustomerRow | null; reduced?: boolean; reason?: string }> {
  const minimal: any = {
    user_id: uid,
    name: payload.name ?? null,
    phone: payload.phone ?? null,
  };

  async function run(p: any) {
    if (mode === 'insert') {
      const { data, error } = await supabase.from('customers').insert(p).select('*').maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    } else {
      const { data, error } = await supabase
        .from('customers')
        .update(p)
        .eq('id', id!)
        .eq('user_id', uid)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    }
  }

  try {
    const row = await run(payload);
    return { ok: true, row, reduced: false };
  } catch (e1: any) {
    const msg1 = String(e1?.message || e1);
    try {
      const row = await run(minimal);
      return { ok: true, row, reduced: true, reason: msg1 };
    } catch (e2: any) {
      const msg2 = String(e2?.message || e2);
      return { ok: false, reduced: true, reason: `${msg1} / ${msg2}` };
    }
  }
}

async function safeInsertSchedule(uid: string, payload: Record<string, any>) {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('id, user_id, title, schedule_date, schedule_time, category, created_at')
      .maybeSingle();
    if (error) throw error;
    return { ok: true, row: (data as any) as ScheduleRow };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

async function loadCustomers(uid: string) {
  try {
    const q1 = await supabase.from('customers').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (!q1.error) return { rows: (q1.data || []) as CustomerRow[], error: null as any };

    const msg1 = String(q1.error.message || q1.error);
    const q2 = await supabase.from('customers').select('*').eq('user_id', uid);
    if (!q2.error) return { rows: (q2.data || []) as CustomerRow[], error: null as any };

    const msg2 = String(q2.error.message || q2.error);
    const q3 = await supabase.from('customers').select('id, user_id, name, phone, memo').eq('user_id', uid);
    if (!q3.error) return { rows: (q3.data || []) as CustomerRow[], error: null as any };

    const msg3 = String(q3.error.message || q3.error);
    return { rows: [] as CustomerRow[], error: `customers 조회 실패: ${msg1} / ${msg2} / ${msg3}` };
  } catch (e: any) {
    return { rows: [] as CustomerRow[], error: String(e?.message || e) };
  }
}

async function loadSchedules(uid: string, monthCursor: Date) {
  const from = fmtYMD(startOfMonth(monthCursor));
  const to = fmtYMD(endOfMonth(monthCursor));

  try {
    const q1 = await supabase
      .from('schedules')
      .select('id, user_id, title, schedule_date, schedule_time, category, created_at')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to)
      .order('schedule_date', { ascending: true });

    if (!q1.error) return { rows: (q1.data || []) as ScheduleRow[], error: null as any };

    const msg1 = String(q1.error.message || q1.error);
    const q2 = await supabase
      .from('schedules')
      .select('id, user_id, title, schedule_date, schedule_time, category, created_at')
      .eq('user_id', uid)
      .gte('schedule_date', from)
      .lte('schedule_date', to);

    if (!q2.error) return { rows: (q2.data || []) as ScheduleRow[], error: null as any };

    const msg2 = String(q2.error.message || q2.error);
    return { rows: [] as ScheduleRow[], error: `schedules 조회 실패: ${msg1} / ${msg2}` };
  } catch (e: any) {
    return { rows: [] as ScheduleRow[], error: String(e?.message || e) };
  }
}

/** ✅ 업쮸가이드 슬라이드(자동 6.5초 + 좌우버튼 + 도트) */
const GUIDE_SLIDES: { title: string; body: string; tip?: string }[] = [
  { title: '업쮸가이드 1', body: '오늘 신규는 “다음 접점 예약”까지가 한 세트예요.', tip: '예: 내일 16:00 해피콜 ✅' },
  { title: '업쮸가이드 2', body: '가망 고객은 “온도 관리”가 핵심. 짧게라도 꾸준히!', tip: '부재 → 재콜 날짜를 박아두기' },
  { title: '업쮸가이드 3', body: '거부는 끝이 아니라 데이터. “사유”를 적으면 다음 멘트가 쉬워져요.', tip: '가격/가족/필요성 중 어디?' },
  { title: '업쮸가이드 4', body: '소개는 우연이 아니라 구조. 만족 포인트를 메모해두면 소개가 나와요.', tip: '만족: 빠른 응대/절차 간단' },
  { title: '업쮸가이드 5', body: '계약은 접점의 합. 작은 기록이 큰 결과를 부릅니다.', tip: '이력 체크하면 달력 스케줄 자동 연결 ✨' },
];

type ProgressState = '미진행' | '진행중' | '완료';

function progressPillColor(p: ProgressState) {
  if (p === '완료') return { bg: 'rgba(34,197,94,0.14)', bd: 'rgba(34,197,94,0.28)' };
  if (p === '진행중') return { bg: 'rgba(255,80,170,0.12)', bd: 'rgba(255,80,170,0.28)' };
  return { bg: 'rgba(60,30,90,0.06)', bd: 'rgba(60,30,90,0.12)' };
}

/** ✅ “꾸준한관리” 카테고리 */
type ManageLogCategory = '해피콜' | '상담' | '부재' | '안부' | '거부' | '기타';

/** ✅ “꾸준한관리” 타입(고객별 누적 저장) */
type ManageLog = {
  id: string;
  tsISO: string;
  date: string;
  time: string;
  category: ManageLogCategory;
  content: string;
  memo?: string;
  saveSchedule?: boolean;
};

function makeLogId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function normalizeLogs(raw: any): ManageLog[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((x: any) => ({
      id: String(x?.id || makeLogId()),
      tsISO: String(x?.tsISO || nowISO()),
      date: String(x?.date || ''),
      time: String(x?.time || ''),
      category: (x?.category as any) || '기타',
      content: String(x?.content || ''),
      memo: String(x?.memo || ''),
      saveSchedule: x?.saveSchedule === true,
    }))
    .filter((x: ManageLog) => x.content.trim().length > 0)
    .slice(0, 300);
}

function logCatBadge(cat: ManageLogCategory) {
  if (cat === '해피콜')
    return { emoji: '📞', bg: 'rgba(34,197,94,0.12)', bd: 'rgba(34,197,94,0.26)', tx: '#14532d', dot: '#22c55e' };
  if (cat === '상담')
    return { emoji: '🗓️', bg: 'rgba(59,130,246,0.12)', bd: 'rgba(59,130,246,0.26)', tx: '#1e3a8a', dot: '#3b82f6' };
  if (cat === '부재')
    return { emoji: '⚪', bg: 'rgba(100,116,139,0.10)', bd: 'rgba(100,116,139,0.22)', tx: '#334155', dot: '#64748b' };
  if (cat === '안부')
    return { emoji: '🟢', bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.22)', tx: '#3a1850', dot: '#a855f7' };
  if (cat === '거부')
    return { emoji: '🔴', bg: 'rgba(239,68,68,0.12)', bd: 'rgba(239,68,68,0.26)', tx: '#7f1d1d', dot: '#ef4444' };
  return { emoji: '🟪', bg: 'rgba(255,80,170,0.10)', bd: 'rgba(255,80,170,0.22)', tx: '#6b1140', dot: '#ec4899' };
}

/** ✅ schedules.category에서 “종류(해피콜/상담/계약…)” 뽑기 */
function scheduleKindFromRow(s: ScheduleRow): string {
  const cat = String(s.category || '');
  const slashIdx = cat.indexOf('/');
  if (slashIdx >= 0) {
    const kind = cat.slice(slashIdx + 1).trim();
    if (kind) return kind;
  }
  const t = String(s.title || '');
  const parts = t.split('·').map((x) => x.trim());
  if (parts.length >= 2) {
    const maybe = parts[1];
    if (maybe) return maybe;
  }
  return '스케줄';
}

function dotColorByKind(kind: string) {
  const k = (kind || '').trim();
  if (k === '계약') return '#ec4899';
  if (k === '해피콜') return '#22c55e';
  if (k === '상담') return '#3b82f6';
  if (k === '부재') return '#64748b';
  if (k === '안부') return '#a855f7';
  if (k === '거부') return '#ef4444';
  if (k === '기타') return '#f59e0b';
  return '#ec4899';
}

export default function CustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [cols, setCols] = useState<CustomerCols | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedYMD = useMemo(() => fmtYMD(selectedDate), [selectedDate]);
  const today = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => formatMonthLabel(monthCursor), [monthCursor]);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(monthCursor);
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [monthCursor]);

  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const s of schedules) {
      const d = s.schedule_date;
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [schedules]);

  const selectedSchedules = useMemo(() => {
    const list = (schedulesByDate[selectedYMD] || []).slice();
    return list.sort((a, b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));
  }, [schedulesByDate, selectedYMD]);

  // ✅ 검색/필터
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('전체');
  const [gradeFilter, setGradeFilter] = useState<string>('전체');

  // ✅ 모달
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ✅ 고객 입력값
  const [cStage, setCStage] = useState('신규');
  const [cGrade, setCGrade] = useState('A');
  const [cPropensity, setCPropensity] = useState<number>(4);

  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cBirth, setCBirth] = useState('');
  const [cGender, setCGender] = useState<'남' | '여' | ''>('');
  const [cMarried, setCMarried] = useState<'미선택' | '기혼' | '미혼'>('미선택');
  const [cChildren, setCChildren] = useState<'미선택' | '있음' | '없음'>('미선택');
  const [cFamily, setCFamily] = useState('');
  const [cJob, setCJob] = useState('');
  const [cMedical, setCMedical] = useState('');

  const [cMemo, setCMemo] = useState('');
  const [cInputISO, setCInputISO] = useState<string>('');

  const [extraFields, setExtraFields] = useState<{ label: string; value: string }[]>([
    { label: '특이사항 1', value: '' },
    { label: '특이사항 2', value: '' },
    { label: '특이사항 3', value: '' },
  ]);

  const [products, setProducts] = useState<string[]>(['']);
  const [issues, setIssues] = useState<string[]>(['']);

  // ✅ 기본정보 아래 “계약일/오늘날짜 + 시간” 자동세팅
  const [contractDate, setContractDate] = useState('');
  const [contractTime, setContractTime] = useState('');
  const [checkContract, setCheckContract] = useState(true);
  const [contractProgress, setContractProgress] = useState<ProgressState>('미진행');

  // ✅ 꾸준한 관리(내용 메모 + 상담내용만 유지)
  const [giftMemo, setGiftMemo] = useState('');
  const [consultNote, setConsultNote] = useState('');

  // ✅ 꾸준한관리(관리 이력 누적)
  const [manageLogs, setManageLogs] = useState<ManageLog[]>([]);
  const [logCategory, setLogCategory] = useState<ManageLogCategory>('해피콜');
  const [logDate, setLogDate] = useState<string>(todayYMD());
  const [logTime, setLogTime] = useState<string>(nowHHMM());
  const [logContent, setLogContent] = useState<string>('');
  const [logMemo, setLogMemo] = useState<string>('');
  const [logSaveSchedule, setLogSaveSchedule] = useState<boolean>(true);

  const stages = useMemo(() => ['신규', '가망1', '가망2', '가망3', '계약1', '계약2', '계약3', '소개', '기타'], []);
  const grades = useMemo(() => ['VIP', 'A', 'B', 'C', '기타'], []);

  // ✅ 업쮸가이드 슬라이드
  const [guideIdx, setGuideIdx] = useState(0);
  const guideLen = GUIDE_SLIDES.length;
  const guide = GUIDE_SLIDES[guideIdx] || GUIDE_SLIDES[0];

  useEffect(() => {
    const t = window.setInterval(() => {
      setGuideIdx((v) => (v + 1) % guideLen);
    }, 6500);
    return () => window.clearInterval(t);
  }, [guideLen]);

  function prevGuide() {
    setGuideIdx((v) => (v - 1 + guideLen) % guideLen);
  }
  function nextGuide() {
    setGuideIdx((v) => (v + 1) % guideLen);
  }

  // ✅ 고객 notes/meta 정규화
  const normalizedCustomers = useMemo(() => {
    return (customers || []).map((c) => {
      const base = { ...(c as any) } as any;

      const memoRaw = String((c as any).memo ?? '');
      const { memoOnly, meta } = splitMemoAndMeta(memoRaw);

      base.__memoOnly = memoOnly;

      if (!base.stage && meta?.stage) base.stage = meta.stage;
      if (!base.grade && meta?.grade) base.grade = meta.grade;
      if (base.propensity == null && meta?.propensity != null) base.propensity = meta.propensity;
      if (!base.notes_json && meta?.notes_json) base.notes_json = meta.notes_json;

      const j = safeJsonParse<any>(base.notes_json ?? meta?.notes_json, {});
      if (!base.__inputISO) base.__inputISO = String(j?.inputISO || meta?.inputISO || base.created_at || '');

      const logs = normalizeLogs(j?.manageLogs || meta?.manageLogs);
      const last = logs.length ? logs[logs.length - 1] : null;
      base.__lastLog = last;

      return base as CustomerRow & { __memoOnly?: string; __inputISO?: string; __lastLog?: ManageLog | null };
    });
  }, [customers]);

  // ✅ 고객명 → 고객 매핑(달력 스케줄 클릭 시 상세로 이동)
  const customerByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of normalizedCustomers as any[]) {
      const n = String(c?.name || '').trim().toLowerCase();
      if (!n) continue;
      if (!map.has(n)) map.set(n, c);
    }
    return map;
  }, [normalizedCustomers]);

  const filteredCustomers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (normalizedCustomers || [])
      .filter((c: any) => {
        const stageVal = String(c.stage || '');
        const gradeVal = String(c.grade || '');
        const sOk = stageFilter === '전체' ? true : stageVal === stageFilter;
        const gOk = gradeFilter === '전체' ? true : gradeVal === gradeFilter;
        if (!sOk || !gOk) return false;

        if (!needle) return true;
        const n = String(c.name || '').toLowerCase();
        const p = String(c.phone || '').toLowerCase();
        return n.includes(needle) || p.includes(needle);
      })
      .slice();
  }, [normalizedCustomers, q, stageFilter, gradeFilter]);

  function resetForm() {
    setEditId(null);
    setCStage('신규');
    setCGrade('A');
    setCPropensity(4);

    setCName('');
    setCPhone('');
    setCAddress('');
    setCBirth('');
    setCGender('');
    setCMarried('미선택');
    setCChildren('미선택');
    setCFamily('');
    setCJob('');
    setCMedical('');

    setCMemo('');
    setCInputISO(nowISO());

    setExtraFields([
      { label: '특이사항 1', value: '' },
      { label: '특이사항 2', value: '' },
      { label: '특이사항 3', value: '' },
    ]);

    setProducts(['']);
    setIssues(['']);

    setContractDate(todayYMD());
    setContractTime(nowHHMM());
    setCheckContract(true);
    setContractProgress('미진행');

    setGiftMemo('');
    setConsultNote('');

    setManageLogs([]);
    setLogCategory('해피콜');
    setLogDate(todayYMD());
    setLogTime(nowHHMM());
    setLogContent('');
    setLogMemo('');
    setLogSaveSchedule(true);
  }

  function openNew() {
    setErr(null);
    resetForm();
    setOpen(true);
  }

  function openEdit(c: any) {
    setErr(null);
    setEditId(c.id);

    const { memoOnly, meta } = splitMemoAndMeta(String((c as any).memo ?? ''));

    const j = safeJsonParse<any>((c as any).notes_json ?? meta?.notes_json, {});
    const inputISO = String(j?.inputISO || meta?.inputISO || (c as any).created_at || '');

    const stageFallback = String((c as any).stage || meta?.stage || '신규');
    const gradeFallback = String((c as any).grade || meta?.grade || 'A');
    const propFallback = Number((c as any).propensity ?? meta?.propensity ?? 4);

    setCStage(stageFallback);
    setCGrade(gradeFallback);
    setCPropensity(Math.max(1, Math.min(5, propFallback)));

    setCName(String((c as any).name || ''));
    setCPhone(String((c as any).phone || ''));

    setCAddress(String((c as any).address || (meta?.address ?? '') || ''));
    setCBirth(String((c as any).birth || (meta?.birth ?? '') || ''));
    setCGender((String((c as any).gender || (meta?.gender ?? '') || '') as any) || '');

    const marriedV = (c as any).married ?? meta?.married;
    const childrenV = (c as any).children ?? meta?.children;
    setCMarried(marriedV === true ? '기혼' : marriedV === false ? '미혼' : '미선택');
    setCChildren(childrenV === true ? '있음' : childrenV === false ? '없음' : '미선택');

    setCFamily(String((c as any).family || (meta?.family ?? '') || ''));
    setCJob(String((c as any).job || (meta?.job ?? '') || ''));
    setCMedical(String((c as any).medical || (meta?.medical ?? '') || ''));

    setCMemo(String(memoOnly || ''));
    setCInputISO(inputISO || nowISO());

    const ef = Array.isArray(j?.extraFields) ? j.extraFields : null;
    const pr = Array.isArray(j?.products) ? j.products : null;
    const is = Array.isArray(j?.issues) ? j.issues : null;

    setExtraFields(
      (ef && ef.length >= 3
        ? ef
        : [
            { label: '특이사항 1', value: '' },
            { label: '특이사항 2', value: '' },
            { label: '특이사항 3', value: '' },
          ]
      ).map((x: any, idx: number) => ({
        label: String(x?.label || `특이사항 ${idx + 1}`),
        value: String(x?.value || ''),
      }))
    );
    setProducts((pr && pr.length ? pr : ['']).map((x: any) => String(x || '')));
    setIssues((is && is.length ? is : ['']).map((x: any) => String(x || '')));

    setContractDate(String(j?.contractDate || '') || todayYMD());
    setContractTime(String(j?.contractTime || '') || nowHHMM());
    setCheckContract(j?.checkContract !== false);
    setContractProgress((j?.contractProgress as ProgressState) || '미진행');

    setGiftMemo(String(j?.giftMemo || ''));
    setConsultNote(String(j?.consultNote || ''));

    const logs = normalizeLogs(j?.manageLogs || meta?.manageLogs);
    setManageLogs(logs);

    setLogCategory('해피콜');
    setLogDate(todayYMD());
    setLogTime(nowHHMM());
    setLogContent('');
    setLogMemo('');
    setLogSaveSchedule(true);

    setOpen(true);
  }

  function addManageLog() {
    setErr(null);

    const d = (logDate || '').trim();
    const t = (logTime || '').trim();
    const content = (logContent || '').trim();
    const memo = (logMemo || '').trim();

    if (!content) {
      setErr('이력 내용(핵심)은 필수입니다.');
      return;
    }
    if (d && !isYMD(d)) {
      setErr('이력 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
      return;
    }
    if (t && !isHHMM(t)) {
      setErr('이력 시간 형식이 올바르지 않습니다. (HH:MM)');
      return;
    }

    const next: ManageLog = {
      id: makeLogId(),
      tsISO: nowISO(),
      date: d || todayYMD(),
      time: t || nowHHMM(),
      category: logCategory,
      content,
      memo,
      saveSchedule: !!logSaveSchedule,
    };

    setManageLogs((prev) => [...prev, next]);

    setLogContent('');
    setLogMemo('');
  }

  function removeManageLog(id: string) {
    setManageLogs((prev) => prev.filter((x) => x.id !== id));
  }

  function parseCustomerNameFromScheduleTitle(title: string) {
    const s = String(title || '');
    const idx = s.indexOf('·');
    if (idx < 0) return '';
    return s.slice(0, idx).trim();
  }

  function goCustomerFromSchedule(s: ScheduleRow) {
    const isCustomer = String(s.category || '').includes('고객관리');
    if (!isCustomer) return;

    const name = parseCustomerNameFromScheduleTitle(s.title).toLowerCase();
    const c = customerByName.get(name);
    if (c) {
      openEdit(c);
    } else {
      setErr((prev) => prev || `고객 스케줄인데 고객을 찾지 못했습니다: ${parseCustomerNameFromScheduleTitle(s.title) || s.title}`);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      if (userErr || !userData?.user) {
        router.replace('/login');
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);

      const detected = await detectCustomerCols();
      if (!alive) return;
      setCols(detected);

      const c = await loadCustomers(uid);
      if (!alive) return;
      if (c.error) setErr((prev) => prev || String(c.error));
      setCustomers(c.rows);

      const sch = await loadSchedules(uid, monthCursor);
      if (!alive) return;
      if (sch.error) setErr((prev) => prev || `미니달력 로드 실패: ${sch.error}`);
      setSchedules(sch.rows);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, monthCursor]); // ✅ monthCursor 포함(초기/월변경 안전)

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const sch = await loadSchedules(userId, monthCursor);
      if (!alive) return;
      if (!sch.error) setSchedules(sch.rows);
    })();
    return () => {
      alive = false;
    };
  }, [userId, monthCursor]);

  async function refreshCustomers() {
    if (!userId) return;
    const c = await loadCustomers(userId);
    if (!c.error) setCustomers(c.rows);
    else setErr((prev) => prev || String(c.error));
  }

  async function saveCustomer() {
    if (!userId) return;
    setErr(null);

    const name = cName.trim();
    const phone = cPhone.trim();

    if (!name) {
      setErr('이름은 필수입니다.');
      return;
    }

    const inputISO = (cInputISO || '').trim() || nowISO();

    const logsSorted = manageLogs
      .slice()
      .filter((x) => (x.content || '').trim().length > 0)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 300);

    const notes_json = {
      inputISO,

      extraFields: extraFields.map((x, i) => ({ label: String(x.label || `특이사항 ${i + 1}`), value: String(x.value || '') })),
      products: products.map((x) => String(x || '')).filter((x) => x.trim()),
      issues: issues.map((x) => String(x || '')).filter((x) => x.trim()),

      contractDate: String(contractDate || ''),
      contractTime: String(contractTime || ''),
      checkContract: !!checkContract,
      contractProgress,

      giftMemo: String(giftMemo || ''),
      consultNote: String(consultNote || ''),

      manageLogs: logsSorted,
    };

    const support = cols || (await detectCustomerCols());

    const memoOnly = cMemo.trim();
    const metaToStore: any = {
      stage: cStage,
      grade: cGrade,
      propensity: cPropensity,
      notes_json,
      inputISO,

      address: cAddress.trim() || '',
      birth: cBirth.trim() || '',
      gender: cGender || '',
      married: cMarried === '기혼' ? true : cMarried === '미혼' ? false : null,
      children: cChildren === '있음' ? true : cChildren === '없음' ? false : null,
      family: cFamily.trim() || '',
      job: cJob.trim() || '',
      medical: cMedical.trim() || '',
    };

    const payload: any = {
      user_id: userId,
      name,
      phone: phone || null,
    };

    if (support.stage) payload.stage = cStage;
    if (support.grade) payload.grade = cGrade;
    if (support.propensity) payload.propensity = cPropensity;
    if (support.notes_json) payload.notes_json = notes_json;

    if (support.address) payload.address = cAddress.trim() || null;
    if (support.birth) payload.birth = cBirth.trim() || null;
    if (support.gender) payload.gender = cGender || null;
    if (support.married) payload.married = cMarried === '기혼' ? true : cMarried === '미혼' ? false : null;
    if (support.children) payload.children = cChildren === '있음' ? true : cChildren === '없음' ? false : null;
    if (support.family) payload.family = cFamily.trim() || null;
    if (support.job) payload.job = cJob.trim() || null;
    if (support.medical) payload.medical = cMedical.trim() || null;

    if (support.memo) {
      const needMeta =
        !support.stage ||
        !support.notes_json ||
        !support.grade ||
        !support.propensity ||
        !support.address ||
        !support.birth ||
        !support.gender ||
        !support.married ||
        !support.children ||
        !support.family ||
        !support.job ||
        !support.medical;

      payload.memo = needMeta ? attachMetaToMemo(memoOnly, metaToStore) : memoOnly || null;
    }

    const mode = editId ? 'update' : 'insert';
    const res = await safeSaveCustomer(mode, userId, payload, editId || undefined);

    if (!res.ok) {
      setErr(`고객 저장 실패: ${res.reason || 'unknown'}`);
      return;
    }

    if (res.row?.id) {
      setCustomers((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((x) => x.id === res.row!.id);
        if (idx >= 0) next[idx] = res.row!;
        else next.unshift(res.row!);
        return next;
      });
    } else {
      await refreshCustomers();
    }

    // ✅ 스케줄 저장 규칙
    // 1) 계약: 체크된 경우만 저장(또는 완료)
    // 2) 꾸준한관리(이력): “달력 스케줄에 저장” 체크된 로그만 저장
    const scheduleJobs: { date: string; time: string; label: string; enabled: boolean }[] = [];

    if (checkContract || contractProgress === '완료') {
      scheduleJobs.push({ date: contractDate, time: contractTime, label: '계약', enabled: true });
    }

    for (const lg of logsSorted) {
      if (lg.saveSchedule !== true) continue;
      scheduleJobs.push({ date: lg.date, time: lg.time, label: lg.category, enabled: true });
    }

    const toInsert = scheduleJobs.filter((x) => x.enabled && x.date && isYMD(x.date));

    for (const item of toInsert) {
      const payloadSch: any = {
        user_id: userId,
        title: buildScheduleTitle(name, item.label, cStage),
        schedule_date: item.date,
        schedule_time: isHHMM(item.time) ? item.time : null,
        category: `고객관리/${item.label}`,
      };

      const ins = await safeInsertSchedule(userId, payloadSch);
      if (ins.ok && ins.row) {
        setSchedules((prev) => [...prev, ins.row].sort((a, b) => (a.schedule_date > b.schedule_date ? 1 : -1)));
      } else if (!ins.ok && ins.reason) {
        setErr((prev) => prev || `스케줄 저장 경고: ${ins.reason}`);
      }
    }

    setOpen(false);
  }

  async function deleteCustomer(id: string) {
    if (!userId) return;
    setErr(null);

    const backup = customers.slice();
    setCustomers((prev) => prev.filter((x) => x.id !== id));

    const { error } = await supabase.from('customers').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setCustomers(backup);
      setErr(`삭제 실패: ${error.message}`);
      return;
    }
  }

  const S: any = {
    page: { maxWidth: 1120, margin: '0 auto', padding: '18px 14px 90px' },

    top: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    titleWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
    title: { fontSize: 26, fontWeight: 950, letterSpacing: -0.6, color: '#2a0f3a' },

    headerCard: {
      borderRadius: 26,
      border: '2px solid rgba(255,80,170,0.28)',
      background:
        'radial-gradient(900px 420px at 18% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,219,239,0.85), rgba(226,214,255,0.85))',
      boxShadow: '0 18px 46px rgba(255,80,170,0.12), 0 22px 48px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    coachWrap: { padding: 14 },
    coachRow: { display: 'flex', gap: 10, alignItems: 'stretch' },

    // ✅ 말풍선 고정 사이즈(텍스트 길어도 흔들리지 않게)
    bubble: {
      flex: 1,
      padding: '12px 14px',
      borderRadius: 18,
      border: '1px solid rgba(255,90,200,0.24)',
      background: 'rgba(255,255,255,0.78)',
      color: '#2a0f3a',
      fontWeight: 950,
      boxShadow: '0 14px 30px rgba(255,120,190,0.12)',
      lineHeight: 1.35,
      position: 'relative',

      // ✅ FIX: 고정 height 제거
      minHeight: 140,
      height: 'auto',
      overflow: 'visible',
    },

    bubbleSub: {
      marginTop: 10,
      padding: '8px 10px',
      borderRadius: 14,
      border: '1px dashed rgba(255,80,170,0.28)',
      background: 'rgba(255,80,170,0.06)',
      color: '#6b1140',
      fontSize: 12,
      fontWeight: 950,
      lineHeight: 1.35,
    },

    // ✅ 마스코트: 테두리/흰배경 제거
    mascotFrame: {
      width: 126,
      minWidth: 126,
      borderRadius: 26,
      padding: 0,
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    mascot: {
      width: 112,
      height: 112,
      borderRadius: 0,
      objectFit: 'contain',
      background: 'transparent',
      filter: 'drop-shadow(0 14px 22px rgba(180,76,255,0.26))',
      animation: 'floaty 3.8s ease-in-out infinite',
    },

    guideTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    guideTitle: { fontSize: 14, fontWeight: 950 },
    guideBtnRow: { display: 'flex', gap: 8, alignItems: 'center' },
    guideBtn: {
      width: 36,
      height: 30,
      borderRadius: 12,
      border: '1px solid rgba(255,90,200,0.18)',
      background: 'rgba(255,255,255,0.72)',
      fontWeight: 950,
      color: '#2a0f3a',
      cursor: 'pointer',
      boxShadow: '0 10px 18px rgba(255,120,190,0.10)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none' as const,
    },
    dots: { display: 'flex', gap: 6, alignItems: 'center' },
    dot: (on: boolean) => ({
      width: on ? 16 : 8,
      height: 8,
      borderRadius: 999,
      background: on ? 'rgba(255,80,170,0.70)' : 'rgba(60,30,90,0.14)',
      transition: 'all 180ms ease',
      cursor: 'pointer',
    }),

    card: {
      borderRadius: 22,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(60,30,90,0.12)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    pad: { padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.3 },
    sectionSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },

    warn: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      background: 'rgba(255,235,245,0.9)',
      border: '1px solid rgba(255,80,160,0.18)',
      color: '#6a1140',
      fontWeight: 950,
      fontSize: 13,
      whiteSpace: 'pre-wrap' as const,
    },

    pill: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      boxShadow: '0 10px 20px rgba(255,120,190,0.12)',
      whiteSpace: 'nowrap',
    },

    // ✅✅✅ 고객 카드 상단 칩: bottomChip
    bottomChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid rgba(255,90,200,0.18)',
      background: 'rgba(255,255,255,0.72)',
      fontWeight: 950,
      color: '#2a0f3a',
      fontSize: 12,
      boxShadow: '0 10px 18px rgba(255,120,190,0.08)',
      whiteSpace: 'nowrap' as const,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    input: {
      width: '100%',
      maxWidth: '100%',
      padding: '11px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },

    textarea: {
      width: '100%',
      maxWidth: '100%',
      padding: '11px 12px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      boxSizing: 'border-box' as const,
      minHeight: 96,
      resize: 'vertical' as const,
    },

    saveBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.25)',
      background: 'linear-gradient(180deg, rgba(255,120,178,0.95), rgba(255,78,147,0.95))',
      color: '#fff',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(255,60,130,0.18)',
      whiteSpace: 'nowrap' as const,
    },
    ghostBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.10)',
      whiteSpace: 'nowrap' as const,
    },
    dangerBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      border: '1px solid rgba(255,60,130,0.18)',
      background: 'rgba(255,235,245,0.92)',
      color: '#8a124a',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.08)',
      whiteSpace: 'nowrap' as const,
    },

    grid2: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    grid3: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },

    row: { marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },

    starWrap: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const },
    starBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      border: '1px solid rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      boxShadow: '0 10px 18px rgba(255,120,190,0.12)',
      cursor: 'pointer',
      fontWeight: 950,
      color: '#2a0f3a',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    calTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 14 },
    calBtn: {
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid rgba(90,30,120,0.14)',
      background: 'rgba(246,240,255,0.7)',
      color: '#3a1850',
      fontWeight: 950,
      fontSize: 13,
      cursor: 'pointer',
    },
    calGridWrap: { padding: '0 14px 14px' },
    weekHead: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 },
    weekHeadCell: { fontSize: 12, fontWeight: 950, opacity: 0.75, color: '#2a0f3a', textAlign: 'center' },
    daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 },
    dayCell: {
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.85)',
      padding: '10px 8px',
      minHeight: 62,
      cursor: 'pointer',
      boxShadow: '0 10px 20px rgba(40,10,70,0.06)',
      userSelect: 'none' as const,
      boxSizing: 'border-box' as const,
    },
    dayCellSelected: {
      borderColor: 'rgba(255,80,170,0.55)',
      boxShadow: '0 16px 28px rgba(255,80,170,0.18)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
    },
    dayCellToday: { borderColor: 'rgba(109,40,217,0.35)' },
    dayHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    dayNum: { fontSize: 13, fontWeight: 950, color: '#2a0f3a' },
    dotRow: { marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
    dotSmall: { width: 9, height: 9, borderRadius: 999, background: '#ec4899' },

    // ✅✅✅ 고객 목록 카드
    item: {
      marginTop: 10,
      padding: '12px 12px',
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.86)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 13,
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      boxSizing: 'border-box' as const,
    },

    // ✅✅✅ 고객추가/수정 모달
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(15, 8, 25, 0.40)',
      backdropFilter: 'blur(6px)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '14px 14px 24px',
      overflowY: 'auto' as const,
      WebkitOverflowScrolling: 'touch' as const,
    },
    modal: {
      width: 'min(980px, 100%)',
      maxHeight: 'none',
      overflow: 'visible' as const,
      borderRadius: 22,
      background:
        'radial-gradient(900px 420px at 18% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,219,239,0.92), rgba(226,214,255,0.92))',
      border: '1px solid rgba(255,90,200,0.22)',
      boxShadow: '0 30px 90px rgba(10, 0, 30, 0.35)',
      marginTop: 10,
    },
    modalPad: { padding: 14 },
    modalTitle: { fontSize: 18, fontWeight: 950, color: '#2a0f3a' },
    small: { fontSize: 12, opacity: 0.75, fontWeight: 900, color: '#2a0f3a' },

    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 999,
      border: '1px solid rgba(255,90,200,0.18)',
      background: 'rgba(255,255,255,0.72)',
      fontWeight: 950,
      color: '#2a0f3a',
      fontSize: 12,
      boxShadow: '0 10px 18px rgba(255,120,190,0.10)',
    },

    toggle: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      fontWeight: 950,
      color: '#2a0f3a',
      cursor: 'pointer',
      boxShadow: '0 12px 22px rgba(40,10,70,0.08)',
      userSelect: 'none' as const,
    },

    closeX: {
      width: 42,
      height: 42,
      borderRadius: 14,
      border: '1px solid rgba(60,30,90,0.12)',
      background: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 18,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.10)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1,
      position: 'sticky' as const,
      top: 10,
      zIndex: 3,
    },

    logItem: {
      borderRadius: 16,
      border: '1px solid rgba(60,30,90,0.10)',
      background: 'rgba(255,255,255,0.86)',
      padding: '10px 10px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'flex-start',
    },
    logLeft: { minWidth: 0, flex: 1 },
    logTitle: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
    logMain: { marginTop: 6, fontWeight: 950, fontSize: 13, color: '#2a0f3a' },
    logSub: { marginTop: 6, fontWeight: 900, fontSize: 12, opacity: 0.72, color: '#2a0f3a' },
  };

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <ClientShell>
      <div style={S.page}>
        <div style={S.top}>
          <div style={S.titleWrap}>
            <div style={S.title}>고객관리</div>
          </div>

          {/* ✅ 상단 홈버튼 삭제, 고객추가만 유지 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={S.saveBtn} onClick={openNew}>
              + 고객 추가
            </button>
          </div>
        </div>

        <div style={S.headerCard}>
          <div style={S.coachWrap}>
            <div className="coachRow" style={S.coachRow}>
              <div style={S.bubble} className="bubbleFixed">
                <div style={S.guideTop}>
                  <div style={S.guideTitle}>업쮸가이드</div>

                  <div style={S.guideBtnRow}>
                    <button type="button" style={S.guideBtn} onClick={prevGuide} aria-label="이전">
                      ◀
                    </button>
                    <button type="button" style={S.guideBtn} onClick={nextGuide} aria-label="다음">
                      ▶
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontWeight: 950 }} className="bubbleClamp1">
                  <span style={{ opacity: 0.85 }}>{guide.title}</span>
                </div>

                <div style={{ marginTop: 6 }} className="bubbleClamp3">
                  {guide.body}
                </div>

                {guide.tip ? (
                  <div style={S.bubbleSub} className="bubbleClamp2">
                    TIP: {guide.tip}
                  </div>
                ) : (
                  <div style={S.bubbleSub} className="bubbleClamp2">
                    꾸준한관리: 이력을 쌓고, 체크한 항목은 “달력 스케줄”까지 자동 연결됩니다.
                  </div>
                )}

                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={S.dots}>
                    {Array.from({ length: guideLen }).map((_, i) => (
                      <div key={i} style={S.dot(i === guideIdx)} onClick={() => setGuideIdx(i)} aria-label={`슬라이드 ${i + 1}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div style={S.mascotFrame} className="mascotFrame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/upzzu9.png"
                  onError={(e: any) => {
                    e.currentTarget.src = '/gogo.png';
                  }}
                  alt="upzzu"
                  style={S.mascot}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ✅ 고객 검색 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>고객 검색</div>
            <div style={S.sectionSub}>이름/전화번호 + 단계/등급 필터</div>

            <div style={{ ...S.grid3, marginTop: 12 }} className="grid3">
              <div>
                <div style={{ ...S.small, marginBottom: 6 }}>검색</div>
                <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 또는 전화번호" />
              </div>

              <div>
                <div style={{ ...S.small, marginBottom: 6 }}>단계</div>
                <select style={S.input as any} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="전체">전체</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {stageEmoji(s)} {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ ...S.small, marginBottom: 6 }}>등급</div>
                <select style={S.input as any} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                  <option value="전체">전체</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {gradeEmoji(g)} {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ ...S.row, marginTop: 12 }}>
              <span style={S.pill}>
                검색 결과 <b style={{ marginLeft: 6 }}>{filteredCustomers.length}</b>명
              </span>
              <span style={{ ...S.pill, opacity: 0.9 }}>정렬: 입력(생성) 최신순</span>
            </div>
          </div>
        </div>

        {/* ✅ 고객 목록 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>고객 목록</div>
            <div style={S.sectionSub}>보기/수정에서 계약/상품/특이사항/꾸준한관리(스케줄 체크 포함)까지 관리</div>

            {filteredCustomers.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>
                아직 고객이 없어요. “고객 추가”부터 시작해요 ✨
              </div>
            ) : (
              <div
                className="customerGrid"
                style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
              >
                {filteredCustomers.map((c: any) => {
                  const memoRaw = String((c as any).memo ?? '');
                  const { memoOnly, meta } = splitMemoAndMeta(memoRaw);

                  const j = safeJsonParse<any>((c as any).notes_json ?? meta?.notes_json, {});
                  const contractD = String(j?.contractDate || '');

                  const stageView = String((c as any).stage || meta?.stage || '미분류');
                  const gradeView = String((c as any).grade || meta?.grade || '기타');
                  const propView = Math.max(1, Math.min(5, Number((c as any).propensity ?? meta?.propensity ?? 4)));

                  const inputISO = String(j?.inputISO || meta?.inputISO || (c as any).created_at || '');
                  const inputLabel = fmtKoreanDT(inputISO);

                  const ctP = (j?.contractProgress as ProgressState) || '미진행';
                  const showContractProgress = ctP !== '미진행';
                  const ctC = progressPillColor(ctP);

                  const lastLog = (c as any).__lastLog as ManageLog | null;
                  const lastLogLine = lastLog
                    ? `${lastLog.date} ${lastLog.time} · ${lastLog.category} · ${lastLog.content}${lastLog.memo ? ` (${lastLog.memo})` : ''}`
                    : '';

                  const lastCat = lastLog?.category as ManageLogCategory | undefined;
                  const lastCatBadge = lastCat ? logCatBadge(lastCat) : null;

                  return (
                    <div key={c.id} className="customerItem" style={{ ...S.item, marginTop: 0, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={S.bottomChip}>{stageView}</span>
                          <span style={S.bottomChip}>{gradeView}</span>
                          <span style={S.bottomChip}>
                            성향 <b>{propView}</b>
                          </span>
                          {inputLabel ? <span style={S.bottomChip}>{inputLabel}</span> : null}
                        </div>

                        <div style={{ marginTop: 10, fontWeight: 950, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name || '이름 없음'} {c.phone ? <span style={{ opacity: 0.8, fontWeight: 900 }}>· {c.phone}</span> : null}
                        </div>

                        {memoOnly ? <div style={{ marginTop: 6, fontWeight: 900, opacity: 0.78 }}>{memoOnly}</div> : null}

                        {lastLogLine ? (
                          <div
                            className="lastLogRow"
                            style={{
                              marginTop: 8,
                              fontWeight: 950,
                              fontSize: 12,
                              opacity: 0.88,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                              flexWrap: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                ...S.chip,
                                padding: '6px 9px',
                                background: lastCatBadge ? lastCatBadge.bg : 'rgba(255,255,255,0.72)',
                                borderColor: lastCatBadge ? lastCatBadge.bd : 'rgba(255,90,200,0.18)',
                                color: lastCatBadge ? lastCatBadge.tx : '#2a0f3a',
                                boxShadow: 'none',
                              }}
                            >
                              {lastCatBadge ? lastCatBadge.emoji : '🧾'} {lastLog?.category || '이력'}
                            </span>
                            <span className="lastLogText">최근: {lastLogLine}</span>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, fontWeight: 950, fontSize: 12, opacity: 0.6 }}>🧾 최근 이력: 없음 (보기/수정에서 추가)</div>
                        )}

                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{contractD ? <span style={S.pill}>계약 {contractD}</span> : null}</div>

                        {showContractProgress ? (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ ...S.chip, background: ctC.bg, borderColor: ctC.bd }}>
                              🧾 계약: <b>{ctP}</b>
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="customerActions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button type="button" style={{ ...S.ghostBtn, padding: '8px 10px', fontSize: 12 }} onClick={() => openEdit(c)}>
                          보기/수정
                        </button>
                        <button type="button" style={{ ...S.dangerBtn, padding: '8px 10px', fontSize: 12 }} onClick={() => deleteCustomer(c.id)}>
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ✅ 미니 달력 */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.calTop}>
            <button
              type="button"
              style={S.calBtn}
              onClick={() => {
                const d = new Date(monthCursor);
                d.setMonth(d.getMonth() - 1);
                setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
            >
              ◀
            </button>

            <div style={{ fontSize: 16, fontWeight: 950, color: '#2a0f3a' }}>{monthLabel} · 미니 달력</div>

            <button
              type="button"
              style={S.calBtn}
              onClick={() => {
                const d = new Date(monthCursor);
                d.setMonth(d.getMonth() + 1);
                setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
            >
              ▶
            </button>
          </div>

          <div style={S.calGridWrap}>
            <div style={S.weekHead}>
              {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
                <div key={w} style={S.weekHeadCell}>
                  {w}
                </div>
              ))}
            </div>

            <div style={S.daysGrid}>
              {gridDays.map((d) => {
                const ymd = fmtYMD(d);
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const selected = sameYMD(d, selectedDate);
                const isToday2 = sameYMD(d, today);

                const list = schedulesByDate[ymd] || [];
                const hasAny = list.length > 0;
                const hasCustomer = list.some((x) => String(x.category || '').includes('고객관리'));

                const kinds = Array.from(new Set(list.map((x) => scheduleKindFromRow(x)))).slice(0, 3);

                const style: any = {
                  ...S.dayCell,
                  ...(selected ? S.dayCellSelected : null),
                  ...(isToday2 ? S.dayCellToday : null),
                  opacity: inMonth ? 1 : 0.35,
                };

                return (
                  <div key={ymd} style={style} onClick={() => setSelectedDate(d)} title={ymd}>
                    <div style={S.dayHead}>
                      <div style={S.dayNum}>{d.getDate()}</div>
                      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>{hasAny ? list.length : ''}</div>
                    </div>

                    {hasAny ? (
                      <div style={S.dotRow}>
                        {kinds.map((k) => (
                          <span key={k} style={{ ...S.dotSmall, background: dotColorByKind(k) }} title={k} />
                        ))}

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 950,
                            opacity: 0.85,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {hasCustomer ? '고객' : '스케줄'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 14, borderTop: '1px solid rgba(60,30,90,0.08)' }}>
            <div style={S.sectionTitle}>선택한 날짜: {selectedYMD}</div>
            <div style={S.sectionSub}>✅ 고객관리 스케줄 클릭 시 고객 상세(보기/수정)로 이동합니다.</div>

            {selectedSchedules.length === 0 ? (
              <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7, color: '#2a0f3a' }}>이 날짜에는 등록된 스케줄이 없어요.</div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {selectedSchedules.map((s) => {
                  const isCustomer = String(s.category || '').includes('고객관리');
                  const kind = scheduleKindFromRow(s);
                  const dotColor = dotColorByKind(kind);

                  return (
                    <div
                      key={s.id}
                      style={{ ...S.item, marginTop: 8, cursor: isCustomer ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (isCustomer) goCustomerFromSchedule(s);
                      }}
                      title={isCustomer ? '클릭하면 고객 상세로 이동' : ''}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ ...S.dotSmall, background: dotColor, width: 10, height: 10 }} />
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                        </div>

                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950, opacity: 0.75, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {s.category ? <span style={S.chip}>{String(s.category)}</span> : null}
                          <span style={S.chip}>🏷 {kind}</span>
                          {isCustomer ? <span style={{ ...S.chip, opacity: 0.95 }}>🔎 고객 상세로</span> : null}
                        </div>
                      </div>
                      <div style={{ fontWeight: 950, opacity: 0.85 }}>{(s.schedule_time || '').slice(0, 5) || '--:--'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {err ? <div style={S.warn}>{err}</div> : null}
        {loading ? <div style={{ marginTop: 14, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div> : null}

        {/* ✅ 모달 */}
        {open ? (
          <div
            style={S.overlay}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div ref={modalRef as any} style={S.modal}>
              <div style={S.modalPad}>
                {/* ✅ 모달 헤더 + 상단 버튼 덩어리 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={S.modalTitle}>{editId ? '고객 정보 수정' : '고객 추가'}</div>
                    <div style={S.sectionSub}>✅ 계약일(기본정보 아래) + 상품/특이사항 + 꾸준한관리(달력 스케줄 체크)까지 한 번에.</div>
                    <div style={{ ...S.small, marginTop: 6 }}>입력일시: {fmtKoreanDT(cInputISO)}</div>
                  </div>

                  {/* ✅✅✅ 상단 버튼 덩어리 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {editId ? (
                      <button
                        type="button"
                        style={{ ...S.dangerBtn, padding: '10px 12px', fontSize: 13 }}
                        onClick={async () => {
                          await deleteCustomer(editId);
                          setOpen(false);
                        }}
                      >
                        삭제
                      </button>
                    ) : null}

                    <button type="button" style={{ ...S.ghostBtn, padding: '10px 12px', fontSize: 13 }} onClick={() => setOpen(false)}>
                      취소
                    </button>

                    <button type="button" style={{ ...S.saveBtn, padding: '10px 12px', fontSize: 13 }} onClick={saveCustomer}>
                      저장
                    </button>

                    <button type="button" style={S.closeX} onClick={() => setOpen(false)} aria-label="닫기">
                      ✕
                    </button>
                  </div>
                </div>

                {/* 단계/등급/성향 */}
                <div style={{ ...S.card, marginTop: 12 }}>
                  <div style={S.pad}>
                    <div style={S.sectionTitle}>카테고리 · 등급 · 고객성향</div>

                    <div style={S.grid3} className="grid3">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>단계</div>
                        <select style={S.input as any} value={cStage} onChange={(e) => setCStage(e.target.value)}>
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              {stageEmoji(s)} {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>등급</div>
                        <select style={S.input as any} value={cGrade} onChange={(e) => setCGrade(e.target.value)}>
                          {grades.map((g) => (
                            <option key={g} value={g}>
                              {gradeEmoji(g)} {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>고객성향 (별 5개)</div>
                        <div style={S.starWrap}>
                          {Array.from({ length: 5 }).map((_, i) => {
                            const on = i + 1 <= cPropensity;
                            return (
                              <button
                                key={i}
                                type="button"
                                style={{
                                  ...S.starBtn,
                                  borderColor: on ? 'rgba(255,80,170,0.55)' : 'rgba(60,30,90,0.12)',
                                  boxShadow: on ? '0 14px 26px rgba(255,60,130,0.16)' : S.starBtn.boxShadow,
                                }}
                                onClick={() => setCPropensity(i + 1)}
                                title={`${i + 1}점`}
                              >
                                {on ? '★' : '☆'}
                              </button>
                            );
                          })}
                          <span style={{ fontWeight: 950, opacity: 0.85, marginLeft: 4 }}>{cPropensity}/5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 기본 정보 */}
                <div style={{ ...S.card, marginTop: 12 }}>
                  <div style={S.pad}>
                    <div style={S.sectionTitle}>기본 정보</div>

                    <div style={S.grid2} className="grid2">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>이름</div>
                        <input style={S.input} value={cName} onChange={(e) => setCName(e.target.value)} placeholder="고객 이름" />
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>전화번호</div>
                        <input style={S.input} value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="010-xxxx-xxxx" />
                      </div>
                    </div>

                    <div style={S.grid2} className="grid2">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>주소</div>
                        <input style={S.input} value={cAddress} onChange={(e) => setCAddress(e.target.value)} placeholder="예: 서울 강남구..." />
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>생년월일</div>
                        <input style={S.input} value={cBirth} onChange={(e) => setCBirth(e.target.value)} placeholder="예: 1990-01-01" />
                      </div>
                    </div>

                    <div style={S.grid3} className="grid3">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>성별</div>
                        <select style={S.input as any} value={cGender} onChange={(e) => setCGender(e.target.value as any)}>
                          <option value="">미선택</option>
                          <option value="남">남</option>
                          <option value="여">여</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>결혼</div>
                        <select style={S.input as any} value={cMarried} onChange={(e) => setCMarried(e.target.value as any)}>
                          <option value="미선택">미선택</option>
                          <option value="기혼">기혼</option>
                          <option value="미혼">미혼</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>자녀</div>
                        <select style={S.input as any} value={cChildren} onChange={(e) => setCChildren(e.target.value as any)}>
                          <option value="미선택">미선택</option>
                          <option value="있음">있음</option>
                          <option value="없음">없음</option>
                        </select>
                      </div>
                    </div>

                    <div style={S.grid3} className="grid3">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>가족사항</div>
                        <input style={S.input} value={cFamily} onChange={(e) => setCFamily(e.target.value)} placeholder="예: 가족관계/동거 등" />
                      </div>
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>직업</div>
                        <input style={S.input} value={cJob} onChange={(e) => setCJob(e.target.value)} placeholder="예: 사무직/자영업 등" />
                      </div>
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>병력/주의사항</div>
                        <input style={S.input} value={cMedical} onChange={(e) => setCMedical(e.target.value)} placeholder="예: 알러지/복용약 등" />
                      </div>
                    </div>

                    {/* ✅ 계약일/시간 + 진행상태(기본정보 아래 고정) */}
                    <div style={{ ...S.card, marginTop: 12, borderColor: 'rgba(255,80,170,0.18)' }}>
                      <div style={S.pad}>
                        <div style={S.sectionTitle}>계약 관리</div>
                        <div style={S.sectionSub}>✅ “계약 체크”가 켜져있으면 저장 시 달력 스케줄에 자동 등록됩니다.</div>

                        <div style={{ ...S.grid3, marginTop: 12 }} className="grid3">
                          <div>
                            <div style={{ ...S.small, marginBottom: 6 }}>계약일</div>
                            <input style={S.input} value={contractDate} onChange={(e) => setContractDate(e.target.value)} placeholder="YYYY-MM-DD" />
                          </div>
                          <div>
                            <div style={{ ...S.small, marginBottom: 6 }}>시간</div>
                            <input style={S.input} value={contractTime} onChange={(e) => setContractTime(e.target.value)} placeholder="HH:MM" />
                          </div>
                          <div>
                            <div style={{ ...S.small, marginBottom: 6 }}>진행상태</div>
                            <select style={S.input as any} value={contractProgress} onChange={(e) => setContractProgress(e.target.value as any)}>
                              <option value="미진행">미진행</option>
                              <option value="진행중">진행중</option>
                              <option value="완료">완료</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ ...S.row, marginTop: 12 }}>
                          <button type="button" style={S.toggle} onClick={() => setCheckContract((v) => !v)} aria-pressed={checkContract}>
                            <span style={{ fontSize: 16 }}>{checkContract ? '✅' : '⬜'}</span>
                            계약 스케줄 자동 저장
                          </button>

                          <span style={{ ...S.chip, background: progressPillColor(contractProgress).bg, borderColor: progressPillColor(contractProgress).bd }}>
                            🧾 상태: <b style={{ marginLeft: 6 }}>{contractProgress}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 메모/상담/사은품 */}
                <div style={{ ...S.card, marginTop: 12 }}>
                  <div style={S.pad}>
                    <div style={S.sectionTitle}>메모 · 꾸준한 관리(상담/사은품)</div>
                    <div style={S.sectionSub}>✅ 핵심 메모는 고객 카드에 요약 노출됩니다.</div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ ...S.small, marginBottom: 6 }}>핵심 메모</div>
                      <textarea style={S.textarea} value={cMemo} onChange={(e) => setCMemo(e.target.value)} placeholder="예: 피부고민, 관심제품, 거부사유 등" />
                    </div>

                    <div style={S.grid2} className="grid2">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>상담내용(요약)</div>
                        <textarea style={{ ...S.textarea, minHeight: 86 }} value={consultNote} onChange={(e) => setConsultNote(e.target.value)} placeholder="예: 상담 핵심/반응/다음 멘트" />
                      </div>
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>사은품/후속관리 메모</div>
                        <textarea style={{ ...S.textarea, minHeight: 86 }} value={giftMemo} onChange={(e) => setGiftMemo(e.target.value)} placeholder="예: 사은품 제공/배송/재안내" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 특이사항 / 상품 / 이슈 */}
                <div style={{ ...S.card, marginTop: 12 }}>
                  <div style={S.pad}>
                    <div style={S.sectionTitle}>특이사항 · 상품 · 이슈</div>
                    <div style={S.sectionSub}>✅ 필요한 만큼 추가/삭제 가능</div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ ...S.small, marginBottom: 8 }}>특이사항(3개)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        {extraFields.map((f, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }} className="extraRow">
                            <input
                              style={S.input}
                              value={f.label}
                              onChange={(e) => {
                                const v = e.target.value;
                                setExtraFields((prev) => prev.map((x, i) => (i === idx ? { ...x, label: v } : x)));
                              }}
                            />
                            <input
                              style={S.input}
                              value={f.value}
                              onChange={(e) => {
                                const v = e.target.value;
                                setExtraFields((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                              }}
                              placeholder="내용"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={S.grid2} className="grid2">
                      <div>
                        <div style={{ ...S.small, marginBottom: 8 }}>상품(복수)</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {products.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8 }} className="lineRow">
                              <input
                                style={S.input}
                                value={p}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setProducts((prev) => prev.map((x, i) => (i === idx ? v : x)));
                                }}
                                placeholder="예: 앰플/크림/세럼..."
                              />
                              <button
                                type="button"
                                style={{ ...S.ghostBtn, padding: '10px 12px', fontSize: 12 }}
                                onClick={() => {
                                  const next = products.filter((_, i) => i !== idx);
                                  setProducts(next.length ? next : ['']);
                                }}
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                          <button type="button" style={S.ghostBtn} onClick={() => setProducts((prev) => [...prev, ''])}>
                            + 상품 추가
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 8 }}>이슈/거부사유(복수)</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {issues.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8 }} className="lineRow">
                              <input
                                style={S.input}
                                value={p}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setIssues((prev) => prev.map((x, i) => (i === idx ? v : x)));
                                }}
                                placeholder="예: 가격/가족반대/필요성..."
                              />
                              <button
                                type="button"
                                style={{ ...S.ghostBtn, padding: '10px 12px', fontSize: 12 }}
                                onClick={() => {
                                  const next = issues.filter((_, i) => i !== idx);
                                  setIssues(next.length ? next : ['']);
                                }}
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                          <button type="button" style={S.ghostBtn} onClick={() => setIssues((prev) => [...prev, ''])}>
                            + 이슈 추가
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 꾸준한관리 이력 */}
                <div style={{ ...S.card, marginTop: 12 }}>
                  <div style={S.pad}>
                    <div style={S.sectionTitle}>꾸준한관리 · 이력</div>
                    <div style={S.sectionSub}>✅ “달력 스케줄 저장” 체크된 이력은 저장 시 자동으로 달력에 등록됩니다.</div>

                    <div style={{ ...S.grid3, marginTop: 12 }} className="grid3">
                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>카테고리</div>
                        <select style={S.input as any} value={logCategory} onChange={(e) => setLogCategory(e.target.value as any)}>
                          <option value="해피콜">해피콜</option>
                          <option value="상담">상담</option>
                          <option value="부재">부재</option>
                          <option value="안부">안부</option>
                          <option value="거부">거부</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>날짜</div>
                        <input style={S.input} value={logDate} onChange={(e) => setLogDate(e.target.value)} placeholder="YYYY-MM-DD" />
                      </div>

                      <div>
                        <div style={{ ...S.small, marginBottom: 6 }}>시간</div>
                        <input style={S.input} value={logTime} onChange={(e) => setLogTime(e.target.value)} placeholder="HH:MM" />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ ...S.small, marginBottom: 6 }}>이력 내용(핵심)</div>
                      <input style={S.input} value={logContent} onChange={(e) => setLogContent(e.target.value)} placeholder="예: 다음주 수요일 재콜 약속" />
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ ...S.small, marginBottom: 6 }}>메모(선택)</div>
                      <input style={S.input} value={logMemo} onChange={(e) => setLogMemo(e.target.value)} placeholder="예: 부재, 문자 남김" />
                    </div>

                    <div style={{ ...S.row, marginTop: 12 }}>
                      <button type="button" style={S.toggle} onClick={() => setLogSaveSchedule((v) => !v)} aria-pressed={logSaveSchedule}>
                        <span style={{ fontSize: 16 }}>{logSaveSchedule ? '✅' : '⬜'}</span>
                        달력 스케줄에 저장
                      </button>

                      <button type="button" style={S.saveBtn} onClick={addManageLog}>
                        + 이력 추가
                      </button>
                    </div>

                    {manageLogs.length ? (
                      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                        {manageLogs
                          .slice()
                          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                          .map((lg) => {
                            const b = logCatBadge(lg.category);
                            return (
                              <div key={lg.id} style={S.logItem} className="logItem">
                                <div style={S.logLeft}>
                                  <div style={S.logTitle}>
                                    <span
                                      style={{
                                        ...S.chip,
                                        padding: '6px 9px',
                                        background: b.bg,
                                        borderColor: b.bd,
                                        color: b.tx,
                                        boxShadow: 'none',
                                      }}
                                    >
                                      {b.emoji} {lg.category}
                                    </span>

                                    <span style={{ ...S.chip, opacity: 0.95 }}>📅 {lg.date}</span>
                                    <span style={{ ...S.chip, opacity: 0.95 }}>🕒 {isHHMM(lg.time) ? lg.time : '--:--'}</span>

                                    <span
                                      style={{
                                        ...S.chip,
                                        opacity: 0.95,
                                        background: lg.saveSchedule ? 'rgba(34,197,94,0.10)' : 'rgba(100,116,139,0.08)',
                                        borderColor: lg.saveSchedule ? 'rgba(34,197,94,0.22)' : 'rgba(100,116,139,0.18)',
                                      }}
                                    >
                                      {lg.saveSchedule ? '✅ 달력 저장' : '⬜ 달력 미저장'}
                                    </span>
                                  </div>

                                  <div style={S.logMain}>• {lg.content}</div>
                                  {lg.memo ? <div style={S.logSub}>메모: {lg.memo}</div> : null}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                  <button
                                    type="button"
                                    style={{ ...S.ghostBtn, padding: '8px 10px', fontSize: 12 }}
                                    onClick={() => {
                                      setManageLogs((prev) => prev.map((x) => (x.id === lg.id ? { ...x, saveSchedule: !x.saveSchedule } : x)));
                                    }}
                                  >
                                    {lg.saveSchedule ? '달력 해제' : '달력 체크'}
                                  </button>
                                  <button
                                    type="button"
                                    style={{ ...S.dangerBtn, padding: '8px 10px', fontSize: 12 }}
                                    onClick={() => removeManageLog(lg.id)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, fontWeight: 950, opacity: 0.65, color: '#2a0f3a' }}>아직 이력이 없어요. 위에서 “+ 이력 추가”로 쌓아보세요.</div>
                    )}
                  </div>
                </div>

                {err ? <div style={S.warn}>{err}</div> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes floaty {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }

        /* ✅ 말풍선 텍스트 줄수 제한(보기 좋게) */
        .bubbleClamp1,
        .bubbleClamp2,
        .bubbleClamp3 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bubbleClamp1 {
          -webkit-line-clamp: 1;
        }
        .bubbleClamp2 {
          -webkit-line-clamp: 2;
        }
        .bubbleClamp3 {
          -webkit-line-clamp: 3;
        }

        /* ✅ 모바일 대응 */
        @media (max-width: 920px) {
          :global(.coachRow) {
            flex-direction: column;
          }
          :global(.mascotFrame) {
            width: 100% !important;
            min-width: 0 !important;
            justify-content: flex-end !important;
            padding-top: 6px;
          }
        }

        @media (max-width: 720px) {
          :global(.customerGrid) {
            grid-template-columns: 1fr !important;
          }
          :global(.grid3) {
            grid-template-columns: 1fr !important;
          }
          :global(.grid2) {
            grid-template-columns: 1fr !important;
          }
          :global(.extraRow) {
            grid-template-columns: 1fr !important;
          }
          :global(.lineRow) {
            flex-direction: column;
            align-items: stretch;
          }
          :global(.lineRow button) {
            width: 100%;
          }
          :global(.logItem) {
            flex-direction: column;
          }
        }
      `}</style>
    </ClientShell>
  );
}
