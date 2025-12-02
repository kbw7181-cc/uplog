// src/components/AdminGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type Props = {
  children: React.ReactNode;
};

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // 로그인 안되어 있으면 로그인 페이지로
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        console.error('admin check error', error);
        router.replace('/home');
        return;
      }

      if (!data.is_admin) {
        // 관리자 아니면 /home 으로 보내기
        router.replace('/home');
        return;
      }

      setAllowed(true);
      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        관리자 권한 확인 중입니다...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
