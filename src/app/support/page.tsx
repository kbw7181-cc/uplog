// src/app/support/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type ChatRole = 'user' | 'admin';

type ChatMessage = {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
};

const ADMIN_EMAIL = 'uplog@naver.com';

// ✅ 고정 가이드(대표님 스타일: 슬라이드 문구 X, 1개만)
const FIXED_GUIDE =
  '문의 내용을 남기면 기록이 남아요. 운영자(또는 AI 테스트)가 빠르게 확인해서 답변 드릴게요.';

function formatTimeKR(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeAiReply(userText: string) {
  const t = (userText || '').trim();

  // 아주 가벼운 “테스트용 AI 응대” (진짜 AI 연결 전 임시)
  const lower = t.toLowerCase();

  if (!t) return '메시지를 확인했어요. 조금만 더 자세히 알려주시면 도와드릴게요!';

  if (lower.includes('로그인') || t.includes('로그인') || t.includes('회원가입')) {
    return (
      '로그인/회원가입 관련 문의 확인했어요.\n' +
      '1) 어떤 화면에서 막히는지(경로)\n' +
      '2) 뜨는 에러 문구/스크린샷\n' +
      '3) 방금 시도한 순서\n' +
      '이 3가지만 알려주시면 더 빠르게 해결 안내 드릴게요.'
    );
  }

  if (t.includes('저장') || t.includes('안됨') || t.includes('오류') || t.includes('에러')) {
    return (
      '오류/저장 문제 확인했어요.\n' +
      '가능하면 “어느 페이지에서”, “무슨 버튼을 눌렀을 때”, “콘솔/에러 문구”를 함께 남겨주세요.\n' +
      '확인 후 해결 방법을 정리해서 답변드릴게요.'
    );
  }

  if (t.includes('디자인') || t.includes('색상') || t.includes('폰트')) {
    return (
      '디자인 요청 접수했어요 ✨\n' +
      '원하시는 느낌을 1) 더 밝게/더 진하게 2) 글씨 크게/보통 3) 카드 여유 간격 넓게/보통\n' +
      '이렇게 3개만 체크해주시면, 통일감 있게 반영해서 안내 드릴게요.'
    );
  }

  return (
    '문의 접수 완료! 👍\n' +
    '확인 후 답변드릴게요.\n' +
    '추가로 “상황(어떤 화면/기능) + 원하는 결과”를 한 줄만 더 적어주시면 더 정확하게 도와드릴 수 있어요.'
  );
}

export default function SupportPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ AI 응대 테스트(기본 ON) - 나중에 실제 AI 연결되면 끄거나 교체
  const [aiTestOn, setAiTestOn] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isReady = useMemo(() => !loadingUser && !!userId, [loadingUser, userId]);

  // 사용자 확인
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoadingUser(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        alert('로그인 후 문의 채팅을 이용하실 수 있습니다.');
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      if (user.email === ADMIN_EMAIL) setIsAdmin(true);

      setLoadingUser(false);
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, [router]);

  // 내 메시지 불러오기
  async function fetchMessages(uid: string) {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('SUPPORT_CHAT_FETCH_ERROR', error);
      setMessages([]);
    } else {
      setMessages((data || []) as ChatMessage[]);
    }
    setLoadingMessages(false);
  }

  // 실시간 구독
  useEffect(() => {
    if (!userId) return;

    fetchMessages(userId);

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
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setMessages(prev => {
              const others = prev.filter(m => m.id !== (payload.new as any).id);
              const next = [...others, payload.new as ChatMessage];
              return next.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 스크롤 자동 하단
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function insertMessage(role: ChatRole, content: string) {
    if (!userId) return;

    const { error } = await supabase.from('support_messages').insert({
      user_id: userId,
      role,
      content,
    });

    if (error) {
      console.error('SUPPORT_CHAT_INSERT_ERROR', error);
      throw error;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    try {
      await insertMessage('user', text);
      setInput('');

      // ✅ AI 응대 테스트: 사용자 메시지 직후 자동 운영자 답변(테스트)
      // - 관리자 계정은 테스트가 필요 없을 수 있어도, 원하면 켤 수 있게 그대로 둠
      if (aiTestOn) {
        const reply = makeAiReply(text);
        window.setTimeout(async () => {
          try {
            await insertMessage('admin', `🤖 업쮸 AI(테스트)\n${reply}`);
          } catch (e) {
            // 조용히 실패(테스트용)
            console.error('AI_TEST_REPLY_ERROR', e);
          }
        }, 600);
      }
    } catch (error: any) {
      alert(
        '메시지 전송 중 오류가 발생했습니다.\n\n' +
          (error?.message || '알 수 없는 오류입니다.'),
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: any) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="root">
      <div className="wrap">
        {/* ===== 헤더 ===== */}
        <header className="header">
          <div className="headerTop">
            <div className="brandTag">UPLOG · SUPPORT</div>
            <h1 className="title">문의하기 · 실시간 채팅</h1>

            <div className="subRow">
              <span className="subPill">
                {isAdmin ? '관리자 모드' : '고객 모드'}
              </span>
              <span className="subPill soft">
                {userEmail ? userEmail : '내 계정'}
              </span>

              {/* ✅ AI 테스트 토글 (대표님 테스트용) */}
              <button
                type="button"
                className={'aiToggle' + (aiTestOn ? ' on' : '')}
                onClick={() => setAiTestOn(v => !v)}
                title="AI 응대 테스트 ON/OFF"
              >
                {aiTestOn ? 'AI 응대 테스트 ON' : 'AI 응대 테스트 OFF'}
              </button>
            </div>
          </div>

          {/* ✅ 말풍선 가이드 + 마스코트(upzzu4.png) */}
          <div className="headerBottom">
            <div className="bubbleRow">
              <div className="bubble">
                <div className="bubbleTag">문의 채팅 가이드</div>
                <p className="bubbleText">{FIXED_GUIDE}</p>
              </div>

              <img
                className="mascot"
                src="/assets/upzzu4.png"
                alt="업쮸"
                draggable={false}
              />
            </div>
          </div>

          {/* 🔥 관리자에게만 보이는 TIP (실사용자에겐 안 보임) */}
          {isAdmin && (
            <div className="adminTip">
              <div className="adminTipTitle">관리자용 안내</div>
              <div className="adminTipText">
                이 박스는 관리자 계정에서만 보입니다. 고객에게는 절대 노출되지 않습니다.
                <br />
                AI 응대 테스트는 “테스트용 자동 답변”이라서, 실제 운영 시 OFF 권장.
              </div>
            </div>
          )}
        </header>

        {/* ===== 채팅 박스 ===== */}
        <section className="chatBox">
          <div className="chatScroll">
            {(!isReady || loadingMessages) && (
              <div className="hint">채팅 내역을 불러오는 중입니다…</div>
            )}

            {isReady && !loadingMessages && messages.length === 0 && (
              <div className="hint">아직 대화가 없습니다. 아래 입력창에 첫 문의를 남겨 주세요.</div>
            )}

            {messages.map(msg => {
              const isMine = msg.role === 'user';
              const timeLabel = formatTimeKR(msg.created_at);

              return (
                <div key={msg.id} className={'row ' + (isMine ? 'mine' : 'theirs')}>
                  <div className="bubbleStack">
                    <div className="who">{isMine ? '나' : '운영자'}</div>

                    <div className={'msg ' + (isMine ? 'msgMine' : 'msgTheirs')}>
                      {msg.content}
                    </div>

                    <div className="time">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* ===== 입력창 ===== */}
        <section className="composer">
          <div className="composerTop">
            <div className="composerLabel">메시지 입력</div>
            <div className="composerGuide">
              Enter 전송 / Shift+Enter 줄바꿈
            </div>
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="문의 내용을 작성하세요."
            className="textarea"
          />

          <div className="composerBottom">
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="ghostBtn"
              title="홈으로"
            >
              홈으로
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || !isReady}
              className="sendBtn"
            >
              {sending ? '전송 중…' : '전송하기'}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.root{
  min-height:100vh;
  padding:24px 12px;
  box-sizing:border-box;
  background: radial-gradient(circle at top left,#312e81 0,#020016 55%,#000 100%);
  display:flex;
  justify-content:center;
}
.wrap{
  width:100%;
  max-width:960px;
  display:flex;
  flex-direction:column;
  gap:16px;
}

/* ===== HEADER ===== */
.header{
  border-radius:26px;
  padding:18px 18px 16px;
  border:1px solid rgba(148,163,184,0.35);
  box-shadow: 0 20px 50px rgba(15,23,42,0.6);
  background: linear-gradient(180deg, rgba(10,6,24,0.92), rgba(2,0,22,0.88));
  overflow:hidden;
}
.headerTop{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.brandTag{
  font-size:11px;
  letter-spacing:0.35em;
  text-transform:uppercase;
  color:#a5b4fc;
  font-weight:800;
}
.title{
  margin:0;
  font-size:22px;
  font-weight:900;
  color:#f9fafb;
}
.subRow{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
.subPill{
  font-size:12px;
  font-weight:800;
  padding:6px 10px;
  border-radius:999px;
  color:#f9fafb;
  border:1px solid rgba(248,250,252,0.22);
  background: rgba(15,23,42,0.45);
}
.subPill.soft{
  color:#e9d5ff;
  border:1px solid rgba(168,85,247,0.28);
  background: rgba(168,85,247,0.12);
}
.aiToggle{
  margin-left:auto;
  font-size:12px;
  font-weight:900;
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(248,250,252,0.22);
  background: rgba(15,23,42,0.45);
  color:#f9fafb;
  cursor:pointer;
}
.aiToggle.on{
  border:1px solid rgba(244,114,182,0.55);
  background: linear-gradient(90deg, rgba(251,113,133,0.18), rgba(168,85,247,0.16));
  box-shadow: 0 0 14px rgba(244,114,182,0.32);
}
.aiToggle:active{ transform: scale(0.99); }

.headerBottom{
  margin-top:14px;
  display:flex;
  justify-content:center;
}
.bubbleRow{
  width:100%;
  max-width:880px;
  display:flex;
  gap:14px;
  align-items:center;
  justify-content:center;
}
.bubble{
  flex:1;
  position:relative;
  border-radius:999px;
  padding:14px 18px;
  background: rgba(255,255,255,0.96);
  border:1px solid rgba(223,202,255,0.85);
  box-shadow: 0 12px 22px rgba(0,0,0,0.22);
  min-height:78px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.bubble::after{
  content:'';
  position:absolute;
  right:-6px;
  top:50%;
  transform: translateY(-50%) rotate(45deg);
  width:14px;
  height:14px;
  background: rgba(255,255,255,0.96);
  border-radius:4px;
  border-right:1px solid rgba(223,202,255,0.85);
  border-bottom:1px solid rgba(223,202,255,0.85);
}
.bubbleTag{
  display:inline-block;
  align-self:center;
  font-size:11px;
  font-weight:900;
  padding:4px 10px;
  border-radius:999px;
  background: rgba(250,244,255,0.95);
  color:#f973b8;
  border:1px solid rgba(223,202,255,0.6);
  margin-bottom:6px;
}
.bubbleText{
  margin:0;
  font-size:14px;
  font-weight:750;
  color:#3b1b55;
  text-align:center;
  line-height:1.55;
}
.mascot{
  width:160px;
  height:160px;
  object-fit:contain;
  flex-shrink:0;
  user-select:none;
  -webkit-user-drag:none;
  filter: drop-shadow(0 12px 16px rgba(0,0,0,0.28));
  animation: floaty 2.7s ease-in-out infinite;
}
@keyframes floaty{
  0%   { transform: translateY(0) scale(1); }
  45%  { transform: translateY(-6px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}

.adminTip{
  margin-top:12px;
  border-radius:14px;
  padding:10px 12px;
  background: linear-gradient(90deg,rgba(251,113,133,0.14),rgba(168,85,247,0.12));
  border:1px solid rgba(244,114,182,0.5);
}
.adminTipTitle{
  font-size:12px;
  font-weight:900;
  color:#fecaca;
  margin-bottom:4px;
}
.adminTipText{
  font-size:12px;
  color:#e5e7eb;
  line-height:1.55;
}

/* ===== CHAT BOX ===== */
.chatBox{
  flex:1;
  min-height:360px;
  max-height:60vh;
  border-radius:20px;
  padding:12px;
  background: rgba(15,23,42,0.82);
  border:1px solid rgba(148,163,184,0.35);
  overflow:hidden;
}
.chatScroll{
  height:100%;
  overflow-y:auto;
  padding:6px 4px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.hint{
  font-size:13px;
  color:#cbd5e1;
  opacity:0.8;
  padding:8px 4px;
}

/* 메시지 행 */
.row{
  display:flex;
}
.row.mine{ justify-content:flex-end; }
.row.theirs{ justify-content:flex-start; }

.bubbleStack{
  max-width:82%;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.row.mine .bubbleStack{ align-items:flex-end; }
.row.theirs .bubbleStack{ align-items:flex-start; }

.who{
  font-size:12px;
  font-weight:800;
  color:#cbd5e1;
  opacity:0.9;
}

.msg{
  border-radius:18px;
  padding:10px 12px;
  font-size:14px;
  line-height:1.55;
  white-space:pre-line;
  color:#f9fafb;
}
.msgMine{
  background: linear-gradient(135deg,#fb7185,#a855f7);
  border:1px solid rgba(248,250,252,0.26);
  box-shadow: 0 0 14px rgba(244,114,182,0.38);
}
.msgTheirs{
  background: rgba(2,6,23,0.72);
  border:1px solid rgba(148,163,184,0.55);
  box-shadow: 0 6px 14px rgba(0,0,0,0.35);
}

.time{
  font-size:11px;
  color:#94a3b8;
  opacity:0.85;
}

/* ===== COMPOSER ===== */
.composer{
  border-radius:20px;
  padding:12px;
  background: rgba(17,24,39,0.92);
  border:1px solid rgba(148,163,184,0.45);
  display:flex;
  flex-direction:column;
  gap:10px;
}
.composerTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}
.composerLabel{
  font-size:13px;
  font-weight:900;
  color:#f9fafb;
}
.composerGuide{
  font-size:12px;
  color:#cbd5e1;
  opacity:0.85;
}
.textarea{
  width:100%;
  border-radius:14px;
  border:1px solid rgba(156,163,175,0.65);
  background: rgba(15,23,42,0.88);
  color:#f9fafb;
  font-size:14px;
  padding:10px 10px;
  resize:vertical;
  outline:none;
  line-height:1.6;
}
.textarea::placeholder{
  color: rgba(203,213,225,0.65);
}
.textarea:focus{
  border-color: rgba(168,85,247,0.75);
  box-shadow: 0 0 0 2px rgba(168,85,247,0.25);
}

.composerBottom{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}
.ghostBtn{
  border-radius:999px;
  padding:10px 14px;
  background: rgba(148,163,184,0.18);
  border:1px solid rgba(148,163,184,0.35);
  color:#e5e7eb;
  font-weight:900;
  font-size:13px;
  cursor:pointer;
}
.sendBtn{
  border-radius:999px;
  padding:10px 18px;
  border:none;
  font-size:13px;
  font-weight:900;
  color:#f9fafb;
  cursor:pointer;
  background: linear-gradient(90deg,#fb7185,#a855f7);
  box-shadow: 0 0 14px rgba(244,114,182,0.45);
}
.sendBtn:disabled{
  cursor:default;
  opacity:0.55;
  box-shadow:none;
  background: rgba(148,163,184,0.35);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 720px){
  .root{ padding:16px 10px; }
  .title{ font-size:20px; }
  .bubbleRow{ gap:12px; }
  .mascot{ width:132px; height:132px; }
  .bubbleText{ font-size:13.5px; }
}
`;
