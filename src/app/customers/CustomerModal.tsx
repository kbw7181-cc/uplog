'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import type { CustomerRow, ContractLog, ContractState } from './contract.types';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toTimeString().slice(0, 5);
const uid = () => crypto.randomUUID();

export default function CustomerModal({
  userId,
  editing,
  onClose,
  onSaved,
}: {
  userId: string;
  editing: CustomerRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name || '');
  const [phone, setPhone] = useState(editing?.phone || '');
  const [memo, setMemo] = useState(editing?.memo || '');

  const j = editing?.notes_json || {};

  const [contractState, setContractState] = useState<ContractState>(j.contractState || '미진행');
  const [logs, setLogs] = useState<ContractLog[]>(Array.isArray(j.contractLogs) ? j.contractLogs : []);
  const [date, setDate] = useState(j.contractDate || today());
  const [time, setTime] = useState(j.contractTime || now());

  function addLog() {
    setLogs((prev) =>
      [...prev, { id: uid(), date, time, state: contractState }].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      )
    );
  }

  function removeLog(id: string) {
    setLogs((prev) => prev.filter((x) => x.id !== id));
  }

  async function save() {
    const payload: Partial<CustomerRow> & { notes_json: any } = {
      user_id: userId,
      name,
      phone,
      memo,
      notes_json: {
        contractState,
        contractDate: date,
        contractTime: time,
        contractLogs: logs,
      },
    };

    if (editing?.id) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editing.id);
      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        alert(error.message);
        return;
      }
    }

    onSaved();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 6, 18, 0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '28px 14px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          background: '#fff',
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{editing ? '고객 수정' : '고객 추가'}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              borderRadius: 10,
              padding: '8px 10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>

        <div style={{ height: 10 }} />

        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#3a2a47' }}>이름</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="고객명"
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                outline: 'none',
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#3a2a47' }}>전화</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                outline: 'none',
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#3a2a47' }}>메모</div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="상담 내용/특이사항"
              rows={4}
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                outline: 'none',
                fontWeight: 800,
                resize: 'vertical',
              }}
            />
          </label>
        </div>

        <div style={{ height: 14 }} />

        {/* ✅ 계약 섹션(모듈 분리 안 하고 모달 내부에서 처리) */}
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
            background: 'rgba(255, 80, 170, 0.05)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 950, color: '#3a1b3a', marginBottom: 10 }}>계약/상태 기록</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={contractState}
              onChange={(e) => setContractState(e.target.value as ContractState)}
              style={{
                padding: '10px 10px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                fontWeight: 900,
              }}
            >
              <option value="미진행">미진행</option>
              <option value="진행중">진행중</option>
              <option value="계약1">계약1</option>
              <option value="취소">취소</option>
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: '10px 10px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                fontWeight: 900,
              }}
            />

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                padding: '10px 10px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                fontWeight: 900,
              }}
            />

            <button
              type="button"
              onClick={addLog}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255, 80, 170, 0.35)',
                background: '#fff',
                fontWeight: 950,
                cursor: 'pointer',
              }}
            >
              + 기록
            </button>
          </div>

          <div style={{ height: 10 }} />

          {logs.length === 0 ? (
            <div style={{ fontSize: 12, fontWeight: 850, color: 'rgba(60,30,60,0.6)' }}>아직 상태 기록이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {logs.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#2c1633' }}>
                    {l.date} {l.time} · {l.state}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLog(l.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#fff',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              fontWeight: 950,
              cursor: 'pointer',
            }}
          >
            취소
          </button>

          <button
            type="button"
            onClick={save}
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255, 80, 170, 0.35)',
              background: 'linear-gradient(135deg, rgba(255,80,170,0.18), rgba(150,80,255,0.16))',
              fontWeight: 950,
              cursor: 'pointer',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
