// ✅✅✅ 전체복붙: src/app/terms/page.tsx
'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="wrap">
      <div className="bg" aria-hidden="true" />

      <section className="card">
        <header className="head">
          <div className="logo" aria-hidden="true">
            <img src="/gogo.png" alt="" className="logoImg" />
          </div>
          <div className="titles">
            <div className="title">서비스 이용약관</div>
            <div className="sub">UPLOG 서비스 이용을 위한 기본 약관</div>
          </div>
        </header>

        <div className="body">
          <p className="p">본 약관은 UPLOG(이하 “서비스”)의 이용과 관련하여 서비스 제공자와 이용자 간의 권리·의무 및 책임사항을 규정합니다.</p>

          <h2 className="h2">1. 계정 및 이용</h2>
          <ul className="ul">
            <li>이용자는 정확한 정보를 제공하고, 계정 정보를 안전하게 관리해야 합니다.</li>
            <li>타인의 계정을 무단으로 사용하거나 서비스 운영을 방해하는 행위는 금지됩니다.</li>
          </ul>

          <h2 className="h2">2. 서비스 제공 및 변경</h2>
          <ul className="ul">
            <li>서비스는 기능 개선 및 운영상 필요에 따라 일부 또는 전부를 변경할 수 있습니다.</li>
            <li>중대한 변경이 있는 경우 서비스 내 공지 등을 통해 안내할 수 있습니다.</li>
          </ul>

          <h2 className="h2">3. 이용자 콘텐츠</h2>
          <ul className="ul">
            <li>이용자가 서비스에 입력/업로드한 콘텐츠(고객 정보, 일정, 게시글 등)에 대한 책임은 이용자에게 있습니다.</li>
            <li>법령 위반 또는 권리 침해 콘텐츠는 사전 통지 없이 제한될 수 있습니다.</li>
          </ul>

          <h2 className="h2">4. 금지행위</h2>
          <ul className="ul">
            <li>불법 정보 유통, 해킹/침해 시도, 서비스 장애 유발 행위</li>
            <li>타인의 개인정보/권리 침해, 사칭, 스팸/도배</li>
            <li>서비스 또는 데이터의 무단 복제/역설계/비정상 접근</li>
          </ul>

          <h2 className="h2">5. 책임 제한</h2>
          <ul className="ul">
            <li>서비스는 천재지변, 장애, 외부 요인으로 인한 서비스 중단에 대해 법령상 허용 범위 내에서 책임을 제한할 수 있습니다.</li>
            <li>이용자의 귀책사유로 인한 손해는 이용자가 부담합니다.</li>
          </ul>

          <h2 className="h2">6. 계약 해지 및 이용 제한</h2>
          <ul className="ul">
            <li>이용자는 언제든지 탈퇴할 수 있습니다.</li>
            <li>약관 위반 시 서비스 이용이 제한되거나 계정이 정지될 수 있습니다.</li>
          </ul>

          <h2 className="h2">7. 분쟁 해결</h2>
          <p className="p">
            서비스 이용과 관련하여 분쟁이 발생할 경우 관련 법령에 따라 해결하며, 서비스 제공자의 소재지 관할 법원을 관할로 할 수 있습니다.
          </p>

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

        .head {
          display: grid; /* ✅ 미세한 좌우 쏠림 방지 */
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

        .body {
          padding: 10px 4px 6px; /* ✅ 좌우 대칭 + 과한 6px 제거 */
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
          margin-top: 18px;
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
            padding: 18px 16px 16px; /* ✅ 모바일에서도 중앙 고정 */
          }
          .body {
            padding: 10px 2px 6px;
          }
        }
      `}</style>
    </main>
  );
}
