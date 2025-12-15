'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminHeaderUnread() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 로그인 안 되어 있으면 그냥 0으로
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;

        // supports 테이블이 있으면 status 기준 카운트(없거나 컬럼 달라도 try/catch로 0 처리)
        const { count: c } = await supabase
          .from('supports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending']);

        if (!alive) return;
        setCount(typeof c === 'number' ? c : 0);
      } catch {
        if (!alive) return;
        setCount(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link
      href="/admin/support"
      className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition text-sm font-semibold"
      title="문의 관리"
    >
      문의
      {count > 0 && (
        <span className="ml-1 min-w-[20px] h-[20px] px-1 rounded-full bg-white text-purple-700 text-xs font-extrabold grid place-items-center">
          {count}
        </span>
      )}
    </Link>
  );
}
