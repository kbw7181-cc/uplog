'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();

        // ✅ 찌꺼기 토큰 제거(가끔 PC에서 무한동기화 유발)
        try {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) keys.push(k);
          }
          keys.forEach((k) => {
            if (k.includes('sb-') && k.includes('-auth-token')) localStorage.removeItem(k);
          });

          const skeys: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k) skeys.push(k);
          }
          skeys.forEach((k) => {
            if (k.includes('sb-') && k.includes('-auth-token')) sessionStorage.removeItem(k);
          });
        } catch {
          // ignore
        }
      } finally {
        router.replace('/login');
      }
    })();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#B982FF] text-white font-black text-[22px]">
      로그아웃 중…
    </main>
  );
}
