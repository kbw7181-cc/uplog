'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  /** ✅ 대표님 관리자 이메일(여기에만 버튼 노출) */
  adminEmail?: string;
  /** ✅ 버튼 라벨 */
  label?: string;
  /** ✅ 외형 사이즈 옵션 */
  size?: 'sm' | 'md';
};

export default function AdminEntryButton({
  adminEmail = '',
  label = '관리자',
  size = 'md',
}: Props) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email ?? '';

        // ✅ 1) 이메일 매칭 우선
        if (adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase()) {
          if (alive) setShow(true);
          return;
        }

        // ✅ 2) role=admin fallback (profiles.role)
        const uid = data?.user?.id;
        if (!uid) {
          if (alive) setShow(false);
          return;
        }

        const { data: prof, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', uid)
          .maybeSingle();

        if (!error && (prof as any)?.role === 'admin') {
          if (alive) setShow(true);
          return;
        }

        if (alive) setShow(false);
      } catch {
        if (alive) setShow(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [adminEmail]);

  if (!show) return null;

  const h = size === 'sm' ? 36 : 40;
  const pad = size === 'sm' ? '0 12px' : '0 14px';
  const font = size === 'sm' ? 13 : 14;

  return (
    <button
      onClick={() => router.push('/admin')}
      style={{
        height: h,
        padding: pad,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'linear-gradient(90deg, rgba(236,72,153,0.92), rgba(168,85,247,0.92))',
        color: '#fff',
        fontWeight: 950,
        fontSize: font,
        cursor: 'pointer',
        boxShadow: '0 16px 34px rgba(168,85,247,0.22)',
        whiteSpace: 'nowrap',
      }}
      title="관리자 대시보드로 이동"
    >
      🛠 {label}
    </button>
  );
}
