'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
  const pathname = usePathname();
  const isChats = pathname?.startsWith('/chats');

  return (
    <header className="hdr">
      <div className="hdrIn">
        <Link href="/home" className="brand" aria-label="UPLOG Home">
          {/* ⚠️ 로고 경로가 logo.png로 되어있으면 /assets/images/lolo.png 로 바꾸세요 */}
          <img src="/assets/images/lolo.png" alt="UPLOG" className="logo" />
          <div className="brandTxt">
            <div className="brandTitle">UPLOG</div>
            <div className="brandSub">오늘도 나를 UP시키다</div>
          </div>
        </Link>

        {/* ✅ 채팅 페이지에서는 우측 버튼들 삭제 */}
        {!isChats && (
          <nav className="nav">
            <Link className="pill" href="/home">홈</Link>
            <Link className="pill" href="/chats">채팅</Link>
            <Link className="pill" href="/settings">설정</Link>
            <Link className="pill hot" href="/logout">로그아웃</Link>
          </nav>
        )}
      </div>

      <style jsx>{`
        .hdr{ position: sticky; top:0; z-index:50; padding:10px 12px; }
        .hdrIn{
          max-width: 1100px; margin:0 auto;
          display:flex; align-items:center; justify-content:space-between;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(160,120,220,0.22);
          box-shadow: 0 18px 45px rgba(30,10,60,0.10);
          border-radius: 18px;
          padding: 10px 12px;
          backdrop-filter: blur(10px);
        }
        .brand{ display:flex; align-items:center; gap:10px; text-decoration:none; color:#2a0f3a; }
        .logo{ width:34px; height:34px; border-radius:10px; object-fit:contain; }
        .brandTitle{ font-weight:950; letter-spacing:-0.6px; }
        .brandSub{ font-size:12px; opacity:0.75; margin-top:1px; }
        .nav{ display:flex; gap:8px; }
        .pill{
          display:inline-flex; align-items:center; justify-content:center;
          height:34px; padding:0 12px; border-radius:999px;
          border:1px solid rgba(160,120,220,0.24);
          background: rgba(255,255,255,0.75);
          color:#2a0f3a; text-decoration:none; font-weight:900; font-size:13px;
        }
        .pill.hot{
          border: 0;
          background: linear-gradient(135deg, rgba(255,105,180,0.95), rgba(140,82,255,0.95));
          color: white;
          box-shadow: 0 14px 28px rgba(180,60,200,0.18);
        }
      `}</style>
    </header>
  );
}
