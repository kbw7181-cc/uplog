'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Sender = 'user' | 'admin' | 'ai' | 'system';

type SupportMessageRow = {
  id: string;
  user_id: string;
  log_date: string | null;
  message: string | null;
  sender: string | null;
  created_at: string;
};

async function getIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}

function formatTimeKR(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const OPERATING_HOURS = '운영시간 10:00 ~ 16:00 (주말/공휴일 제외)';
const FIXED_GUIDE =
  '문의 내용을 남기면 기록이 남아요. 운영자(또는 AI)가 빠르게 확인해서 답변 드릴게요.';

const GREET_BEFORE = [
  '안녕하세요 대표님 ✨ 문의 접수 도와드릴게요.',
  '업쮸가 도착했어요 🫧 어떤 점이 불편하셨나요?',
  '오늘도 대표님의 하루를 UP! 문의 내용 확인할게요 💗',
];
const GREET_AFTER = [
  '좋아요! 접수 완료 ✅ 곧 답변으로 찾아올게요.',
  '대표님, 남겨주신 내용 확인했어요. 조금만 기다려주세요 💜',
  '오늘도 기록해주셔서 고마워요. 해결까지 함께 갈게요 🌷',
];

function makeAiReply(userText: string) {
  const t = (userText || '').trim();
  const lower = t.toLowerCase();
  const intro = pick(GREET_BEFORE);

  if (!t)
    return `${intro}\n\n메시지를 확인했어요. 상황을 한 줄만 더 알려주시면 바로 도와드릴게요 💗\n\n${pick(
      GREET_AFTER,
    )}`;

  if (lower.includes('로그인') || t.includes('회원가입') || t.includes('비밀번호')) {
    return (
      `${intro}\n\n` +
      '로그인/회원가입 관련 문의 확인했어요.\n' +
      '1) 막히는 화면(경로)\n' +
      '2) 에러 문구/스크린샷\n' +
      '3) 방금 시도한 순서\n' +
      '이 3가지만 적어주시면 더 빠르게 안내드릴게요.\n\n' +
      `${pick(GREET_AFTER)}`
    );
  }

  if (t.includes('저장') || t.includes('안됨') || t.includes('오류') || t.includes('에러')) {
    return (
      `${intro}\n\n` +
      '오류/저장 문제 접수했어요.\n' +
      '“어느 페이지에서 / 어떤 버튼을 눌렀을 때 / 콘솔 에러(또는 캡처)”를 함께 남겨주시면 해결이 빨라요.\n\n' +
      `${pick(GREET_AFTER)}`
    );
  }

  if (t.includes('신고') || t.includes('욕설') || t.includes('비방') || t.includes('도배')) {
    return (
      `${intro}\n\n` +
      '신고/주의 문의 접수 완료했어요.\n' +
      '가능하면 “상대/내용/시간/화면”을 적고, 캡처 이미지도 함께 첨부해 주세요.\n\n' +
      `${pick(GREET_AFTER)}`
    );
  }

  if (t.includes('디자인') || t.includes('색상') || t.includes('폰트') || t.includes('간격')) {
    return (
      `${intro}\n\n` +
      '디자인 요청 접수 완료 ✨\n' +
      '원하시는 느낌을 한 줄로만 적어주세요.\n' +
      '예) “더 밝게 + 글씨 크게 + 여유 넓게”\n\n' +
      `${pick(GREET_AFTER)}`
    );
  }

  return (
    `${intro}\n\n` +
    '문의 접수 완료 ✅\n' +
    '추가로 “상황(어떤 화면/기능) + 원하는 결과”를 한 줄만 더 적어주시면 더 정확하게 도와드릴게요.\n\n' +
    `${pick(GREET_AFTER)}`
  );
}

const FAQ_ITEMS = [
  {
    title: 'Q. 저장/전송이 안돼요.',
    body: 'A. 어느 페이지에서, 어떤 버튼을 눌렀을 때, 콘솔 에러 문구(또는 캡처)를 함께 남겨주세요.',
    template:
      '📌 문의유형: 저장/전송 오류\n- 발생 페이지:\n- 버튼/동작:\n- 에러 문구(캡처 가능):\n- 재현 순서:',
  },
  {
    title: 'Q. 로그인/회원가입이 막혀요.',
    body: 'A. 막히는 화면 경로 + 에러 문구 + 방금 시도한 순서를 남겨주시면 빠르게 안내드릴게요.',
    template:
      '🔐 문의유형: 로그인/회원가입\n- 막히는 화면 경로:\n- 에러 문구:\n- 방금 시도한 순서:\n- 사용 환경(PC/모바일):',
  },
  {
    title: 'Q. 디자인(색상/폰트/간격)을 바꾸고 싶어요.',
    body: 'A. “더 밝게/더 진하게”, “글씨 크게/보통”, “여유 넓게/보통”을 조합해서 한 줄로 적어주세요.',
    template:
      '🎨 문의유형: 디자인 요청\n- 더 밝게/더 진하게:\n- 글씨 크게/보통:\n- 여유 간격 넓게/보통:\n- 참고 화면(페이지):',
  },
  {
    title: 'Q. 기능 제안하고 싶어요.',
    body: 'A. “원하는 기능 + 왜 필요한지 + 기대 효과”를 3줄로 적어주시면 반영 우선순위 잡기 좋아요.',
    template:
      '💡 문의유형: 기능 제안\n- 원하는 기능:\n- 왜 필요한지:\n- 기대 효과:\n- 우선순위(높음/보통/낮음):',
  },
] as const;

const REPORT_ITEMS = [
  '욕설/비방/혐오 표현',
  '기밀/개인정보 누설(전화번호, 주소, 계정정보 등)',
  '음란/불쾌한 콘텐츠',
  '도배/스팸/광고',
  '캡처 이미지(증거) 포함 권장',
] as const;

/* ==========================
   ✅✅✅ 이미지 URL 추출/정리 (안전 강화)
   - [첨부이미지] 블록 우선
   - 라인 안 URL도 잡음
   - 이미지 확장자만
========================== */
function extractImageUrls(text: string) {
  const raw = (text || '').trim();
  if (!raw) return [];

  const out: string[] = [];

  const idx = raw.indexOf('[첨부이미지]');
  if (idx >= 0) {
    const after = raw.slice(idx + '[첨부이미지]'.length);
    const lines = after
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    for (const line of lines) {
      const matches = line.match(/https?:\/\/[^\s)]+/gi) || [];
      for (const m of matches) out.push(m);
    }
  }

  if (out.length === 0) {
    const matches = raw.match(/https?:\/\/[^\s)]+/gi) || [];
    out.push(...matches);
  }

  return Array.from(
    new Set(out.filter(u => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(u))),
  );
}

