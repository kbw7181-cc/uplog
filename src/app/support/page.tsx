// ✅✅✅ 전체복붙: src/app/support/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ChatRole = 'user' | 'ai' | 'admin';

type ChatMessage = {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
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

const LOGO_SRC = '/lolo.png'; // ✅ public/lolo.png 고정
const MASCOT_SRC = '/assets/upzzu4.png'; // ✅ 문의하기=upzzu4.png (public/assets)

const BENEFIT_TITLE = '이번달 UPLOG 혜택';
const BENEFIT_DESC = '신규 회원 3개월 구독 무료 (이벤트 조건 적용)';

// ✅ “자주하는질문” 버튼 목록 + 답변(전문적으로)
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
      '운영자 답변은 관리자 페이지(/admin/support)에서 작성되고, 여기 채팅으로 그대로 도착해요.',
      '',
      '답변이 오면:',
      '• “AI → 운영자” 형태로 이어서 표시됩니다.',
      '• 중요한 안내는 상단에 요약 카드로도 다시 보여드려요.',
    ].join('\n'),
    tags: ['관리자', '답변'],
  },
];

// ✅ 첫 방문 인사(감성 + 짧게)
function buildWelcome() {
  return [
    '안녕하세요 🙂 UPLOG AI 고객센터예요.',
    '질문을 남기면 제가 먼저 빠르게 안내하고, 필요하면 운영자가 이어서 답변합니다.',
    '',
    '아래 “자주하는질문”을 눌러도 되고, 그냥 편하게 상황을 적어주셔도 돼요.',
    '스크린샷/사진을 첨부하면 해결 속도가 훨씬 빨라집니다.',
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

async function uploadToSupportBucket(file: File, userId: string): Promise<string | null> {
  // ✅ bucket 이름 고정: support_uploads
  // ⚠️ Supabase Storage에 bucket이 없으면 "Bucket not found" 발생
  const bucket = 'support_uploads';
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (upErr) {
    throw upErr;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = data?.publicUrl ? String(data.publicUrl) : '';
  return url || null;
}

export default function SupportPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // ✅ 사진첨부
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const faqChips = useMemo(() => FAQS, []);
  const headerGuide = useMemo(() => {
    return '자주 묻는 질문을 누르거나, 아래에 질문을 남겨주세요. AI가 먼저 안내하고 필요하면 운영자가 이어서 답변합니다.';
  }, []);

  // 0) 사용자 확인
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingUser(true);
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      if (!alive) return;

      if (!uid) {
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

  // ✅ AI 답변 로직(FAQ 기반 + 간단 분기)
  function getAiAnswer(text: string) {
    const t = (text || '').trim();

    const hit = FAQS.find((f) => f.q === t);
    if (hit) return hit.a;

    const lower = t.toLowerCase();
    if (lower.includes('결제') || lower.includes('구독') || lower.includes('요금')) return FAQS.find((f) => f.id === 'payment')?.a || '';
    if (lower.includes('환불') || lower.includes('해지')) return FAQS.find((f) => f.id === 'refund')?.a || '';
    if (lower.includes('로그인') || lower.includes('세션')) return FAQS.find((f) => f.id === 'login')?.a || '';
    if (lower.includes('채팅') || lower.includes('404')) return FAQS.find((f) => f.id === 'chat404')?.a || '';
    if (lower.includes('저장') || lower.includes('동기화') || lower.includes('rls')) return FAQS.find((f) => f.id === 'sync')?.a || '';

    return [
      '확인했어요. 🙂',
      '지금 상황을 더 빨리 잡기 위해 아래 3가지만 알려주세요:',
      '1) 어떤 화면에서 발생했는지(예: 홈/채팅/커뮤니티/문의하기)',
      '2) 어떤 행동을 했을 때 발생했는지(예: 버튼 클릭/저장/새로고침)',
      '3) 콘솔 오류 메시지(텍스트 또는 스크린샷)',
      '',
      '가능하면 사진/스크린샷을 첨부해 주세요.',
    ].join('\n');
  }

  // ✅ insert: DB가 message NOT NULL인 케이스를 확실히 뚫기 위해 content+message 둘 다 넣음
  async function insertMessage(uid: string, role: ChatRole, content: string, attachmentUrl?: string | null) {
    const safe = (content ?? '').toString().trim() || '[사진]';

    const payload: any = {
      user_id: uid,
      role,
      content: safe,  // content 컬럼 쓰는 경우
      message: safe,  // message NOT NULL 컬럼 쓰는 경우 (둘 중 하나만 있어도 안전)
    };
    if (attachmentUrl) payload.attachment_url = attachmentUrl;

    const { error } = await supabase.from('support_messages').insert(payload);
    if (error) throw error;
  }

  // 1) 메시지 로드 (content/message 둘 다 대응)
  async function fetchMessages(uid: string) {
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('SUPPORT_LOAD_ERROR', error);
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const rows = (data || []) as any[];
    const mapped: ChatMessage[] = rows
      .map((r) => ({
        id: String(r.id),
        user_id: String(r.user_id),
        role: (r.role as ChatRole) || 'user',
        content: safeString(r.content) || safeString(r.message) || '',
        attachment_url: r.attachment_url ?? null,
        created_at: String(r.created_at),
      }))
      .filter((m) => !!m.id);

    setMessages(mapped);
    setLoadingMessages(false);
  }

  // 2) 웰컴 메시지 1회 보장 (DB 컬럼 불일치/NOT NULL 방어 위해 insertMessage 사용)
  async function ensureWelcome(uid: string) {
    const { data, error } = await supabase.from('support_messages').select('id').eq('user_id', uid).limit(1);
    if (error) {
      console.error('WELCOME_CHECK_ERROR', error);
      return;
    }
    if ((data || []).length > 0) return;

    try {
      await insertMessage(uid, 'ai', buildWelcome());
    } catch (e) {
      console.error('WELCOME_INSERT_ERROR', e);
    }
  }

  // 3) 초기 로딩 + 실시간 구독
  useEffect(() => {
    if (!userId) return;

    (async () => {
      await ensureWelcome(userId);
      await fetchMessages(userId);
    })();

    const channel = supabase
      .channel(`support-chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const r: any = payload.new || {};
            const nextMsg: ChatMessage = {
              id: String(r.id),
              user_id: String(r.user_id),
              role: (r.role as ChatRole) || 'user',
              content: safeString(r.content) || safeString(r.message) || '',
              attachment_url: r.attachment_url ?? null,
              created_at: String(r.created_at),
            };
            setMessages((prev) => [...prev, nextMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 4) 스크롤 하단 고정
  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!userId) return;
    if (sending) return;

    const safeInput = (input ?? '').toString().trim();

    setSending(true);
    try {
      // 1) 파일 업로드(선택)
      let attachmentUrl: string | null = null;

      if (file) {
        try {
          attachmentUrl = await uploadToSupportBucket(file, userId);
        } catch (e: any) {
          console.error('SUPPORT_UPLOAD_ERROR', e);
          alert(
            '사진 업로드가 실패했어요.\n(원인: Storage 버킷/정책 문제일 가능성)\n\n✅ Supabase Storage에 버킷을 먼저 만들어주세요: support_uploads\n그 전까지는 텍스트만 전송해 주세요.'
          );
          attachmentUrl = null;
        }
      }

      // ✅ 텍스트도 없고 첨부도 없으면 전송 금지
      if (!safeInput && !attachmentUrl) {
        alert('메시지를 입력하거나 사진을 첨부해주세요.');
        return;
      }

      // 2) 유저 메시지 저장 (NOT NULL 방어)
      const userMessage = safeInput || '[사진]';
      await insertMessage(userId, 'user', userMessage, attachmentUrl);

      // 3) AI 즉시 응답 저장(FAQ/키워드)
      const aiInput = safeInput || '사진이 첨부되었어요. 사진 내용 설명/문의 내용을 텍스트로 적어주시면 더 정확히 도와드릴게요.';
      const ai = getAiAnswer(aiInput);
      await insertMessage(userId, 'ai', ai);

      // 4) UI 리셋
      setInput('');
      setFile(null);
      setFilePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // 실시간 구독이 있으니 fetch는 선택, 그래도 안정성 위해 1번만
      await fetchMessages(userId);
    } catch (e: any) {
      console.error('SUPPORT_SEND_ERROR', e);
      alert(e?.message ?? '전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }

  async function handleFAQClick(f: FAQ) {
    setInput(f.q);
    setTimeout(() => handleSend(), 0);
  }

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
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

          {/* ✅ FAQ는 “채팅창 쪽(본문)”에 배치 */}
          <div className="faqWrap">
            <div className="faqTitle">자주하는질문</div>
            <div className="faqChips">
              {faqChips.map((f) => (
                <button key={f.id} className="chip" onClick={() => handleFAQClick(f)}>
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
                const mine = m.role === 'user';
                const isAi = m.role === 'ai';
                const time = fmtTime(m.created_at);

                return (
                  <div key={m.id} className={'row ' + (mine ? 'right' : 'left')}>
                    <div className="msgWrap">
                      <div className="meta">
                        <span className="who">{mine ? '나' : isAi ? 'AI' : '운영자'}</span>
                        <span className="time">{time}</span>
                      </div>

                      <div className={'msg ' + (mine ? 'mine' : isAi ? 'ai' : 'admin')}>
                        {m.content}

                        {m.attachment_url ? (
                          <div className="attach">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="attachImg" src={m.attachment_url} alt="첨부 이미지" />
                            <a className="attachLink" href={m.attachment_url} target="_blank" rel="noreferrer">
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
                <button className="fileBtn" onClick={handlePickFile} type="button">
                  + 사진첨부
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

                {file ? (
                  <div className="filePill">
                    {filePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="fileThumb" src={filePreview} alt="preview" />
                    ) : (
                      <div className="fileThumb placeholder">FILE</div>
                    )}
                    <div className="fileName">{file.name}</div>
                    <button className="fileDel" type="button" onClick={clearFile}>
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
                  placeholder="질문을 입력해 주세요. Enter 전송, 줄바꿈은 Shift+Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <button
                  className={'send ' + (sending || (!input.trim() && !file) ? 'disabled' : '')}
                  type="button"
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && !file)}
                >
                  {sending ? '전송 중…' : '전송'}
                </button>
              </div>

              <div className="hint">
                운영자 답변은 관리자 페이지(/admin/support)에서 작성됩니다. 필요 시 AI가 먼저 안내하고, 운영자가 이어서 답변해요.
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
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
  border-radius:999px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(168,85,247,0.20);
  box-shadow: 0 14px 26px rgba(0,0,0,0.10);
  padding:12px 16px;
  min-height:64px;
  position:relative;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.bubble:after{
  content:'';
  position:absolute;
  right:-6px;
  top:50%;
  transform: translateY(-50%) rotate(45deg);
  width:14px; height:14px;
  background: rgba(255,255,255,0.92);
  border-right: 1px solid rgba(168,85,247,0.20);
  border-bottom: 1px solid rgba(168,85,247,0.20);
  border-radius:4px;
}
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
  font-size:16px;
  font-weight:1000;
  color:#241336;
  margin-bottom:10px;
}
.faqChips{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.chip{
  border:none;
  cursor:pointer;
  border-radius:999px;
  padding:10px 12px;
  font-size:13px;
  font-weight:950;
  color:#3a2357;
  background: rgba(245,240,255,0.92);
  border: 1px solid rgba(168,85,247,0.18);
  box-shadow: 0 10px 16px rgba(0,0,0,0.06);
}
.chip:hover{
  transform: translateY(-1px);
}

/* CHAT */
.chatBox{
  border-radius:22px;
  background: #fff;
  border: 1px solid rgba(168,85,247,0.14);
  overflow:hidden;
}
.chatScroll{
  height: 52vh;
  min-height: 360px;
  max-height: 640px;
  overflow-y:auto;
  padding:14px 12px 10px;
  display:flex;
  flex-direction:column;
  gap:12px;
  background:
    radial-gradient(800px 240px at 20% 0%, rgba(255,231,244,0.85) 0%, rgba(255,231,244,0) 60%),
    radial-gradient(800px 240px at 80% 0%, rgba(233,246,255,0.85) 0%, rgba(233,246,255,0) 60%),
    #ffffff;
}
.state{
  font-size:14px;
  font-weight:900;
  color:#7a69c4;
  padding:6px 4px;
}

.row{ display:flex; }
.row.left{ justify-content:flex-start; }
.row.right{ justify-content:flex-end; }

.msgWrap{ max-width:82%; display:flex; flex-direction:column; gap:6px; }
.meta{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.who{ font-size:12px; font-weight:1000; color:#6b46c1; }
.time{ font-size:11px; font-weight:950; color: rgba(107,70,193,0.55); }

.msg{
  border-radius:18px;
  padding:12px 12px;
  font-size:14px;
  font-weight:800;
  line-height:1.6;
  white-space:pre-line;
  border: 1px solid rgba(168,85,247,0.14);
  background: rgba(250,247,255,0.95);
  color:#241336;
}
.msg.mine{
  background: linear-gradient(135deg, rgba(255,88,171,0.92), rgba(168,85,247,0.92));
  color:#fff;
  border: 1px solid rgba(255,255,255,0.30);
  box-shadow: 0 0 16px rgba(244,114,182,0.28);
}
.msg.ai{
  background: rgba(245,240,255,0.95);
}
.msg.admin{
  background: rgba(233,246,255,0.95);
}

/* 첨부 */
.attach{
  margin-top:10px;
  border-radius:14px;
  padding:10px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.35);
}
.attachImg{
  width:100%;
  max-height:240px;
  object-fit:contain;
  border-radius:12px;
  background: rgba(0,0,0,0.04);
}
.attachLink{
  display:inline-block;
  margin-top:8px;
  font-size:12px;
  font-weight:1000;
  color:#5b21b6;
 n  text-decoration:none;
}

/* INPUT */
.inputArea{
  padding:12px;
  border-top: 1px solid rgba(168,85,247,0.12);
  background: rgba(255,255,255,0.96);
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
  border-radius:999px;
  padding:10px 12px;
  font-size:13px;
  font-weight:1000;
  color:#ff2f95;
  background: rgba(255,231,244,0.95);
  border: 1px solid rgba(244,114,182,0.22);
}
.filePill{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 10px;
  border-radius:16px;
  background: rgba(245,240,255,0.92);
  border: 1px solid rgba(168,85,247,0.16);
}
.fileThumb{
  width:36px; height:36px;
  border-radius:12px;
  object-fit:cover;
  background:#fff;
  border: 1px solid rgba(0,0,0,0.06);
}
.fileThumb.placeholder{
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  font-weight:1000;
  color:#7a69c4;
}
.fileName{
  max-width:240px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:13px;
  font-weight:950;
  color:#2b1640;
}
.fileDel{
  border:none;
  cursor:pointer;
  border-radius:999px;
  padding:8px 10px;
  font-size:12px;
  font-weight:1000;
  color:#7a69c4;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(168,85,247,0.14);
}

.inputRow{
  display:flex;
  gap:10px;
  align-items:stretch;
}
.textarea{
  flex:1;
  border-radius:18px;
  border: 1px solid rgba(168,85,247,0.20);
  background: rgba(250,247,255,0.95);
  padding:12px 12px;
  font-size:14px;
  font-weight:850;
  line-height:1.6;
  outline:none;
  color:#241336;
  resize: vertical;
}
.textarea:focus{
  border-color: rgba(255,47,149,0.55);
  box-shadow: 0 0 0 2px rgba(255,47,149,0.14);
}
.send{
  width:110px;
  border:none;
  border-radius:18px;
  cursor:pointer;
  font-size:15px;
  font-weight:1000;
  color:#fff;
  background: linear-gradient(135deg, rgba(255,47,149,0.95), rgba(168,85,247,0.95));
  box-shadow: 0 0 16px rgba(244,114,182,0.22);
}
.send.disabled{
  cursor:default;
  opacity:0.55;
  box-shadow:none;
}
.hint{
  margin-top:10px;
  font-size:12px;
  font-weight:850;
  color: rgba(43,22,64,0.60);
}

/* RESPONSIVE */
@media (max-width: 720px){
  .brandTitle{ font-size:26px; }
  .mascot{ width:118px; height:118px; }
  .chatScroll{ height: 56vh; }
  .send{ width:96px; }
}
`;
