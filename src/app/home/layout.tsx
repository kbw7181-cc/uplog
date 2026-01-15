'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          router.replace('/login');
          return;
        }

        const user = data.user;
        const uid = user.id;

        // ✅ 1) profiles 존재 확인 (중복/에러 대비: maybeSingle)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', uid)
          .maybeSingle();

        // ✅ 2) 없으면 자동 생성(회원가입 때 RLS로 실패했어도 여기서 복구)
        if (!profile && !profileErr) {
          // 최소 필드만 넣기: 나머지는 /settings에서 채워도 됨
          const payload: any = {
            user_id: uid,
            email: user.email ?? null,
            role: 'user',
          };

          // 메타데이터가 있으면 조금 더 채움(없어도 OK)
          const meta: any = user.user_metadata || {};
          if (meta.name) payload.name = String(meta.name);
          if (meta.nickname) payload.nickname = String(meta.nickname);

          await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
        }

        if (!alive) return;
        setOk(true);
      } catch {
        router.replace('/login');
      }
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
