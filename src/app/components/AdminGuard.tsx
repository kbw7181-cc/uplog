'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';


export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          router.replace('/main');
          return;
        }

        // profiles.role === 'admin' 기준 (대표님 프로젝트 흐름)
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        const isAdmin = profile?.role === 'admin';
        if (!isAdmin) {
          router.replace('/home');
          return;
        }

        if (!alive) return;
        setOk(true);
      } catch (e) {
        // 실패하면 일단 안전하게 홈으로
        router.replace('/home');
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="px-5 py-4 rounded-2xl bg-white/10 border border-white/15">
          관리자 권한 확인 중…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
