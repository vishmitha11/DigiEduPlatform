"use client";

import { useState, useEffect } from "react";
import { Briefcase, Users, TrendingUp, FileText, Loader2, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import StatusPill from "~/app/components/ui/StatusPill";
import SetupIncompleteBanner from "./SetupIncompleteBanner";
import ApprovalStatusBanner from "./ApprovalStatusBanner";

interface JobApplication {
  id: string;
  status: string;
  appliedAt: string;
  job: { title: string }[] | null;
}

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const utils = api.useUtils();

  const [fullName, setFullName] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: jobs = [], isLoading: jobsLoading } = api.job.getMyListings.useQuery(
    undefined,
    { enabled: approvalStatus === "APPROVED" },
  );

  const togglePublish = api.job.togglePublish.useMutation({
    onSuccess: () => void utils.job.getMyListings.invalidate(),
  });

  const deleteJob = api.job.delete.useMutation({
    onSuccess: () => void utils.job.getMyListings.invalidate(),
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("Profile")
        .select("fullName")
        .eq("id", user.id)
        .single();

      setFullName(profile?.fullName ?? null);

      const { data: employer } = await supabase
        .from("Employer")
        .select("id, approvalStatus")
        .eq("profileId", user.id)
        .single();

      setSetupComplete(!!employer);
      setApprovalStatus((employer?.approvalStatus as "PENDING" | "APPROVED" | "REJECTED") ?? null);

      if (employer?.approvalStatus === "APPROVED") {
        await fetchApplications(employer.id);
      } else {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const fetchApplications = async (empId: string) => {
    try {
      setLoading(true);
      const applicationsRes = await supabase
        .from("JobApplication")
        .select("id, status, appliedAt, job:JobListing(title)")
        .eq("job.employerId", empId)
        .order("appliedAt", { ascending: false })
        .limit(10);
      if (applicationsRes.data) setApplications(applicationsRes.data as JobApplication[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter((j) => j.isActive).length;
  const pendingApplications = applications.filter((a) => a.status === "APPLIED").length;

  const appStatusColors: Record<string, string> = {
    APPLIED: "bg-yellow-100 text-yellow-800",
    SHORTLISTED: "bg-blue-100 text-blue-800",
    INTERVIEW: "bg-purple-100 text-purple-800",
    OFFERED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    WITHDRAWN: "bg-gray-100 text-gray-800",
  };

  const jobTypeColors: Record<string, string> = {
    FULL_TIME: "bg-blue-100 text-blue-700",
    PART_TIME: "bg-purple-100 text-purple-700",
    INTERNSHIP: "bg-orange-100 text-orange-700",
    CONTRACT: "bg-yellow-100 text-yellow-700",
    OVERSEAS: "bg-green-100 text-green-700",
  };

  if (loading || setupComplete === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {!setupComplete && <SetupIncompleteBanner role="EMPLOYER" />}

        {setupComplete && approvalStatus && approvalStatus !== "APPROVED" && (
          <ApprovalStatusBanner status={approvalStatus} role="EMPLOYER" />
        )}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Employer Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold text-brand-dim">{fullName ?? "Employer"}</span>
            </p>
          </div>
          {approvalStatus === "APPROVED" && (
            <button
              onClick={() => router.push("/dashboard/employer/jobs/new")}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dim"
            >
              + Post Job
            </button>
          )}
        </div>

        {approvalStatus !== "APPROVED" ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-600">Full dashboard available after approval</p>
            <p className="mt-1 text-sm text-slate-400">
              You'll be able to post jobs and manage applications once your account is approved.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-4">
              {[
                { icon: Briefcase, color: "text-brand", value: jobs.length, label: "Total Postings" },
                { icon: TrendingUp, color: "text-emerald-600", value: activeJobs, label: "Active Jobs" },
                { icon: Users, color: "text-brand", value: applications.length, label: "Applications" },
                { icon: FileText, color: "text-amber-600", value: pendingApplications, label: "Pending Review" },
              ].map(({ icon: Icon, color, value, label }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <Icon className={`mb-2 h-8 w-8 ${color}`} />
                  <div className="mb-1 text-3xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-600">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Job Postings */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Job Postings</h2>
                  <button onClick={() => router.push("/dashboard/employer/jobs/new")} className="rounded-lg bg-brand px-4 py-2 text-sm text-white transition hover:bg-brand-dim">
                    Post Job
                  </button>
                </div>
                <div className="p-6">
                  {jobsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-brand" />
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="py-8 text-center">
                      <Briefcase className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                      <p className="text-gray-600">No jobs posted yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.slice(0, 5).map((job) => (
                        <div key={job.id} className="rounded-lg border border-gray-200 p-4">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                            <StatusPill status={job.status} />
                          </div>
                          <p className="mb-2 text-sm text-gray-500">
                            {job.location ?? "Remote"}{job.isRemote && " · Remote"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${jobTypeColors[job.type] ?? "bg-gray-100 text-gray-700"}`}>
                              {job.type.replace("_", " ")}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-400">Posted {new Date(job.createdAt).toLocaleDateString()}</p>

                          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3">
                            <button
                              onClick={() => router.push(`/dashboard/employer/jobs/${job.id}/edit`)}
                              title="Edit"
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => togglePublish.mutate({ id: job.id })}
                              disabled={togglePublish.isPending}
                              title={job.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand disabled:opacity-50"
                            >
                              {togglePublish.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : job.status === "PUBLISHED"
                                  ? <EyeOff className="h-3.5 w-3.5" />
                                  : <Eye className="h-3.5 w-3.5" />
                              }
                              {job.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => { if (confirm("Delete this job listing?")) deleteJob.mutate({ id: job.id }); }}
                              disabled={deleteJob.isPending}
                              title="Delete"
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              {deleteJob.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Applications */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
                </div>
                <div className="p-6">
                  {applications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                      <p className="text-gray-600">No applications received yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.slice(0, 5).map((application) => {
                        const job = Array.isArray(application.job) ? application.job[0] : null;
                        return (
                          <div key={application.id} className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="mb-1 font-semibold text-gray-900">{job?.title ?? "Unknown Position"}</h3>
                                <p className="text-sm text-gray-500">{new Date(application.appliedAt).toLocaleDateString()}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${appStatusColors[application.status] ?? "bg-gray-100 text-gray-800"}`}>
                                {application.status}
                              </span>
                            </div>
                            {application.status === "APPLIED" && (
                              <button className="text-sm font-medium text-brand hover:text-brand-dim">Review Application</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}