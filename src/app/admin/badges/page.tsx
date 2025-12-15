'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type BadgeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
};

type UserBadgeRow = {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
};

type ProfileRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

export default function AdminBadgesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const badgeById = useMemo(() => {
    const m = new Map<string, BadgeRow>();
    badges.forEach((b) => m.set(b.id, b));
    return m;
  }, [badges]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.replace('/login');
        return;
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', auth.user.id)
        .single();

      if (me?.role !== 'admin') {
        router.replace('/home');
        return;
      }

      await loadAll();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadAll = async () => {
    const { data: b } = await supabase
      .from('badges')
      .select('id,code,name,description,icon')
      .order('name', { ascending: true });

    const { data: ub } = await supabase
      .from('user_badges')
      .select('id,user_id,badge_id,awarded_at')
      .order('awarded_at', { ascending: false });

    setBadges((b ?? []) as BadgeRow[]);
    setUserBadges((ub ?? []) as UserBadgeRow[]);

    const userIds = Array.from(new Set((ub ?? []).map((x: any) => x.user_id)));
    if (userIds.length === 0) {
      setProfiles([]);
      return;
    }

    const { data: ps } = await supabase
      .from('profiles')
      .select('user_id,name,email,role')
      .in('user_id', userIds);

    setProfiles((ps ?? []) as ProfileRow[]);
  };

  const recalc = async () => {
    if (running) return;
    setRunning(true);
    try {
      const { error } = await supabase.rpc('recalculate_all_badges');
      if (error) {
        alert(`배지 재계산 실패: ${error.message}`);
        return;
      }
      await loadAll();
      alert('배지 재계산 완료!');
    } finally {
      setRunning(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleString('ko-KR', { hour12: false });

  const winners = useMemo(() => {
    return userBadges.map((ub) => {
      const b = badgeById.get(ub.badge_id);
      const p = profileByUserId.get(ub.user_id);
      return {
        id: ub.id,
        user_id: ub.user_id,
        awarded_at: ub.awarded_at,
        badge: b,
        profile: p,
      };
    });
  }, [userBadges, badgeById, profileByUserId]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F2FF] via-[#F7FBFF] to-white px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-[30px] font-extrabold text-[#5B2EFF]">배지 관리</h1>
            <p className="mt-1 text-[14px] text-gray-600 font-semibold">
              버튼 한 번으로 배지 초기화 + 재부여
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 rounded-xl bg-white border border-[#EDE7FF] shadow-sm text-[#5B2EFF] font-extrabold text-[14px]"
            >
              관리자 홈
            </button>

            <button
              onClick={recalc}
              disabled={running}
              className={`px-5 py-2 rounded-xl text-white font-extrabold text-[14px] shadow-sm ${
                running
                  ? 'bg-gray-300'
                  : 'bg-gradient-to-r from-[#FF4FD8] to-[#5BC0EB] hover:opacity-90'
              }`}
            >
              {running ? '재계산 중…' : '🏆 배지 재계산'}
            </button>
          </div>
        </div>

        {/* 배지 목록 */}
        <div className="bg-white/85 border border-[#EDE7FF] rounded-3xl shadow-sm p-5 mb-5">
          <div className="text-[16px] font-extrabold text-[#1F1B2E] mb-3">등록된 배지</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-[#EFE7FF] bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[20px]">{b.icon ?? '🏷️'}</div>
                  <div className="text-[16px] font-extrabold text-[#2B2B2B]">{b.name}</div>
                </div>
                <div className="mt-2 text-[12px] font-bold text-[#5B2EFF]">{b.code}</div>
                <div className="mt-1 text-[13px] text-gray-600">{b.description ?? ''}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 수여 결과 */}
        <div className="bg-white/85 border border-[#EDE7FF] rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[16px] font-extrabold text-[#1F1B2E]">현재 수여 결과</div>
            <div className="text-[13px] text-gray-500 font-semibold">총 {winners.length}건</div>
          </div>

          <div className="space-y-3">
            {winners.map((w) => {
              const b = w.badge;
              const p = w.profile;

              return (
                <div
                  key={w.id}
                  className="rounded-2xl bg-white border border-[#EFE7FF] p-4"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF4FD8] to-[#5BC0EB] text-white text-[12px] font-extrabold">
                      {b?.icon ?? '🏷️'} {b?.name ?? '(배지 없음)'}
                    </span>

                    <div className="flex-1" />

                    <div className="text-[12px] text-gray-500 font-semibold">
                      {fmt(w.awarded_at)}
                    </div>
                  </div>

                  <div className="mt-2 text-[15px] font-extrabold text-[#2B2B2B]">
                    {p?.name ?? '(이름 없음)'}{' '}
                    <span className="text-[13px] font-bold text-gray-500">
                      {p?.email ? `· ${p.email}` : ''}
                    </span>
                  </div>

                  <div className="mt-1 text-[12px] text-gray-400 break-all">
                    UID · {w.user_id}
                  </div>

                  <div className="mt-1 text-[12px] text-[#5B2EFF] font-bold">
                    {b?.code ?? ''}
                  </div>
                </div>
              );
            })}

            {winners.length === 0 && (
              <div className="py-16 text-center text-gray-400 font-semibold">
                수여된 배지가 없습니다. 위 버튼으로 재계산하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
