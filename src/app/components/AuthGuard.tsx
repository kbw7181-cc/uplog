'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace('/login'); // ❌ 로그인 안 됐으면 무조건 튕김
        return;
      }

      if (alive) setChecking(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#B982FF] text-white text-[18px] font-black">
        인증 확인 중...
      </div>
    );
  }

  return <>{children}</>;
}
