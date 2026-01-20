// ✅✅✅ 전체복붙: src/app/support/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getSafeImgSrc } from '@/lib/getSafeImgSrc';


type SupportStatus = 'open' | 'pending' | 'closed';
type ChatSender = 'user' | 'ai' | 'admin';

type ChatMessage = {
  id: string;
  support_id: string;
  sender: ChatSender;
  message: string;
  attachment_url?: string | null;
  created_at: string;
};

type FAQ = {
  id: string;
  q: string;
  a: string;
  tags?: string[];
};

const PAGE_TITLE = '문의하기';
const BRAND_TAG = 'UPLOG · SUPPORT';

// ✅ public 경로 고정
const LOGO_SRC = '/gogo.png';
const MASCOT_SRC = '/upzzu4.png';

const BENEFIT_TITLE = '이번달 UPLOG 혜택';
const BENEFIT_DESC = '신규 회원 3개월 구독 무료 (이벤트 조건 적용)';

const FAQS: FAQ[] = [
  {
    id: 'pricing',
    q: '요금제는 어떤 게 있어요?',
    a: [
      '현재 UPLOG는 Pro / Business / Premium 3가지 플랜을 준비 중이에요.',
      '• Pro: 개인 사용 중심 (기본 관리 + 핵심 기능)',
      '• Business: 팀/조직 관리 + 실적 리포트 강화',
      '• Premium: 전용 컨설팅/맞춤 세팅 + 우선 지원',
      '',
      '결제 페이지가 오픈되면 “결제/구독” 메뉴에서 바로 안내드릴게요.',
    ].join('\n'),
    tags: ['요금', '플랜'],
  },
  {
    id: 'payment',
    q: '결제는 어떻게 하나요?',
    a: [
      '웹 결제 기준으로는 아래 방식이 가장 깔끔해요.',
      '',
      '✅ 추천: Toss Payments 또는 PortOne(아임포트)로 정기결제(구독) 연동',
      '• 국내 카드/간편결제 지원이 안정적이고, 운영/정산이 편해요.',
      '',
      '추가 옵션:',
      '• Stripe: 해외 사용자/달러 결제까지 고려할 때 좋아요.',
      '• 앱 출시(스토어) 시: iOS/Android 인앱결제로 구독 전환 가능',
      '',
      '원하시면 “웹 우선(토스/포트원) → 앱 인앱 결제” 순서로 설계해드릴게요.',
    ].join('\n'),
    tags: ['결제', '구독'],
  },
  {
    id: 'refund',
    q: '환불/해지는 어떻게 해요?',
    a: [
      '구독 결제(정기결제)는 “해지”를 먼저 진행하고, 환불은 결제 상태에 따라 달라져요.',
      '',
      '일반적인 정책 예시:',
      '• 결제 직후/미사용: 전액 환불 가능',
      '• 사용 이력 존재: 일할 계산 또는 다음 결제부터 해지 적용',
      '',
      '정확한 정책은 결제 오픈 시 “결제/환불 정책”에 고지됩니다.',
      '지금은 이 채팅에 “결제일/플랜/상황”을 남겨주시면 운영자가 확인해 안내해드릴게요.',
    ].join('\n'),
    tags: ['환불', '해지'],
  },
  {
    id: 'login',
    q: '로그인이 안 돼요 / 세션이 풀려요',
    a: [
      '빠르게 점검해볼 체크리스트예요.',
      '',
      '1) 새로고침 후 재로그인(가장 흔함)',
      '2) 브라우저 쿠키/로컬스토리지 차단 여부 확인',
      '3) 다른 탭/다른 기기에서 동시에 로그인했는지 확인',
      '',
      '그래도 반복되면:',
      '• “발생 시간 / 기기(PC/모바일) / 브라우저 / 오류 메시지”를 함께 보내주세요.',
      '운영자가 로그를 보고 바로 잡아드릴게요.',
    ].join('\n'),
    tags: ['로그인', '세션'],
  },
  {
    id: 'chat404',
    q: '친구/채팅이 안 열려요(404/목록만 보여요)',
    a: [
      '보통 라우트 혼재(/memo-chat vs /chats) 또는 방 생성 이동이 끊길 때 발생해요.',
      '',
      '확인 포인트:',
      '• 채팅 라우트가 /chats 로 통일됐는지',
      '• /chats/open → /chats/[roomId] 로 replace 이동이 되는지',
      '• friend.user_id 가 실제 auth.users.id 와 일치하는지',
      '',
      '이 채팅에 “콘솔 오류 화면(스크린샷)”을 올려주시면 운영자가 바로 원인 잡아드릴게요.',
    ].join('\n'),
    tags: ['채팅', '404'],
  },
  {
    id: 'sync',
    q: '저장/동기화가 안 돼요',
    a: [
      '가장 많은 원인은 RLS(조회 정책) 또는 컬럼 스키마 불일치예요.',
      '',
      '빠른 해결을 위해 아래를 함께 보내주세요:',
      '• 저장이 안 되는 화면/기능',
      '• 콘솔 오류 메시지(텍스트/스크린샷)',
      '• “어떤 행동 → 어떤 결과”였는지',
      '',
      '운영자가 확인 후 정책/쿼리 쪽을 바로 수정해드릴게요.',
    ].join('\n'),
    tags: ['저장', '동기화'],
  },
  {
    id: 'adminreply',
    q: '운영자(관리자) 답변은 어디서 받아요?',
    a: [
      '운영자 답변은 이 “문의하기 채팅”에서 그대로 받아보실 수 있어요.',
      '',
      '남겨주신 내용은 접수 순서대로 확인하고, 확인되는 즉시 구체적인 해결 방법까지 안내드립니다.',
      '',
      '또한 고객님들 의견을 반영해 자주 발생하는 이슈는 FAQ/자동 안내를 지속적으로 업데이트하고, 더 안정적으로 이용하실 수 있도록 관리하겠습니다.',
    ].join('\n'),
    tags: ['관리자', '답변'],
  },
];

