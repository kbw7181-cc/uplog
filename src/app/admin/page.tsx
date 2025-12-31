'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ProfileRow = {
  user_id: string;
  role: string | null;
  created_at: string | null;
  grade?: string | null;
  tier?: string | null;
};

type SupportRow = {
  id: string;
  status: string | null;
  is_read_admin: boolean | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [meEmail, setMeEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [totalUsers, setTotalUsers] = useState(0);
  const [new7d, setNew7d] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [suspendedCount, setSuspendedCount] = useState(0);

  const [paid1, setPaid1] = useState(0);
  const [paid2, setPaid2] = useState(0);
  const [paid3, setPaid3] = useState(0);

  const [unreadSupport, setUnreadSupport] = useState(0);
  const [activeSupport, setActiveSupport] = useState(0);

  const [monthlyBadgeCount, setMonthlyBadgeCount] = useState(0);

  const now = useMemo(() => new Date(), []);
  const since7dISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const auth = await supabase.auth.getUser();
      setMeEmail(auth.data.user?.email ?? '');

      // 1) 회원 수/신규/role/등급
      // grade/tier 컬럼은 프로젝트마다 달라서 "있으면 집계, 없으면 0" 처리
      const prof = await supabase
        .from('profiles')
        .select('user_id,role,created_at,grade,tier')
        .order('created_at', { ascending: false });

      const profRows = ((prof.data as any[]) ?? []) as ProfileRow[];

      setTotalUsers(profRows.length);

      const new7 = profRows.filter((r) => {
        if (!r.created_at) return false;
        const t = new Date(r.created_at).toISOString();
        return t >= since7dISO;
      }).length;
      setNew7d(new7);

      const admins = profRows.filter((r) => (r.role ?? '').toLowerCase() === 'admin').length;
      const suspended = profRows.filter((r) => (r.role ?? '').toLowerCase() === 'suspended').length;
      setAdminCount(admins);
      setSuspendedCount(suspended);

      // ✅ 유료 1/2/3단계: grade 또는 tier 중 하나라도 있으면 그걸로 집계
      const pickLevel = (r: ProfileRow) => {
        const v = (r.tier ?? r.grade ?? '').toString().trim();
        // 허용 패턴: "1" "2" "3" "paid1" "유료1" 등 섞여도 최대한 맞춤
        if (v.includes('3')) return 3;
        if (v.includes('2')) return 2;
        if (v.includes('1')) return 1;
        return 0;
      };

      const p1 = profRows.filter((r) => pickLevel(r) === 1).length;
      const p2 = profRows.filter((r) => pickLevel(r) === 2).length;
      const p3 = profRows.filter((r) => pickLevel(r) === 3).length;
      setPaid1(p1);
      setPaid2(p2);
      setPaid3(p3);

      // 2) 문의: 미열람 우선(is_read_admin=false), 진행중(status open/pending)
      const sup = await supabase.from('supports').select('id,status,is_read_admin');
      const supRows = ((sup.data as any[]) ?? []) as SupportRow[];

      const unread = supRows.filter((s) => s.is_read_admin === false).length;
      const active = supRows.filter((s) => ['open', 'pending'].includes((s.status ?? '').toLowerCase())).length;
      setUnreadSupport(unread);
      setActiveSupport(active);

      // 3) 월간 배지 수
      const mb = await supabase.from('monthly_badges').select('badge_code', { count: 'exact', head: true });
      // @ts-ignore
      setMonthlyBadgeCount(mb.count ?? 0);

      setLoading(false);
    })();
  }, [since7dISO]);

  return (
    <div className="page">
      <div className="bg" />
      <div className="wrap">
        <div className="topRow">
          <div>
            <div className="title">관리자 대시보드</div>
            <div className="sub">
              관리자: <b>{meEmail || '(이메일 없음)'}</b>
            </div>
          </div>

          <div className="nav">
            <button className="navBtn" onClick={() => router.push('/admin/users')}>회원관리</button>
            <button className="navBtn" onClick={() => router.push('/admin/support')}>문의관리</button>
            <button className="navBtn" onClick={() => router.push('/admin/badges')}>배지관리</button>
            <button className="navBtn ghost" onClick={() => router.push('/home')}>홈으로</button>
          </div>
        </div>

        <div className="kpis">
          <Kpi title="전체 회원" value={totalUsers} desc="profiles 기준 전체 사용자 수" tone="pink" />
          <Kpi title="신규 가입(7일)" value={new7d} desc="최근 7일 생성된 계정" tone="purple" />
          <Kpi title="미열람 문의" value={unreadSupport} desc="is_read_admin=false 우선" tone="yellow" onClick={() => router.push('/admin/support?tab=unread')} />
          <Kpi title="진행중 문의" value={activeSupport} desc="status=open/pending" tone="blue" onClick={() => router.push('/admin/support')} />

          <Kpi title="유료 1단계" value={paid1} desc="grade/tier 기반(없으면 0)" tone="mint" />
          <Kpi title="유료 2단계" value={paid2} desc="grade/tier 기반(없으면 0)" tone="mint2" />
          <Kpi title="유료 3단계" value={paid3} desc="grade/tier 기반(없으면 0)" tone="mint3" />
          <Kpi title="월간 배지" value={monthlyBadgeCount} desc="monthly_badges 레코드 수" tone="violet" />
        </div>

        <div className="bigCards">
          <BigCard title="회원 리스트" desc="검색/정보/정지/복구/권한(관리자)" onClick={() => router.push('/admin/users')} />
          <BigCard title="최근 문의" desc="미열람/답변/상태(open→pending→closed)" onClick={() => router.push('/admin/support')} />
          <BigCard title="배지/활동량" desc="일정·활동·실적 기반 배지 부여/확인" onClick={() => router.push('/admin/badges')} />
        </div>

        {loading ? <div className="loading">불러오는 중…</div> : null}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function Kpi({
  title,
  value,
  desc,
  tone,
  onClick,
}: {
  title: string;
  value: number;
  desc: string;
  tone: 'pink' | 'purple' | 'yellow' | 'blue' | 'mint' | 'mint2' | 'mint3' | 'violet';
  onClick?: () => void;
}) {
  return (
    <div className={`kpi ${tone} ${onClick ? 'click' : ''}`} onClick={onClick}>
      <div className="kTop">
        <div className="kTitle">{title}</div>
        <div className="live">LIVE</div>
      </div>
      <div className="kVal">{value}</div>
      <div className="kDesc">{desc}</div>
    </div>
  );
}

function BigCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <div className="big" onClick={onClick}>
      <div>
        <div className="bTitle">{title}</div>
        <div className="bDesc">{desc}</div>
      </div>
      <button className="open">열기</button>
    </div>
  );
}

