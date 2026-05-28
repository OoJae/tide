const SOURCE_COLORS: Record<string, string> = {
  grantees: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  defillama: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  github_activity: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  github: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  etherscan: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reputation: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  coingecko: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  neynar: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const SOURCES = Object.keys(SOURCE_COLORS);

export function SourceChips({ sql }: { sql: string }) {
  const found = SOURCES.filter((s) => sql.toLowerCase().includes(s));
  if (found.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {found.map((source) => (
        <span
          key={source}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${SOURCE_COLORS[source]}`}
        >
          {source}
        </span>
      ))}
    </div>
  );
}
