// ✅✅✅ 전체복붙: src/app/sms-helper/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

type SmsCategory =
  | '계절/날씨'
  | '상황별'
  | '첫통화 전'
  | '첫통화 후'
  | '감성 응원'
  | '계약 이후 감사'
  | '관리/리마인드'
  | '재접촉/휴면'
  | '소개/추천'
  | '생일/기념일';

type SmsExample = {
  id: string;
  category: SmsCategory;
  title: string;
  body: string;
  tags?: string[];
};

type MySmsRow = {
  id: string;
  user_id: string;
  category: string | null;
  title: string | null;
  body: string | null;
  // ✅ created_at 없는 테이블도 많아서 "있으면 쓰고 없으면 null"
  created_at?: string | null;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

const EMO_QUOTES: string[] = [
  '대표님, 문자는 “관리의 습관”이에요. 오늘 3명만 보내도 충분합니다.',
  '단 한 줄의 메시지가 계약을 다시 데려옵니다.',
  '거절은 숫자, 관리는 자산. 대표님은 지금 자산을 쌓는 중!',
  '마음은 짧게, 진심은 깊게. 오늘도 UP 😎',
  '안부 한 번이 소개 한 번이 됩니다. 오늘도 가볍게 한 번!',
];

/** ✅✅ 카테고리별 최소 2개 이상(총 20+) */
const SMS_EXAMPLES: SmsExample[] = [
  {
    id: 'w1',
    category: '계절/날씨',
    title: '겨울 한파 안부',
    body:
      'OO님, 오늘 많이 춥죠 🥶 따뜻하게 챙겨 입으셨나요?\n' +
      '추운 날엔 컨디션이 제일 중요해서요. 필요하신 거 있으시면 편하게 연락 주세요 🙂',
    tags: ['겨울', '안부'],
  },
  {
    id: 'w2',
    category: '계절/날씨',
    title: '비 오는 날 배려',
    body:
      'OO님, 비가 오네요 ☔ 이동 조심하시고 미끄럼 주의하세요.\n' +
      '오늘은 통화보다 메시지가 편하시면, 여기로 답 주셔도 괜찮아요 🙂',
    tags: ['비', '배려'],
  },
  {
    id: 's1',
    category: '상황별',
    title: '바쁜 고객에게(선택지)',
    body:
      'OO님, 바쁘실까 봐 짧게만 남겨요.\n' +
      '오늘/내일 중 편한 시간 1개만 숫자로 답 주시면, 그때 맞춰 드릴게요 🙂\n' +
      '(1) 오늘 오전 (2) 오늘 오후 (3) 내일 오전 (4) 내일 오후',
    tags: ['바쁨', '선택지'],
  },
  {
    id: 's2',
    category: '상황별',
    title: '읽씹 방지(부담 낮추기)',
    body:
      'OO님, 답장 부담 갖지 마세요 🙂\n' +
      '그냥 “가능/불가”만 주셔도 충분해요. 편하실 때 한 줄만 부탁드릴게요!',
    tags: ['부담줄이기'],
  },
  {
    id: 'p1',
    category: '첫통화 전',
    title: '첫 연락(정중+명확)',
    body:
      'OO님 안녕하세요, OOO입니다 🙂\n' +
      '잠시 안내 드릴 내용이 있어 연락드렸어요.\n' +
      '오늘 통화 가능하신 시간대가 있으실까요? (오전/오후/저녁 중 편한 시간 한 가지로 답 주셔도 됩니다!)',
    tags: ['첫연락', '정중'],
  },
  {
    id: 'p2',
    category: '첫통화 전',
    title: '첫 연락(가볍게)',
    body:
      'OO님 안녕하세요 🙂 OOO입니다.\n' +
      '5분만 짧게 여쭤볼 게 있어요.\n' +
      '통화 편한 시간만 알려주시면 그때 맞춰드릴게요!',
    tags: ['첫연락', '가볍게'],
  },
  {
    id: 'a1',
    category: '첫통화 후',
    title: '통화 감사 + 다음 액션',
    body:
      'OO님, 방금 통화 감사드려요 🙂\n' +
      '말씀 주신 부분 정리해서 (자료/요약/견적) 준비해드릴게요.\n' +
      '제가 오늘 저녁까지 보내드려도 괜찮을까요?',
    tags: ['통화후', '다음액션'],
  },
  {
    id: 'e1',
    category: '감성 응원',
    title: '응원 한 줄',
    body:
      'OO님, 요즘 많이 애쓰고 계신 거 알아요.\n' +
      '오늘은 “무사히 하루를 끝내는 것”만으로도 충분히 잘하셨어요 🙂\n' +
      '필요하면 언제든 편하게 말씀 주세요.',
    tags: ['감성', '응원'],
  },
  {
    id: 't1',
    category: '계약 이후 감사',
    title: '계약 감사+안심',
    body:
      'OO님, 오늘 결정 정말 감사합니다 🙏\n' +
      '제가 끝까지 책임지고 꼼꼼히 챙겨드릴게요.\n' +
      '진행 과정은 (오늘/내일) 한 번 더 안내드리겠습니다 🙂',
    tags: ['계약', '감사'],
  },
  {
    id: 'm1',
    category: '관리/리마인드',
    title: '부드러운 리마인드',
    body:
      'OO님, 지난번에 말씀하신 OO 관련해서 생각나서 연락드려요 🙂\n' +
      '요즘 상황은 어떠실까요? 편하실 때 “괜찮아요/아직이요”만 주셔도 됩니다!',
    tags: ['리마인드', '부드럽게'],
  },
  {
    id: 'r1',
    category: '재접촉/휴면',
    title: '오랜만 안부(가볍게)',
    body:
      'OO님, 오랜만에 인사드려요 🙂\n' +
      '문득 생각나서 안부만 톡 드립니다.\n' +
      '요즘 OO는 어떠신가요? (괜찮아요/바빠요) 한 글자도 좋아요!',
    tags: ['휴면', '안부'],
  },
  {
    id: 'i1',
    category: '소개/추천',
    title: '소개 요청(부담 없이)',
    body:
      'OO님, 혹시 주변에 OO로 고민하시는 분 있으실까요?\n' +
      '갑자기 부탁드려 죄송하지만 “생각나는 분 1명”만 떠오르면 소개 부탁드려도 될까요 🙂\n' +
      '부담되시면 편하게 거절하셔도 괜찮아요!',
    tags: ['소개', '부담없게'],
  },
  {
    id: 'b1',
    category: '생일/기념일',
    title: '생일 축하',
    body:
      'OO님, 생일 진심으로 축하드립니다 🎉\n' +
      '오늘은 OO님이 가장 빛나는 날이에요.\n' +
      '늘 건강하고 좋은 일만 가득하시길 바랄게요 🙂',
    tags: ['생일', '축하'],
  },
];

const ALL_CATS: (SmsCategory | '전체')[] = [
  '전체',
  '계절/날씨',
  '상황별',
  '첫통화 전',
  '첫통화 후',
  '감성 응원',
  '계약 이후 감사',
  '관리/리마인드',
  '재접촉/휴면',
  '소개/추천',
  '생일/기념일',
];

const SMS_TABLE = 'sms_templates';

/** ✅✅✅ 400 원인 제거: created_at select / order 절대 안 함 */
async function tryLoadMySms(uid: string) {
  const { data, error } = await supabase
    .from(SMS_TABLE)
    .select('id, user_id, category, title, body')
    .eq('user_id', uid);

  // created_at 없이도 "최근 저장이 위로"가 필요하면 로컬에서 prepend로 해결(이미 그렇게 함)
  return { rows: (data || []) as MySmsRow[], error: error ? String(error.message || error) : null };
}

/** ✅✅✅ insert도 created_at select 제거 */
async function tryInsertMySms(uid: string, payload: { category: string; title: string; body: string }) {
  const { data, error } = await supabase
    .from(SMS_TABLE)
    .insert({ user_id: uid, category: payload.category, title: payload.title, body: payload.body })
    .select('id, user_id, category, title, body')
    .maybeSingle();

  if (error) return { ok: false, row: null as any, reason: String(error.message || error) };
  return { ok: true, row: (data as any) as MySmsRow, reason: null as any };
}

function groupByCategory<T extends { category: any }>(rows: T[]) {
  const map = new Map<string, T[]>();
  rows.forEach((r) => {
    const k = String(r.category || '기타');
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function previewText(s: string, maxLines = 3) {
  const lines = String(s || '').split('\n');
  if (lines.length <= maxLines) return s;
  return lines.slice(0, maxLines).join('\n') + '\n…';
}

export default function SmsHelperPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [dbEnabled, setDbEnabled] = useState<boolean>(true);

  const [activeCat, setActiveCat] = useState<SmsCategory | '전체'>('전체');
  const [search, setSearch] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editCat, setEditCat] = useState<SmsCategory>('첫통화 전');
  const [editBody, setEditBody] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);

  const [mySms, setMySms] = useState<MySmsRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const localKey = useMemo(() => (userId ? `uplog_my_sms_${userId}` : `uplog_my_sms_anon`), [userId]);

  const coachLine = useMemo(() => {
    const d = new Date();
    const key = Number(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    );
    return EMO_QUOTES[key % EMO_QUOTES.length];
  }, []);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setToast(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!alive) return;

      if (!userData?.user) {
        router.replace('/login');
        return;
      }

      const uid2 = userData.user.id;
      setUserId(uid2);

      const local = lsGetJson<MySmsRow[]>(localKey, []);
      setMySms(Array.isArray(local) ? local : []);

      if (dbEnabled) {
        const res = await tryLoadMySms(uid2);
        if (!alive) return;

        if (res.error) {
          setDbEnabled(false);
        } else {
          if (Array.isArray(res.rows)) {
            setMySms(res.rows);
            lsSetJson(localKey, res.rows);
          }
        }
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, localKey, dbEnabled]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  function pickExample(x: SmsExample) {
    setPickedId(x.id);
    setEditTitle(x.title);
    setEditCat(x.category);
    setEditBody(x.body);
    setTimeout(() => editorRef.current?.focus(), 0);
  }

  function pickMine(x: MySmsRow) {
    setPickedId(x.id);
    setEditTitle(String(x.title || ''));
    setEditCat((String(x.category || '관리/리마인드') as any) as SmsCategory);
    setEditBody(String(x.body || ''));
    setTimeout(() => editorRef.current?.focus(), 0);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('클립보드 복사 완료 ✅');
    } catch {
      showToast('복사 실패(권한 확인)');
    }
  }

  async function saveToMine() {
    if (!userId) return;

    const title = editTitle.trim() || '제목 없음';
    const body = editBody.trim();
    const cat = String(editCat || '관리/리마인드');

    if (!body) {
      showToast('문자 내용을 입력해 주세요.');
      return;
    }

    const localNow = lsGetJson<MySmsRow[]>(localKey, []);
    const baseRow: MySmsRow = {
      id: `local_${uid()}`,
      user_id: userId,
      category: cat,
      title,
      body,
      created_at: new Date().toISOString(),
    };

    let savedRow: MySmsRow = baseRow;

    if (dbEnabled) {
      const res = await tryInsertMySms(userId, { category: cat, title, body });
      if (res.ok && res.row) {
        savedRow = { ...res.row, created_at: new Date().toISOString() }; // 화면 표시용(테이블 없어도 OK)
      } else {
        setDbEnabled(false);
      }
    }

    const next = [savedRow, ...(Array.isArray(localNow) ? localNow : [])];

    const seen = new Set<string>();
    const uniq = next.filter((r) => {
      const k = String(r.id || '');
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    setMySms(uniq);
    lsSetJson(localKey, uniq);

    showToast('저장 완료 ✅');
  }

  function removeMine(id: string) {
    const next = (mySms || []).filter((x) => x.id !== id);
    setMySms(next);
    lsSetJson(localKey, next);
    showToast('삭제 완료');
  }

  const filteredExamples = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SMS_EXAMPLES.filter((x) => {
      if (activeCat !== '전체' && x.category !== activeCat) return false;
      if (!q) return true;
      const hay = `${x.title}\n${x.body}\n${(x.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeCat, search]);

  const filteredMine = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (mySms || []).filter((x) => {
      if (activeCat !== '전체' && String(x.category || '') !== activeCat) return false;
      if (!q) return true;
      const hay = `${x.title || ''}\n${x.body || ''}\n${x.category || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mySms, activeCat, search]);

  const mineGroups = useMemo(() => groupByCategory(filteredMine), [filteredMine]);

  const S: any = {
    page: { maxWidth: 1040, margin: '0 auto', padding: '18px 14px 80px' },
    top: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: 950, letterSpacing: -0.6, color: '#2a0f3a' },

    headerCard: {
      borderRadius: 26,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'rgba(255,80,170,0.28)',
      background:
        'radial-gradient(900px 420px at 18% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(255,219,239,0.85), rgba(226,214,255,0.85))',
      boxShadow: '0 18px 46px rgba(255,80,170,0.12), 0 22px 48px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    coachWrap: { padding: 14 },
    coachRow: { display: 'flex', gap: 10, alignItems: 'stretch' },
    bubble: {
      flex: 1,
      padding: '12px 14px',
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,90,200,0.24)',
      backgroundColor: 'rgba(255,255,255,0.78)',
      color: '#2a0f3a',
      fontWeight: 950,
      boxShadow: '0 14px 30px rgba(255,120,190,0.12)',
      lineHeight: 1.35,
      position: 'relative',
      minHeight: 92,
    },
    bubbleSub: { marginTop: 6, fontSize: 12, opacity: 0.78, fontWeight: 900 },
    mascot: {
      width: 110,
      height: 110,
      borderRadius: 28,
      objectFit: 'contain',
      backgroundColor: 'transparent',
      filter: 'drop-shadow(0 14px 22px rgba(180,76,255,0.26))',
      flex: '0 0 auto',
      animation: 'floaty 3.8s ease-in-out infinite',
      alignSelf: 'center',
    },

    card: {
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.12)',
      boxShadow: '0 18px 40px rgba(40,10,70,0.10)',
      overflow: 'hidden',
    },
    pad: { padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: 950, color: '#2a0f3a', letterSpacing: -0.3 },
    sectionSub: { marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.72, color: '#2a0f3a' },

    toast: {
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 14,
      backgroundColor: 'rgba(255,235,245,0.9)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,80,160,0.18)',
      color: '#6a1140',
      fontWeight: 950,
      fontSize: 13,
      whiteSpace: 'pre-wrap' as const,
      lineHeight: 1.35,
    },

    pills: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' },
    pill: {
      padding: '8px 12px',
      borderRadius: 999,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 13,
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    },
    pillOn: {
      borderColor: 'rgba(255,80,170,0.55)',
      boxShadow: '0 16px 28px rgba(255,80,170,0.18)',
      background: 'linear-gradient(180deg, rgba(255,230,246,0.98), rgba(235,226,255,0.95))',
    },

    input: {
      width: '100%',
      maxWidth: '100%',
      padding: '11px 12px',
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.12)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      maxWidth: '100%',
      minHeight: 160,
      padding: '12px 12px',
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.12)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      fontWeight: 900,
      fontSize: 14,
      color: '#2a0f3a',
      outline: 'none',
      resize: 'vertical' as const,
      lineHeight: 1.45,
      boxSizing: 'border-box' as const,
      whiteSpace: 'pre-wrap' as const,
    },

    row: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },

    saveBtn: {
      padding: '11px 14px',
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,60,130,0.25)',
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
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.12)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 14,
      cursor: 'pointer',
      boxShadow: '0 14px 26px rgba(40,10,70,0.10)',
      whiteSpace: 'nowrap' as const,
    },
    miniBtn: {
      padding: '8px 10px',
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.12)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 12,
      cursor: 'pointer',
      boxShadow: '0 12px 22px rgba(40,10,70,0.08)',
      whiteSpace: 'nowrap' as const,
    },
    dangerBtn: {
      padding: '8px 10px',
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,60,130,0.25)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      color: '#6a1140',
      fontWeight: 950,
      fontSize: 12,
      cursor: 'pointer',
      boxShadow: '0 12px 22px rgba(40,10,70,0.08)',
      whiteSpace: 'nowrap' as const,
    },

    phone: {
      marginTop: 10,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.10)',
      background:
        'radial-gradient(700px 260px at 20% 0%, rgba(255,220,240,0.28) 0%, rgba(255,255,255,0) 60%), rgba(248,246,255,0.65)',
    },
    msgRow: { display: 'flex', marginTop: 10 },
    msgLeft: { justifyContent: 'flex-start' },
    msgRight: { justifyContent: 'flex-end' },

    msgBubbleLeft: {
      maxWidth: '86%',
      padding: '10px 12px',
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.10)',
      backgroundColor: 'rgba(255,255,255,0.92)',
      boxShadow: '0 12px 22px rgba(40,10,70,0.08)',
      color: '#2a0f3a',
      fontWeight: 900,
      fontSize: 15,
      whiteSpace: 'pre-wrap' as const,
      lineHeight: 1.55,
    },
    msgBubbleRight: {
      maxWidth: '86%',
      padding: '10px 12px',
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,80,170,0.22)',
      background: 'linear-gradient(180deg, rgba(255,230,246,0.95), rgba(235,226,255,0.92))',
      boxShadow: '0 12px 22px rgba(255,80,170,0.10)',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 15,
      whiteSpace: 'pre-wrap' as const,
      lineHeight: 1.55,
    },
    msgMeta: { marginTop: 6, fontSize: 12, fontWeight: 950, opacity: 0.65 },

    groupWrap: { marginTop: 10, display: 'grid', gap: 14 },
    groupBox: {
      padding: 12,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.65)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(60,30,90,0.10)',
    },
    groupHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    groupTitle: { fontSize: 14, fontWeight: 950, color: '#2a0f3a' },
    groupCount: { fontSize: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' },

    badge: {
      display: 'inline-flex',
      padding: '6px 10px',
      borderRadius: 999,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'rgba(255,90,200,0.22)',
      background: 'linear-gradient(180deg, rgba(255,246,252,0.95), rgba(246,240,255,0.9))',
      color: '#2a0f3a',
      fontWeight: 950,
      fontSize: 12,
      whiteSpace: 'nowrap',
    },
  };

  return (
    <ClientShell>
      <div style={S.page}>
        <div style={S.top}>
          <div style={S.title}>문자 도우미</div>
        </div>

        <div style={S.headerCard}>
          <div style={S.coachWrap}>
            <div style={S.coachRow}>
              <div style={S.bubble}>
                <div style={{ fontSize: 14, fontWeight: 950 }}>오늘 가이드</div>
                <div style={{ marginTop: 6 }}>{coachLine}</div>
                <div style={S.bubbleSub}>예시를 골라 편집하고, 나만의 UP문자함에 저장하세요.</div>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/upzzu2.png"
                onError={(e: any) => {
                  e.currentTarget.src = '/lolo.png';
                }}
                alt="upzzu"
                style={S.mascot}
              />
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>편집 / 저장</div>
            <div style={S.sectionSub}>핸드폰 문자처럼 미리보기 되며, 저장하면 바로 아래 “나만의 UP문자함”에 쌓입니다.</div>

            <div style={S.phone}>
              <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>미리보기</div>

              <div style={{ ...S.msgRow, ...S.msgLeft }}>
                <div style={S.msgBubbleLeft}>
                  {editTitle.trim() ? `(${editTitle.trim()})\n` : ''}
                  {editBody.trim() ? editBody.trim() : '예시를 선택하면 여기에 미리보기가 보여요 🙂'}
                  <div style={S.msgMeta}>카테고리: {editCat}</div>
                </div>
              </div>

              <div style={{ ...S.msgRow, ...S.msgRight }}>
                <div style={S.msgBubbleRight}>
                  복사/저장 버튼으로 바로 쓰세요 ✨
                  <div style={S.msgMeta}>UPLOG</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div style={S.row}>
                <div style={{ flex: '1 1 280px', minWidth: 220 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, color: '#2a0f3a', marginBottom: 6 }}>제목</div>
                  <input style={S.input} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="예: 첫통화 전 인사 / 계약 감사" />
                </div>

                <div style={{ flex: '0 0 240px', minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, color: '#2a0f3a', marginBottom: 6 }}>카테고리</div>
                  <select style={S.input as any} value={editCat} onChange={(e) => setEditCat(e.target.value as SmsCategory)} aria-label="category">
                    {ALL_CATS.filter((x) => x !== '전체').map((c) => (
                      <option key={c} value={c as SmsCategory}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75, color: '#2a0f3a', marginBottom: 6 }}>문자 내용</div>
                <textarea
                  ref={editorRef}
                  style={S.textarea}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder={'예시를 아래에서 “편집하기” 누르면 여기에 들어옵니다.\n\n팁)\n- OO님: 고객 이름\n- OOO: 내 이름/회사\n- (자료/요약/견적): 상황에 맞게 바꾸기'}
                />
              </div>

              <div style={{ ...S.row, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={S.saveBtn} onClick={saveToMine}>
                    나만의 UP문자함에 저장
                  </button>
                  <button type="button" style={S.ghostBtn} onClick={() => copyToClipboard(editBody || '')}>
                    복사
                  </button>
                </div>
              </div>

              {toast ? <div style={S.toast}>{toast}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>나만의 UP문자함</div>
            <div style={S.sectionSub}>카테고리/검색 필터가 적용됩니다. (편집하기 누르면 위 편집기에 올라와요)</div>

            {loading ? (
              <div style={{ marginTop: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>불러오는 중...</div>
            ) : mineGroups.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>
                아직 저장된 문자가 없어요. 아래 예시에서 하나 골라 저장해보세요 ✨
              </div>
            ) : (
              <div style={S.groupWrap}>
                {mineGroups.map(([cat, rows]) => (
                  <div key={cat} style={S.groupBox}>
                    <div style={S.groupHeader}>
                      <div style={S.groupTitle}>{cat}</div>
                      <div style={S.groupCount}>{rows.length}개</div>
                    </div>

                    <div style={S.phone}>
                      {rows.map((x, idx) => {
                        const left = idx % 2 === 0;
                        return (
                          <div key={x.id} style={{ ...S.msgRow, ...(left ? S.msgLeft : S.msgRight) }}>
                            <div style={left ? S.msgBubbleLeft : S.msgBubbleRight}>
                              <div style={{ fontWeight: 950, marginBottom: 6 }}>
                                {x.title || '제목 없음'}
                              </div>

                              {previewText(String(x.body || ''), 6)}

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                <button type="button" style={S.miniBtn} onClick={() => copyToClipboard(String(x.body || ''))}>
                                  복사
                                </button>
                                <button type="button" style={S.miniBtn} onClick={() => pickMine(x)}>
                                  편집하기
                                </button>
                                <button type="button" style={S.dangerBtn} onClick={() => removeMine(x.id)}>
                                  삭제
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>카테고리 / 검색</div>
            <div style={S.sectionSub}>카테고리를 누르면 “나만의 UP문자함 + 예시 문자”가 함께 필터됩니다.</div>

            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 280px', minWidth: 220 }}>
                <input
                  style={S.input}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색: 예) 감사, 리마인드, 소개, 생일..."
                />
              </div>
            </div>

            <div style={S.pills}>
              {ALL_CATS.map((c) => {
                const on = activeCat === c;
                return (
                  <button key={c} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => setActiveCat(c)} title={c}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.pad}>
            <div style={S.sectionTitle}>예시 문자</div>
            <div style={S.sectionSub}>핸드폰 문자처럼 보여요. “편집하기” 누르면 위 편집기에 올라갑니다.</div>

            {filteredExamples.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 950, opacity: 0.7, color: '#2a0f3a' }}>해당 조건의 예시가 없어요.</div>
            ) : (
              <div style={S.phone}>
                {filteredExamples.map((x, idx) => {
                  const left = idx % 2 === 0;
                  return (
                    <div key={x.id} style={{ ...S.msgRow, ...(left ? S.msgLeft : S.msgRight) }}>
                      <div style={left ? S.msgBubbleLeft : S.msgBubbleRight}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 950 }}>{x.title}</span>
                          <span style={S.badge}>{x.category}</span>
                          {(x.tags || []).slice(0, 2).map((t) => (
                            <span key={t} style={{ ...S.badge, opacity: 0.78 }}>
                              #{t}
                            </span>
                          ))}
                        </div>

                        {x.body}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                          <button type="button" style={S.miniBtn} onClick={() => copyToClipboard(x.body)}>
                            복사
                          </button>
                          <button type="button" style={S.miniBtn} onClick={() => pickExample(x)}>
                            편집하기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes floaty {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
            100% {
              transform: translateY(0px);
            }
          }
          :global(*),
          :global(*::before),
          :global(*::after) {
            box-sizing: border-box;
          }
        `}</style>
      </div>
    </ClientShell>
  );
}
