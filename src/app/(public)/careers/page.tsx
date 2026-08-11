"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Search, MapPin, Clock, Building2,
  ChevronRight, Loader2, Globe, DollarSign,
} from "lucide-react";
import { api } from "~/trpc/react";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time",
  INTERNSHIP: "Internship", CONTRACT: "Contract", OVERSEAS: "Overseas",
};
const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: "bg-blue-50 text-blue-700",
  PART_TIME: "bg-violet-50 text-violet-700",
  INTERNSHIP: "bg-amber-50 text-amber-700",
  CONTRACT: "bg-slate-100 text-slate-600",
  OVERSEAS: "bg-emerald-50 text-emerald-700",
};

type JobTypeFilter = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "OVERSEAS";

export default function PublicCareersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<JobTypeFilter | "">("");

  const { data: jobs = [], isLoading } = api.job.listPublic.useQuery({
    search: search || undefined,
    type: jobType === "" ? undefined : jobType,
  }, { staleTime: 60_000 });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-violet-600 uppercase tracking-wide">Career Opportunities</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Find Your Next Opportunity</h1>
          <p className="text-slate-500 max-w-xl">
            Browse job listings posted by verified employers. Sign in to apply and track your applications.
          </p>

          {/* Search + filter */}
          <div className="mt-6 flex flex-col gap-3 max-w-2xl sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, companies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as JobTypeFilter | "")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-400"
            >
              <option value="">All Types</option>
              {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-600">No job listings found</p>
            <p className="mt-1 text-sm text-slate-400">Check back soon for new opportunities.</p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-500">
              {jobs.length} opportunit{jobs.length !== 1 ? "ies" : "y"} available
            </p>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
                >
                  {/* Company logo placeholder */}
                  <div className="mb-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 sm:mb-0">
                    {job.employer?.logoUrl ? (
                      <img src={job.employer.logoUrl} alt={job.employer.companyName} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="font-bold text-slate-900">{job.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${JOB_TYPE_COLORS[job.type] ?? "bg-slate-100 text-slate-600"}`}>
                        {JOB_TYPE_LABELS[job.type] ?? job.type}
                      </span>
                      {job.isRemote && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <Globe className="h-3 w-3" /> Remote
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.employer?.companyName}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {job.location}
                        </span>
                      )}
                      {(job.salaryMin ?? job.salaryMax) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.currency}{" "}
                          {job.salaryMin ? Number(job.salaryMin).toLocaleString() : ""}
                          {job.salaryMin && job.salaryMax ? " – " : ""}
                          {job.salaryMax ? Number(job.salaryMax).toLocaleString() : ""}
                        </span>
                      )}
                      {job.applicationDeadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Closes {new Date(job.applicationDeadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => router.push("/login")}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:mt-0 sm:flex-shrink-0"
                  >
                    Apply <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}