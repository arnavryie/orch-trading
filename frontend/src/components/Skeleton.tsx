export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-[#161616]">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-2 w-16" />
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-2 w-12" />
      </div>
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return <div className="skeleton w-full rounded-lg" style={{ height }} />;
}

export function SkeletonChart({ height = 400 }: { height?: number }) {
  return (
    <div className="skeleton w-full rounded-lg flex items-end gap-1 p-4" style={{ height }}>
      {/* fake candles */}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return <div>{Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}</div>;
}
