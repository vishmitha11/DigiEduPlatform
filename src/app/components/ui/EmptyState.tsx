import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      {Icon && <Icon className="mx-auto mb-4 h-10 w-10 text-slate-200" />}
      <p className="font-medium text-slate-600">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