function stripImageUrls(text: string) {
  let out = (text || '');
  out = out.replace('[첨부이미지]', '');
  const urls = extractImageUrls(out);
  for (const u of urls) out = out.replaceAll(u, '');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

// ✅ Storage 버킷 이름 (대표님 프로젝트에서 없는 경우 1번만 바꾸면 끝)
const SUPPORT_BUCKET = 'support-uploads';

export default function SupportPage() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [aiAutoOn, setAiAutoOn] = useState(false);

  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [guideOpen, setGuideOpen] = useState(true);

  // ✅ 첨부 상태
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<
    { file: File; previewUrl: string; uploading: boolean; url?: string; err?: string }[]
  >([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isReady = useMemo(() => !!userId, [userId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? '');

      // nickname
      const { data: p } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle();

      setNickname((p?.nickname as string) || '');

      const admin = await getIsAdmin();
      setIsAdmin(admin);
      setAiAutoOn(admin ? true : false);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function fetchMessages(uid: string) {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('SUPPORT_FETCH_ERROR', error);
      setMessages([]);
      return;
    }
    setMessages((data || []) as SupportMessageRow[]);
  }

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
          // ✅✅✅ 타입 고정 (빨간줄/unknown 제거)
          const row = payload.new as SupportMessageRow;
          if (!row?.id) return;

          setMessages(prev => {
            const others = prev.filter(m => m.id !== row.id);
            const next = [...others, row];
            next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function pushToInput(text: string) {
    setInput(prev => {
      const base = (prev || '').trim();
      if (!base) return text;
      return base + '\n\n' + text;
    });

    window.setTimeout(() => {
      const el = document.getElementById('support-textarea') as HTMLTextAreaElement | null;
      el?.focus();
    }, 0);
  }

  async function insertMessage(sender: Sender, message: string) {
    const log_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('support_messages').insert({
      user_id: userId,
      sender,
      message,
      log_date,
    });
    if (error) throw error;
  }

  // ✅ 파일 선택 -> 미리보기 등록 (최대 3장)
  function handlePickFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).slice(0, 3);

    setAttachments(prev => {
      const next = [...prev];
      for (const f of list) {
        if (!/^image\//.test(f.type)) continue;
        if (next.length >= 3) break;
        next.push({
          file: f,
          previewUrl: URL.createObjectURL(f),
          uploading: false,
        });
      }
      return next;
    });

    if (fileRef.current) fileRef.current.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => {
      const next = [...prev];
      const item = next[idx];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      next.splice(idx, 1);
      return next;
    });
  }

  // ✅ 업로드: Storage에 올리고 public URL 생성
  async function uploadOne(file: File) {
    const ext = file.name.split('.').pop() || 'png';
    const key = `support/${userId}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(SUPPORT_BUCKET).upload(key, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type,
    });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || !isReady || sending) return;

    setSending(true);

    try {
      // 첨부 업로드
      let imageUrls: string[] = [];
      if (attachments.length > 0) {
        setAttachments(prev => prev.map(it => ({ ...it, uploading: true, err: undefined })));

        const urls: string[] = [];
        for (let i = 0; i < attachments.length; i++) {
          const f = attachments[i].file;
          try {
            const url = await uploadOne(f);
            urls.push(url);
          } catch (e: any) {
            console.error('UPLOAD_ERROR', e);
            throw new Error(
              '사진 업로드 중 오류가 발생했습니다.\n버킷 이름/권한(Storage 정책)을 확인해주세요.\n\n' +
                (e?.message || ''),
            );
          }
        }
        imageUrls = urls;
      }

      // 메시지에 이미지 URL 같이 저장
      let payload = text || '';
      if (imageUrls.length > 0) {
        payload = (payload ? payload + '\n\n' : '') + '[첨부이미지]\n' + imageUrls.join('\n');
      }

      await insertMessage('user', payload);

      setInput('');
      setAttachments(prev => {
        prev.forEach(p => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        return [];
      });

      if (aiAutoOn) {
        const reply = makeAiReply(text || '사진 첨부');
        window.setTimeout(async () => {
          try {
            await insertMessage('ai', `🤖 업쮸 AI\n\n${reply}`);
          } catch (e) {
            console.error('AI_REPLY_ERROR', e);
          }
        }, 420);
      }
    } catch (error: any) {
      alert('메시지 전송 중 오류가 발생했습니다.\n\n' + (error?.message || '알 수 없는 오류'));
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

  const displayName = nickname?.trim() ? nickname.trim() : '내 계정';

  return (
    <div className="root">
      <div className="wrap">
        {/* ===== HEADER ===== */}
        <header className="header">
          <div className="headerTop">
            <div className="brandTag">UPLOG · SUPPORT</div>
            <h1 className="title">문의하기 · 실시간 채팅</h1>

            <div className="subRow">
              <span className="subPill">{displayName}</span>
              <span className="subPill soft">{email || '이메일'}</span>

              {isAdmin && (
                <button
                  type="button"
                  className={'aiToggle' + (aiAutoOn ? ' on' : '')}
                  onClick={() => setAiAutoOn(v => !v)}
                  title="관리자만 ON/OFF 가능"
                >
                  {aiAutoOn ? 'AI 자동응대 ON' : 'AI 자동응대 OFF'}
                </button>
              )}
            </div>
          </div>

          <div className="headerBottom">
            <div className="bubbleRow">
              <div className="bubble">
                <div className="bubbleTag">문의 채팅 가이드</div>
                <p className="bubbleText">{FIXED_GUIDE}</p>
                <div className="bubbleMini">{OPERATING_HOURS}</div>
              </div>

              <img className="mascot" src="/assets/upzzu4.png" alt="업쮸" draggable={false} />
            </div>
          </div>
        </header>

        {/* ===== CHAT BOX ===== */}
        <section className="chatBox">
          <div className="chatScroll">
            {/* 가이드 버튼 */}
            <div className="guideToggleWrap">
              <button
                type="button"
                className="guideToggleBtn"
                onClick={() => setGuideOpen(v => !v)}
              >
                {guideOpen ? '가이드 접기' : '가이드 펼치기'}
              </button>
            </div>

            {guideOpen && (
              <div className="guideBox">
                <div className="guideHead">
                  <div className="guideTitle">자주 묻는 질문 · 신고 안내</div>
                  <div className="guideSub">원하시는 항목을 누르면 입력창에 자동으로 들어가요 ✨</div>
                </div>

                <div className="guideGrid">
                  <div className="guideCard">
                    <div className="cardTitle">자주 묻는 질문</div>

                    {FAQ_ITEMS.map((it, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="itemBtn"
                        onClick={() => pushToInput(it.template)}
                      >
                        <div className="q">{it.title}</div>
                        <div className="a">{it.body}</div>
                      </button>
                    ))}
                  </div>

                  <div className="guideCard warn">
                    <div className="cardTitle">신고 / 주의 안내</div>
                    <div className="desc">
                      아래 내용은 제재 대상입니다. 신고 시 “상대/시간/화면/내용”을 적고, 캡처 이미지가 있으면 함께
                      첨부해 주세요.
                    </div>

                    <div className="chips">
                      {REPORT_ITEMS.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          className="chip"
                          onClick={() =>
                            pushToInput(
                              `🚨 신고 접수\n- 사유: ${t}\n- 상대(닉네임/ID): \n- 발생 시간: \n- 발생 화면: \n- 구체 내용: \n- 캡처/증거: `,
                            )
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="dangerFill"
                      onClick={() =>
                        pushToInput(
                          '🚨 신고 접수 템플릿\n- 사유:\n- 상대(닉네임/ID):\n- 발생 시간:\n- 발생 화면:\n- 구체 내용:\n- 캡처/증거:',
                        )
                      }
                    >
                      신고 템플릿 한 번에 넣기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(loading || !isReady) && <div className="hint">채팅 내역을 불러오는 중입니다…</div>}

            {!loading && isReady && messages.length === 0 && (
              <div className="hint">아직 대화가 없습니다. 아래 입력창에 첫 문의를 남겨 주세요.</div>
            )}

            {messages.map(m => {
              const sender = (m.sender || 'user') as Sender;
              const isMine = sender === 'user';
              const isAi = sender === 'ai';
              const who = isMine ? '나' : isAi ? 'AI' : '운영자';
              const timeLabel = formatTimeKR(m.created_at);

              const text = m.message || '';
              const imgs = extractImageUrls(text);
              const pure = stripImageUrls(text);

              return (
                <div key={m.id} className={'row ' + (isMine ? 'mine' : 'theirs')}>
                  <div className="bubbleStack">
                    <div className="who">{who}</div>

                    {pure && (
                      <div className={'msg ' + (isMine ? 'msgMine' : isAi ? 'msgAi' : 'msgTheirs')}>
                        {pure}
                      </div>
                    )}

                    {imgs.length > 0 && (
                      <div className="imgGrid">
                        {imgs.map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noreferrer" className="imgCard">
                            <img src={u} alt="첨부 이미지" className="img" />
                            <div className="imgCap">이미지 보기</div>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="time">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* ===== INPUT ===== */}
        <section className="composer">
          <div className="composerTop">
            <div className="composerLabel">메시지 입력</div>
            <div className="composerGuide">Enter 전송 / Shift+Enter 줄바꿈</div>
          </div>

          <textarea
            id="support-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문의 내용을 작성하세요."
            className="textarea"
          />

          {/* 입력창 내부 첨부바 */}
          <div className="attachBar">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handlePickFiles(e.target.files)}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              className="attachBtn"
              onClick={() => fileRef.current?.click()}
              disabled={attachments.length >= 3 || sending}
              title="최대 3장"
            >
              📎 사진 첨부 ({attachments.length}/3)
            </button>

            <div className="attachHint">캡처 이미지를 첨부하면 문의가 더 빨리 해결돼요 ✨</div>
          </div>

          {/* 미리보기 */}
          {attachments.length > 0 && (
            <div className="previewRow">
              {attachments.map((a, idx) => (
                <div key={idx} className="previewCard">
                  <img src={a.previewUrl} alt="미리보기" className="previewImg" />
                  <button
                    type="button"
                    className="previewDel"
                    onClick={() => removeAttachment(idx)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composerBottom">
            <button type="button" onClick={() => router.push('/home')} className="ghostBtn">
              홈으로
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !isReady || (!input.trim() && attachments.length === 0)}
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
  background:
    radial-gradient(900px 520px at 14% 0%, rgba(255, 108, 200, 0.62), transparent 62%),
    radial-gradient(900px 520px at 86% 0%, rgba(178, 122, 255, 0.62), transparent 62%),
    radial-gradient(900px 520px at 50% 40%, rgba(255, 210, 245, 0.18), transparent 70%),
    linear-gradient(180deg, #4a0078 0%, #24004d 55%, #160038 100%);
  display:flex;
  justify-content:center;
  color:#fff;
  font-size:17px;
}
.wrap{
  width:100%;
  max-width:980px;
  display:flex;
  flex-direction:column;
  gap:14px;
}

/* HEADER */
.header{
  border-radius:30px;
  padding:24px 22px 20px;
  border:1px solid rgba(255, 210, 245, 0.22);
  box-shadow: 0 18px 55px rgba(0,0,0,0.55);
  background:
    radial-gradient(620px 260px at 20% 0%, rgba(255, 210, 245, 0.20), transparent 70%),
    radial-gradient(620px 260px at 80% 0%, rgba(220, 200, 255, 0.20), transparent 70%),
    linear-gradient(180deg, rgba(95,0,155,0.72), rgba(28,0,78,0.72));
  overflow:hidden;
}
.headerTop{ display:flex; flex-direction:column; gap:10px; }
.brandTag{
  font-size:12px;
  letter-spacing:0.35em;
  text-transform:uppercase;
  color: rgba(255, 235, 246, 0.96);
  font-weight:950;
}
.title{
  margin:0;
  font-size:25px;
  font-weight:950;
  color:#fff;
}
.subRow{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  align-items:center;
}
.subPill{
  font-size:14px;
  font-weight:950;
  padding:9px 13px;
  border-radius:999px;
  color:#fff;
  border:1px solid rgba(255, 210, 245, 0.22);
  background: rgba(255, 210, 245, 0.10);
}
.subPill.soft{
  color: rgba(255, 235, 246, 0.96);
  border:1px solid rgba(220, 200, 255, 0.24);
  background: rgba(220, 200, 255, 0.10);
}
.aiToggle{
  margin-left:auto;
  font-size:14px;
  font-weight:950;
  padding:10px 13px;
  border-radius:999px;
  border:1px solid rgba(255, 210, 245, 0.24);
  background: rgba(255, 210, 245, 0.12);
  color:#fff;
  cursor:pointer;
}
.aiToggle.on{
  border:1px solid rgba(255, 210, 245, 0.38);
  background: linear-gradient(90deg, rgba(255, 108, 200, 0.32), rgba(178, 122, 255, 0.26));
  box-shadow: 0 0 18px rgba(255,108,200,0.26);
}
.headerBottom{ margin-top:14px; display:flex; justify-content:center; }
.bubbleRow{
  width:100%;
  max-width:900px;
  padding:0 10px;
  box-sizing:border-box;
  display:flex;
  gap:16px;
  align-items:center;
  justify-content:center;
  flex-wrap:wrap;
}
.bubble{
  flex:1;
  position:relative;
  border-radius:999px;
  padding:18px 20px;
  background: rgba(255,245,255,0.96);
  border:1px solid rgba(255, 210, 245, 0.45);
  box-shadow: 0 12px 26px rgba(0,0,0,0.20);
  min-height:102px;
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
  background: rgba(255,245,255,0.96);
  border-radius:4px;
  border-right:1px solid rgba(255, 210, 245, 0.45);
  border-bottom:1px solid rgba(255, 210, 245, 0.45);
}
.bubbleTag{
  display:inline-block;
  align-self:center;
  font-size:13px;
  font-weight:950;
  padding:6px 12px;
  border-radius:999px;
  background: rgba(255, 235, 246, 0.98);
  color: rgba(255, 85, 180, 0.98);
  border:1px solid rgba(255, 210, 245, 0.35);
  margin-bottom:8px;
}
.bubbleText{
  margin:0;
  font-size:16px;
  font-weight:950;
  color:#3b0a44;
  text-align:center;
  line-height:1.6;
}
.bubbleMini{
  margin-top:10px;
  font-size:14px;
  font-weight:950;
  color:#5a1365;
  text-align:center;
  opacity:0.95;
}
.mascot{
  width:150px;
  height:150px;
  object-fit:contain;
  flex-shrink:0;
  user-select:none;
  -webkit-user-drag:none;
  filter: drop-shadow(0 12px 18px rgba(0,0,0,0.28));
  animation: floaty 2.7s ease-in-out infinite;
}
@keyframes floaty{
  0%{ transform: translateY(0) scale(1); }
  45%{ transform: translateY(-6px) scale(1.02); }
  100%{ transform: translateY(0) scale(1); }
}

/* CHAT BOX */
.chatBox{
  flex:1;
  min-height:360px;
  max-height:60vh;
  border-radius:24px;
  padding:12px;
  background:
    radial-gradient(720px 320px at 15% 0%, rgba(255, 210, 245, 0.16), transparent 70%),
    radial-gradient(720px 320px at 85% 0%, rgba(220, 200, 255, 0.16), transparent 70%),
    linear-gradient(180deg, rgba(115,0,190,0.42), rgba(40,0,110,0.42));
  border:1px solid rgba(255, 210, 245, 0.22);
  overflow:hidden;
}
.chatScroll{
  height:100%;
  overflow-y:auto;
  padding:8px 6px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.hint{
  font-size:15px;
  color: rgba(255, 235, 246, 0.92);
  padding:10px 6px;
}
.guideToggleWrap{
  position: sticky;
  top: 6px;
  z-index: 50;
  display:flex;
  justify-content:center;
  padding:6px 0 10px;
  background: linear-gradient(180deg, rgba(115,0,190,0.70), rgba(115,0,190,0.00));
  border-radius:18px;
}
.guideToggleBtn{
  width: min(520px, 92%);
  border:none;
  cursor:pointer;
  border-radius:999px;
  padding:12px 16px;
  font-weight:950;
  font-size:15px;
  color:#fff;
  background: linear-gradient(90deg, rgba(255, 108, 200, 0.98), rgba(178, 122, 255, 0.98));
  box-shadow: 0 0 22px rgba(255,108,200,0.35);
}
.guideBox{
  width:100%;
  max-width:740px;
  margin:0 auto 14px;
  border-radius:22px;
  padding:18px;
  box-sizing:border-box;
  background: linear-gradient(180deg, rgba(255,245,255,0.95), rgba(243,232,255,0.92));
  border:1px solid rgba(255, 210, 245, 0.50);
  box-shadow: 0 18px 42px rgba(0,0,0,0.18);
  color:#3b0a44;
}
.guideHead{ display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.guideTitle{ font-size:17px; font-weight:950; color:#6b21a8; }
.guideSub{ font-size:14px; font-weight:900; color:#7c3aed; opacity:0.9; }
.guideGrid{ display:grid; grid-template-columns: 1fr; gap:12px; }
.guideCard{
  border-radius:18px;
  padding:14px;
  border:1px solid rgba(124,58,237,0.16);
  background: rgba(0,0,0,0.04);
}
.guideCard.warn{
  border:1px solid rgba(255, 108, 200, 0.22);
  background: linear-gradient(180deg, rgba(255, 210, 245, 0.18), rgba(220, 200, 255, 0.14));
}
.cardTitle{ font-size:16px; font-weight:950; color:#5b21b6; margin-bottom:10px; }
.desc{ font-size:14.5px; font-weight:850; line-height:1.65; margin-bottom:10px; color:#3b0a44; }
.itemBtn{
  width:100%;
  text-align:left;
  cursor:pointer;
  border-radius:16px;
  padding:14px;
  border:1px solid rgba(124,58,237,0.12);
  background: rgba(255,255,255,0.70);
  margin-bottom:10px;
}
.q{ font-size:15.5px; font-weight:950; color:#4c1d95; }
.a{ margin-top:8px; font-size:14.5px; font-weight:850; line-height:1.65; color:#3b0a44; }
.chips{ display:flex; flex-direction:column; gap:8px; }
.chip{
  width:100%;
  text-align:left;
  cursor:pointer;
  border-radius:16px;
  padding:12px 14px;
  border:1px solid rgba(255, 108, 200, 0.18);
  background: rgba(255,255,255,0.70);
  font-size:14.5px;
  font-weight:950;
  color:#4c1d95;
}
.dangerFill{
  margin-top:10px;
  width:100%;
  border:none;
  cursor:pointer;
  border-radius:16px;
  padding:12px 14px;
  font-weight:950;
  font-size:15px;
  color:#fff;
  background: linear-gradient(90deg, rgba(255, 70, 165, 0.95), rgba(178, 90, 255, 0.95));
  box-shadow: 0 0 18px rgba(255,108,200,0.26);
}
.row{ display:flex; }
.row.mine{ justify-content:flex-end; }
.row.theirs{ justify-content:flex-start; }
.bubbleStack{
  max-width:82%;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.row.mine .bubbleStack{ align-items:flex-end; }
.row.theirs .bubbleStack{ align-items:flex-start; }
.who{
  font-size:14px;
  font-weight:950;
  color: rgba(255, 235, 246, 0.92);
}
.msg{
  border-radius:18px;
  padding:13px 14px;
  font-size:16px;
  line-height:1.7;
  white-space:pre-line;
}
.msgMine{
  color:#fff;
  background: linear-gradient(135deg, rgba(255, 108, 200, 0.98), rgba(178, 122, 255, 0.98));
  border:1px solid rgba(255, 235, 246, 0.16);
  box-shadow: 0 0 20px rgba(255,108,200,0.22);
}
.msgTheirs{
  color: rgba(255, 235, 246, 0.98);
  background: linear-gradient(180deg, rgba(220, 200, 255, 0.14), rgba(255, 210, 245, 0.10));
  border:1px solid rgba(255, 210, 245, 0.18);
  box-shadow: 0 10px 18px rgba(0,0,0,0.24);
}
.msgAi{
  color:#3b0a44;
  background: rgba(255,255,255,0.96);
  border:1px solid rgba(255, 210, 245, 0.45);
}
.time{
  font-size:13px;
  font-weight:900;
  color: rgba(255, 235, 246, 0.74);
}
.imgGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
  width: min(560px, 100%);
}
.imgCard{
  display:block;
  text-decoration:none;
  border-radius:16px;
  overflow:hidden;
  border:1px solid rgba(255, 210, 245, 0.22);
  background: rgba(0,0,0,0.12);
}
.img{
  width:100%;
  height:150px;
  object-fit:cover;
  display:block;
}
.imgCap{
  padding:10px 12px;
  font-size:14px;
  font-weight:950;
  color:#fff;
  background: linear-gradient(90deg, rgba(255,108,200,0.22), rgba(178,122,255,0.18));
}

/* COMPOSER */
.composer{
  border-radius:24px;
  padding:12px;
  background:
    radial-gradient(740px 260px at 20% 0%, rgba(255, 210, 245, 0.18), transparent 70%),
    radial-gradient(740px 260px at 80% 0%, rgba(220, 200, 255, 0.18), transparent 70%),
    linear-gradient(180deg, rgba(115,0,190,0.42), rgba(40,0,110,0.42));
  border:1px solid rgba(255, 210, 245, 0.24);
  display:flex;
  flex-direction:column;
  gap:10px;
  max-width:100%;
  overflow:hidden;
  box-sizing:border-box;
}
.composerTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}
.composerLabel{
  font-size:16px;
  font-weight:950;
  color:#fff;
}
.composerGuide{
  font-size:14px;
  font-weight:900;
  color: rgba(255, 235, 246, 0.84);
}
.textarea{
  width:100%;
  max-width:100%;
  box-sizing:border-box;
  height:64px;
  min-height:64px;
  max-height:80px;
  overflow:auto;
  border-radius:16px;
  border:1px solid rgba(255, 210, 245, 0.28);
  background: rgba(255, 210, 245, 0.08);
  color:#fff;
  font-size:16px;
  padding:10px 10px;
  resize:none;
  outline:none;
  line-height:1.7;
}
.textarea::placeholder{ color: rgba(255, 235, 246, 0.60); }
.textarea:focus{
  border-color: rgba(255, 210, 245, 0.42);
  box-shadow: 0 0 0 2px rgba(178, 122, 255, 0.18);
}
.attachBar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:10px 8px 6px;
}
.attachBtn{
  border:none;
  cursor:pointer;
  border-radius:999px;
  padding:10px 14px;
  font-weight:950;
  font-size:14px;
  color:#fff;
  background: linear-gradient(90deg, rgba(255,108,200,0.55), rgba(178,122,255,0.45));
  border:1px solid rgba(255, 210, 245, 0.22);
  box-shadow: 0 0 14px rgba(255,108,200,0.18);
}
.attachBtn:disabled{ opacity:0.55; cursor:default; }
.attachHint{
  font-size:13px;
  font-weight:900;
  color: rgba(255, 235, 246, 0.82);
  text-align:right;
}
.previewRow{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  padding:0 8px 6px;
}
.previewCard{
  position:relative;
  width:88px;
  height:88px;
  border-radius:16px;
  overflow:hidden;
  border:1px solid rgba(255, 210, 245, 0.22);
  background: rgba(0,0,0,0.12);
}
.previewImg{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.previewDel{
  position:absolute;
  top:6px;
  right:6px;
  width:26px;
  height:26px;
  border-radius:999px;
  border:none;
  cursor:pointer;
  font-weight:950;
  color:#fff;
  background: rgba(0,0,0,0.45);
  border:1px solid rgba(255, 210, 245, 0.22);
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
  background: rgba(255, 210, 245, 0.12);
  border:1px solid rgba(255, 210, 245, 0.18);
  color:#fff;
  font-weight:950;
  font-size:15px;
  cursor:pointer;
}
.sendBtn{
  border-radius:999px;
  padding:10px 18px;
  border:none;
  font-size:15px;
  font-weight:950;
  color:#fff;
  cursor:pointer;
  background: linear-gradient(90deg, rgba(255, 108, 200, 0.98), rgba(178, 122, 255, 0.98));
  box-shadow: 0 0 20px rgba(255,108,200,0.22);
}
.sendBtn:disabled{
  cursor:default;
  opacity:0.55;
  box-shadow:none;
  background: rgba(255, 210, 245, 0.14);
}
@media (max-width: 720px){
  .root{ padding:16px 10px; font-size:17px; }
  .title{ font-size:23px; }
  .mascot{ width:132px; height:132px; }
  .bubbleText{ font-size:15px; }
  .textarea{ height:60px; min-height:60px; max-height:72px; }
  .msg{ font-size:16px; }
  .header{ padding:22px 16px 16px; }
  .guideBox{ max-width:100%; }
  .guideToggleBtn{ width:92%; }
  .imgGrid{ grid-template-columns: 1fr; }
  .attachBar{ flex-direction:column; align-items:stretch; }
  .attachHint{ text-align:left; }
}
`;
