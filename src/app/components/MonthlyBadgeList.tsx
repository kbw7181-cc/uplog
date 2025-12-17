type MonthlyBadge = {
  badge_code: string;
  badge_name: string;
  reason: string;
  month_start: string;
};

export default function MonthlyBadgeList({ badges }: { badges: MonthlyBadge[] }) {
  return (
    <div className="grid gap-12">
      {badges.map(b => (
        <div
          key={b.badge_code}
          className="rounded-2xl p-16 border border-white/20
                     bg-gradient-to-br from-[#FF4FD8]/25 to-[#B982FF]/20"
        >
          <div className="flex items-center gap-10 mb-6">
            <span className="text-28">👑</span>
            <h3 className="text-22 font-extrabold">{b.badge_name}</h3>
          </div>

          <p className="text-16 font-semibold leading-6 text-white/95">
            {b.reason}
          </p>

          <div className="mt-6 text-13 text-white/60">
            {b.month_start.slice(0, 7)}
          </div>
        </div>
      ))}
    </div>
  );
}
