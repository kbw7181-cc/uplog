'use client';

import React from 'react';

type Props = {
  nickname: string;
  motto?: string;
  badges?: string[]; // badge_code 배열
  badgeNames?: Record<string, string | null | undefined>; // 있으면 이름 우선
};

type BadgeStyle = {
  label: string;
  tone: 'gold' | 'pink' | 'purple' | 'sky' | 'mint' | 'gray';
};

const DEFAULT_BADGE_MAP: Record<string, BadgeStyle> = {
  monthly_top: { label: '월간 1등', tone: 'gold' },
  streak_month_king: { label: '존버왕(월간)', tone: 'purple' },
  most_likes_month: { label: '좋아요 부자(월간)', tone: 'pink' },
  mvp_count_month: { label: '최대건수 MVP(월간)', tone: 'sky' },
  mvp_amount_month: { label: '최대금액 MVP(월간)', tone: 'mint' },
  attendance_month_mvp: { label: '출석 MVP(월간)', tone: 'purple' },
  most_posts_month: { label: '커뮤니티 최다게시(월간)', tone: 'pink' },

  // 혹시 주간이 섞여 들어와도 예쁘게 처리
  weekly_top: { label: '주간 1등', tone: 'gold' },
};

function toneClass(tone: BadgeStyle['tone']) {
  switch (tone) {
    case 'gold':
      return 'badgeToneGold';
    case 'pink':
      return 'badgeTonePink';
    case 'purple':
      return 'badgeTonePurple';
    case 'sky':
      return 'badgeToneSky';
    case 'mint':
      return 'badgeToneMint';
    default:
      return 'badgeToneGray';
  }
}

export default function NicknameWithBadge({ nickname, motto, badges = [], badgeNames }: Props) {
  const safeNick = (nickname ?? '').trim() || '영업인';

  const normalized = Array.from(
    new Set(
      badges
        .filter(Boolean)
        .map((b) => String(b).trim())
        .filter((b) => b.length > 0)
    )
  );

  return (
    <div className="nickBlock">
      {/* ✅ 닉네임: 무조건 1번만, 크게/진하게/핑크퍼플 */}
      <div className="nickTitle" title={safeNick}>
        {safeNick}
      </div>

      {/* ✅ 모토(작게 한 줄) */}
      {motto ? <div className="nickMotto">{motto}</div> : null}

      {/* ✅ 배지: 코드별로 톤 다르게 */}
      {normalized.length > 0 ? (
        <div className="badgeRow">
          {normalized.map((code) => {
            const meta = DEFAULT_BADGE_MAP[code] ?? { label: code, tone: 'gray' as const };
            const label = (badgeNames?.[code] ?? meta.label ?? code) || code;

            return (
              <span key={code} className={`badgeChip ${toneClass(meta.tone)}`} title={code}>
                <span className="badgeIcon">👑</span>
                <span className="badgeText">{label}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* ✅ 이 컴포넌트 안에서 스타일을 ‘전역 클래스명’으로 박아둠 (home/page.tsx style jsx에서 같이 먹습니다) */}
    </div>
  );
}
