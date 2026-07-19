"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Award,
  Briefcase,
  TrendingUp,
  Loader2,
  AlertCircle,
  GraduationCap,
  Layers,
  ArrowRight,
  CheckCircle2,
  Building2,
  Globe,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import SetupIncompleteBanner from "./SetupIncompleteBanner";

interface ProgramEnrollment {
  id: string;
  programId: string;
  status: string;
  programTitle: string | null;
  institutionName: string | null;
  deliveryMode: string | null;
  durationMonths: number | null;
  totalModules: number;
  completedModules: number;
}

interface JobApplication {
  id: string;
  status: string;
  appliedAt: string;
  jobTitle: string | null;
  companyName: string | null;
}

interface Credential {
  id: string;
  title: string;
  credentialType: string;
  issueDate: string | null;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all ${percent === 100 ? "bg-emerald-500" : "bg-brand"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const DELIVERY_LABELS: Record<string, string> = {
  ONLINE: "Online",
  ON_CAMPUS: "On Campus",
  HYBRID: "Hybrid",
  BLENDED: "Blended",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-yellow-100 text-yellow-800",
  SHORTLISTED: "bg-blue-100 text-blue-800",
  INTERVIEW: "bg-purple-100 text-purple-800",
  OFFERED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WITHDRAWN: "bg-gray-100 text-gray-800",
};

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [learningTab, setLearningTab] = useState<"COURSES" | "PROGRAMS">(
    "COURSES",
  );
  const [programEnrollments, setProgramEnrollments] = useState<
    ProgramEnrollment[]
  >([]);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);

