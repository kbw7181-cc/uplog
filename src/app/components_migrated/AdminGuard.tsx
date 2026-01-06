'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  children: React.ReactNode;
};

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          router.replace('/login');
          return;
        }

        // ✅ profiles 테이블 PK = user_id (id 쓰면 400/42703 터짐)
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          router.replace('/home');
          return;
        }

        const role = prof?.role ?? 'user';
        if (role !== 'admin') {
          router.replace('/home');
          return;
        }

        if (alive) setOk(true);
      } catch {
        router.replace('/home');
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
