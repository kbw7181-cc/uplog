// ✅ 파일: src/app/admin/users/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

type ProfileRow = {
  user_id: string;
  name: string | null;
  role: string | null;
  created_at?: string | null;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | 'admin' | 'user'>('all');

  const fetchList = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,name,role,created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('profiles fetch error', error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ProfileRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (role !== 'all') {
      list = list.filter((r) => (r.role ?? 'user') === role);
    }

    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((r) => {
      const name = (r.name ?? '').toLowerCase();
      const uid = (r.user_id ?? '').toLowerCase();
      const rr = (r.role ?? 'user').toLowerCase();
      return name.includes(s) || uid.includes(s) || rr.includes(s);
    });
  }, [rows, q, role]);

  if (loading) return null;

  return (
    <div className="bg-white/70 rounded-3xl border border-white shadow p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-3xl font-black text-[#6B2EFF]">회원 관리</div>
          <div className="text-base font-bold text-[#2C154B]/70 mt-1">
            회원 목록과 권한(role)을 확인합니다.
          </div>
        </div>

        <button
          onClick={fetchList}
          className="rounded-2xl px-4 py-3 bg-white shadow border border-[#E8DAFF] hover:border-[#CDB5FF] text-[#6B2EFF] font-extrabold"
        >
          새로고침
        </button>
      </div>

      <div className="mt-5 bg-white rounded-3xl shadow p-4 border border-white">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setRole('all')}
            className={`rounded-2xl px-4 py-2 font-extrabold border ${
              role === 'all'
                ? 'bg-[#6B2EFF] text-white border-[#6B2EFF]'
                : 'bg-white text-[#6B2EFF] border-[#E8DAFF] hover:border-[#CDB5FF]'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setRole('admin')}
            className={`rounded-2xl px-4 py-2 font-extrabold border ${
              role === 'admin'
                ? 'bg-[#FF4FD8] text-white border-[#FF4FD8]'
                : 'bg-white text-[#6B2EFF] border-[#E8DAFF] hover:border-[#CDB5FF]'
            }`}
          >
            admin
          </button>
          <button
            onClick={() => setRole('user')}
            className={`rounded-2xl px-4 py-2 font-extrabold border ${
              role === 'user'
                ? 'bg-[#49B7FF] text-white border-[#49B7FF]'
                : 'bg-white text-[#6B2EFF] border-[#E8DAFF] hover:border-[#CDB5FF]'
            }`}
          >
            user
          </button>

          <div className="flex-1" />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="닉네임/UID/role 검색"
            className="min-w-[280px] rounded-2xl px-4 py-3 bg-[#FAF7FF] border border-[#E8DAFF] outline-none text-base"
          />
        </div>

        <div className="mt-4 grid gap-3">
          {filtered.map((r) => {
            const rr = r.role ?? 'user';
            return (
              <div
                key={r.user_id}
                className="rounded-3xl p-4 border border-[#EFE7FF] bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {rr === 'admin' ? (
                    <span className="px-3 py-1 rounded-full bg-[#FF4FD8] text-white text-sm font-extrabold">
                      ADMIN
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-[#49B7FF] text-white text-sm font-extrabold">
                      USER
                    </span>
                  )}

                  <div className="text-xl font-extrabold text-[#2C154B]">
                    {r.name ?? '(닉네임 없음)'}
                  </div>

                  <div className="flex-1" />

                  <div className="text-sm font-bold text-[#2C154B]/60">
                    {r.created_at ? r.created_at.slice(0, 10) : ''}
                  </div>
                </div>

                <div className="mt-2 text-sm text-[#2C154B]/70 font-bold">
                  UID: <span className="font-mono">{r.user_id}</span>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500 font-bold">
              표시할 회원이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
