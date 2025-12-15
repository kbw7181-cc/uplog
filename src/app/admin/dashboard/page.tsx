'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type CountBlock = {
  label: string;
  value: number;
  tone: 'pink' | 'sky' | 'violet' | 'gray';
  sub?: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [usersTotal, setUsersTotal] = useState(0);
  const [adminsTotal, setAdminsTotal] = useState(0);

  const [supportsTotal, setSupportsTotal] = useState(0);
  const [supportsOpen, setSupportsOpen] = useState(0);
  const [supportsUnread, setSupportsUnread] = useState(0);

  const [rebuttalsTotal, setRebuttalsTotal] = useState(0);
  const [postsTotal, setPostsTotal] = useState(0);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (p?.role !== 'admin') {
        router.replace('/home');
        return;
      }
    };

    checkAdmin();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // ✅ 1) 회원 수 = profiles 전체 (대표님 구조 기준)
      const users = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });

      const admins = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'admin');

      // ✅ 2) 문의 통계
      const sTotal = await supabase
        .from('supports')
        .select('id', { count: 'exact', head: true });

      const sOpen = await supabase
        .from('supports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');

      const sUnread = await supabase
        .from('supports')
        .select('id', { count: 'exact', head: true })
        .eq('is_read_admin', false);

      // ✅ 3) (있으면 카운트) 반론/커뮤니티
      // 테이블이 없을 수도 있어서 실패해도 무시하게 처리
      const safeCount = async (table: string) => {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });
        if (error) return 0;
        return count ?? 0;
      };

      const rb = await safeCount('rebuttals');
      const posts = await safeCount('community_posts');

      setUsersTotal(users.count ?? 0);
      setAdminsTotal(admins.count ?? 0);

      setSupportsTotal(sTotal.count ?? 0);
      setSupportsOpen(sOpen.count ?? 0);
      setSupportsUnread(sUnread.count ?? 0);

      setRebuttalsTotal(rb);
      setPostsTotal(posts);

      setLoading(false);
    };

    load();
  }, []);

  const blocks: CountBlock[] = useMemo(
    () => [
      { label: '회원 수', value: usersTotal, tone: 'violet', sub: 'profiles 기준' },
      { label: '관리자', value: adminsTotal, tone: 'gray', sub: 'role=admin' },
      { label: '전체 문의', value: supportsTotal, tone: 'sky' },
      { label: '진행중 문의', value: supportsOpen, tone: 'violet', sub: 'status=open' },
      { label: '미열람 문의', value: supportsUnread, tone: 'pink', sub: 'is_read_admin=false' },
      { label: '반론 자산', value: rebuttalsTotal, tone: 'gray', sub: 'rebuttals' },
      { label: '커뮤니티 글', value: postsTotal, tone: 'gray', sub: 'community_posts' },
    ],
    [usersTotal, adminsTotal, supportsTotal, supportsOpen, supportsUnread, rebuttalsTotal, postsTotal]
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FF] px-6 py-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-extrabold text-[#5B2EFF]">
            관리자 대시보드
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/support')}
              className="px-4 py-2 rounded-xl bg-[#5BC0EB] text-white font-bold"
            >
              문의 관리
            </button>
            <button
              onClick={() => location.reload()}
              className="px-4 py-2 rounded-xl bg-[#FF4FD8] text-white font-bold"
            >
              새로고침
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map((b) => (
            <CountCard key={b.label} {...b} />
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-5 shadow border border-[#EDE7FF]">
          <div className="text-[14px] font-extrabold text-[#2B2B2B] mb-2">
            바로가기
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickButton onClick={() => router.push('/admin/support')}>
              문의 목록 열기
            </QuickButton>
            <QuickButton onClick={() => router.push('/home')}>
              홈으로
            </QuickButton>
          </div>
        </div>

      </div>
    </div>
  );
}

function toneClasses(tone: 'pink' | 'sky' | 'violet' | 'gray') {
  if (tone === 'pink') return 'border-[#FF4FD8] bg-[#FFF0FB] text-[#8A0D6A]';
  if (tone === 'sky') return 'border-[#5BC0EB] bg-[#EFFBFF] text-[#0A4B66]';
  if (tone === 'violet') return 'border-[#5B2EFF] bg-[#F2EDFF] text-[#2A1B6B]';
  return 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]';
}

function CountCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: 'pink' | 'sky' | 'violet' | 'gray';
  sub?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses(tone)}`}>
      <div className="text-[14px] font-extrabold opacity-90">{label}</div>
      <div className="mt-2 text-[34px] font-extrabold leading-none">{value}</div>
      {sub ? (
        <div className="mt-2 text-[12px] opacity-80 font-semibold">{sub}</div>
      ) : null}
    </div>
  );
}

function QuickButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-[#5B2EFF] text-white font-extrabold text-[14px] hover:opacity-90"
    >
      {children}
    </button>
  );
}
