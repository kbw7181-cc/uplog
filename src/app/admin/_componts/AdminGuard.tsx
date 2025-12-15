// ✅ 파일: src/app/admin/_components/AdminGuard.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');

      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if ((p?.role ?? 'user') !== 'admin') return router.replace('/home');

      setOk(true);
    };
    run();
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
