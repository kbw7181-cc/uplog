'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await supabase.auth.signOut();
      router.replace('/login');
    })();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#B982FF] text-white font-black text-[22px]">
      로그아웃 중…
    </main>
  );
}
