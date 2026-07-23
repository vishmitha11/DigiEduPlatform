export default function Card({
  title,
  action,
  className = "",
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  if (title ?? action) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
          {action}
        </div>
        <div className="p-5">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
