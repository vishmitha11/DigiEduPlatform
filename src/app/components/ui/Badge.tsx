import type { ReactNode } from "react";

type BadgeColor =
  | "slate"
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "red";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const COLOR_CLASSES: Record<BadgeColor, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-600",
};

export default function Badge({ children, color = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_CLASSES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
