'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function StatCard({
  title,
  value,
  tone,
  onClick,
  badge,
}: {
  title: string;
  value: string;
  tone: 'sky' | 'pink' | 'coral';
  onClick?: () => void;
  badge?: string;
}) {
  const toneCls =
    tone === 'sky'
      ? 'from-[#49B7FF] to-[#8FD7FF]'
      : tone === 'pink'
      ? 'from-[#FF4FD8] to-[#FF9BE8]'
      : 'from-[#FF5E7A] to-[#FF9AAE]';

  return (
    <button
      onClick={onClick}
      className={[
        'text-left w-full rounded-3xl p-6 border border-white/60 shadow-sm',
        'bg-gradient-to-r',
        toneCls,
        'hover:brightness-105 transition',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] font-extrabold text-white/95">{title}</div>
        {badge ? (
          <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-xs font-black">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-[38px] leading-none font-black text-white tracking-tight">
        {value}
      </div>
      <div className="mt-3 h-[2px] w-full bg-white/25 rounded-full" />
      <div className="mt-3 text-xs font-bold text-white/85">클릭해서 바로 이동</div>
    </button>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [userCount, setUserCount] = useState(0);
  const [supportCount, setSupportCount] = useState(0);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrMsg(null);

    try {
      // 1) 전체 회원 수
      const u = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (u.error) throw u.error;

      // 2) 전체 문의 수
      const s = await supabase.from('supports').select('*', { count: 'exact', head: true });
      if (s.error) throw s.error;

      // 3) 미열람 문의 수
      // - 1순위: is_read_admin 컬럼이 있으면 그걸 사용
      // - 2순위: 없으면 status(open/pending)로 대체
      let unread = 0;

      const un1 = await supabase
        .from('supports')
        .select('*', { count: 'exact', head: true })
        .eq('is_read_admin', false);

      if (!un1.error) {
        unread = un1.count ?? 0;
      } else {
        const un2 = await supabase
          .from('supports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending']);

        if (un2.error) throw un2.error;
        unread = un2.count ?? 0;
      }

      setUserCount(u.count ?? 0);
      setSupportCount(s.count ?? 0);
      setUnreadSupportCount(unread);
    } catch (e: any) {
      setErrMsg(e?.message ?? '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/10 border border-white/15 p-6 text-white font-bold">
        로딩 중…
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="rounded-3xl bg-white/10 border border-white/20 p-6 text-white">
        <div className="text-2xl font-black">대시보드 로드 실패</div>
        <div className="mt-2 text-sm font-bold text-white/80">
          아래 오류 문구를 그대로 보내주시면 DB/RLS까지 바로 마무리합니다.
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-4 text-sm font-semibold">
{errMsg}
        </pre>
        <button
          onClick={load}
          className="mt-4 rounded-2xl px-4 py-3 bg-white text-[#6B2EFF] font-extrabold"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/70 rounded-3xl border border-white shadow p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-3xl font-black text-[#6B2EFF]">대시보드</div>
          <div className="text-base font-bold text-[#2C154B]/70 mt-1">
            오늘 상태를 한눈에 보고 바로 처리하세요.
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-2xl px-4 py-3 bg-white shadow border border-[#E8DAFF] hover:border-[#CDB5FF] text-[#6B2EFF] font-extrabold"
        >
          새로고침
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="전체 회원 수"
          value={`${userCount} 명`}
          tone="sky"
          onClick={() => router.push('/admin/users')}
        />
        <StatCard
          title="전체 문의 수"
          value={`${supportCount} 건`}
          tone="pink"
          onClick={() => router.push('/admin/support')}
        />
        <StatCard
          title="미열람 문의"
          value={`${unreadSupportCount} 건`}
          tone="coral"
          badge={unreadSupportCount > 0 ? 'NEW' : undefined}
          onClick={() => router.push('/admin/support?tab=unread')}
        />
      </div>
    </div>
  );
}
