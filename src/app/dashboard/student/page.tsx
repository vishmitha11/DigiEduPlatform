"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, GraduationCap, Layers, Clock, CheckCircle2,
  ArrowRight, Search, PlayCircle, FileText, Users,
  Loader2, BarChart3, Building2, Globe, Award, Sparkles,
} from "lucide-react";
import { api } from "~/trpc/react";
import Button from "~/app/components/ui/Button";
import Badge from "~/app/components/ui/Badge";
import EmptyState from "~/app/components/ui/EmptyState";
import ProgressBar from "~/app/components/ui/ProgressBar";

// ── Helpers ───────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE:    "info",
  COMPLETED: "success",
  PENDING:   "warning",
  FAILED:    "danger",
  WITHDRAWN: "neutral",
  SUSPENDED: "warning",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "info"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

const DELIVERY_LABELS: Record<string, string> = {
  ONLINE: "Online", ON_CAMPUS: "On Campus", HYBRID: "Hybrid", BLENDED: "Blended",
};

const TYPE_LABELS: Record<string, string> = {
  BACHELOR: "Bachelor's", MASTER: "Master's", PHD: "PhD",
  DIPLOMA: "Diploma", CERTIFICATE: "Certificate", FOUNDATION: "Foundation",
  PROFESSIONAL: "Professional", MICROCREDENTIAL: "Microcredential", SHORT_COURSE: "Short Course",
};

// ── Profile completion pie chart ──────────────────────────────────────────

const STEP_LABELS = [
  "Personal Info",
  "Academic Background",
  "Interests",
  "Career Goals",
  "Preferences",
  "Location",
];

function ProfilePieChart({ completedCount, total }: { completedCount: number; total: number }) {
  const pct = completedCount / total;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);
  const color = pct === 1 ? "#22C55E" : "#94A3B8";

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={radius} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        className="transition-[stroke-dashoffset] duration-500"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" className="font-display text-[13px] font-bold fill-slate-900">
        {completedCount}/{total}
      </text>
    </svg>
  );
}

