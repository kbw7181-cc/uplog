// ✅ 파일: src/app/admin/users/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ProfileRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: string | null; // user/admin/suspended...
  created_at: string | null;
};

type WeeklyBadgeRow = {
  id: string;
  badge_code: string | null;
  badge_name: string | null;
  winner_user_id: string | null;
  week_start: string | null;
  week_end: string | null;
  created_at: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function rolePill(role?: string | null) {
  if (role === 'admin') return 'bg-pink-500/20 border-pink-300/40 text-pink-100';
  if (role === 'suspended') return 'bg-red-500/18 border-red-200/40 text-red-100';
  return 'bg-white/12 border-white/18 text-white/85';
}

function roleLabel(role?: string | null) {
  if (role === 'admin') return '관리자';
  if (role === 'suspended') return '정지';
  return '일반';
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // ✅ 배지 섹션(테이블 없거나 RLS 막혀도 UI 안 깨지게)
  const [badgeMsg, setBadgeMsg] = useState<string>(
    '배지 목록(weekly_badges)이 아직 준비되지 않았어요. (테이블/뷰 생성 또는 RLS 확인 필요)'
  );
  const [badges, setBadges] = useState<WeeklyBadgeRow[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setErr('');

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,email,name,role,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErr(`${error.code ?? 'ERR'}: ${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as ProfileRow[]) ?? []);
    setLoading(false);
  }

  async function loadBadges() {
    setLoadingBadges(true);

    const { data, error } = await supabase
      .from('weekly_badges')
      .select('id,badge_code,badge_name,winner_user_id,week_start,week_end,created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      // ✅ 테이블 없음(42P01) / 컬럼 없음(42703) / RLS 등 → 메시지만 보여주고 넘어감
      setBadges([]);
      setBadgeMsg(
        `배지 목록(weekly_badges)이 아직 준비되지 않았어요. (테이블/뷰 생성 또는 RLS 확인 필요)\n[${error.code ?? 'ERR'}] ${error.message}`
      );
      setLoadingBadges(false);
      return;
    }

    const arr = (data as WeeklyBadgeRow[]) ?? [];
    setBadges(arr);
    setBadgeMsg(arr.length ? '' : '이번 주 배지가 아직 생성되지 않았어요.');
    setLoadingBadges(false);
  }

  async function setRole(user_id: string, role: string) {
    setErr('');
    const { error } = await supabase.from('profiles').update({ role }).eq('user_id', user_id);
    if (error) {
      setErr(`${error.code ?? 'ERR'}: ${error.message}`);
      return;
    }
    await loadUsers();
  }

  useEffect(() => {
    loadBadges();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const counts = useMemo(() => {
    const admin = rows.filter((r) => r.role === 'admin').length;
    const suspended = rows.filter((r) => r.role === 'suspended').length;
    const user = rows.length - admin - suspended;
    return { all: rows.length, admin, suspended, user };
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#B982FF] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[30px] font-black tracking-tight">회원 · 배지 관리</h1>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15"
            >
              ← 대시보드
            </button>
            <button
              onClick={() => {
                loadBadges();
                loadUsers();
              }}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15"
            >
              ⟳ 새로고침
            </button>
          </div>
        </div>

        {/* 에러바 */}
        {err ? (
          <div className="mt-4 rounded-2xl border border-red-200/40 bg-red-500/18 px-4 py-3 text-[15px] font-black text-red-100 whitespace-pre-wrap">
            ⚠️ {err}
          </div>
        ) : null}

        {/* 배지 현황 */}
        <section className="mt-5 rounded-3xl border border-white/20 bg-white/10 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[22px] font-black">배지 현황</div>
              <div className="mt-1 text-[14px] font-extrabold text-white/80">
                활동지수 기반 배지(주간 TOP)를 보여줍니다.
              </div>
            </div>

            <button
              onClick={loadBadges}
              disabled={loadingBadges}
              className="w-fit rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[14px] font-black hover:bg-white/15 disabled:opacity-60"
            >
              {loadingBadges ? '불러오는 중…' : '배지 새로고침'}
            </button>
          </div>

          {badgeMsg ? (
            <div className="mt-4 rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[15px] font-black text-white/85 whitespace-pre-wrap">
              {badgeMsg}
            </div>
          ) : null}

          {badges.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {badges.map((b) => (
                <div key={b.id} className="rounded-2xl border border-white/18 bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[16px] font-black text-white/95">
                      {b.badge_name ?? b.badge_code ?? '배지'}
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-black text-white/85">
                      {b.week_start && b.week_end ? `${fmtDate(b.week_start)} ~ ${fmtDate(b.week_end)}` : '주간'}
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] font-extrabold text-white/75">
                    winner: {b.winner_user_id ? b.winner_user_id.slice(0, 8) : '(없음)'}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* 회원 리스트 */}
        <section className="mt-5 rounded-3xl border border-white/20 bg-white/10 p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[22px] font-black">회원 리스트</div>
                <div className="mt-1 text-[14px] font-extrabold text-white/80">
                  정지/복구/관리자 지정은 관리자에게만 보이며 즉시 반영됩니다.
                </div>
              </div>

              {/* ✅ 검색창 작게 + 왼쪽 정렬 + 절대 튀어나오지 않게 */}
              <div className="flex w-full justify-start sm:justify-end">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="이름/닉네임/이메일/ID"
                  className="w-full max-w-[320px] rounded-2xl px-4 py-3 text-[15px] font-bold text-black outline-none"
                />
              </div>
            </div>

            {/* 카운트 */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[13px] font-black">
                전체 {counts.all}
              </span>
              <span className="rounded-full border border-pink-200/40 bg-pink-500/20 px-3 py-1 text-[13px] font-black">
                관리자 {counts.admin}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[13px] font-black">
                일반 {counts.user}
              </span>
              <span className="rounded-full border border-red-200/40 bg-red-500/18 px-3 py-1 text-[13px] font-black">
                정지 {counts.suspended}
              </span>
              <span className="ml-auto text-[13px] font-extrabold text-white/75">
                표시: {filtered.length}명
              </span>
            </div>
          </div>
        </section>

        {/* 목록 */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-[18px] font-black text-white/80">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-[18px] font-black text-white/85">
              표시할 회원이 없습니다.
            </div>
          ) : (
            filtered.map((u) => (
              <div key={u.user_id} className="rounded-3xl border border-white/18 bg-white/10 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-black',
                          rolePill(u.role),
                        ].join(' ')}
                      >
                        {roleLabel(u.role)}
                      </span>

                      <span className="text-[18px] font-black text-white/95">
                        {u.name ? u.name : '(닉네임 없음)'}
                      </span>

                      <span className="text-[14px] font-extrabold text-white/75 break-all">
                        {u.email ?? '(이메일 없음)'}
                      </span>
                    </div>

                    <div className="mt-2 text-[13px] font-extrabold text-white/70 break-all">
                      <span className="text-white/90 font-black">회원 ID</span>: {u.user_id}{' '}
                      {u.created_at ? (
                        <>
                          <span className="mx-2 text-white/30">|</span>
                          <span className="text-white/90 font-black">가입일</span>: {fmtDate(u.created_at)}
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 text-[13px] font-extrabold text-white/70">
                      현재 상태: <span className="text-white font-black">{roleLabel(u.role)}</span>
                    </div>
                  </div>

                  {/* ✅ 버튼 한줄 + 작게 */}
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      onClick={() => setRole(u.user_id, 'admin')}
                      className="rounded-full border border-pink-200/40 bg-pink-500/22 px-4 py-2 text-[13px] font-black hover:bg-pink-500/32"
                    >
                      관리자
                    </button>
                    <button
                      onClick={() => setRole(u.user_id, 'user')}
                      className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-black hover:bg-white/15"
                    >
                      관리자 해제
                    </button>
                    <button
                      onClick={() => setRole(u.user_id, 'suspended')}
                      className="rounded-full border border-red-200/40 bg-red-500/18 px-4 py-2 text-[13px] font-black hover:bg-red-500/28"
                    >
                      정지
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-[13px] font-extrabold text-white/80">
                  ⚠️ 정지/복구가 실패하면 <span className="text-white font-black">profiles.role</span> 업데이트 RLS 정책이
                  관리자에게 열려있는지 확인이 필요합니다.
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
