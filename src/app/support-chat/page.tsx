// src/app/support-chat/page.tsx
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
};

const FIXED_GUIDE =
  '여기엔 문의 내용을 편하게 남겨주세요. 운영자가 순서대로 확인하고 답변해요.';

export default function SupportChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 사용자 확인
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      setLoadingUser(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        alert('로그인 후 문의 채팅을 이용하실 수 있습니다.');
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setLoadingUser(false);
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // 메시지 불러오기
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

  // 실시간 구독 + 초기 로딩
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              const next = [...prev, payload.new as ChatMessage];
              return next.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 스크롤 항상 맨 아래로
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: userId,
        role: 'user',
        content: text,
      });

      if (error) {
        console.error('SUPPORT_CHAT_SEND_ERROR', error);
        alert('메시지 전송 중 오류가 발생했습니다.');
      } else {
        setInput('');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isReady = useMemo(
    () => !loadingUser && !!userId,
    [loadingUser, userId]
  );

  return (
    <div className="root">
      <div className="inner">
        {/* ===== 헤더 (UP 채팅 + 말풍선/마스코트) ===== */}
        <header className="header">
          <div className="headerTop">
            <p className="headerTag">UPLOG · SUPPORT CHAT</p>
            <h1 className="headerTitle">UP 채팅</h1>
          </div>

          <div className="headerBottom">
            <div className="bubbleAndMascot">
              <div className="guideBubble">
                <div className="guideBubbleTop">
                  <span className="guideBubbleChip">채팅 가이드</span>
                </div>
                <p className="guideBubbleText">{FIXED_GUIDE}</p>
              </div>

              <img
                className="mascotImg"
                src="/assets/upzzu4.png"
                alt="업쮸"
                draggable={false}
              />
            </div>
          </div>
        </header>

        {/* ===== 채팅 박스 ===== */}
        <section className="chatBox">
          <div className="chatScroll">
            {(!isReady || loadingMessages) && (
              <div className="stateText">채팅 내역을 불러오는 중입니다…</div>
            )}

            {isReady && !loadingMessages && messages.length === 0 && (
              <div className="stateText">
                아직 대화가 없습니다. 아래 입력창에 첫 문의를 남겨 주세요.
              </div>
            )}

            {messages.map((msg) => {
              const isMine = msg.role === 'user';
              const timeLabel = new Date(msg.created_at).toLocaleTimeString(
                'ko-KR',
                { hour: '2-digit', minute: '2-digit' }
              );

              return (
                <div
                  key={msg.id}
                  className="row"
                  style={{ justifyContent: isMine ? 'flex-end' : 'flex-start' }}
                >
                  <div
                    className="bubbleWrap"
                    style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}
                  >
                    <span className="who">{isMine ? '나' : '운영자'}</span>

                    <div className={'bubble ' + (isMine ? 'mine' : 'admin')}>
                      {msg.content}
                    </div>

                    <span className="time">{timeLabel}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* ===== 입력창 ===== */}
        <section className="inputBox">
          <label className="inputLabel">메시지 입력</label>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="문의하실 내용을 편하게 남겨 주세요. 엔터 전송, 줄바꿈은 Shift+Enter"
            className="textarea"
          />

          <div className="inputBottom">
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending || !isReady}
              className={'sendBtn ' + (!input.trim() || sending || !isReady ? 'disabled' : '')}
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
/* =========================
   BASE
   ========================= */
.root{
  min-height:100vh;
  padding:24px 12px;
  box-sizing:border-box;
  display:flex;
  justify-content:center;
  background: linear-gradient(180deg, #ffe6f7 0%, #f5f0ff 45%, #e8f6ff 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color:#1b1030;
}
.inner{
  width:100%;
  max-width:960px;
  display:flex;
  flex-direction:column;
  gap:16px;
}

/* =========================
   HEADER
   ========================= */
.header{
  border-radius:34px;
  background: radial-gradient(circle at top left, #ff8ac8 0, #a855f7 40%, #2a1bff 100%);
  box-shadow: 0 26px 60px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.18);
  padding:22px 20px 16px;
  color:#fff;
}
.headerTop{ display:flex; flex-direction:column; gap:6px; }
.headerTag{
  font-size:11px;
  letter-spacing:0.35em;
  text-transform:uppercase;
  margin:0;
  color: rgba(255,255,255,0.88);
  font-weight:900;
}
.headerTitle{
  margin:0;
  font-size:24px;
  font-weight:950;
  letter-spacing:-0.02em;
}

/* 말풍선+업쮸 */
.headerBottom{
  margin-top:14px;
  display:flex;
  justify-content:center;
}
.bubbleAndMascot{
  width:100%;
  max-width:860px;
  display:flex;
  gap:14px;
  justify-content:center;
  align-items:center;
}

.guideBubble{
  flex:1;
  border-radius:999px;
  padding:14px 20px;
  background: rgba(255,255,255,0.97);
  color:#2b163a;
  box-shadow: 0 10px 22px rgba(0,0,0,0.18);
  border:1px solid rgba(223, 202, 255, 0.9);
  position:relative;
  min-height:78px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.guideBubble::after{
  content:'';
  position:absolute;
  right:-6px;
  top:50%;
  transform: translateY(-50%) rotate(45deg);
  width:14px;
  height:14px;
  background: rgba(255,255,255,0.97);
  border-radius:4px;
  border-right:1px solid rgba(223, 202, 255, 0.9);
  border-bottom:1px solid rgba(223, 202, 255, 0.9);
}
.guideBubbleTop{ display:flex; justify-content:center; margin-bottom:6px; }
.guideBubbleChip{
  font-size:11px;
  font-weight:900;
  padding:4px 10px;
  border-radius:999px;
  background: rgba(250, 244, 255, 0.95);
  color:#f973b8;
  border:1px solid rgba(223, 202, 255, 0.6);
}
.guideBubbleText{
  margin:0;
  font-size:14px;
  font-weight:750;
  color:#4b2966;
  text-align:center;
  line-height:1.55;
}

.mascotImg{
  width:150px;
  height:150px;
  object-fit:contain;
  flex-shrink:0;
  user-select:none;
  -webkit-user-drag:none;
  animation: upzzu-float 2.6s ease-in-out infinite;
  filter: drop-shadow(0 10px 14px rgba(0,0,0,0.18));
}
@keyframes upzzu-float{
  0%   { transform: translateY(0) scale(1); }
  45%  { transform: translateY(-6px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}

/* =========================
   CHAT BOX
   ========================= */
.chatBox{
  flex:1;
  min-height:360px;
  max-height:60vh;
  border-radius:22px;
  padding:12px;
  background:#ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.10);
  overflow:hidden;
  display:flex;
  flex-direction:column;
}
.chatScroll{
  flex:1;
  overflow-y:auto;
  padding:6px 4px 4px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.stateText{
  font-size:14px;
  color:#7a69c4;
  padding:10px 8px;
  font-weight:700;
}

/* messages */
.row{ display:flex; }
.bubbleWrap{
  max-width:80%;
  display:flex;
  flex-direction:column;
  gap:3px;
}
.who{
  font-size:11px;
  color:#7a69c4;
  font-weight:900;
}
.bubble{
  border-radius:18px;
  padding:10px 12px;
  font-size:14px;
  line-height:1.6;
  white-space:pre-line;
  color:#1b1030;
  border:1px solid #e5ddff;
  background:#faf7ff;
}
.bubble.mine{
  background: linear-gradient(135deg,#fb7185,#a855f7);
  color:#fff;
  border: 1px solid rgba(255,255,255,0.35);
  box-shadow: 0 0 14px rgba(244,114,182,0.35);
}
.bubble.admin{
  background:#ffffff;
  color:#1b1030;
}
.time{
  font-size:10px;
  color:#a78bfa;
  font-weight:900;
}

/* =========================
   INPUT
   ========================= */
.inputBox{
  border-radius:22px;
  padding:12px;
  background:#ffffff;
  border: 1px solid #e5ddff;
  box-shadow: 0 18px 32px rgba(0,0,0,0.10);
  display:flex;
  flex-direction:column;
  gap:8px;
}
.inputLabel{
  font-size:13px;
  color:#5a3cb2;
  font-weight:950;
}
.textarea{
  width:100%;
  border-radius:14px;
  border: 1px solid #d6c7ff;
  background:#faf7ff;
  color:#241336;
  font-size:14px;
  padding:10px 12px;
  resize: vertical;
  outline:none;
  line-height:1.6;
  box-sizing:border-box;
}
.textarea:focus{
  border-color:#a855f7;
  box-shadow: 0 0 0 2px rgba(168,85,247,0.20);
}
.inputBottom{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:10px;
  margin-top:2px;
}
.sendBtn{
  padding:10px 18px;
  border-radius:999px;
  border:none;
  font-size:13px;
  font-weight:950;
  cursor:pointer;
  background: linear-gradient(90deg,#fb7185,#a855f7);
  color:#fff;
  box-shadow: 0 0 14px rgba(244,114,182,0.35);
}
.sendBtn.disabled{
  cursor:default;
  background: rgba(148,163,184,0.35);
  box-shadow:none;
  color:#ffffff;
}

@media (max-width: 640px){
  .header{ padding:20px 14px 14px; border-radius:28px; }
  .headerTitle{ font-size:22px; }
  .bubbleAndMascot{ gap:10px; }
  .mascotImg{ width:128px; height:128px; }
}
`;
