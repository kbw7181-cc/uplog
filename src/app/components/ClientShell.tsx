'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ProfileMini = {
  user_id: string;
  nickname?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  address_text?: string | null;
  lat?: number | null;
  lon?: number | null;
};

function withTimeout<T>(p: Promise<T>, ms = 4500, label = 'timeout') {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label}(${ms}ms)`)), ms);
    p.then((v) => {
      window.clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      window.clearTimeout(t);
      reject(e);
    });
  });
}

const PUBLIC_PATH_PREFIXES = ['/login', '/register', '/privacy', '/support-chat'];
const PUBLIC_EXACT = ['/'];

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export const ShellContext = React.createContext<{ uid: string | null; profile: ProfileMini | null }>({
  uid: null,
  profile: null,
});

export default function ClientShell({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const actuallyRequireAuth = requireAuth && !isPublicPath(pathname);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      setChecking(true);
      setBanner(null);

      try {
        if ((supabase as any)?.__is_stub) {
          const reason = String((supabase as any)?.__reason || 'SUPABASE_STUB');
          if (!cancelled && alive.current) setBanner(reason);
          if (actuallyRequireAuth) router.replace('/login');
          return;
        }

        const userRes = await withTimeout(supabase.auth.getUser(), 4500, 'getUser');
        let user = (userRes as any)?.data?.user ?? null;

        if (!user) {
          const sessRes = await withTimeout(supabase.auth.getSession(), 4500, 'getSession');
          user = (sessRes as any)?.data?.session?.user ?? null;
        }

        if (!user) {
          if (!cancelled && alive.current) {
            setUid(null);
            setProfile(null);
          }
          if (actuallyRequireAuth) router.replace('/login');
          return;
        }

        const userId = String(user.id);
        if (!cancelled && alive.current) setUid(userId);

        try {
          const q = supabase
            .from('profiles')
            .select('user_id,nickname,name,avatar_url,role,address_text,lat,lon')
            .eq('user_id', userId)
            .maybeSingle();

          const profRes = await withTimeout(q as any, 4500, 'profiles.maybeSingle');
          const row = (profRes as any)?.data ?? null;

          if (!cancelled && alive.current) setProfile(row ? (row as ProfileMini) : { user_id: userId });
        } catch {
          if (!cancelled && alive.current) setProfile({ user_id: userId });
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        if (!cancelled && alive.current) setBanner(msg);
        if (actuallyRequireAuth) router.replace('/login');
      } finally {
        if (!cancelled && alive.current) setChecking(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, actuallyRequireAuth]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') {
        setUid(null);
        setProfile(null);
        if (actuallyRequireAuth) router.replace('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, actuallyRequireAuth]);

  const ctxValue = useMemo(() => ({ uid, profile }), [uid, profile]);

  return (
    <ShellContext.Provider value={ctxValue}>
      {children}

      {(checking || banner) && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            bottom: 12,
            zIndex: 9999,
            maxWidth: 'min(560px, 92vw)',
            padding: '10px 12px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 14px 30px rgba(0,0,0,0.12)',
            color: '#2b1a3b',
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 900 }}>
            ClientShell: path={pathname} / requireAuth={String(actuallyRequireAuth)}
          </div>
          {checking && <div style={{ marginTop: 4 }}>세션 체크 중…</div>}
          {banner && (
            <div style={{ marginTop: 4, color: '#b00020', wordBreak: 'break-word', fontWeight: 900 }}>
              {banner}
            </div>
          )}
        </div>
      )}
    </ShellContext.Provider>
  );
}
