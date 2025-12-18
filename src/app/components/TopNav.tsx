// ✅ 파일: src/app/components/TopNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type MyProfile = {
  user_id: string;
  nickname: string | null;
  name: string | null;
  role: string | null;
};

export default function TopNav() {
  const [me, setMe] = useState<MyProfile | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        if (alive) setMe(null);
        return;
      }

      const r = await supabase
        .from('profiles')
        .select('user_id,nickname,name,role')
        .eq('user_id', uid)
        .maybeSingle();

      if (!alive) return;
      if (r.error) {
        setMe({ user_id: uid, nickname: null, name: null, role: null });
        return;
      }
      setMe((r.data as any) ?? { user_id: uid, nickname: null, name: null, role: null });
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const displayName = (me?.nickname || me?.name || '').trim() || '사용자';
  const role = (me?.role || 'user').toLowerCase();
  const isAdmin = role === 'admin';

  return (
    <div className="wrap">
      <div className="left">
        <div className="name">{displayName}</div>

        <div className="subRow">
          <span className={`pill ${isAdmin ? 'admin' : 'user'}`}>{isAdmin ? '관리자' : '일반'}</span>

          {isAdmin ? (
            <Link className="adminBtn" href="/admin">
              관리자페이지
            </Link>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .wrap{
          width:100%;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }
        .left{ min-width:0; }
        .name{
          font-size:18px;
          font-weight:950;
          color:#210a34;
          letter-spacing:-0.2px;
        }
        .subRow{
          margin-top:6px;
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }
        .pill{
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(60,30,90,0.16);
          font-weight:950;
          font-size:12px;
        }
        .pill.user{
          background: rgba(73,183,255,0.14);
          border-color: rgba(73,183,255,0.22);
          color:#1f1230;
        }
        .pill.admin{
          background: rgba(255,79,216,0.16);
          border-color: rgba(255,79,216,0.26);
          color:#2a0f3c;
        }
        .adminBtn{
          padding:8px 12px;
          border-radius:999px;
          border:1px solid rgba(255,79,216,0.26);
          background: linear-gradient(135deg, rgba(255,79,216,0.18), rgba(185,130,255,0.16));
          font-weight:950;
          color:#230b35;
          text-decoration:none;
          box-shadow: 0 12px 24px rgba(40,10,70,0.10);
          white-space:nowrap;
        }
      `}</style>
    </div>
  );
}
