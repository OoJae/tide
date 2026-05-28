interface TideGlyphProps {
  size?: number;
  className?: string;
}

export function TideGlyph({ size = 24, className }: TideGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-label="Tide"
      className={className}
    >
      <path
        d="M1 17 C 5 17, 6 12, 10 12 C 14 12, 15 17, 19 17 L 23 17"
        stroke="var(--bone)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="1"
        y1="20.5"
        x2="23"
        y2="20.5"
        stroke="var(--clay)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="12" r="1.3" fill="var(--clay)" />
    </svg>
  );
}
