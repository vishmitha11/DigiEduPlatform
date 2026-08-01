"use client";

import { AlertCircle } from "lucide-react";
import Button from "~/app/components/ui/Button";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div
          className={`mb-4 flex items-center gap-3 ${tone === "danger" ? "text-red-600" : "text-amber-600"}`}
        >
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        {description && <p className="mb-6 text-sm text-slate-600">{description}</p>}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
