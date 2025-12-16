'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SupportLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.replace('/login');
        return;
      }

      if (!alive) return;
      setOk(true);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#B982FF] text-white font-black text-[22px]">
        로그인 확인 중…
      </div>
    );
  }

  return <>{children}</>;
}
