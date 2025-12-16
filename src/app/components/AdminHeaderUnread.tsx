'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminHeaderUnread() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          if (!alive) return;
          setIsAdmin(false);
          setCount(0);
          return;
        }

        // ✅ 관리자 판별: profiles.role === 'admin'
        // (role 컬럼 없거나 정책 막히면 try/catch로 자연스럽게 버튼 숨김)
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const admin = prof?.role === 'admin';
        if (!alive) return;
        setIsAdmin(admin);

        if (!admin) {
          setCount(0);
          return;
        }

        // ✅ 관리자일 때만 미처리(open/pending) 카운트
        const { count: c } = await supabase
          .from('supports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'pending']);

        if (!alive) return;
        setCount(typeof c === 'number' ? c : 0);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
        setCount(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ 관리자 아니면 아예 안 보임
  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition text-sm font-extrabold"
      title="관리자 페이지"
    >
      관리자페이지
      {count > 0 && (
        <span className="ml-1 min-w-[20px] h-[20px] px-1 rounded-full bg-white text-purple-700 text-xs font-extrabold grid place-items-center">
          {count}
        </span>
      )}
    </Link>
  );
}
