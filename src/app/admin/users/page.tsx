'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type ProfileRow = {
  user_id: string;
  email: string | null;
  name: string | null; // 닉네임으로 쓰는 컬럼(없으면 null)
  role: string | null; // user/admin/suspended...
  created_at: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function pillCls(role?: string | null) {
  if (role === 'admin') return 'bg-pink-500/25 border-pink-200/40 text-pink-100';
  if (role === 'suspended') return 'bg-red-500/20 border-red-200/40 text-red-100';
  return 'bg-white/10 border-white/25 text-white/85';
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,email,name,role,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setRows((data as ProfileRow[]) ?? []);
    setLoading(false);
  }

  async function setRole(user_id: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('user_id', user_id);
    if (error) return alert(error.message);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const email = (r.email ?? '').toLowerCase();
      const name = (r.name ?? '').toLowerCase();
      const uid = (r.user_id ?? '').toLowerCase();
      return email.includes(s) || name.includes(s) || uid.includes(s);
    });
  }, [q, rows]);

  return (
    <main className="min-h-screen bg-[#B982FF] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[30px] font-black">회원 관리</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15"
            >
              ← 대시보드
            </button>
            <button
              onClick={load}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15"
            >
              ⟳ 새로고침
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[16px] font-extrabold text-white/85">
              총 <span className="text-pink-200 font-black">{filtered.length}</span> 명
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이메일/닉네임/UID 검색"
              className="w-full sm:w-[360px] rounded-2xl px-4 py-3 text-[16px] font-semibold text-black"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="text-[18px] font-black text-white/80">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[18px] font-black text-white/70">
              표시할 회원이 없습니다.
            </div>
          ) : (
            filtered.map((u) => (
              <div key={u.user_id} className="rounded-3xl border border-white/18 bg-white/10 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={['inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-black', pillCls(u.role)].join(' ')}>
                        {u.role ?? 'user'}
                      </span>
                      <span className="text-[18px] font-black text-white/95">
                        {u.name ? u.name : '(닉네임 없음)'}
                      </span>
                      <span className="text-[14px] font-extrabold text-white/70">
                        {u.email ?? '(이메일 없음)'}
                      </span>
                    </div>

                    <div className="mt-2 text-[13px] font-extrabold text-white/65">
                      UID: {u.user_id} {u.created_at ? `· 가입일: ${fmtDate(u.created_at)}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setRole(u.user_id, 'user')}
                      className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15"
                    >
                      일반
                    </button>
                    <button
                      onClick={() => setRole(u.user_id, 'admin')}
                      className="rounded-full border border-pink-200/40 bg-pink-500/25 px-4 py-2 text-[14px] font-black hover:bg-pink-500/35"
                    >
                      관리자
                    </button>
                    <button
                      onClick={() => setRole(u.user_id, 'suspended')}
                      className="rounded-full border border-red-200/40 bg-red-500/20 px-4 py-2 text-[14px] font-black hover:bg-red-500/30"
                    >
                      정지
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
