// ✅✅✅ 전체복붙: src/app/home/homeStyles.ts
export const homeStyles = `
:root{
  --uplog-accent-pink:#f472b6;
  --uplog-accent-purple:#a855f7;
  --soft-ink:#201235;
  --soft-sub:#6f60b8;
  --soft-shadow:0 14px 26px rgba(0,0,0,0.10);

  /* ✅ 말풍선/마스코트 "고정 규격" */
  --uplog-bubble-h:148px;
  --uplog-bubble-radius:22px;
  --uplog-bubble-pad:14px 16px;
  --uplog-bubble-pill-size:13px;
  --uplog-bubble-text-size:16px;
  --uplog-mascot-size:180px;
  --uplog-font:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
html,body{margin:0;padding:0;}
a{color:inherit;text-decoration:none;}
*{box-sizing:border-box;}

/* ✅✅✅ 전역 텍스트 인플레이션 방지 */
.coach-bubble-panel,
.coach-bubble-panel *{
  -webkit-text-size-adjust:100%;
  text-size-adjust:100%;
}
.right-card,
.right-card *{
  -webkit-text-size-adjust:100%;
  text-size-adjust:100%;
}

/* ✅✅✅ 치우침 방지 "센터 고정" 안전장치 (핵심) */
.home-root{
  min-height:100vh;
  width:100%;
  display:flex;
  justify-content:center;
  box-sizing:border-box;
  overflow-x:hidden;

  padding:24px;
  font-size:16px;
  background:
    radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(900px 560px at 82% 18%, rgba(243,232,255,0.55) 0%, rgba(243,232,255,0) 64%),
    linear-gradient(180deg,#fff3fb 0%, #f6f2ff 45%, #eef8ff 100%);
  font-family:var(--uplog-font);
  color:var(--soft-ink);
}
.home-inner{
  width:100%;
  max-width:1200px;
  margin-left:auto;
  margin-right:auto;
}

.section-title{font-size:18px;font-weight:900;color:#5d3bdb;}
.section-sub{font-size:14px;margin-top:4px;color:var(--soft-sub);}
.home-loading{margin-top:120px;text-align:center;font-size:20px;}

/* Header */
.home-header{
  display:flex;
  flex-direction:column;
  gap:12px;
  padding:22px 26px 38px;
  border-radius:26px;
  background:
    radial-gradient(900px 520px at 20% 20%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 55%),
    linear-gradient(135deg, rgba(236,72,153,0.75), rgba(124,58,237,0.72));
  box-shadow:0 16px 28px rgba(0,0,0,0.18);
  margin-bottom:14px;
  color:#fff;
  overflow:hidden;
}
.home-header-top{
  display:grid;
  grid-template-columns:1fr minmax(0, clamp(320px, 36vw, 420px));
  gap:16px;
  align-items:start;
}
@media (max-width:980px){
  .home-header-top{grid-template-columns:1fr;}
  .home-header-profile{justify-content:flex-start;}
  .profile-box{max-width:520px;height:auto;}
}
.home-logo-row{display:flex;align-items:center;gap:12px;}
.home-logo{
  width:70px;height:70px;border-radius:22px;padding:8px;
  background:rgba(255,255,255,0.16);
  box-shadow:0 10px 18px rgba(0,0,0,0.14);
}
.home-logo-text-wrap{display:flex;flex-direction:column;gap:4px;}
.wave-text{display:inline-flex;gap:2px;}
.wave-text span{
  display:inline-block;
  font-size:36px;
  font-weight:900;
  letter-spacing:5px;
  color:rgba(255,255,255,0.96);
  animation: uplogBounce 2.2s ease-in-out infinite;
  transform-origin:center bottom;
  text-shadow:0 2px 10px rgba(0,0,0,0.18);
}
@keyframes uplogBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
.home-logo-sub{font-size:16px;font-weight:900;color:rgba(255,255,255,0.92);text-shadow:0 2px 8px rgba(0,0,0,0.18);}
.home-date{font-size:18px;font-weight:900;margin-top:10px;color:rgba(255,255,255,0.92);text-shadow:0 2px 10px rgba(0,0,0,0.18);}

.admin-btn{
  margin-left:10px;
  border:1px solid rgba(255,255,255,0.65);
  background:rgba(255,255,255,0.16);
  color:#fff;
  font-weight:950;
  border-radius:999px;
  cursor:pointer;
  box-shadow:0 10px 18px rgba(0,0,0,0.12);
}
.admin-btn-sm{height:34px;padding:0 12px;font-size:12px;}
.admin-btn-md{height:40px;padding:0 14px;font-size:13px;}

/* Profile */
.home-header-profile{display:flex;justify-content:flex-end;align-items:flex-start;}
.profile-box{
  width:100%;
  max-width:420px;
  min-width:0;
  height:220px;
  background:rgba(255,255,255,0.96);
  border-radius:22px;
  padding:12px 14px;
  box-shadow:0 14px 26px rgba(0,0,0,0.12);
  display:flex;
  flex-direction:column;
  gap:6px;
  border:2px solid rgba(227,218,251,0.95);
  color:#211437;
  position:relative;
}
@media (max-width:980px){.profile-box{height:auto;padding-bottom:14px;}}
.profile-settings-btn{
  position:absolute;top:10px;right:10px;height:30px;padding:0 10px;border-radius:999px;
  border:1px solid rgba(217,204,255,0.75);
  background:linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,240,255,0.92));
  color:#3a1f62;font-weight:950;font-size:12px;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  cursor:pointer;box-shadow:0 8px 14px rgba(0,0,0,0.10);
}
.profile-click{border:none;background:transparent;padding:0;text-align:left;cursor:pointer;width:100%;}
.profile-main{display:flex;align-items:center;gap:12px;padding-right:86px;margin-top:2px;}
.profile-main-text{min-width:0;}
.profile-avatar{
  width:72px;height:72px;border-radius:999px;
  background:radial-gradient(circle at top left, rgba(244,114,182,0.85) 0, rgba(168,85,247,0.78) 60%);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:22px;overflow:hidden;flex-shrink:0;
  box-shadow:0 8px 16px rgba(168,85,247,0.22);
}
.profile-avatar img{width:100%;height:100%;object-fit:cover;}
.profile-name{font-size:18px;font-weight:950;line-height:1.15;}
.profile-email{font-size:13px;color:#7b6ac4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;}

/* ... 이하 대표님 원본 그대로 ... (여기부터 아래는 변경 없음) */

/* ✅✅✅ 홈 메뉴 */
.home-menu-row{
  margin:18px 0 16px;
  display:grid;
  grid-template-columns:repeat(6, minmax(0, 1fr));
  gap:12px;
  width:100%;
  align-items:stretch;
}
@media (max-width:760px){
  .home-root{padding:16px;}
  .home-menu-row{
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:10px;
  }
}

/* Floating support */
.floating-support-btn{
  position:fixed;
  right:18px;
  bottom:18px;
  width:72px;
  height:72px;
  border:none;
  border-radius:999px;
  cursor:pointer;
  z-index:90;

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;

  color:#ffffff;
  font-weight:950;
  font-size:11px;
  line-height:1.05;
  letter-spacing:-0.2px;

  background:
    radial-gradient(60px 60px at 30% 25%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #1d4ed8 100%);

  box-shadow:
    0 16px 32px rgba(37,99,235,0.35),
    0 8px 14px rgba(0,0,0,0.12);
}
`;
