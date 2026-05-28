interface RiskBadgeProps {
  change7d: number | null;
  sentiment: number | null;
}

export function RiskBadge({ change7d, sentiment }: RiskBadgeProps) {
  if (change7d === null && sentiment === null) return null;

  const isRed =
    (change7d !== null && change7d < -10) ||
    (sentiment !== null && sentiment < 0.3);
  const isAmber =
    !isRed &&
    ((change7d !== null && change7d < -5) ||
      (sentiment !== null && sentiment < 0.5));

  if (!isRed && !isAmber) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isRed
          ? "bg-red-500/20 text-red-400 border-red-500/30"
          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isRed ? "bg-red-400" : "bg-amber-400"}`}
      />
      {isRed ? "High Risk" : "Watch"}
    </span>
  );
}
