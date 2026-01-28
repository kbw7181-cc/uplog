export type ContractState = '미진행' | '진행중' | '계약1' | '취소';

export type ContractLog = {
  id: string;
  date: string;
  time: string;
  state: ContractState;
};

export type CustomerRow = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  memo?: string | null;
  notes_json?: {
    contractState?: ContractState;
    contractDate?: string;
    contractTime?: string;
    contractLogs?: ContractLog[];
  } | null;
  created_at?: string | null;
};
