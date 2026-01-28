'use client';

export type ContractState = '미진행' | '진행중' | '계약1' | '취소';

export type ContractLog = {
  id: string;
  date: string;
  time: string;
  state: ContractState;
};

export default function ContractSection({
  contractState,
  setContractState,
  date,
  setDate,
  time,
  setTime,
  logs,
  addLog,
}: {
  contractState: ContractState;
  setContractState: (v: ContractState) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  logs: ContractLog[];
  addLog: () => void;
}) {
  return (
    <>
      <h4 style={{ marginTop: 16 }}>계약 관리</h4>

      <select value={contractState} onChange={(e) => setContractState(e.target.value as ContractState)}>
        <option value="미진행">미진행</option>
        <option value="진행중">진행중</option>
        <option value="계약1">계약1</option>
        <option value="취소">취소</option>
      </select>

      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <button onClick={addLog}>+ 상태 기록</button>

      {logs.map((l) => (
        <div key={l.id} style={{ fontSize: 12 }}>
          {l.date} {l.time} · {l.state}
        </div>
      ))}
    </>
  );
}
