'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1️⃣ 로그인 체크
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;

      if (!uid) {
        router.replace('/login'); // 로그인 안 했으면 로그인 페이지
        return;
      }

      // 2️⃣ 관리자 권한 체크
      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;

      if (p?.role !== 'admin') {
        router.replace('/home'); // 관리자 아니면 홈
        return;
      }

      // 3️⃣ 통과
      setOk(true);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#B982FF] text-white font-black text-[22px]">
        관리자 권한 확인 중…
      </div>
    );
  }

  return <>{children}</>;
}
