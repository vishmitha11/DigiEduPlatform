"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, GraduationCap, Layers, Clock, CheckCircle2,
  ArrowRight, Search, PlayCircle, FileText, Users,
  Loader2, BarChart3, Building2, Globe, Award,
} from "lucide-react";
import { api } from "~/trpc/react";

// ── Helpers ───────────────────────────────────────────────────────────────

function ProgressBar({ percent, color = "blue" }: { percent: number; color?: "blue" | "violet" }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${
          percent === 100 ? "bg-emerald-500"
          : color === "violet" ? "bg-violet-500"
          : "bg-blue-500"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:    "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    PENDING:   "bg-amber-100 text-amber-700",
    FAILED:    "bg-red-100 text-red-600",
    WITHDRAWN: "bg-slate-100 text-slate-500",
    SUSPENDED: "bg-orange-100 text-orange-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] ?? map.ACTIVE}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
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
  const color = pct === 1 ? "#22C55E" : pct >= 0.5 ? "#38BDF8" : "#A3E635";

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(136,153,187,0.12)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={radius} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "13px", fontWeight: 700, fill: "#F5F5F0", fontFamily: "Sora, sans-serif" }}>
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
    <div style={{
      background: "linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(30,43,85,0.95) 100%)",
      border: "1px solid rgba(34,197,94,0.22)",
      borderRadius: "14px",
      padding: "20px 24px",
      marginBottom: "28px",
      display: "flex",
      alignItems: "center",
      gap: "20px",
      flexWrap: "wrap",
    }}>
      {/* Pie chart */}
      <ProfilePieChart completedCount={completedCount} total={total} />

      {/* Text + steps */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: "15px", color: "#F5F5F0", margin: "0 0 4px" }}>
          Complete your profile to get personalised recommendations
        </p>
        <p style={{ fontSize: "12px", color: "rgba(136,153,187,0.65)", margin: "0 0 12px" }}>
          {completedCount} of {total} steps done
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {STEP_LABELS.map((label, i) => {
            const done = completedSteps[i] ?? false;
            return (
              <span key={label} style={{
                fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "12px",
                background: done ? "rgba(34,197,94,0.12)" : "rgba(136,153,187,0.08)",
                border: done ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(136,153,187,0.15)",
                color: done ? "#22C55E" : "rgba(136,153,187,0.55)",
              }}>
                {done ? "✓ " : ""}{label}
              </span>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/profile-setup")}
        style={{
          background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
          border: "none", borderRadius: "9px", padding: "11px 20px",
          color: "#0A0F1E", fontSize: "13px", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center",
          gap: "7px", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        Continue Setup <ArrowRight style={{ width: "14px", height: "14px" }} />
      </button>
    </div>
  );
}

function RecommendationsCTA() {
  const router = useRouter();
  const { data: profileStatus, isLoading } = api.studentProfile.getProfileStatus.useQuery();

  if (isLoading || !profileStatus?.completed) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(30,43,85,0.95) 100%)",
      border: "1px solid rgba(34,197,94,0.22)",
      borderRadius: "14px",
      padding: "20px 24px",
      marginBottom: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "20px",
      flexWrap: "wrap",
    }}>
      <div>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: "15px", color: "#F5F5F0", margin: "0 0 4px" }}>
          Your personalised program matches are ready
        </p>
        <p style={{ fontSize: "12px", color: "rgba(136,153,187,0.65)", margin: 0 }}>
          Based on your interests, goals and preferences
        </p>
      </div>
      <button
        onClick={() => router.push("/dashboard/student/recommendations")}
        style={{
          background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
          border: "none", borderRadius: "9px", padding: "11px 20px",
          color: "#0A0F1E", fontSize: "13px", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center",
          gap: "7px", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        View Recommendations <ArrowRight style={{ width: "14px", height: "14px" }} />
      </button>
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
        { label: "Enrolled",    value: courseEnrollments.length, icon: BookOpen,     color: "text-blue-600",    bg: "bg-blue-50" },
        { label: "In Progress", value: courseInProgress,         icon: PlayCircle,   color: "text-amber-600",   bg: "bg-amber-50" },
        { label: "Completed",   value: courseCompleted,          icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Overall",     value: `${courseOverall}%`,      icon: BarChart3,    color: "text-violet-600",  bg: "bg-violet-50" },
      ]
    : [
        { label: "Enrolled",  value: programEnrollments.length, icon: GraduationCap, color: "text-violet-600",  bg: "bg-violet-50" },
        { label: "Active",    value: programActive,             icon: PlayCircle,    color: "text-amber-600",   bg: "bg-amber-50" },
        { label: "Completed", value: programCompleted,          icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Pending",   value: programPending,            icon: BarChart3,     color: "text-blue-600",    bg: "bg-blue-50" },
      ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Learning</h1>
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
                    ? key === "PROGRAMS" ? "bg-violet-600 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm"
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
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(["ALL", "IN_PROGRESS", "COMPLETED"] as const).map((t) => (
              <button key={t} onClick={() => setStatusTab(t)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  statusTab === t
                    ? contentTab === "PROGRAMS" ? "bg-violet-600 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm"
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
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : contentTab === "COURSES" ? (
          filteredCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-slate-200" />}
              message={search ? "No courses match your search" : "No courses enrolled yet"}
              sub="Courses and modules you enroll in will appear here."
              onBrowse={() => router.push("/dashboard/student/courses")}
              browseLabel="Browse Courses"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((e) => {
                const lecturer = e.course.courseLecturers[0]?.lecturer;
                const lecturerName = lecturer?.profile?.fullName
                  ? `${lecturer.title ? `${lecturer.title} ` : ""}${lecturer.profile.fullName}` : null;
                const isModule = !e.course.isStandalone;
                return (
                  <div key={e.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <div className={`h-2 rounded-t-xl ${e.progressPercent === 100 ? "bg-emerald-400" : e.progressPercent > 0 ? "bg-blue-400" : "bg-slate-200"}`} />
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
                          <span className={`font-bold ${e.progressPercent === 100 ? "text-emerald-600" : "text-blue-600"}`}>{e.progressPercent}%</span>
                        </div>
                        <ProgressBar percent={e.progressPercent} color="blue" />
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/student/courses/${e.courseId}/learn`)}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${e.progressPercent === 100 ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        {e.progressPercent === 0 ? "Start Learning" : e.progressPercent === 100 ? "Review Course" : "Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredPrograms.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-12 w-12 text-slate-200" />}
              message={search ? "No programs match your search" : "No programs enrolled yet"}
              sub="Programs you enroll in will appear here."
              onBrowse={() => router.push("/dashboard/student/programs")}
              browseLabel="Browse Programs"
              violet
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((e) => {
                const totalModules     = e.program._count?.courses ?? 0;
                const completedModules = e.completedCourses ?? 0;
                const progressPercent  = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                return (
                  <div key={e.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md">
                    <div className={`h-2 rounded-t-xl bg-gradient-to-r ${progressPercent === 100 ? "from-emerald-400 to-teal-400" : progressPercent > 0 ? "from-violet-500 to-blue-500" : "from-slate-200 to-slate-300"}`} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
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
                          <span className={`font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-violet-600"}`}>{progressPercent}%</span>
                        </div>
                        <ProgressBar percent={progressPercent} color="violet" />
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/student/programs/${e.programId}/learn`)}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${progressPercent === 100 ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : progressPercent > 0 ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-900 text-white hover:bg-slate-700"}`}
                      >
                        {progressPercent === 0 ? "Start Program" : progressPercent === 100 ? "View Program" : "Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
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

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ icon, message, sub, onBrowse, browseLabel, violet = false }: {
  icon: React.ReactNode; message: string; sub: string;
  onBrowse: () => void; browseLabel: string; violet?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex justify-center">{icon}</div>
      <p className="font-medium text-slate-600">{message}</p>
      <p className="mt-1 text-sm text-slate-400">{sub}</p>
      <button onClick={onBrowse} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${violet ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700"}`}>
        {browseLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}