'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type SupportStatus = 'open' | 'pending' | 'closed';
type TabKey = 'unread' | 'open' | 'pending' | 'closed' | 'all';
type ReadMode = 'click' | 'save'; // ✅ 클릭즉시 열람 / 저장(상태저장·답변전송) 시 열람

type SupportRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  category: string | null;
  body: string | null;
  status: SupportStatus | null;
  created_at: string | null;
  is_read_admin: boolean | null;
};

type MsgRow = {
  id: string;
  support_id: string;
  sender: string;
  message: string;
  created_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function safeStatus(s: SupportStatus | null | undefined): SupportStatus {
  if (s === 'open' || s === 'pending' || s === 'closed') return s;
  return 'open';
}

function statusLabel(s: SupportStatus) {
  if (s === 'open') return '답변중';
  if (s === 'pending') return '진행중';
  return '완료';
}

export default function AdminSupportPage() {
  const router = useRouter();

  const [rows, setRows] = useState<SupportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);

  const [tab, setTab] = useState<TabKey>('all');
  const [readMode, setReadMode] = useState<ReadMode>('save'); // ✅ 기본: 저장할 때 열람

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const [reply, setReply] = useState('');
  const [nextStatus, setNextStatus] = useState<SupportStatus>('open');

  const counts = useMemo(() => {
    const open = rows.filter((x) => safeStatus(x.status) === 'open').length;
    const pending = rows.filter((x) => safeStatus(x.status) === 'pending').length;
    const closed = rows.filter((x) => safeStatus(x.status) === 'closed').length;
    const unread = rows.filter((x) => x.is_read_admin === false).length;
    return { open, pending, closed, unread, all: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (tab === 'all') return rows;
    if (tab === 'unread') return rows.filter((x) => x.is_read_admin === false);
    if (tab === 'open') return rows.filter((x) => safeStatus(x.status) === 'open');
    if (tab === 'pending') return rows.filter((x) => safeStatus(x.status) === 'pending');
    return rows.filter((x) => safeStatus(x.status) === 'closed');
  }, [rows, tab]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedId(null);
      setMsgs([]);
      return;
    }
    if (!selectedId) {
      setSelectedId(filteredRows[0].id);
      return;
    }
    const still = filteredRows.some((x) => x.id === selectedId);
    if (!still) setSelectedId(filteredRows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filteredRows.length]);

  async function fetchList() {
    setLoadingList(true);
    setErr('');

    const { data, error } = await supabase
      .from('supports')
      .select('id,user_id,title,category,body,status,created_at,is_read_admin')
      .order('created_at', { ascending: false });

    if (error) {
      setRows([]);
      setErr(`${error.code ?? 'ERR'}: ${error.message}`);
      setLoadingList(false);
      return;
    }

    const safe = (data ?? []) as SupportRow[];
    setRows(safe);
    if (!selectedId && safe.length > 0) setSelectedId(safe[0].id);
    setLoadingList(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    const row = rows.find((x) => x.id === selectedId);
    setNextStatus(safeStatus(row?.status));
    void fetchMsgs(selectedId);

    // ✅ 클릭모드일 때만 “선택=열람 처리”
    if (readMode === 'click') void markReadAdmin(selectedId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, readMode]);

  async function fetchMsgs(id: string) {
    setLoadingDetail(true);

    const { data, error } = await supabase
      .from('support_messages')
      .select('id,support_id,sender,message,created_at')
      .eq('support_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      setMsgs([]);
      setLoadingDetail(false);
      return;
    }

    setMsgs((data ?? []) as MsgRow[]);
    setLoadingDetail(false);
  }

  async function markReadAdmin(id: string) {
    try {
      await supabase.from('supports').update({ is_read_admin: true }).eq('id', id);
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, is_read_admin: true } : x)));
    } catch {}
  }

  async function applyStatusOnly() {
    if (!selectedId) return;

    setSending(true);
    setErr('');

    const patch: any = { status: nextStatus };
    if (readMode === 'save') patch.is_read_admin = true;

    const { error } = await supabase.from('supports').update(patch).eq('id', selectedId);

    if (error) {
      setErr(`${error.code ?? 'ERR'}: ${error.message}`);
      setSending(false);
      return;
    }

    setRows((prev) =>
      prev.map((x) =>
        x.id === selectedId
          ? { ...x, status: nextStatus, is_read_admin: readMode === 'save' ? true : x.is_read_admin }
          : x
      )
    );

    await fetchList();
    if (readMode === 'save') await markReadAdmin(selectedId);

    setSending(false);
  }

  async function sendReply() {
    if (!selectedId) return;
    const text = reply.trim();
    if (!text) return;

    setSending(true);
    setErr('');

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    const adminUid = sessionData?.session?.user?.id ?? null;

    if (sessErr || !adminUid) {
      setErr('AUTH: 관리자 세션이 없습니다. 다시 로그인 후 시도하세요.');
      setSending(false);
      return;
    }

    const { error: insErr } = await supabase.from('support_messages').insert({
      support_id: selectedId,
      user_id: adminUid, // ✅ NOT NULL 만족
      sender: 'admin',
      message: text,
    });

    if (insErr) {
      setErr(`${insErr.code ?? 'ERR'}: ${insErr.message}`);
      setSending(false);
      return;
    }

    // ✅ 답변 전송은 무조건 열람 처리 + 상태도 함께 저장
    const { error: upErr } = await supabase
      .from('supports')
      .update({ status: nextStatus, is_read_admin: true })
      .eq('id', selectedId);

    if (upErr) {
      setErr(`${upErr.code ?? 'ERR'}: ${upErr.message}`);
    } else {
      setRows((prev) =>
        prev.map((x) => (x.id === selectedId ? { ...x, status: nextStatus, is_read_admin: true } : x))
      );
    }

    setReply('');
    await fetchMsgs(selectedId);
    await fetchList();
    setSending(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 22,
        background:
          'radial-gradient(1200px 800px at 20% 0%, rgba(255,79,216,.14), transparent 60%), radial-gradient(1000px 700px at 80% 10%, rgba(185,130,255,.18), transparent 55%), #f7f4ff',
        color: '#0f1020',
      }}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => router.push('/admin')}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(20,20,30,.18)',
            background: '#fff',
            fontWeight: 950,
            cursor: 'pointer',
          }}
        >
          ← 관리자 홈
        </button>
        <button
          onClick={fetchList}
          disabled={loadingList}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(20,20,30,.18)',
            background: 'linear-gradient(135deg, rgba(255,79,216,.22), rgba(185,130,255,.12))',
            fontWeight: 950,
            cursor: loadingList ? 'not-allowed' : 'pointer',
            opacity: loadingList ? 0.6 : 1,
          }}
        >
          새로고침
        </button>
      </div>

      <div style={{ fontSize: 38, fontWeight: 1000, letterSpacing: -0.6, marginBottom: 10, color: '#111' }}>
        문의 관리
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <ChipButton active={tab === 'unread'} onClick={() => setTab('unread')} label={`미열람 ${counts.unread}`} tone="warn" />
        <ChipButton active={tab === 'open'} onClick={() => setTab('open')} label={`답변중 ${counts.open}`} tone="pink" />
        <ChipButton active={tab === 'pending'} onClick={() => setTab('pending')} label={`진행중 ${counts.pending}`} tone="sky" />
        <ChipButton active={tab === 'closed'} onClick={() => setTab('closed')} label={`완료 ${counts.closed}`} tone="mint" />
        <ChipButton active={tab === 'all'} onClick={() => setTab('all')} label={`전체 ${counts.all}`} tone="white" />
      </div>

      {/* ✅ 열람 처리 방식 토글 */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 14,
          padding: 10,
          borderRadius: 14,
          border: '1px solid rgba(20,20,30,.12)',
          background: '#fff',
          boxShadow: '0 10px 24px rgba(0,0,0,.05)',
        }}
      >
        <div style={{ fontWeight: 1000, fontSize: 15, color: '#111' }}>열람 처리:</div>

        <button
          onClick={() => setReadMode('save')}
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            border: readMode === 'save' ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
            background: readMode === 'save' ? 'rgba(255,240,251,1)' : '#fff',
            fontWeight: 1000,
            cursor: 'pointer',
          }}
        >
          저장/전송 시 열람
        </button>

        <button
          onClick={() => setReadMode('click')}
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            border: readMode === 'click' ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
            background: readMode === 'click' ? 'rgba(255,240,251,1)' : '#fff',
            fontWeight: 1000,
            cursor: 'pointer',
          }}
        >
          클릭 즉시 열람
        </button>

        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 900, color: '#333' }}>
          {readMode === 'save' ? '✅ 클릭만으로는 미열람 유지' : '✅ 클릭하면 바로 열람'}
        </div>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 14,
            border: '1px solid rgba(255, 80, 120, .28)',
            background: 'rgba(255, 80, 120, .12)',
            color: '#7a0f2a',
            fontWeight: 1000,
            fontSize: 16,
            whiteSpace: 'pre-wrap',
          }}
        >
          ⚠️ ERROR: {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 14 }}>
        {/* LEFT */}
        <section
          style={{
            background: '#fff',
            border: '1px solid rgba(20,20,30,.12)',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,.06)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 10, color: '#111' }}>문의 목록</div>

          {loadingList && <div style={{ fontWeight: 900, fontSize: 16, color: '#111' }}>불러오는 중…</div>}

          {!loadingList && filteredRows.length === 0 && (
            <div
              style={{
                marginTop: 10,
                padding: 18,
                borderRadius: 14,
                border: '1px solid rgba(20,20,30,.12)',
                background: '#fff',
                fontSize: 18,
                fontWeight: 1000,
                color: '#111',
                textAlign: 'center',
              }}
            >
              해당 탭에 문의가 없습니다.
            </div>
          )}

          {!loadingList && filteredRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRows.map((r) => {
                const active = r.id === selectedId;
                const st = safeStatus(r.status);
                const unread = r.is_read_admin === false;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      textAlign: 'left',
                      border: active
                        ? '2px solid rgba(255,79,216,.65)'
                        : unread
                        ? '2px solid rgba(255,160,0,.65)'
                        : '1px solid rgba(20,20,30,.14)',
                      borderRadius: 16,
                      padding: 14,
                      background: unread ? 'rgba(255,200,90,.10)' : '#fff',
                      cursor: 'pointer',
                      boxShadow: active ? '0 10px 24px rgba(0,0,0,.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Badge status={st} />
                      {unread ? <NewBadge text="미열람" /> : <ReadBadge />}
                      <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 900, color: '#222' }}>
                        {fmt(r.created_at)}
                      </div>
                    </div>

                    <div style={{ fontSize: 19, fontWeight: 1000, color: '#111' }}>{r.title || '제목 없음'}</div>
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: '#444' }}>
                      #{r.id.slice(0, 8)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT */}
        <section
          style={{
            background: '#fff',
            border: '1px solid rgba(20,20,30,.12)',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,.06)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 10, color: '#111' }}>문의 상세</div>

          {!selected && (
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111', opacity: 0.85 }}>
              왼쪽에서 문의를 선택하세요.
            </div>
          )}

          {selected && (
            <>
              <div style={{ border: '1px solid rgba(20,20,30,.12)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 20, fontWeight: 1000, color: '#111' }}>
                    {selected.title || '제목 없음'}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge status={safeStatus(selected.status)} />
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 900, color: '#222', marginBottom: 10 }}>
                  작성일: {fmt(selected.created_at)}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: '#f7f7ff',
                    border: '1px solid rgba(20,20,30,.10)',
                    fontSize: 16,
                    fontWeight: 900,
                    color: '#111',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.55,
                  }}
                >
                  {selected.body?.trim() ? selected.body : '문의 내용이 없습니다.'}
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 1000, marginBottom: 8, color: '#111' }}>대화</div>

              <div
                style={{
                  border: '1px solid rgba(20,20,30,.12)',
                  borderRadius: 16,
                  padding: 12,
                  height: 260,
                  overflow: 'auto',
                  background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(250,249,255,1))',
                }}
              >
                {loadingDetail && <div style={{ fontWeight: 900, color: '#111' }}>불러오는 중…</div>}
                {!loadingDetail && msgs.length === 0 && (
                  <div style={{ fontWeight: 900, color: '#111', opacity: 0.8 }}>대화가 없습니다.</div>
                )}

                {!loadingDetail &&
                  msgs.map((m) => {
                    const mine = m.sender === 'admin';
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: mine ? 'flex-end' : 'flex-start',
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '85%',
                            padding: 12,
                            borderRadius: 16,
                            border: '1px solid rgba(20,20,30,.12)',
                            background: mine ? 'rgba(255,240,251,1)' : 'rgba(247,247,255,1)',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 1000, color: '#222' }}>
                            {mine ? '관리자' : '사용자'}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 16,
                              fontWeight: 900,
                              color: '#111',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.55,
                            }}
                          >
                            {m.message}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, color: '#333', textAlign: 'right' }}>
                            {fmt(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div style={{ marginTop: 12, fontSize: 16, fontWeight: 1000, color: '#111' }}>
                상태 선택 (저장/전송 시 적용)
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <StatusBtn active={nextStatus === 'open'} onClick={() => setNextStatus('open')} label="답변중" />
                <StatusBtn active={nextStatus === 'pending'} onClick={() => setNextStatus('pending')} label="진행중" />
                <StatusBtn active={nextStatus === 'closed'} onClick={() => setNextStatus('closed')} label="완료" />
              </div>

              <button
                onClick={applyStatusOnly}
                disabled={sending || !selectedId}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(20,20,30,.16)',
                  fontSize: 18,
                  fontWeight: 1000,
                  cursor: sending || !selectedId ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, rgba(73,183,255,.22), rgba(157,255,106,.12))',
                  color: '#111',
                  opacity: sending || !selectedId ? 0.55 : 1,
                }}
              >
                {sending ? '저장 중…' : '상태만 저장'}
              </button>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="관리자 답변을 입력하세요"
                style={{
                  marginTop: 10,
                  width: '100%',
                  minHeight: 120,
                  borderRadius: 16,
                  border: '1px solid rgba(20,20,30,.16)',
                  padding: 12,
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#111',
                  outline: 'none',
                  resize: 'vertical',
                  background: '#fff',
                }}
              />

              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: '1px solid rgba(20,20,30,.16)',
                  fontSize: 18,
                  fontWeight: 1000,
                  cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, rgba(255,79,216,.34), rgba(185,130,255,.16))',
                  color: '#111',
                  opacity: sending || !reply.trim() ? 0.55 : 1,
                }}
              >
                {sending ? '전송 중…' : '답변 전송'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ChipButton({
  label,
  tone,
  active,
  onClick,
}: {
  label: string;
  tone: 'warn' | 'pink' | 'sky' | 'mint' | 'white';
  active: boolean;
  onClick: () => void;
}) {
  const bg =
    tone === 'warn'
      ? 'linear-gradient(135deg, rgba(255,200,90,.65), rgba(255,120,0,.18))'
      : tone === 'pink'
      ? 'linear-gradient(135deg, rgba(255,79,216,.38), rgba(255,155,232,.16))'
      : tone === 'sky'
      ? 'linear-gradient(135deg, rgba(73,183,255,.30), rgba(143,215,255,.16))'
      : tone === 'mint'
      ? 'linear-gradient(135deg, rgba(157,255,106,.24), rgba(199,255,173,.12))'
      : 'rgba(255,255,255,.95)';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 999,
        border: active ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
        background: bg,
        fontWeight: 1000,
        color: '#111',
        fontSize: 15,
        cursor: 'pointer',
        boxShadow: active ? '0 10px 22px rgba(0,0,0,.10)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function Badge({ status }: { status: SupportStatus }) {
  const bg = status === 'closed' ? '#16a34a' : status === 'pending' ? '#2563eb' : '#f59e0b';
  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        background: bg,
        color: '#fff',
        fontWeight: 1000,
        fontSize: 13,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function NewBadge({ text }: { text: string }) {
  return (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        background: 'linear-gradient(135deg, rgba(255,200,90,.75), rgba(255,120,0,.18))',
        border: '1px solid rgba(255,200,90,.30)',
        fontWeight: 1000,
        fontSize: 12,
        color: '#111',
      }}
    >
      {text}
    </span>
  );
}

function ReadBadge() {
  return (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        background: 'rgba(60,60,80,.10)',
        border: '1px solid rgba(60,60,80,.14)',
        fontWeight: 1000,
        fontSize: 12,
        color: '#111',
      }}
    >
      열람
    </span>
  );
}

function StatusBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 999,
        border: active ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
        background: active ? 'rgba(255,240,251,1)' : '#fff',
        fontWeight: 1000,
        color: '#111',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
