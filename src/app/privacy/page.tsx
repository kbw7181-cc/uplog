// ✅✅✅ 전체복붙: src/app/privacy/page.tsx
'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="wrap">
      <div className="bg" aria-hidden="true" />

      <section className="card">
        <header className="head">
          <div className="logo" aria-hidden="true">
            <img src="/gogo.png" alt="" className="logoImg" />
          </div>
          <div className="titles">
            <div className="title">개인정보처리방침</div>
            <div className="sub">UPLOG 서비스 이용을 위한 필수 안내</div>
          </div>
        </header>

        <div className="body">
          <p className="p">
            UPLOG(이하 “서비스”)는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 서비스 제공을 위해 어떤
            정보를 수집하고, 어떻게 이용 및 보관하는지 안내합니다.
          </p>

          <h2 className="h2">1. 수집하는 개인정보 항목</h2>
          <ul className="ul">
            <li>
              <b>필수</b>: 이메일, 비밀번호(인증 제공자에 의해 처리), 이름, 닉네임, 전화번호, 생년월일, 회사명, 팀명, 업종, 주소(지역
              매핑용)
            </li>
            <li>
              <b>선택</b>: 프로필 이미지
            </li>
            <li>
              <b>서비스 이용 중 생성</b>: 고객관리/일정/커뮤니티/채팅/문의하기 등 사용자가 입력한 데이터, 접속 로그(보안/품질 개선 목적)
            </li>
          </ul>

          <h2 className="h2">2. 개인정보 수집 방법</h2>
          <ul className="ul">
            <li>회원가입 및 프로필 설정 시 이용자가 직접 입력</li>
            <li>서비스 이용 과정에서 자동 생성(로그, 오류 정보 등)</li>
            <li>문의하기(고객지원) 제출 시 이용자가 직접 입력</li>
          </ul>

          <h2 className="h2">3. 개인정보의 이용 목적</h2>
          <ul className="ul">
            <li>회원 식별, 가입 의사 확인, 로그인 및 계정 관리</li>
            <li>서비스 제공(고객관리/일정/성과/커뮤니티/채팅 등 기능 제공)</li>
            <li>고객지원(문의 응대, 공지 전달, 오류 대응)</li>
            <li>부정 이용 방지, 보안, 서비스 품질 개선</li>
            <li>(선택 동의 시) 마케팅/이벤트/신규 기능 안내</li>
          </ul>

          <h2 className="h2">4. 보유 및 이용 기간</h2>
          <ul className="ul">
            <li>
              원칙적으로 이용자가 <b>회원 탈퇴</b>를 요청하거나 개인정보 수집/이용 목적이 달성되면 지체 없이 파기합니다.
            </li>
            <li>다만, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관할 수 있습니다.</li>
          </ul>

          <h2 className="h2">5. 처리 위탁 및 국외 이전 가능성</h2>
          <p className="p">
            서비스 운영을 위해 일부 업무를 외부 서비스 제공자에 위탁할 수 있습니다. 예) 데이터베이스/인증/스토리지(Supabase),
            호스팅/배포(Vercel) 등. 위탁이 발생하는 경우 관련 법령에 따라 필요한 사항을 안내합니다.
          </p>

          <h2 className="h2">6. 이용자의 권리</h2>
          <ul className="ul">
            <li>이용자는 언제든지 개인정보 열람/정정/삭제/처리정지를 요청할 수 있습니다.</li>
            <li>요청은 서비스 내 설정 또는 고객지원을 통해 가능합니다.</li>
          </ul>

          <h2 className="h2">7. 개인정보 보호를 위한 조치</h2>
          <ul className="ul">
            <li>접근 통제, 권한 관리, 보안 설정을 통해 개인정보를 보호합니다.</li>
            <li>중요 정보는 전송 구간 암호화(HTTPS) 등을 통해 보호합니다.</li>
          </ul>

          <h2 className="h2">8. 문의처</h2>
          <p className="p">개인정보 관련 문의는 서비스 내 “문의하기”를 통해 접수해 주세요.</p>

          <h2 className="h2">9. 고지 의무</h2>
          <p className="p">본 개인정보처리방침은 법령/정책/서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지합니다.</p>

          <div className="foot">
            <Link className="btn" href="/register">
              회원가입으로 돌아가기
            </Link>
            <div className="ver">버전: 2026-01-16</div>
          </div>
        </div>
      </section>

      <style jsx>{`
        :global(*),
        :global(*::before),
        :global(*::after) {
          box-sizing: border-box;
        }

        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 26px 16px;
          position: relative;
          overflow: hidden;
          background: #120022;
        }

        .bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 18% 10%, rgba(255, 90, 210, 0.34), transparent 55%),
            radial-gradient(circle at 88% 18%, rgba(145, 80, 255, 0.4), transparent 52%),
            radial-gradient(circle at 45% 95%, rgba(255, 170, 235, 0.22), transparent 50%),
            linear-gradient(135deg, #a23ea7 0%, #7b3fe6 100%);
          filter: saturate(1.05);
          z-index: 0;
        }

        /* ✅ 중앙/대칭 고정 */
        .card {
          width: min(980px, 96vw);
          margin: 0 auto;
          border-radius: 28px;
          padding: 22px 22px 20px; /* ✅ 좌우 동일 */
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          z-index: 1;
        }

        /* ✅ 헤더 쏠림 제거: grid로 정렬 고정 */
        .head {
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 12px;
          align-items: center;
          padding: 4px 4px 12px;
        }

        .logo {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.28);
          display: grid;
          place-items: center;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .logoImg {
          width: 32px;
          height: 32px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 10px 18px rgba(255, 77, 184, 0.18));
        }

        .titles {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
          min-width: 0;
        }

        .title {
          font-size: 22px;
          font-weight: 1000;
          color: #ffffff;
          text-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
        }

        .sub {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.85);
        }

        /* ✅ body도 좌우 대칭 */
        .body {
          padding: 10px 4px 4px;
        }

        .p {
          margin: 10px 0;
          color: rgba(255, 255, 255, 0.92);
          font-size: 14px;
          font-weight: 900;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .h2 {
          margin: 16px 0 8px;
          font-size: 15px;
          font-weight: 1000;
          color: #fff;
        }

        .ul {
          margin: 8px 0 12px 18px;
          padding: 0;
          color: rgba(255, 255, 255, 0.92);
          font-size: 14px;
          font-weight: 900;
          line-height: 1.7;
        }

        .foot {
          margin-top: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.16);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          text-decoration: none;
          color: #fff;
          font-weight: 1000;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.26);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
        }

        .btn:hover {
          filter: brightness(1.08);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .ver {
          font-size: 12px;
          font-weight: 950;
          color: rgba(255, 255, 255, 0.72);
        }

        @media (max-width: 520px) {
          .card {
            padding: 18px 16px 16px;
          }
          .body {
            padding: 10px 2px 4px;
          }
        }
      `}</style>
    </main>
  );
}
