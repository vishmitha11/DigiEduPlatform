// Semantic status → color mapping, matching the inline StatusBadge idiom
// already used across the student dashboard.
const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-600",
  WITHDRAWN: "bg-slate-100 text-slate-500",
  SUSPENDED: "bg-orange-100 text-orange-600",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
};

function formatLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface StatusPillProps {
  status: string;
  className?: string;
}

export default function StatusPill({ status, className = "" }: StatusPillProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status] ?? "bg-slate-100 text-slate-600"} ${className}`}
    >
      {formatLabel(status)}
    </span>
  );
}
