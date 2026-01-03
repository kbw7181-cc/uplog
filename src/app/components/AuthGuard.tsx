'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const PUBLIC_PATHS = ['/', '/login', '/register'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // ✅ 공개 페이지는 절대 막지 않기
      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (isPublic) {
        if (mounted) setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;

      if (!hasSession) {
        router.replace('/login');
        return;
      }

      if (mounted) setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // ✅ 공개 페이지는 로딩 마스크도 없이 바로 렌더
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) return <>{children}</>;

  if (checking) {
    return (
      <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', color: '#fff', background: '#7b3bbf' }}>
        로딩중…
      </div>
    );
  }

  return <>{children}</>;
}