function ProfileCompletionBanner() {
  const router = useRouter();
  const { data: profileStatus, isLoading } = api.studentProfile.getProfileStatus.useQuery();

  if (isLoading || !profileStatus?.required || profileStatus?.completed) return null;

  const completedSteps: boolean[] = profileStatus.completedSteps ?? [];
  const completedCount = completedSteps.filter(Boolean).length;
  const total = STEP_LABELS.length;
  const allComplete = completedCount === total;

  if (allComplete) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <ProfilePieChart completedCount={completedCount} total={total} />

      <div className="min-w-[200px] flex-1">
        <p className="font-display text-sm font-bold text-slate-900">
          Complete your profile to get personalised recommendations
        </p>
        <p className="mt-0.5 mb-3 text-xs text-slate-400">
          {completedCount} of {total} steps done
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STEP_LABELS.map((label, i) => {
            const done = completedSteps[i] ?? false;
            return (
              <span
                key={label}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  done
                    ? "border-brand/30 bg-brand-subtle text-brand-dim"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {done ? "✓ " : ""}{label}
              </span>
            );
          })}
        </div>
      </div>

      <Button className="flex-shrink-0" onClick={() => router.push("/profile-setup")}>
        Continue Setup <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RecommendationsCTA() {
  const router = useRouter();
  const { data: profileStatus, isLoading } = api.studentProfile.getProfileStatus.useQuery();

  if (isLoading || !profileStatus?.completed) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand/20 bg-brand-subtle p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white">
          <Sparkles className="h-4 w-4 text-brand" />
        </span>
        <div>
          <p className="font-display text-sm font-bold text-slate-900">
            Your personalised program matches are ready
          </p>
          <p className="text-xs text-slate-500">Based on your interests, goals and preferences</p>
        </div>
      </div>
      <Button className="flex-shrink-0" onClick={() => router.push("/dashboard/student/recommendations")}>
        View Recommendations <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MyLearningPage() {
  const router = useRouter();
  const [contentTab, setContentTab] = useState<"COURSES" | "PROGRAMS">("COURSES");
  const [statusTab, setStatusTab]   = useState<"ALL" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [search, setSearch]         = useState("");

  const { data: courseEnrollments = [], isLoading: coursesLoading } =
    api.studentCourse.getMyEnrollments.useQuery(undefined, { staleTime: 0 });

  const { data: programEnrollments = [], isLoading: programsLoading } =
    api.enrollment.getMyProgramEnrollments.useQuery(undefined, { staleTime: 0 });

  const courseInProgress = courseEnrollments.filter((e) => e.progressPercent < 100 && e.status === "ACTIVE").length;
  const courseCompleted  = courseEnrollments.filter((e) => e.progressPercent === 100 || e.status === "COMPLETED").length;
  const courseOverall    = courseEnrollments.length > 0
    ? Math.round(courseEnrollments.reduce((s, e) => s + e.progressPercent, 0) / courseEnrollments.length) : 0;

  const programActive    = programEnrollments.filter((e) => e.status === "ACTIVE").length;
  const programCompleted = programEnrollments.filter((e) => e.status === "COMPLETED").length;
  const programPending   = programEnrollments.filter((e) => e.status === "PENDING").length;

  const filteredCourses = courseEnrollments.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.course.title.toLowerCase().includes(q) ||
      (e.course.code?.toLowerCase().includes(q) ?? false) ||
      (e.course.program?.title.toLowerCase().includes(q) ?? false);
    const matchTab =
      statusTab === "ALL" ||
      (statusTab === "IN_PROGRESS" && e.progressPercent < 100 && e.status === "ACTIVE") ||
      (statusTab === "COMPLETED" && (e.progressPercent === 100 || e.status === "COMPLETED"));
    return matchSearch && matchTab;
  });

  const filteredPrograms = programEnrollments.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.program.title.toLowerCase().includes(q) ||
      (e.program.institution?.name.toLowerCase().includes(q) ?? false);
    const matchTab =
      statusTab === "ALL" ||
      (statusTab === "IN_PROGRESS" && e.status === "ACTIVE") ||
      (statusTab === "COMPLETED" && e.status === "COMPLETED");
    return matchSearch && matchTab;
  });

  const isLoading = contentTab === "COURSES" ? coursesLoading : programsLoading;

  const stats = contentTab === "COURSES"
    ? [
        { label: "Enrolled",    value: courseEnrollments.length, icon: BookOpen,     color: "text-brand",       bg: "bg-brand-subtle" },
        { label: "In Progress", value: courseInProgress,         icon: PlayCircle,   color: "text-amber-600",   bg: "bg-amber-50" },
        { label: "Completed",   value: courseCompleted,          icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Overall",     value: `${courseOverall}%`,      icon: BarChart3,    color: "text-brand",       bg: "bg-brand-subtle" },
      ]
    : [
        { label: "Enrolled",  value: programEnrollments.length, icon: GraduationCap, color: "text-brand",       bg: "bg-brand-subtle" },
        { label: "Active",    value: programActive,             icon: PlayCircle,    color: "text-amber-600",   bg: "bg-amber-50" },
        { label: "Completed", value: programCompleted,          icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Pending",   value: programPending,            icon: BarChart3,     color: "text-brand",       bg: "bg-brand-subtle" },
      ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900">My Learning</h1>
          <p className="mt-1 text-sm text-slate-500">Your enrolled courses, modules and programs</p>
        </div>

        {/* Profile completion banner / recommendations CTA */}
        <ProfileCompletionBanner />
        <RecommendationsCTA />

        {/* Content type toggle */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {([
              { key: "COURSES",  label: "Courses",  icon: BookOpen,      count: courseEnrollments.length },
              { key: "PROGRAMS", label: "Programs", icon: GraduationCap, count: programEnrollments.length },
            ] as const).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => { setContentTab(key); setStatusTab("ALL"); setSearch(""); }}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                  contentTab === key
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${contentTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={contentTab === "COURSES" ? "Search courses and modules…" : "Search programs or institutions…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-subtle"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(["ALL", "IN_PROGRESS", "COMPLETED"] as const).map((t) => (
              <button key={t} onClick={() => setStatusTab(t)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  statusTab === t
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "ALL" ? "All" : t === "IN_PROGRESS" ? "In Progress" : "Completed"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : contentTab === "COURSES" ? (
          filteredCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={search ? "No courses match your search" : "No courses enrolled yet"}
              description="Courses and modules you enroll in will appear here."
              action={
                <Button variant="ghost" onClick={() => router.push("/dashboard/student/courses")}>
                  Browse Courses
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((e) => {
                const lecturer = e.course.courseLecturers[0]?.lecturer;
                const lecturerName = lecturer?.profile?.fullName
                  ? `${lecturer.title ? `${lecturer.title} ` : ""}${lecturer.profile.fullName}` : null;
                const isModule = !e.course.isStandalone;
                return (
                  <div key={e.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/30 hover:shadow-md">
                    <div className={`h-2 rounded-t-xl ${e.progressPercent === 100 ? "bg-emerald-400" : e.progressPercent > 0 ? "bg-brand" : "bg-slate-200"}`} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isModule ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {isModule ? <><Layers className="h-3 w-3" /> Module</> : <><GraduationCap className="h-3 w-3" /> Course</>}
                        </span>
                        <StatusBadge status={e.status} />
                      </div>
                      <h3 className="font-semibold leading-snug text-slate-900">{e.course.title}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {e.course.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">{e.course.code}</span>}
                        {e.course.program && <span className="truncate text-xs text-slate-400">{e.course.program.title}</span>}
                      </div>
                      {lecturerName && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> {lecturerName}</p>}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{e.totalResources} resources</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{e.completedResources} done</span>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Progress</span>
                          <span className={`font-bold ${e.progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}>{e.progressPercent}%</span>
                        </div>
                        <ProgressBar value={e.progressPercent} />
                      </div>
                      <Button
                        variant={e.progressPercent === 100 ? "ghost" : "primary"}
                        className="mt-4 w-full"
                        onClick={() => router.push(`/dashboard/student/courses/${e.courseId}/learn`)}
                      >
                        {e.progressPercent === 0 ? "Start Learning" : e.progressPercent === 100 ? "Review Course" : "Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredPrograms.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={search ? "No programs match your search" : "No programs enrolled yet"}
              description="Programs you enroll in will appear here."
              action={
                <Button variant="ghost" onClick={() => router.push("/dashboard/student/programs")}>
                  Browse Programs
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((e) => {
                const totalModules     = e.program._count?.courses ?? 0;
                const completedModules = e.completedCourses ?? 0;
                const progressPercent  = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                return (
                  <div key={e.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/30 hover:shadow-md">
                    <div className={`h-2 rounded-t-xl ${progressPercent === 100 ? "bg-emerald-400" : progressPercent > 0 ? "bg-brand" : "bg-slate-200"}`} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-dim">
                          <Award className="h-3 w-3" />{TYPE_LABELS[e.program.type] ?? e.program.type}
                        </span>
                        <StatusBadge status={e.status} />
                      </div>
                      <h3 className="font-semibold leading-snug text-slate-900">{e.program.title}</h3>
                      {e.program.institution && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="truncate">{e.program.institution.name}</span>
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        {e.program.durationMonths && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {e.program.durationMonths >= 12 ? `${Math.round(e.program.durationMonths / 12)} yr${e.program.durationMonths >= 24 ? "s" : ""}` : `${e.program.durationMonths} months`}
                          </span>
                        )}
                        {e.program.deliveryMode && (
                          <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{DELIVERY_LABELS[e.program.deliveryMode] ?? e.program.deliveryMode}</span>
                        )}
                        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{totalModules} modules</span>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{completedModules}/{totalModules} modules complete</span>
                          <span className={`font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}>{progressPercent}%</span>
                        </div>
                        <ProgressBar value={progressPercent} />
                      </div>
                      <Button
                        variant={progressPercent === 100 ? "ghost" : "primary"}
                        className="mt-4 w-full"
                        onClick={() => router.push(`/dashboard/student/programs/${e.programId}/learn`)}
                      >
                        {progressPercent === 0 ? "Start Program" : progressPercent === 100 ? "View Program" : "Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
