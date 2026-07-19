interface ProgressBarProps {
  percent: number;
  color?: "blue" | "violet";
}

export default function ProgressBar({ percent, color = "blue" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${
          clamped === 100
            ? "bg-emerald-500"
            : color === "violet"
              ? "bg-violet-500"
              : "bg-blue-500"
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
