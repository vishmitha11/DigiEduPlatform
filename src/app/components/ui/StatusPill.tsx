import Badge from "~/app/components/ui/Badge";

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

// Semantic status → tone mapping; rendering goes through Badge so every
// pill in the app shares one visual system.
const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: "info",
  COMPLETED: "success",
  PENDING: "warning",
  APPROVED: "success",
  FAILED: "danger",
  WITHDRAWN: "neutral",
  SUSPENDED: "warning",
  PUBLISHED: "success",
  UNDER_REVIEW: "warning",
};

function formatLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function StatusPill({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={className}>
      {formatLabel(status)}
    </Badge>
  );
}
