import { Building2, Clock, DollarSign, Globe, MapPin } from "lucide-react";
import type { JobFormValues } from "./jobFormTypes";

export const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time",
  INTERNSHIP: "Internship", CONTRACT: "Contract", OVERSEAS: "Overseas",
};
export const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: "bg-blue-50 text-blue-700",
  PART_TIME: "bg-violet-50 text-violet-700",
  INTERNSHIP: "bg-amber-50 text-amber-700",
  CONTRACT: "bg-slate-100 text-slate-600",
  OVERSEAS: "bg-emerald-50 text-emerald-700",
};

// Live preview of the in-progress (unsaved) job form, mirroring the job
// card layout used on the public careers page so employers see exactly
// what applicants will see.
export default function JobPreviewCard({
  form,
  companyName,
  logoUrl,
}: {
  form: JobFormValues;
  companyName?: string | null;
  logoUrl?: string | null;
}) {
  const currency = "LKR";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <div className="mb-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 sm:mb-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? "Company logo"} className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-slate-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="font-bold text-slate-900">{form.title || "Untitled Role"}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${JOB_TYPE_COLORS[form.type] ?? "bg-slate-100 text-slate-600"}`}>
            {JOB_TYPE_LABELS[form.type] ?? form.type}
          </span>
          {form.workModel === "REMOTE" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <Globe className="h-3 w-3" /> Remote
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {companyName ?? "Your Company"}
          </span>
          {form.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {form.location}
            </span>
          )}
          {form.displaySalaryPublicly && (form.salaryMin || form.salaryMax) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {currency}{" "}
              {form.salaryMin ? Number(form.salaryMin).toLocaleString() : ""}
              {form.salaryMin && form.salaryMax ? " – " : ""}
              {form.salaryMax ? Number(form.salaryMax).toLocaleString() : ""}
            </span>
          )}
          {form.applicationDeadline && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Closes {new Date(form.applicationDeadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {form.description && (
          <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">
            {form.description}
          </p>
        )}
      </div>
    </div>
  );
}
