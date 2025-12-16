'use client';

type SanctionMeta = {
  hard: boolean;   // ⛔ 전체 사용 불가
  soft: boolean;   // ⚠️ 기능 제한
  labels: string[]; // ["💬🚫 채팅", "✍️🚫 글쓰기"]
  untilText?: string; // "2025-12-20" (없으면 무기한 느낌)
};

export default function SanctionBadge({ meta }: { meta: SanctionMeta }) {
  if (!meta?.hard && !meta?.soft) return null;

  // ⛔ 하드 정지
  if (meta.hard) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          text-[12px] font-extrabold text-white
          bg-gradient-to-r from-[#FF4FD8] to-[#B982FF]
          shadow-[0_10px_22px_rgba(255,79,216,0.18)]"
        title={meta.untilText ? `정지 해제: ${meta.untilText}` : '이용정지'}
      >
        ⛔ 이용정지
        {meta.untilText ? <span className="opacity-85">· {meta.untilText}</span> : null}
      </span>
    );
  }

  // ⚠️ 소프트 제한
  const detail = meta.labels?.length ? meta.labels.join(', ') : '기능 제한';
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        text-[12px] font-black
        bg-white/80 text-[#5B2A86] border border-white/70 shadow-sm"
      title={meta.untilText ? `${detail} (until ${meta.untilText})` : detail}
    >
      ⚠️ 제한중
      {meta.untilText ? <span className="opacity-70">· {meta.untilText}</span> : null}
    </span>
  );
}
