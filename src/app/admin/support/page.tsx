// ✅✅✅ 전체복붙: src/app/admin/support/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type SupportStatus = 'open' | 'pending' | 'closed';
type TabKey = 'unread' | 'open' | 'pending' | 'closed' | 'all';
type ReadMode = 'click' | 'save';

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
  const [readMode, setReadMode] = useState<ReadMode>('save');

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

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

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
      user_id: adminUid,
      sender: 'admin',
      message: text,
    });

    if (insErr) {
      setErr(`${insErr.code ?? 'ERR'}: ${insErr.message}`);
      setSending(false);
      return;
    }

    const { error: upErr } = await supabase
      .from('supports')
      .update({ status: nextStatus, is_read_admin: true })
      .eq('id', selectedId);

    if (upErr) {
      setErr(`${upErr.code ?? 'ERR'}: ${upErr.message}`);
    } else {
      setRows((prev) => prev.map((x) => (x.id === selectedId ? { ...x, status: nextStatus, is_read_admin: true } : x)));
    }

    setReply('');
    await fetchMsgs(selectedId);
    await fetchList();
    setSending(false);
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn ghost" onClick={() => router.push('/admin')}>
            ← 관리자 홈
          </button>
          <button className="btn soft" onClick={fetchList} disabled={loadingList}>
            {loadingList ? '새로고침…' : '새로고침'}
          </button>
        </div>

        <div className="title">
          문의 관리 <span className="title-sub">리스트는 компакт, 상세는 넓게</span>
        </div>
      </div>

      <div className="chips">
        <ChipButton active={tab === 'unread'} onClick={() => setTab('unread')} label={`미열람 ${counts.unread}`} tone="warn" />
        <ChipButton active={tab === 'open'} onClick={() => setTab('open')} label={`답변중 ${counts.open}`} tone="pink" />
        <ChipButton active={tab === 'pending'} onClick={() => setTab('pending')} label={`진행중 ${counts.pending}`} tone="sky" />
        <ChipButton active={tab === 'closed'} onClick={() => setTab('closed')} label={`완료 ${counts.closed}`} tone="mint" />
        <ChipButton active={tab === 'all'} onClick={() => setTab('all')} label={`전체 ${counts.all}`} tone="white" />
      </div>

      <div className="readmode">
        <div className="readmode-left">
          <div className="readmode-label">열람 처리</div>
          <button className={`pill ${readMode === 'save' ? 'active' : ''}`} onClick={() => setReadMode('save')}>
            저장/전송 시 열람
          </button>
          <button className={`pill ${readMode === 'click' ? 'active' : ''}`} onClick={() => setReadMode('click')}>
            클릭 즉시 열람
          </button>
        </div>

        <div className="readmode-right">{readMode === 'save' ? '✅ 클릭만으로는 미열람 유지' : '✅ 클릭하면 바로 열람'}</div>
      </div>

      {err && <div className="errbox">⚠️ ERROR: {err}</div>}

      <div className="grid">
        {/* LEFT */}
        <section className="panel listPanel">
          <div className="panelHead">
            <div className="panelTitle">문의 목록</div>
            <div className="panelHint">클릭해서 상세 확인</div>
          </div>

          {loadingList && <div className="muted">불러오는 중…</div>}
          {!loadingList && filteredRows.length === 0 && <div className="empty">해당 탭에 문의가 없습니다.</div>}

          {!loadingList && filteredRows.length > 0 && (
            <div className="list">
              {filteredRows.map((r) => {
                const active = r.id === selectedId;
                const st = safeStatus(r.status);
                const unread = r.is_read_admin === false;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`row ${active ? 'active' : ''} ${unread ? 'unread' : ''}`}
                    type="button"
                  >
                    <div className="rowTop">
                      <Badge status={st} />
                      {unread ? <NewBadge text="미열람" /> : <ReadBadge />}
                      <div className="rowTime">{fmt(r.created_at)}</div>
                    </div>

                    <div className="rowTitle">{r.title || '제목 없음'}</div>
                    <div className="rowMeta">
                      <span className="mono">#{r.id.slice(0, 8)}</span>
                      {r.category ? <span className="cat">{r.category}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT */}
        <section className="panel detailPanel">
          <div className="panelHead">
            <div className="panelTitle">문의 상세</div>
            <div className="panelHint">내용/대화/상태/답변</div>
          </div>

          {!selected && <div className="muted">왼쪽에서 문의를 선택하세요.</div>}

          {selected && (
            <>
              <div className="detailCard">
                <div className="detailTop">
                  <div className="detailTitle">{selected.title || '제목 없음'}</div>
                  <div className="detailBadge">
                    <Badge status={safeStatus(selected.status)} />
                  </div>
                </div>

                <div className="detailSub">
                  <div>작성일: {fmt(selected.created_at)}</div>
                  <div className="mono">ID: {selected.id.slice(0, 8)}</div>
                </div>

                <div className="detailBody">{selected.body?.trim() ? selected.body : '문의 내용이 없습니다.'}</div>
              </div>

              <div className="sectionTitle">대화</div>

              <div className="chatBox">
                {loadingDetail && <div className="muted">불러오는 중…</div>}
                {!loadingDetail && msgs.length === 0 && <div className="muted">대화가 없습니다.</div>}

                {!loadingDetail &&
                  msgs.map((m) => {
                    const mine = m.sender === 'admin';
                    return (
                      <div key={m.id} className={`msgRow ${mine ? 'mine' : 'other'}`}>
                        <div className="msg">
                          <div className="msgWho">{mine ? '관리자' : '사용자'}</div>
                          <div className="msgText">{m.message}</div>
                          <div className="msgTime">{fmt(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="sectionTitle">상태 선택 (저장/전송 시 적용)</div>

              <div className="statusRow">
                <StatusBtn active={nextStatus === 'open'} onClick={() => setNextStatus('open')} label="답변중" />
                <StatusBtn active={nextStatus === 'pending'} onClick={() => setNextStatus('pending')} label="진행중" />
                <StatusBtn active={nextStatus === 'closed'} onClick={() => setNextStatus('closed')} label="완료" />
              </div>

              <button className="btn wide sky" onClick={applyStatusOnly} disabled={sending || !selectedId}>
                {sending ? '저장 중…' : '상태만 저장'}
              </button>

              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="관리자 답변을 입력하세요" className="textarea" />

              <button className="btn wide pink" onClick={sendReply} disabled={sending || !reply.trim()}>
                {sending ? '전송 중…' : '답변 전송'}
              </button>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .wrap{
          min-height:100vh;
          padding:16px;
          background:
            radial-gradient(1200px 800px at 20% 0%, rgba(255,79,216,.14), transparent 60%),
            radial-gradient(1000px 700px at 80% 10%, rgba(185,130,255,.18), transparent 55%),
            #f7f4ff;
          color:#0f1020;
        }

        .topbar{
          max-width:1240px;
          margin:0 auto 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .topbar-left{display:flex;gap:8px;align-items:center;}
        .title{
          font-size:28px;
          font-weight:1000;
          letter-spacing:-0.5px;
          color:#111;
          display:flex;
          gap:10px;
          align-items:baseline;
        }
        .title-sub{
          font-size:12px;
          font-weight:900;
          color:rgba(20,20,30,.55);
        }

        .btn{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid rgba(20,20,30,.16);
          background:#fff;
          font-weight:950;
          cursor:pointer;
          color:#111;
        }
        .btn:disabled{cursor:not-allowed;opacity:.6;}
        .btn.ghost{background:rgba(255,255,255,.9);}
        .btn.soft{
          background:linear-gradient(135deg, rgba(255,79,216,.18), rgba(185,130,255,.12));
        }
        .btn.wide{
          width:100%;
          border-radius:14px;
          padding:12px 14px;
          font-size:16px;
          font-weight:1000;
        }
        .btn.wide.sky{
          background:linear-gradient(135deg, rgba(73,183,255,.22), rgba(157,255,106,.12));
        }
        .btn.wide.pink{
          background:linear-gradient(135deg, rgba(255,79,216,.28), rgba(185,130,255,.14));
        }

        .chips{
          max-width:1240px;
          margin:0 auto 10px;
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .readmode{
          max-width:1240px;
          margin:0 auto 12px;
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:space-between;
          padding:10px 12px;
          border-radius:14px;
          border:1px solid rgba(20,20,30,.12);
          background:rgba(255,255,255,.92);
          box-shadow:0 10px 24px rgba(0,0,0,.05);
          flex-wrap:wrap;
        }
        .readmode-left{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .readmode-label{font-weight:1000;font-size:13px;color:#111;margin-right:2px;}
        .pill{
          padding:8px 10px;
          border-radius:999px;
          border:1px solid rgba(20,20,30,.16);
          background:#fff;
          font-weight:1000;
          cursor:pointer;
          font-size:13px;
          color:#111;
        }
        .pill.active{
          border:2px solid rgba(255,79,216,.7);
          background:rgba(255,240,251,1);
        }
        .readmode-right{font-size:12px;font-weight:950;color:rgba(20,20,30,.7);}

        .errbox{
          max-width:1240px;
          margin:0 auto 12px;
          padding:12px;
          border-radius:14px;
          border:1px solid rgba(255,80,120,.28);
          background:rgba(255,80,120,.12);
          color:#7a0f2a;
          font-weight:1000;
          font-size:14px;
          white-space:pre-wrap;
        }

        .grid{
          max-width:1240px;
          margin:0 auto;
          display:grid;
          grid-template-columns:360px 1fr;
          gap:12px;
          align-items:start;
        }

        .panel{
          background:rgba(255,255,255,.95);
          border:1px solid rgba(20,20,30,.12);
          border-radius:18px;
          padding:12px;
          box-shadow:0 10px 30px rgba(0,0,0,.06);
        }
        .panelHead{
          display:flex;
          align-items:baseline;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
          padding-bottom:8px;
          border-bottom:1px solid rgba(20,20,30,.08);
        }
        .panelTitle{font-size:18px;font-weight:1000;color:#111;}
        .panelHint{font-size:12px;font-weight:900;color:rgba(20,20,30,.55);}

        .listPanel{
          position:sticky;
          top:12px;
          max-height:calc(100vh - 24px);
          overflow:hidden;
          display:flex;
          flex-direction:column;
        }
        .list{
          display:flex;
          flex-direction:column;
          gap:10px;
          overflow:auto;
          padding-right:2px;
        }

        .row{
          text-align:left;
          border:1px solid rgba(20,20,30,.14);
          border-radius:16px;
          padding:12px;
          background:#fff;
          cursor:pointer;
        }
        .row.unread{
          border:2px solid rgba(255,160,0,.55);
          background:rgba(255,200,90,.10);
        }
        .row.active{
          border:2px solid rgba(255,79,216,.65);
          box-shadow:0 10px 24px rgba(0,0,0,.08);
        }
        .rowTop{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
        .rowTime{
          margin-left:auto;
          font-size:11px;
          font-weight:900;
          color:rgba(20,20,30,.75);
          white-space:nowrap;
        }
        .rowTitle{
          font-size:15px;
          font-weight:1000;
          color:#111;
          line-height:1.3;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .rowMeta{
          margin-top:8px;
          display:flex;
          gap:8px;
          align-items:center;
          font-size:12px;
          font-weight:900;
          color:rgba(20,20,30,.7);
        }
        .mono{
          font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }
        .cat{
          padding:4px 8px;
          border-radius:999px;
          border:1px solid rgba(20,20,30,.12);
          background:rgba(185,130,255,.08);
          color:rgba(20,20,30,.8);
        }

        .detailPanel{min-height:420px;}

        .detailCard{
          border:1px solid rgba(20,20,30,.12);
          border-radius:16px;
          padding:12px;
          background:rgba(255,255,255,.98);
          margin-bottom:12px;
        }
        .detailTop{
          display:flex;
          gap:10px;
          align-items:flex-start;
          justify-content:space-between;
          margin-bottom:8px;
        }
        .detailTitle{
          font-size:18px;
          font-weight:1000;
          color:#111;
          line-height:1.25;
          word-break:break-word;
        }
        .detailBadge{flex:0 0 auto;margin-top:2px;}
        .detailSub{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          font-size:12px;
          font-weight:900;
          color:rgba(20,20,30,.75);
          margin-bottom:10px;
        }
        .detailBody{
          padding:12px;
          border-radius:14px;
          background:#f7f7ff;
          border:1px solid rgba(20,20,30,.10);
          font-size:14px;
          font-weight:900;
          color:#111;
          white-space:pre-wrap;
          line-height:1.6;
        }

        .sectionTitle{
          font-size:15px;
          font-weight:1000;
          margin:10px 0 8px;
          color:#111;
        }

        .chatBox{
          border:1px solid rgba(20,20,30,.12);
          border-radius:16px;
          padding:10px;
          height:280px;
          overflow:auto;
          background:linear-gradient(180deg, rgba(255,255,255,1), rgba(250,249,255,1));
        }

        /* ✅✅✅ 여기부터 "치우침" 해결 핵심 */
        .msgRow{
          display:flex;
          margin-bottom:10px;
        }
        .msgRow.mine{
          justify-content:flex-end;
          padding-left:44px;   /* 끝으로 딱 붙지 않게 */
        }
        .msgRow.other{
          justify-content:flex-start;
          padding-right:44px;  /* 반대쪽도 여백 */
        }
        .msg{
          max-width:min(640px, 92%); /* 너무 좁거나 너무 길지 않게 */
          padding:10px 12px;
          border-radius:16px;
          border:1px solid rgba(20,20,30,.12);
          background:rgba(247,247,255,1);
        }
        .msgRow.mine .msg{
          background:rgba(255,240,251,1);
        }

        .msgWho{
          font-size:11px;
          font-weight:1000;
          color:rgba(20,20,30,.85);
        }
        .msgText{
          margin-top:6px;
          font-size:14px;
          font-weight:900;
          color:#111;
          white-space:pre-wrap;
          line-height:1.55;
        }
        .msgTime{
          margin-top:8px;
          font-size:11px;
          font-weight:900;
          color:rgba(20,20,30,.75);
          text-align:right;
          white-space:nowrap;
        }
        /* ✅✅✅ 여기까지 */

        .statusRow{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:6px;
          margin-bottom:8px;
        }

        .textarea{
          margin-top:10px;
          width:100%;
          min-height:120px;
          border-radius:16px;
          border:1px solid rgba(20,20,30,.16);
          padding:12px;
          font-size:14px;
          font-weight:900;
          color:#111;
          outline:none;
          resize:vertical;
          background:#fff;
          line-height:1.55;
        }

        .muted{
          font-weight:900;
          font-size:14px;
          color:rgba(20,20,30,.75);
        }
        .empty{
          margin-top:6px;
          padding:14px;
          border-radius:14px;
          border:1px solid rgba(20,20,30,.12);
          background:#fff;
          font-size:14px;
          font-weight:1000;
          color:#111;
          text-align:center;
        }

        @media (max-width:980px){
          .grid{grid-template-columns:1fr;}
          .listPanel{position:relative;top:auto;max-height:none;}
          .chatBox{height:240px;}
          .title{font-size:24px;}
          .msgRow.mine{padding-left:28px;}
          .msgRow.other{padding-right:28px;}
          .msg{max-width:92%;}
        }
      `}</style>
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
        padding: '9px 12px',
        borderRadius: 999,
        border: active ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
        background: bg,
        fontWeight: 1000,
        color: '#111',
        fontSize: 13,
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
        padding: '6px 10px',
        borderRadius: 999,
        background: bg,
        color: '#fff',
        fontWeight: 1000,
        fontSize: 12,
        whiteSpace: 'nowrap',
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
        padding: '6px 9px',
        borderRadius: 999,
        background: 'linear-gradient(135deg, rgba(255,200,90,.75), rgba(255,120,0,.18))',
        border: '1px solid rgba(255,200,90,.30)',
        fontWeight: 1000,
        fontSize: 11,
        color: '#111',
        whiteSpace: 'nowrap',
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
        padding: '6px 9px',
        borderRadius: 999,
        background: 'rgba(60,60,80,.10)',
        border: '1px solid rgba(60,60,80,.14)',
        fontWeight: 1000,
        fontSize: 11,
        color: '#111',
        whiteSpace: 'nowrap',
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
        padding: '9px 12px',
        borderRadius: 999,
        border: active ? '2px solid rgba(255,79,216,.70)' : '1px solid rgba(20,20,30,.16)',
        background: active ? 'rgba(255,240,251,1)' : '#fff',
        fontWeight: 1000,
        color: '#111',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}
