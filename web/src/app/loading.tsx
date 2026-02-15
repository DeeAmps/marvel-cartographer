export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border-default)", borderTopColor: "transparent" }}
        />
        <span
          className="text-sm"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
        >
          Loading...
        </span>
      </div>
    </div>
  );
}
