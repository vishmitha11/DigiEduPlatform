"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Search, MapPin, Clock, DollarSign, Globe,
  Building2, Loader2, X, ChevronDown, ExternalLink,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import Button from "~/app/components/ui/Button";
import EmptyState from "~/app/components/ui/EmptyState";

interface Job {
  id: string;
  title: string;
  type: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string | null;
  requirements: string | null;
  requiredQualifications: string[];
  preferredFields: string[];
  applicationDeadline: string | null;
  createdAt: string;
  employer: { companyName: string; logoUrl: string | null; industry: string | null } | null;
}

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "OVERSEAS"] as const;

const TYPE_META: Record<string, { label: string; color: string }> = {
  FULL_TIME:   { label: "Full Time",   color: "bg-blue-100 text-blue-700" },
  PART_TIME:   { label: "Part Time",   color: "bg-violet-100 text-violet-700" },
  INTERNSHIP:  { label: "Internship",  color: "bg-green-100 text-green-700" },
  CONTRACT:    { label: "Contract",    color: "bg-orange-100 text-orange-700" },
  OVERSEAS:    { label: "Overseas",    color: "bg-red-100 text-red-700" },
};

export default function CareersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [remoteFilter, setRemoteFilter] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [existingApplications, setExistingApplications] = useState<Set<string>>(new Set());

  // Published, active job listings — server-side filtered (status +
  // isActive) and salary-figure-stripped where the employer opted out of
  // public display, so this client never even receives DRAFT jobs or
  // hidden salary data.
  const { data: rawJobs = [], isLoading: loading } = api.job.listPublic.useQuery({});

  const jobs: Job[] = rawJobs.map((j) => ({
    id: j.id,
    title: j.title,
    type: j.type,
    location: j.location,
    isRemote: j.isRemote,
    salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
    salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
    currency: j.currency,
    description: j.description,
    requirements: j.requirements,
    requiredQualifications: j.requiredQualifications,
    preferredFields: j.preferredFields,
    applicationDeadline: j.applicationDeadline ? new Date(j.applicationDeadline).toISOString() : null,
    createdAt: j.createdAt.toString(),
    employer: j.employer,
  }));

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: student } = await supabase
          .from("Student")
          .select("id")
          .eq("profileId", user.id)
          .single();
        if (student) {
          setStudentId(student.id);
          // Fetch existing applications
          const { data: apps } = await supabase
            .from("JobApplication")
            .select("jobId")
            .eq("studentId", student.id);
          if (apps) setExistingApplications(new Set(apps.map((a) => a.jobId)));
        }
      }
    };
    void init();
  }, []);

  const handleApply = async (jobId: string) => {
    if (!user) { router.push(`/login?redirect=/careers`); return; }
    if (!studentId) {
      setApplyError("Please complete your student profile first.");
      return;
    }
    setApplying(jobId);
    setApplyError(null);
    try {
      const { error } = await supabase.from("JobApplication").insert({
        id: crypto.randomUUID(),
        jobId,
        studentId,
        status: "APPLIED",
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      setExistingApplications((prev) => new Set([...prev, jobId]));
      setApplySuccess(jobId);
      setTimeout(() => setApplySuccess(null), 3000);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setApplying(null);
    }
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchSearch =
      j.title.toLowerCase().includes(q) ||
      (j.employer?.companyName.toLowerCase().includes(q) ?? false) ||
      (j.location?.toLowerCase().includes(q) ?? false);
    const matchType = typeFilter === "ALL" || j.type === typeFilter;
    const matchRemote = !remoteFilter || j.isRemote;
    return matchSearch && matchType && matchRemote;
  });

  const isDeadlinePassed = (deadline: string | null) =>
    deadline ? new Date(deadline) < new Date() : false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Career Opportunities</h1>
            <p className="mt-3 text-lg text-slate-500">
              Find jobs and internships from verified employers
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, companies or locations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-subtle"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              All Types
            </button>
            {JOB_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  typeFilter === t
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {TYPE_META[t]?.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRemoteFilter(!remoteFilter)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              remoteFilter
                ? "bg-brand text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> Remote Only
          </button>
          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} job{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Global error */}
        {applyError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />{applyError}
            <button onClick={() => setApplyError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Jobs list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs found" />
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const isExpanded = expandedId === job.id;
              const hasApplied = existingApplications.has(job.id);
              const isApplying = applying === job.id;
              const didSucceed = applySuccess === job.id;
              const deadlinePassed = isDeadlinePassed(job.applicationDeadline);
              const typeMeta = TYPE_META[job.type] ?? { label: job.type, color: "bg-slate-100 text-slate-600" };

              return (
                <div key={job.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/30">
                  {/* Main row */}
                  <div className="flex items-start gap-4 px-5 py-5">
                    {/* Company logo / initials */}
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500">
                      {job.employer?.companyName.charAt(0).toUpperCase() ?? "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900">{job.title}</h3>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.employer?.companyName}
                            {job.employer?.industry && (
                              <span className="text-slate-400">· {job.employer.industry}</span>
                            )}
                          </div>
                        </div>

                        {/* Apply / Applied button */}
                        <div className="flex-shrink-0">
                          {hasApplied || didSucceed ? (
                            <span className="flex items-center gap-1.5 rounded-lg bg-brand-subtle px-4 py-2 text-sm font-semibold text-brand-dim">
                              <CheckCircle2 className="h-4 w-4" /> Applied
                            </span>
                          ) : deadlinePassed ? (
                            <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                              Closed
                            </span>
                          ) : (
                            <Button onClick={() => handleApply(job.id)} disabled={isApplying}>
                              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {isApplying ? "Applying…" : "Apply Now"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />{job.location}
                          </span>
                        )}
                        {job.isRemote && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                            <Globe className="h-3.5 w-3.5" /> Remote
                          </span>
                        )}
                        {(job.salaryMin ?? job.salaryMax) && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <DollarSign className="h-3.5 w-3.5" />
                            {job.currency}{" "}
                            {job.salaryMin?.toLocaleString()}
                            {job.salaryMax && ` – ${job.salaryMax.toLocaleString()}`}
                          </span>
                        )}
                        {job.applicationDeadline && (
                          <span className={`flex items-center gap-1 ${deadlinePassed ? "text-red-500" : "text-slate-400"}`}>
                            <Clock className="h-3.5 w-3.5" />
                            {deadlinePassed ? "Deadline passed" : `Apply by ${new Date(job.applicationDeadline).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="flex-shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                      {job.description && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
                          <p className="text-sm leading-relaxed text-slate-600">{job.description}</p>
                        </div>
                      )}
                      {job.requirements && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Requirements</p>
                          <p className="text-sm leading-relaxed text-slate-600">{job.requirements}</p>
                        </div>
                      )}
                      {job.requiredQualifications.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Qualifications</p>
                          <div className="flex flex-wrap gap-2">
                            {job.requiredQualifications.map((q) => (
                              <span key={q} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{q}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {job.preferredFields.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Preferred Fields</p>
                          <div className="flex flex-wrap gap-2">
                            {job.preferredFields.map((f) => (
                              <span key={f} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">{f.replace(/_/g, " ")}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}