function buildWelcome() {
  return [
    '안녕하세요. UPLOG 고객지원입니다.',
    '증상을 말씀해주시면 제가 먼저 원인을 분류해서 즉시 조치 방법을 안내드리고, 필요 시 운영자가 이어서 처리합니다.',
    '',
    '빠른 해결을 위해 가능하면 아래 중 하나만 같이 보내주세요:',
    '• 화면 캡처 1장 또는 • 콘솔 오류 1줄(텍스트 그대로)',
  ].join('\n');
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function safeString(v: any) {
  return typeof v === 'string' ? v : '';
}

function isImageFile(f?: File | null) {
  if (!f) return false;
  return /^image\/(png|jpe?g|webp|gif)$/i.test(f.type);
}

function extFromFile(file: File) {
  const raw = (file.name.split('.').pop() || '').toLowerCase().trim();
  if (raw) return raw;
  const t = (file.type || '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  return 'png';
}

async function uploadToSupportBucket(file: File, userId: string): Promise<string | null> {
  const bucket = 'support_uploads';
  const ext = extFromFile(file);
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = data?.publicUrl ? String(data.publicUrl) : '';
  return url || null;
}

function makeTitleFromText(text: string) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '문의';
  return t.length > 26 ? t.slice(0, 26) + '…' : t;
}

function looksLikeErrorDetail(s: string) {
  return /console|콘솔|오류|error|rls|policy|permission|denied|401|403|42703|23502|uuid|not null/i.test(s);
}

function normalizeTopic(text: string) {
  const t = (text || '').trim().toLowerCase();
  if (!t) return 'general';
  if (t.includes('결제') || t.includes('구독') || t.includes('요금')) return 'payment';
  if (t.includes('환불') || t.includes('해지')) return 'refund';
  if (t.includes('로그인') || t.includes('세션') || t.includes('auth') || t.includes('401') || t.includes('403')) return 'auth';
  if (t.includes('채팅') || t.includes('404') || t.includes('room') || t.includes('/chats/open')) return 'chat';
  if (t.includes('저장') || t.includes('동기화') || t.includes('rls') || t.includes('insert') || t.includes('select') || t.includes('update'))
    return 'sync';
  if (t.includes('문의') || t.includes('고객센터') || t.includes('support') || t.includes('관리자') || t.includes('답변')) return 'support';
  return 'general';
}

export default function SupportPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [supportId, setSupportId] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const faqChips = useMemo(() => FAQS, []);
  const headerGuide = useMemo(() => {
    return '자주 묻는 질문을 누르거나, 아래에 상황을 남겨주세요. AI가 먼저 원인 분류 및 해결 절차를 안내하고, 필요 시 운영자가 이어서 처리합니다.';
  }, []);

  // ✅✅✅ 전문가 톤 + 반복 방지 + “다음 단계 1개”만 요청
  function getAiAnswer(text: string) {
    const t = (text || '').trim();
    const lower = t.toLowerCase();

    // FAQ exact hit
    const hit = FAQS.find((f) => f.q === t);
    if (hit) return hit.a;

    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user')?.message || '';
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === 'ai')?.message || '';
    const alreadyRequestedProof =
      looksLikeErrorDetail(lastAiMsg) || /캡처|스크린샷|오류|콘솔/i.test(lastAiMsg) || looksLikeErrorDetail(lastUserMsg);

    // 짧은 인사/확인
    if (/^(감사|고마|ㅇㅋ|ok|확인|네|넵|ㅇㅇ|안녕|hi|하이)\b/i.test(t)) {
      return ['확인했습니다.', '', '지금 바로 도와드릴게요. “어느 화면(문의/채팅/저장/로그인)”에서 막혔는지만 한 줄로 알려주세요.'].join(
        '\n'
      );
    }

    // 결제/구독/요금
    if (lower.includes('결제') || lower.includes('구독') || lower.includes('요금')) {
      return FAQS.find((f) => f.id === 'payment')?.a || '';
    }

    // 환불/해지
    if (lower.includes('환불') || lower.includes('해지')) {
      return FAQS.find((f) => f.id === 'refund')?.a || '';
    }

    // 로그인/세션
    if (lower.includes('로그인') || lower.includes('세션') || lower.includes('auth') || lower.includes('401') || lower.includes('403')) {
      if (alreadyRequestedProof) {
        return [
          '좋아요. 이제 원인 확정 단계예요.',
          '',
          '아래 중 하나만 보내주세요:',
          '• 오류 메시지 1줄(텍스트 그대로) 또는 • 문제 화면 캡처 1장',
          '',
          '받는 즉시 “세션 문제인지 / 정책(RLS)인지 / 라우팅인지”로 갈라서 해결 순서 안내드릴게요.',
        ].join('\n');
      }
      return FAQS.find((f) => f.id === 'login')?.a || '';
    }

    // 채팅/404
    if (lower.includes('채팅') || lower.includes('404') || lower.includes('room') || lower.includes('/chats/open')) {
      if (alreadyRequestedProof) {
        return [
          '채팅 이슈는 “to=UID 값” 또는 “방 생성 후 이동(replace)”에서 끊기는 경우가 많습니다.',
          '',
          '아래 중 하나만 보내주세요:',
          '• 주소창 전체(/chats/open?to=...) 캡처',
          '• 콘솔 오류 1줄',
        ].join('\n');
      }
      return FAQS.find((f) => f.id === 'chat404')?.a || '';
    }

    // 저장/동기화/RLS
    if (
      lower.includes('저장') ||
      lower.includes('동기화') ||
      lower.includes('rls') ||
      lower.includes('insert') ||
      lower.includes('select') ||
      lower.includes('update')
    ) {
      if (alreadyRequestedProof) {
        return [
          '확인했습니다. 이 케이스는 “정책(SELECT) 차단” 또는 “컬럼 불일치”일 확률이 높습니다.',
          '',
          '오류 메시지 1줄만 부탁드려요(예: 42703 / permission denied / not null 등).',
          '그 한 줄로 바로 원인 확정 후 해결 순서 안내드릴게요.',
        ].join('\n');
      }
      return FAQS.find((f) => f.id === 'sync')?.a || '';
    }

    // 운영자 답변/문의 흐름
    if (lower.includes('운영자') || lower.includes('관리자') || lower.includes('답변') || lower.includes('문의') || lower.includes('고객센터')) {
      if (alreadyRequestedProof) {
        return [
          '좋습니다. 현재 패턴상 “세션 uid가 null로 전송됨” 또는 “RLS 때문에 조회/저장이 막힘” 쪽이 유력합니다.',
          '',
          '확정하려면 아래 중 하나만 부탁드려요:',
          '• 콘솔 오류 1줄 또는 • 화면 캡처 1장',
        ].join('\n');
      }

      return [
        '확인했습니다. 먼저 제가 1차로 원인을 분류해서 바로 해결 절차를 안내드릴게요.',
        '',
        '가능하면 아래 중 하나만 보내주세요:',
        '• 화면 캡처 1장 또는 • 콘솔 오류 1줄(텍스트 그대로)',
        '',
        '필요한 경우 운영자가 이어서 조치하고, 개선 사항은 반영해 지속적으로 안정화하겠습니다.',
      ].join('\n');
    }

    // 일반 케이스
    if (alreadyRequestedProof) {
      return [
        '확인했습니다.',
        '',
        '이제 “오류 1줄” 또는 “캡처 1장”만 있으면 확정 가능합니다. 올려주시면 다음 메시지에서 바로 해결 단계로 안내드릴게요.',
      ].join('\n');
    }

    return [
      '확인했습니다. 증상을 기준으로 원인을 빠르게 좁히겠습니다.',
      '',
      '아래 중 해당되는 번호만 답해도 됩니다.',
      '1) 문의/고객센터(전송/운영자 답변)',
      '2) 로그인/세션',
      '3) 저장/동기화',
      '4) 채팅/404',
      '',
      '가능하면 콘솔 오류 1줄 또는 캡처 1장만 함께 부탁드립니다.',
    ].join('\n');
  }

  // ✅ 로그인/유저 확인: getSession 기반
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingUser(true);

      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;

      if (!alive) return;

      if (sessErr || !uid) {
        alert('로그인 후 이용할 수 있어요.');
        router.push('/login');
        return;
      }

      setUserId(uid);
      setLoadingUser(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // ✅ supports 티켓 확보(에러 방어 강화)
  async function ensureSupportTicket(uid: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('supports')
        .select('id,status,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0]?.id) {
        return String(data[0].id);
      }
    } catch {}

    const { data: ins, error: insErr } = await supabase
      .from('supports')
      .insert({
        user_id: uid,
        title: '문의',
        category: 'general',
        body: '',
        status: 'open',
        is_read_admin: false,
      })
      .select('id')
      .single();

    if (insErr || !ins?.id) throw insErr || new Error('support ticket create failed');
    return String(ins.id);
  }

  // ✅ 메시지 로드
  async function fetchMessagesBySupportId(sid: string) {
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from('support_messages')
      .select('id,support_id,sender,message,attachment_url,created_at')
      .eq('support_id', sid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('SUPPORT_LOAD_ERROR', error);
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const rows = (data || []) as any[];
    const mapped: ChatMessage[] = rows.map((r) => ({
      id: String(r.id),
      support_id: String(r.support_id),
      sender: (r.sender as ChatSender) || 'user',
      message: safeString(r.message),
      attachment_url: r.attachment_url ?? null,
      created_at: String(r.created_at),
    }));

    setMessages(mapped);
    setLoadingMessages(false);
  }

  // ✅ 웰컴 1회 보장
  async function ensureWelcomeOnce(uid: string, sid: string) {
    const { data, error } = await supabase.from('support_messages').select('id').eq('support_id', sid).limit(1);

    if (error) {
      console.error('WELCOME_CHECK_ERROR', error);
      return;
    }
    if ((data || []).length > 0) return;

    const { error: insErr } = await supabase.from('support_messages').insert({
      support_id: sid,
      user_id: uid,
      sender: 'ai',
      message: buildWelcome(),
      attachment_url: null,
    });

    if (insErr) console.error('WELCOME_INSERT_ERROR', insErr);
  }

  // ✅ 초기 로딩
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    (async () => {
      try {
        const sid = await ensureSupportTicket(userId);
        if (!alive) return;

        setSupportId(sid);
        await ensureWelcomeOnce(userId, sid);
        await fetchMessagesBySupportId(sid);
      } catch (e) {
        console.error('SUPPORT_INIT_ERROR', e);
        alert('문의 페이지 초기화 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  // ✅ 실시간 구독
  useEffect(() => {
    if (!supportId) return;

    const channel = supabase
      .channel(`support-chat-${supportId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `support_id=eq.${supportId}` },
        (payload) => {
          const r: any = payload.new || {};
          const nextMsg: ChatMessage = {
            id: String(r.id),
            support_id: String(r.support_id),
            sender: (r.sender as ChatSender) || 'user',
            message: safeString(r.message),
            attachment_url: r.attachment_url ?? null,
            created_at: String(r.created_at),
          };
          setMessages((prev) => [...prev, nextMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supportId]);

  // 스크롤 하단
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ✅ preview url cleanup (unmount 포함)
  useEffect(() => {
    return () => {
      if (filePreview) {
        try {
          URL.revokeObjectURL(filePreview);
        } catch {}
      }
    };
  }, [filePreview]);

  async function touchTicketOnUserSend(sid: string, textForTitle: string, bodyForTicket: string) {
    const title = makeTitleFromText(textForTitle);
    await supabase.from('supports').update({ title, body: bodyForTicket, status: 'open' as SupportStatus, is_read_admin: false }).eq('id', sid);
  }

  async function insertMessage(uid: string, sid: string, sender: ChatSender, message: string, attachmentUrl?: string | null) {
    const safeMsg = (message ?? '').toString().trim() || (attachmentUrl ? '[사진]' : '');
    const payload: any = { support_id: sid, user_id: uid, sender, message: safeMsg || '[메시지]' };
    if (attachmentUrl) payload.attachment_url = attachmentUrl;

    const { error } = await supabase.from('support_messages').insert(payload);
    if (error) throw error;
  }

  async function getFreshUid(): Promise<string | null> {
    const { data: sessionData, error } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id ?? null;
    if (error) return null;
    return uid;
  }

  // ✅✅✅ FAQ 클릭/전송 안정화 + 반복 답변 방지
  async function handleSend(overrideText?: string) {
    if (sending) return;

    const freshUid = await getFreshUid();
    const uid = freshUid || userId;

    if (!uid) {
      alert('세션이 만료되었어요. 다시 로그인 후 전송해 주세요.');
      router.push('/login');
      return;
    }

    const sid = supportId || (await ensureSupportTicket(uid));
    if (!supportId) setSupportId(sid);

    const safeInput = (overrideText ?? input ?? '').toString().trim();

    setSending(true);
    try {
      // 1) 파일 업로드(선택)
      let attachmentUrl: string | null = null;

      if (file) {
        try {
          attachmentUrl = await uploadToSupportBucket(file, uid);
        } catch (e: any) {
          console.error('SUPPORT_UPLOAD_ERROR', e);
          alert(
            '사진 업로드가 실패했어요.\n(원인: Storage 버킷/정책 문제일 가능성)\n\n✅ Supabase Storage에 버킷: support_uploads\n✅ 정책 적용 필요\n\n그 전까지는 텍스트만 전송해 주세요.'
          );
          attachmentUrl = null;
        }
      }

      if (!safeInput && !attachmentUrl) {
        alert('메시지를 입력하거나 사진을 첨부해주세요.');
        return;
      }

      // 2) 티켓 업데이트(관리자 리스트에 바로 보이게)
      const userMessageText = safeInput || '[사진]';
      await touchTicketOnUserSend(sid, safeInput || '사진 첨부', userMessageText);

      // 3) 유저 메시지 저장
      await insertMessage(uid, sid, 'user', userMessageText, attachmentUrl);

      // 4) AI 즉시 응답 저장(전문가 톤)
      const aiInput =
        safeInput || '사진이 첨부되었어요. 사진에서 어떤 문제가 보이는지 한 줄만 적어주시면, 더 정확히 원인을 잡아드릴게요.';
      const ai = getAiAnswer(aiInput);
      await insertMessage(uid, sid, 'ai', ai);

      // 5) UI 리셋
      setInput('');
      setFile(null);
      setFilePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchMessagesBySupportId(sid);
    } catch (e: any) {
      console.error('SUPPORT_SEND_ERROR', e);
      const code = e?.code ? String(e.code) : '';
      const msg = e?.message ? String(e.message) : '';
      const hint = normalizeTopic(overrideText ?? input ?? '') !== 'general' ? `\n\n(분류: ${normalizeTopic(overrideText ?? input ?? '')})` : '';
      alert((code || msg ? `${code ? code + ': ' : ''}${msg || '전송 중 오류가 발생했습니다.'}` : '전송 중 오류가 발생했습니다.') + hint);
    } finally {
      setSending(false);
    }
  }

  // ✅ FAQ 클릭: 텍스트를 직접 전송(타이밍 이슈 제거)
  async function handleFAQClick(f: FAQ) {
    await handleSend(f.q);
  }

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;

    if (filePreview) {
      try {
        URL.revokeObjectURL(filePreview);
      } catch {}
    }

    if (!f) {
      setFile(null);
      setFilePreview('');
      return;
    }

    setFile(f);

    if (isImageFile(f)) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview('');
    }
  }

  function clearFile() {
    if (filePreview) {
      try {
        URL.revokeObjectURL(filePreview);
      } catch {}
    }
    setFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (loadingUser) {
    return (
      <div className="root">
        <div className="inner">
          <div className="loadingCard">로딩 중…</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="root">
      <div className="inner">
        {/* ===== HEADER ===== */}
        <header className="header">
          <div className="headerTop">
            <div className="brandRow">
              <div className="brandLeft">
                <img className="logo" src={LOGO_SRC} alt="UPLOG" draggable={false} />
                <div className="brandText">
                  <div className="brandTag">{BRAND_TAG}</div>
                  <div className="brandTitle">{PAGE_TITLE}</div>
                </div>
              </div>
            </div>

            <div className="bubbleRow">
              <div className="bubble">
                <div className="bubbleChip">채팅 가이드</div>
                <div className="bubbleText">{headerGuide}</div>
              </div>

              <img className="mascot" src={MASCOT_SRC} alt="업쮸" draggable={false} />
            </div>
          </div>
        </header>

        {/* ===== MAIN CARD ===== */}
        <section className="panel">
          <div className="panelHead">
            <div className="panelTitle">AI 고객센터</div>

            <div className="benefitCard">
              <div className="benefitChip">{BENEFIT_TITLE}</div>
              <div className="benefitText">{BENEFIT_DESC}</div>
            </div>
          </div>

          <div className="faqWrap">
            <div className="faqTitle">자주하는질문</div>
            <div className="faqChips">
              {faqChips.map((f) => (
                <button key={f.id} className="chip" onClick={() => void handleFAQClick(f)} type="button" disabled={sending}>
                  {f.q}
                </button>
              ))}
            </div>
          </div>

          {/* ===== CHAT ===== */}
          <div className="chatBox">
            <div className="chatScroll">
              {(loadingMessages || messages.length === 0) && (
                <div className="state">
                  {loadingMessages ? '채팅 내역을 불러오는 중입니다…' : '아직 대화가 없어요. 아래 입력창에 첫 질문을 남겨주세요.'}
                </div>
              )}

              {messages.map((m) => {
                const mine = m.sender === 'user';
                const isAi = m.sender === 'ai';
                const time = fmtTime(m.created_at);

                return (
                  <div key={m.id} className={'row ' + (mine ? 'right' : 'left')}>
                    <div className="msgWrap">
                      <div className="meta">
                        <span className="who">{mine ? '나' : isAi ? 'AI' : '운영자'}</span>
                        <span className="time">{time}</span>
                      </div>

                      <div className={'msg ' + (mine ? 'mine' : isAi ? 'ai' : 'admin')}>
                        {m.message}

                        {m.attachment_url ? (
  <div className="attach">
    <img
      className="attachImg"
      src={getSafeImgSrc(m.attachment_url, { bucket: 'support_uploads', fallback: '/gogo.png' })}
      alt="첨부 이미지"
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        img.onerror = null;
        img.src = '/gogo.png';
      }}
    />
    <a
      className="attachLink"
      href={getSafeImgSrc(m.attachment_url, { bucket: 'support_uploads', fallback: '/gogo.png', cacheBust: false })}
      target="_blank"
      rel="noreferrer"
    >
      첨부파일 열기
    </a>
  </div>
) : null}

                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {/* ===== INPUT ===== */}
            <div className="inputArea">
              <div className="inputTop">
                <button className="fileBtn" onClick={handlePickFile} type="button" disabled={sending}>
                  + 사진첨부
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

                {file ? (
                  <div className="filePill">
                    {filePreview ? <img className="fileThumb" src={filePreview} alt="preview" /> : <div className="fileThumb placeholder">FILE</div>}
                    <div className="fileName">{file.name}</div>
                    <button className="fileDel" type="button" onClick={clearFile} disabled={sending}>
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="inputRow">
                <textarea
                  className="textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  placeholder="질문을 입력해 주세요.(사진 첨부하시면 더 빠르게 도와드려요)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />

                <button
                  className={'send ' + (sending || (!input.trim() && !file) ? 'disabled' : '')}
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!input.trim() && !file)}
                >
                  {sending ? '전송 중…' : '전송'}
                </button>
              </div>

              <div className="hint">운영자 답변은 AI가 먼저 안내하고, 운영자가 이어서 답변해요.</div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
/* (대표님 원본 CSS 그대로) */
/* ===== BASE ===== */
.root{
  min-height:100vh;
  padding:18px 12px 28px;
  box-sizing:border-box;
  display:flex;
  justify-content:center;
  background: linear-gradient(180deg, #ffe7f4 0%, #f7f1ff 45%, #e9f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color:#1b1030;
}
.inner{
  width:100%;
  max-width:980px;
  display:flex;
  flex-direction:column;
  gap:14px;
}

/* ===== LOADING ===== */
.loadingCard{
  width:100%;
  border-radius:24px;
  padding:18px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(168,85,247,0.18);
  box-shadow: 0 18px 42px rgba(0,0,0,0.10);
  font-size:16px;
  font-weight:900;
}

/* ===== HEADER (밝은 파스텔 핑크톤) ===== */
.header{
  border-radius:34px;
  padding:18px 18px 14px;
  background:
    radial-gradient(900px 360px at 18% 20%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.0) 55%),
    linear-gradient(120deg, #ffb6d9 0%, #c9a7ff 45%, #9ad9ff 100%);
  border: 1px solid rgba(255,255,255,0.45);
  box-shadow: 0 26px 60px rgba(0,0,0,0.16);
}
.brandRow{ display:flex; align-items:center; justify-content:space-between; }
.brandLeft{ display:flex; align-items:center; gap:12px; }
.logo{
  width:54px;
  height:54px;
  border-radius:18px;
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(255,255,255,0.45);
  box-shadow: 0 12px 22px rgba(0,0,0,0.10);
  object-fit:contain;
  padding:6px;
}
.brandText{ display:flex; flex-direction:column; gap:2px; }
.brandTag{
  font-size:11px;
  letter-spacing:0.32em;
  font-weight:950;
  color: rgba(36,14,60,0.72);
}
.brandTitle{
  font-size:30px;
  font-weight:1000;
  letter-spacing:-0.02em;
  color: rgba(22,10,44,0.92);
}

.bubbleRow{
  margin-top:12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.bubble{
  flex:1;
  border-radius:22px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(168,85,247,0.20);
  box-shadow: 0 14px 26px rgba(0,0,0,0.10);
  padding:14px 18px;
  min-height:64px;
  position:relative;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.bubble:after{ content:none; }

.bubbleChip{
  align-self:flex-start;
  font-size:11px;
  font-weight:950;
  padding:4px 10px;
  border-radius:999px;
  background: rgba(255,232,245,0.90);
  border: 1px solid rgba(244,114,182,0.22);
  color:#ff4da0;
  margin-bottom:6px;
}
.bubbleText{
  font-size:14px;
  font-weight:850;
  line-height:1.45;
  color:#2b1640;
}
.mascot{
  width:140px;
  height:140px;
  object-fit:contain;
  flex-shrink:0;
  user-select:none;
  -webkit-user-drag:none;
  animation: floaty 2.8s ease-in-out infinite;
  filter: drop-shadow(0 12px 16px rgba(0,0,0,0.12));
}
@keyframes floaty{
  0%{ transform: translateY(0) }
  50%{ transform: translateY(-7px) }
  100%{ transform: translateY(0) }
}

/* ===== PANEL ===== */
.panel{
  border-radius:28px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(168,85,247,0.16);
  box-shadow: 0 22px 52px rgba(0,0,0,0.10);
  padding:16px;
}
.panelHead{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-bottom:12px;
}
.panelTitle{
  font-size:18px;
  font-weight:1000;
  color:#1b1030;
}

/* 혜택 카드 */
.benefitCard{
  border-radius:18px;
  padding:12px 12px;
  background: linear-gradient(135deg, rgba(255,231,244,0.95), rgba(233,246,255,0.95));
  border: 1px solid rgba(244,114,182,0.20);
}
.benefitChip{
  display:inline-block;
  font-size:12px;
  font-weight:1000;
  padding:5px 10px;
  border-radius:999px;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(244,114,182,0.18);
  color:#ff3f9c;
}
.benefitText{
  margin-top:8px;
  font-size:14px;
  font-weight:900;
  color:#2b1640;
}

/* FAQ */
.faqWrap{
  border-radius:20px;
  padding:12px 12px;
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(168,85,247,0.14);
  margin-bottom:12px;
}
.faqTitle{
  font-size:13px;
  font-weight:1000;
  color:#2b1640;
  margin-bottom:8px;
}
.faqChips{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.chip{
  border:none;
  cursor:pointer;
  padding:9px 12px;
  border-radius:999px;
  background: rgba(245,240,255,0.92);
  border: 1px solid rgba(168,85,247,0.20);
  color:#3a1f64;
  font-size:13px;
  font-weight:900;
  box-shadow: 0 10px 18px rgba(0,0,0,0.06);
  transition: transform .12s ease, filter .12s ease, background .12s ease;
}
.chip:hover{ transform: translateY(-1px); filter: brightness(1.02); }
.chip:active{ transform: translateY(0px) scale(0.99); }
.chip:disabled{ opacity:0.55; cursor:not-allowed; }

/* ===== CHAT BOX ===== */
.chatBox{
  border-radius:22px;
  overflow:hidden;
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(168,85,247,0.16);
  box-shadow: 0 18px 34px rgba(0,0,0,0.08);
}
.chatScroll{
  padding:14px 12px;
  max-height: 520px;
  overflow:auto;
  background:
    radial-gradient(800px 300px at 20% 10%, rgba(255,182,217,0.25) 0%, rgba(255,255,255,0) 55%),
    radial-gradient(900px 350px at 85% 15%, rgba(154,217,255,0.22) 0%, rgba(255,255,255,0) 60%),
    rgba(255,255,255,0.80);
}
.state{
  padding:12px 12px;
  border-radius:16px;
  background: rgba(255,255,255,0.84);
  border: 1px dashed rgba(168,85,247,0.22);
  color: rgba(43,22,64,0.72);
  font-weight:900;
  font-size:13px;
  line-height:1.45;
}

/* message rows */
.row{
  display:flex;
  width:100%;
  margin:10px 0;
}
.row.left{ justify-content:flex-start; }
.row.right{ justify-content:flex-end; }

.msgWrap{
  width: min(640px, 88%);
  display:flex;
  flex-direction:column;
  gap:6px;
}
.row.right .msgWrap{ align-items:flex-end; }
.row.left .msgWrap{ align-items:flex-start; }

.meta{
  display:flex;
  gap:8px;
  align-items:center;
  font-size:12px;
  font-weight:950;
  color: rgba(43,22,64,0.62);
}
.who{
  padding:3px 8px;
  border-radius:999px;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(168,85,247,0.16);
}
.time{ opacity:0.9; }

.msg{
  white-space:pre-wrap;
  word-break:break-word;
  border-radius:18px;
  padding:12px 12px;
  border: 1px solid rgba(168,85,247,0.16);
  box-shadow: 0 14px 26px rgba(0,0,0,0.08);
  font-size:14px;
  font-weight:900;
  line-height:1.55;
  color:#241136;
}
.msg.mine{
  background: linear-gradient(135deg, rgba(255,182,217,0.52), rgba(201,167,255,0.52));
  border: 1px solid rgba(244,114,182,0.25);
}
.msg.ai{
  background: rgba(255,255,255,0.92);
}
.msg.admin{
  background: linear-gradient(135deg, rgba(154,217,255,0.50), rgba(255,255,255,0.75));
  border: 1px solid rgba(59,130,246,0.20);
}

/* attachment */
.attach{
  margin-top:10px;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.attachImg{
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius:14px;
  border: 1px solid rgba(168,85,247,0.18);
  box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.75);
}
.attachLink{
  align-self:flex-start;
  font-size:12px;
  font-weight:950;
  color:#6d28d9;
  text-decoration:none;
  padding:6px 10px;
  border-radius:999px;
  border: 1px solid rgba(109,40,217,0.22);
  background: rgba(255,255,255,0.80);
}
.attachLink:hover{ filter: brightness(1.02); }

/* ===== INPUT AREA ===== */
.inputArea{
  padding:12px;
  border-top: 1px solid rgba(168,85,247,0.16);
  background: rgba(255,255,255,0.92);
}
.inputTop{
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:10px;
  flex-wrap:wrap;
}
.fileBtn{
  border:none;
  cursor:pointer;
  padding:9px 12px;
  border-radius:14px;
  font-size:13px;
  font-weight:1000;
  color:#2b1640;
  background: linear-gradient(135deg, rgba(255,231,244,0.95), rgba(233,246,255,0.95));
  border: 1px solid rgba(244,114,182,0.20);
  box-shadow: 0 12px 22px rgba(0,0,0,0.08);
}
.fileBtn:hover{ filter: brightness(1.02); }
.fileBtn:active{ transform: translateY(1px); }
.fileBtn:disabled{ opacity:0.55; cursor:not-allowed; }

.filePill{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 10px;
  border-radius:999px;
  background: rgba(245,240,255,0.92);
  border: 1px solid rgba(168,85,247,0.18);
  box-shadow: 0 12px 22px rgba(0,0,0,0.06);
  max-width: 100%;
}
.fileThumb{
  width:34px;
  height:34px;
  border-radius:12px;
  object-fit:cover;
  border: 1px solid rgba(168,85,247,0.18);
  background: rgba(255,255,255,0.80);
}
.fileThumb.placeholder{
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:10px;
  font-weight:1000;
  color: rgba(43,22,64,0.70);
}
.fileName{
  font-size:12px;
  font-weight:950;
  color:#2b1640;
  max-width: 340px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.fileDel{
  border:none;
  cursor:pointer;
  padding:6px 10px;
  border-radius:999px;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(244,114,182,0.20);
  color:#ff3f9c;
  font-size:12px;
  font-weight:1000;
}
.fileDel:hover{ filter: brightness(1.02); }
.fileDel:disabled{ opacity:0.55; cursor:not-allowed; }

.inputRow{
  display:flex;
  gap:10px;
  align-items:stretch;
}
.textarea{
  flex:1;
  resize:none;
  border-radius:18px;
  padding:12px 12px;
  border: 1px solid rgba(168,85,247,0.20);
  background: rgba(255,255,255,0.92);
  outline:none;
  box-shadow: 0 10px 20px rgba(0,0,0,0.06);
  font-size:14px;
  font-weight:900;
  line-height:1.45;
  color:#241136;
}
.textarea::placeholder{
  color: rgba(43,22,64,0.45);
  font-weight:900;
}
.textarea:focus{
  border-color: rgba(244,114,182,0.34);
  box-shadow: 0 12px 26px rgba(244,114,182,0.12);
}

.send{
  width:108px;
  border:none;
  cursor:pointer;
  border-radius:18px;
  font-size:14px;
  font-weight:1000;
  color:#ffffff;
  background: linear-gradient(135deg, #ff4da0 0%, #8b5cf6 55%, #38bdf8 110%);
  box-shadow: 0 16px 30px rgba(139,92,246,0.22);
}
.send:hover{ filter: brightness(1.02); }
.send:active{ transform: translateY(1px); }
.send.disabled{
  opacity:0.55;
  cursor:not-allowed;
  filter: grayscale(0.15);
  box-shadow:none;
}

.hint{
  margin-top:10px;
  font-size:12px;
  font-weight:900;
  color: rgba(43,22,64,0.62);
}

/* ===== SCROLLBAR(웹) ===== */
.chatScroll::-webkit-scrollbar{ width: 10px; }
.chatScroll::-webkit-scrollbar-thumb{
  background: rgba(168,85,247,0.22);
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.75);
}
.chatScroll::-webkit-scrollbar-track{
  background: rgba(255,255,255,0.35);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 820px){
  .brandTitle{ font-size:26px; }
  .mascot{ width:120px; height:120px; }
  .chatScroll{ max-height: 520px; }
}
@media (max-width: 520px){
  .root{ padding:14px 10px 22px; }
  .header{ border-radius:28px; padding:16px 14px 12px; }
  .brandTitle{ font-size:22px; }
  .logo{ width:50px; height:50px; border-radius:16px; }
  .bubbleRow{ align-items:flex-end; }
  .bubble{ padding:12px 12px; border-radius:18px; }
  .bubbleText{ font-size:13px; }
  .mascot{ width:108px; height:108px; }
  .panel{ border-radius:24px; padding:14px; }
  .chatScroll{ padding:12px 10px; max-height: 520px; }
  .msgWrap{ width: min(640px, 92%); }
  .inputRow{ flex-direction:column; }
  .send{ width:100%; height:46px; border-radius:16px; }
  .fileName{ max-width: 160px; }
}
`;
