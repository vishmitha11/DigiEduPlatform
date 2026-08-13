export default function ProgressBar({
  value,
  max = 100,
  tone,
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "brand" | "success" | "warning";
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const TONE_CLASSES: Record<"brand" | "success" | "warning", string> = {
    brand: "bg-brand",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
  };

  // No `tone` passed = byte-identical to the original behavior.
  const barClass = tone ? TONE_CLASSES[tone] : percent === 100 ? "bg-emerald-500" : "bg-brand";

  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
