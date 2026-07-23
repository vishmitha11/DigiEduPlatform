export default function ProgressBar({
  value,
  max = 100,
  className = "",
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${
          percent === 100 ? "bg-emerald-500" : "bg-brand"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
