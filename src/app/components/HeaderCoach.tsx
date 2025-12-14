'use client';

type Props = {
  text: string;        // 페이지마다 바뀌는 문구
  tag?: string;        // 기본: 오늘의 U P 한마디
};

export default function HeaderCoach({
  text,
  tag = '오늘의 U P 한마디',
}: Props) {
  return (
    <div className="headerCoachWrap">
      <div className="headerBubble">
        <span className="headerBubbleTag">{tag}</span>
        <p className="headerBubbleText">{text}</p>
      </div>

      <div className="headerMascot">
        <img
          src="/assets/images/upzzu-mascot.png"
          alt="업쮸 마스코트"
        />
      </div>

      <style jsx>{`
        .headerCoachWrap{
          display:flex;
          align-items:center;
          gap:14px;
          margin-top:14px;
        }

        /* 말풍선 */
        .headerBubble{
          position:relative;
          flex:1;
          background:#fff;
          border-radius:20px;
          padding:14px 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
        }

        /* 꼬리 – 항상 오른쪽 */
        .headerBubble::after{
          content:'';
          position:absolute;
          right:-6px;
          top:50%;
          width:14px;
          height:14px;
          background:#fff;
          transform: translateY(-50%) rotate(45deg);
        }

        .headerBubbleTag{
          display:inline-block;
          font-size:11px;
          font-weight:800;
          color:#ff4fa3;
          background:#ffe6f3;
          padding:3px 8px;
          border-radius:999px;
          margin-bottom:6px;
        }

        .headerBubbleText{
          margin:0;
          font-size:15px;
          font-weight:700;
          color:#3b1d5a;
          line-height:1.55;
        }

        /* 마스코트 */
        .headerMascot{
          width:64px;
          height:64px;
          border-radius:50%;
          overflow:hidden;
          border:3px solid #fff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
          flex-shrink:0;
          background:#fff;
        }

        .headerMascot img{
          width:100%;
          height:100%;
          object-fit:cover;
        }

        /* 모바일 */
        @media (max-width:640px){
          .headerCoachWrap{
            gap:10px;
          }
          .headerBubble{
            padding:12px 14px;
          }
          .headerBubbleText{
            font-size:14px;
          }
          .headerMascot{
            width:56px;
            height:56px;
          }
        }
      `}</style>
    </div>
  );
}