  const { data: courseEnrollments = [], isLoading: coursesLoading } =
    api.studentCourse.getMyEnrollments.useQuery(undefined, {
      enabled: !!studentId,
      staleTime: 0,
    });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("Profile")
        .select("fullName")
        .eq("id", user.id)
        .single();
      setFullName(profile?.fullName ?? null);
      const { data: student } = await supabase
        .from("Student")
        .select("id")
        .eq("profileId", user.id)
        .single();
      if (student) {
        setSetupComplete(true);
        setStudentId(student.id);
        await fetchDashboardData(student.id);
      } else {
        setSetupComplete(false);
        setLoading(false);
      }
    };
    void init();
  }, []);

  const fetchDashboardData = async (sId: string) => {
    try {
      setLoading(true);
      const [enrollmentsRes, jobAppsRes, credentialsRes] = await Promise.all([
        supabase
          .from("Enrollment")
          .select(
            `
            id, status,
            program:Program(id, title, deliveryMode, durationMonths, institution:Institution(name), courses:Course(id)),
            courseEnrollments:CourseEnrollment(id, status)
          `,
          )
          .eq("studentId", sId)
          .neq("status", "WITHDRAWN"),
        supabase
          .from("JobApplication")
          .select(
            "id, status, appliedAt, job:JobListing(title, employer:Employer(companyName))",
          )
          .eq("studentId", sId)
          .order("appliedAt", { ascending: false })
          .limit(5),
        supabase
          .from("Credential")
          .select("id, title, credentialType, issueDate")
          .eq("studentId", sId)
          .order("issueDate", { ascending: false }),
      ]);

      if (enrollmentsRes.data) {
        setProgramEnrollments(
          enrollmentsRes.data.map((e: any) => {
            const program = Array.isArray(e.program) ? e.program[0] : e.program;
            const institution = Array.isArray(program?.institution)
              ? program.institution[0]
              : program?.institution;
            const allCourses = Array.isArray(program?.courses)
              ? program.courses
              : [];
            const courseEnrols = Array.isArray(e.courseEnrollments)
              ? e.courseEnrollments
              : [];
            return {
              id: e.id,
              programId: program?.id ?? "",
              status: e.status,
              programTitle: program?.title ?? null,
              institutionName: institution?.name ?? null,
              deliveryMode: program?.deliveryMode ?? null,
              durationMonths: program?.durationMonths ?? null,
              totalModules: allCourses.length,
              completedModules: courseEnrols.filter(
                (c: any) => c.status === "COMPLETED",
              ).length,
            };
          }),
        );
      }

      if (jobAppsRes.data) {
        setJobApplications(
          jobAppsRes.data.map((a: any) => {
            const job = Array.isArray(a.job) ? a.job[0] : a.job;
            const employer = Array.isArray(job?.employer)
              ? job.employer[0]
              : job?.employer;
            return {
              id: a.id,
              status: a.status,
              appliedAt: a.appliedAt,
              jobTitle: job?.title ?? null,
              companyName: employer?.companyName ?? null,
            };
          }),
        );
      }

      if (credentialsRes.data)
        setCredentials(credentialsRes.data as Credential[]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
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

  const inProgressCourses = courseEnrollments.filter(
    (e) => e.progressPercent < 100 && e.status === "ACTIVE",
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!setupComplete && <SetupIncompleteBanner role="STUDENT" />}

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-gray-900">
              Student Dashboard
            </h1>
            <p className="font-medium text-gray-600">
              Welcome back,{" "}
              <span className="text-brand-dim">{fullName ?? "Student"}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard/student/programs")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Browse Programs
            </button>
            <button
              onClick={() => router.push("/dashboard/student/courses")}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dim"
            >
              Browse Courses
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<GraduationCap className="h-5 w-5 text-brand" />}
            bg="bg-brand-subtle"
            count={programEnrollments.length}
            label="Programs Enrolled"
            onClick={() => {
              setLearningTab("PROGRAMS");
              window.scrollTo({ top: 320, behavior: "smooth" });
            }}
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-brand" />}
            bg="bg-brand-subtle"
            count={courseEnrollments.length}
            label="Courses Enrolled"
            onClick={() => {
              setLearningTab("COURSES");
              window.scrollTo({ top: 320, behavior: "smooth" });
            }}
          />
          <StatCard
            icon={<Award className="h-5 w-5 text-amber-600" />}
            bg="bg-amber-50"
            count={credentials.length}
            label="Certificates Earned"
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
            count={jobApplications.length}
            label="Job Applications"
          />
        </div>

        {/* My Learning */}
        {setupComplete && (
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">My Learning</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {learningTab === "COURSES"
                    ? `${courseEnrollments.length} enrolled · ${inProgressCourses} in progress`
                    : `${programEnrollments.length} program${programEnrollments.length !== 1 ? "s" : ""} enrolled`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {(["COURSES", "PROGRAMS"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLearningTab(t)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${learningTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {t === "COURSES" ? "Courses" : "Programs"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    router.push(
                      learningTab === "COURSES"
                        ? "/dashboard/student"
                        : "/dashboard/student/programs",
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-brand-subtle px-3 py-1.5 text-xs font-semibold text-brand-dim transition hover:bg-brand-glow"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Courses tab */}
            {learningTab === "COURSES" &&
              (coursesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              ) : courseEnrollments.length === 0 ? (
                <EmptyTabState
                  icon={<BookOpen className="h-10 w-10 text-gray-200" />}
                  message="No courses enrolled yet"
                  sub="Courses you enroll in will appear here."
                  action={{
                    label: "Browse Courses",
                    onClick: () => router.push("/dashboard/student/courses"),
                  }}
                />
              ) : (
                <div className="divide-y divide-gray-50">
                  {courseEnrollments.slice(0, 4).map((e) => {
                    const lecturer = e.course.courseLecturers[0]?.lecturer;
                    const lecturerName = lecturer?.profile?.fullName ?? null;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                          <GraduationCap className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {e.course.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            {e.course.code && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                                {e.course.code}
                              </span>
                            )}
                            {lecturerName && <span>{lecturerName}</span>}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar percent={e.progressPercent} />
                            </div>
                            <span
                              className={`flex-shrink-0 text-xs font-bold ${e.progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}
                            >
                              {e.progressPercent}%
                            </span>
                          </div>
                        </div>
                        <div className="hidden flex-shrink-0 flex-col items-end gap-1 text-xs text-slate-400 sm:flex">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {e.completedResources}/{e.totalResources}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${e.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {e.status === "COMPLETED" ? "Completed" : "Active"}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/student/courses/${e.courseId}/learn`,
                            )
                          }
                          className="flex-shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          {e.progressPercent === 0
                            ? "Start"
                            : e.progressPercent === 100
                              ? "Review"
                              : "Continue"}
                        </button>
                      </div>
                    );
                  })}
                  {courseEnrollments.length > 4 && (
                    <div className="px-6 py-3 text-center">
                      <button
                        onClick={() => router.push("/dashboard/student")}
                        className="text-xs font-semibold text-brand hover:text-brand-dim"
                      >
                        + {courseEnrollments.length - 4} more courses →
                      </button>
                    </div>
                  )}
                </div>
              ))}

            {/* Programs tab */}
            {learningTab === "PROGRAMS" &&
              (programEnrollments.length === 0 ? (
                <EmptyTabState
                  icon={<GraduationCap className="h-10 w-10 text-gray-200" />}
                  message="No programs enrolled yet"
                  sub="Programs you enroll in will appear here."
                  action={{
                    label: "Browse Programs",
                    onClick: () => router.push("/dashboard/student/programs"),
                  }}
                />
              ) : (
                <div className="divide-y divide-gray-50">
                  {programEnrollments.slice(0, 4).map((e) => {
                    const progressPercent =
                      e.totalModules > 0
                        ? Math.round(
                            (e.completedModules / e.totalModules) * 100,
                          )
                        : 0;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-subtle">
                          <GraduationCap className="h-5 w-5 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {e.programTitle ?? "—"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                            {e.institutionName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {e.institutionName}
                              </span>
                            )}
                            {e.deliveryMode && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {DELIVERY_LABELS[e.deliveryMode] ??
                                  e.deliveryMode}
                              </span>
                            )}
                            {e.durationMonths && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {e.durationMonths >= 12
                                  ? `${Math.round(e.durationMonths / 12)} yr${e.durationMonths >= 24 ? "s" : ""}`
                                  : `${e.durationMonths} months`}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar percent={progressPercent} />
                            </div>
                            <span
                              className={`flex-shrink-0 text-xs font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}
                            >
                              {progressPercent}%
                            </span>
                          </div>
                        </div>
                        <div className="hidden flex-shrink-0 flex-col items-end gap-1 text-xs text-slate-400 sm:flex">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {e.completedModules}/{e.totalModules} modules
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              e.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : e.status === "ACTIVE"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {e.status.charAt(0) +
                              e.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/student/programs/${e.programId}/learn`,
                            )
                          }
                          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            progressPercent === 100
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : progressPercent > 0
                                ? "bg-brand text-white hover:bg-brand-dim"
                                : "bg-slate-900 text-white hover:bg-slate-700"
                          }`}
                        >
                          {progressPercent === 0
                            ? "Start"
                            : progressPercent === 100
                              ? "Review"
                              : "Continue"}
                        </button>
                      </div>
                    );
                  })}
                  {programEnrollments.length > 4 && (
                    <div className="px-6 py-3 text-center">
                      <button
                        onClick={() =>
                          router.push("/dashboard/student/programs")
                        }
                        className="text-xs font-semibold text-brand hover:text-brand-dim"
                      >
                        + {programEnrollments.length - 4} more programs →
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Job Applications */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Job Applications
            </h2>
            <button
              onClick={() => router.push("/dashboard/student/careers")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-subtle px-3 py-1.5 text-xs font-semibold text-brand-dim transition hover:bg-brand-glow"
            >
              Browse Jobs <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-6">
            {jobApplications.length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p className="font-medium text-gray-600">
                  No job applications yet
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Browse career opportunities and apply.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {jobApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-start justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {app.jobTitle ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {app.companyName ?? "—"} ·{" "}
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${JOB_STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Career CTA */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row">
          <div className="flex items-center gap-6">
            <div className="rounded-2xl bg-brand p-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Career Recommendations
              </h3>
              <p className="text-gray-500">
                Explore career paths based on your credentials
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!setupComplete) {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4000);
                return;
              }
              router.push("/career-map");
            }}
            className="rounded-xl bg-gray-900 px-8 py-3 font-bold text-white transition hover:bg-gray-800"
          >
            View Career Map
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-5 py-4 shadow-xl">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Profile setup incomplete
            </p>
            <p className="text-sm text-gray-500">
              Complete your profile to access the Career Map.
            </p>
          </div>
          <button
            onClick={() => router.push("/profile-setup")}
            className="ml-2 shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600"
          >
            Setup Now
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  bg,
  count,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  count: number;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition ${onClick ? "cursor-pointer hover:border-brand/30 hover:shadow-md" : ""}`}
    >
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}
      >
        {icon}
      </div>
      <div className="mb-1 text-3xl font-black text-gray-900">{count}</div>
      <div className="text-xs font-bold tracking-widest text-gray-400 uppercase">
        {label}
      </div>
    </div>
  );
}

function EmptyTabState({
  icon,
  message,
  sub,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="font-medium text-gray-600">{message}</p>
      <p className="mt-1 text-sm text-gray-400">{sub}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dim"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
