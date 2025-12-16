// 파일: src/app/components/TopNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Role = 'admin' | 'user' | 'suspended' | string;

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const hideTopNav =
    pathname === '/support-chat' ||
    pathname === '/support' ||
    pathname === '/rebuttal';

  const [role, setRole] = useState<Role>('user');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;

        if (!uid) {
          if (alive) {
            setRole('user');
            setReady(true);
          }
          return;
        }

        const { data: p, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', uid)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          setRole('user');
        } else {
          setRole((p as any)?.role ?? 'user');
        }
        setReady(true);
      } catch {
        if (alive) {
          setRole('user');
          setReady(true);
        }
      }
    }

    loadRole();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (hideTopNav) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="w-full sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="rounded-2xl border border-white/20 bg-white/25 backdrop-blur px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/home"
              className="font-black text-[15px] text-[#5B23FF]"
            >
              홈
            </Link>

            <div className="flex items-center gap-2">
              {ready && isAdmin ? (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 rounded-xl font-black text-[14px]
                    bg-gradient-to-r from-[#FF4FD8] to-[#B982FF]
                    text-white"
                >
                  관리자페이지
                </button>
              ) : null}

              <button
                onClick={() => router.refresh()}
                className="px-4 py-2 rounded-xl font-black text-[14px]
                  bg-white/60 text-[#5B2A86] border border-white/70"
              >
                새로고침
              </button>
            </div>
          </div>

          {ready && isAdmin ? (
            <div className="mt-2 text-[12px] font-semibold text-[#5B2A86]/70">
              ADMIN MODE
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