const styles = `
.page{
  position:relative;
  min-height:100vh;
  background:#f7f3ff;
  color:#111;
}
.bg{
  position:absolute; inset:0;
  background:
    radial-gradient(1200px 700px at 12% 15%, rgba(255,160,220,0.35), transparent 60%),
    radial-gradient(1200px 700px at 80% 20%, rgba(170,160,255,0.35), transparent 60%),
    linear-gradient(180deg, #fbf7ff 0%, #f6f8ff 55%, #fbf7ff 100%);
}
.wrap{ position:relative; max-width:1120px; margin:0 auto; padding:24px 18px 70px; }

.topRow{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.title{ font-size:30px; font-weight:950; letter-spacing:-0.6px; color:#111; }
.sub{ margin-top:6px; font-size:14px; font-weight:900; color:#111; opacity:.8; }

.nav{ display:flex; gap:10px; flex-wrap:wrap; }
.navBtn{
  height:42px; padding:0 14px; border-radius:999px;
  border:1px solid rgba(30,20,60,0.18);
  background: rgba(255,255,255,0.9);
  color:#111; font-weight:950;
  box-shadow: 0 10px 26px rgba(40,10,70,0.10);
  cursor:pointer;
}
.navBtn.ghost{ background: rgba(255,255,255,0.7); }

.kpis{
  margin-top:16px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap:12px;
}
@media (max-width: 980px){ .kpis{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.kpi{
  border-radius: 18px;
  padding: 14px;
  border: 1px solid rgba(20,10,40,0.10);
  box-shadow: 0 16px 34px rgba(40,10,70,0.10);
  background: rgba(255,255,255,0.80);
  color:#111;
  backdrop-filter: blur(8px);
}
.kpi.click{ cursor:pointer; }
.kTop{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.kTitle{ font-size:14px; font-weight:950; color:#111; }
.live{ font-size:12px; font-weight:950; color:#111; opacity:0.55; }
.kVal{ margin-top:10px; font-size:34px; font-weight:950; color:#111; }
.kDesc{ margin-top:6px; font-size:12px; font-weight:900; color:#111; opacity:0.65; }

.kpi.pink{ background: linear-gradient(135deg, rgba(255,180,220,0.50), rgba(255,255,255,0.75)); }
.kpi.purple{ background: linear-gradient(135deg, rgba(205,180,255,0.50), rgba(255,255,255,0.75)); }
.kpi.yellow{ background: linear-gradient(135deg, rgba(255,230,170,0.55), rgba(255,255,255,0.75)); }
.kpi.blue{ background: linear-gradient(135deg, rgba(175,220,255,0.55), rgba(255,255,255,0.75)); }
.kpi.mint{ background: linear-gradient(135deg, rgba(175,255,220,0.45), rgba(255,255,255,0.75)); }
.kpi.mint2{ background: linear-gradient(135deg, rgba(170,245,255,0.45), rgba(255,255,255,0.75)); }
.kpi.mint3{ background: linear-gradient(135deg, rgba(190,255,240,0.45), rgba(255,255,255,0.75)); }
.kpi.violet{ background: linear-gradient(135deg, rgba(220,200,255,0.55), rgba(255,255,255,0.75)); }

.bigCards{
  margin-top: 16px;
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:12px;
}
@media (max-width: 980px){ .bigCards{ grid-template-columns: 1fr; } }

.big{
  border-radius: 22px;
  padding: 16px;
  border: 1px solid rgba(20,10,40,0.10);
  background: rgba(0,0,0,0.25);
  box-shadow: 0 18px 40px rgba(40,10,70,0.12);
  color:#fff;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  min-height:150px;
}
.bTitle{ font-size:18px; font-weight:950; }
.bDesc{ margin-top:6px; font-size:13px; font-weight:900; opacity:0.9; line-height:1.35; }
.open{
  margin-top:12px;
  height:44px;
  border-radius: 16px;
  border:0;
  font-weight:950;
  color:#fff;
  cursor:pointer;
  background: linear-gradient(90deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95));
  box-shadow: 0 16px 34px rgba(168,85,247,0.22);
}

.loading{ margin-top:16px; font-weight:950; color:#111; opacity:0.75; }
`;
