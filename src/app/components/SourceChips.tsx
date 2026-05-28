const SOURCE_COLORS: Record<string, string> = {
  grantees:
    "bg-[#2d4a3a] text-[#8ab8a4] border-[#3d6a54]",
  defillama:
    "bg-[#3a2d4a] text-[#b09ab8] border-[#4a3d5a]",
  github_activity:
    "bg-[#4a3520] text-[#c49b6a] border-[#5a4530]",
  github:
    "bg-[#4a3520] text-[#c49b6a] border-[#5a4530]",
  etherscan:
    "bg-[#203040] text-[#7a9ab0] border-[#304050]",
  etherscan_transfers:
    "bg-[#203040] text-[#7a9ab0] border-[#304050]",
  reputation:
    "bg-[#4a2030] text-[#b87a8a] border-[#5a3040]",
  coingecko:
    "bg-[#4a4020] text-[#b8a870] border-[#5a5030]",
  neynar:
    "bg-[#203a3a] text-[#7ab0a8] border-[#304a4a]",
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
