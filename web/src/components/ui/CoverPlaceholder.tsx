export default function CoverPlaceholder({
  format,
  width = 64,
  height = 96,
  className = "",
}: {
  format: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const label = format.replace(/_/g, " ").toUpperCase();

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width,
        height,
        background: "var(--bg-tertiary)",
        borderRadius: 4,
      }}
    >
      <svg
        width={width * 0.6}
        height={height * 0.4}
        viewBox="0 0 40 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Book shape */}
        <rect
          x="4"
          y="2"
          width="32"
          height="26"
          rx="2"
          stroke="var(--text-tertiary)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />
        <line
          x1="20"
          y1="2"
          x2="20"
          y2="28"
          stroke="var(--text-tertiary)"
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Spine lines */}
        <line x1="8" y1="8" x2="17" y2="8" stroke="var(--text-tertiary)" strokeWidth="1" opacity="0.2" />
        <line x1="8" y1="12" x2="15" y2="12" stroke="var(--text-tertiary)" strokeWidth="1" opacity="0.2" />
        <line x1="8" y1="16" x2="16" y2="16" stroke="var(--text-tertiary)" strokeWidth="1" opacity="0.2" />
      </svg>
      <span
        className="absolute text-center px-1"
        style={{
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: Math.max(8, width * 0.1),
          maxWidth: width - 8,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {label}
      </span>
    </div>
  );
}
