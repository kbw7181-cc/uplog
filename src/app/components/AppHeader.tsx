'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyProfileSafe } from '@/lib/getMyProfile';

type MyProfile = {
  user_id: string;
  email?: string | null;
  nickname?: string | null;
  name?: string | null;
  role?: string | null;
  is_admin?: boolean;
  avatar_url?: string | null;
};

export default function AppHeader() {
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { profile, error } = await getMyProfileSafe();

      if (!alive) return;

      if (error) {
        console.warn('[AppHeader] profile error:', error);
        setProfile(null);
      } else {
        setProfile(profile);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const displayName =
    profile?.nickname?.trim() ||
    profile?.name?.trim() ||
    profile?.email?.split('@')[0] ||
    '사용자';

  const isAdmin = String(profile?.role ?? '').trim().toLowerCase() === 'admin';

  return (
    <header className="appHeader">
      <div className="ahInner">
        <Link href="/home" className="logo">
          UPLOG
        </Link>

        <div className="right">
          {loading ? (
            <span className="skeleton">로딩중…</span>
          ) : (
            <>
              <span className="nickname" title={displayName}>
                {displayName}
              </span>

              {isAdmin && (
                <button
                  className="adminBtn"
                  type="button"
                  onClick={() => router.push('/admin')}
                >
                  관리자
                </button>
              )}

              <button
                className="logoutBtn"
                type="button"
                onClick={async () => {
                  const { supabase } = await import('@/lib/supabaseClient');
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
              >
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .appHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: saturate(120%) blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .ahInner {
          max-width: var(--app-maxw);
          margin: 0 auto;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-weight: 900;
          letter-spacing: -0.3px;
          color: #7b3bbf;
          text-decoration: none;
        }

        .right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nickname {
          font-size: 13px;
          font-weight: 700;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .adminBtn {
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid rgba(123, 59, 191, 0.35);
          background: #fff;
          color: #7b3bbf;
          font-weight: 800;
          cursor: pointer;
        }

        .logoutBtn {
          padding: 6px 10px;
          border-radius: 10px;
          border: none;
          background: #f3f3f3;
          font-weight: 700;
          cursor: pointer;
        }

        .skeleton {
          font-size: 12px;
          color: #999;
        }
      `}</style>
    </header>
  );
}
