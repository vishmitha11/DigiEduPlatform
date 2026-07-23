"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Clock, Globe,
  GraduationCap, CheckCircle2, Layers, Loader2,
  ChevronDown, ChevronUp, Award, AlertCircle,
  BookOpen, MapPin, BadgeCheck, PlayCircle,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import Button from "~/app/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
  type: string;
  level: string;
  field: string;
  deliveryMode: string;
  durationMonths: number | null;
  localPrice: number | null;
  foreignPrice: number | null;
  scholarshipAvailable: boolean;
  description: string | null;
  entryRequirements: string | null;
  careerOutcomes: string | null;
  language: string[];
  creditPoints: number | null;
  institution: {
    name: string; logoUrl: string | null; type: string;
    description: string | null; city: string | null;
  } | null;
  courses: {
    id: string; title: string; code: string | null;
    isMandatory: boolean; orderIndex: number; description: string | null;
  }[];
}

interface CourseEnrollmentStatus {
  courseId: string;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const DELIVERY_LABELS: Record<string, string> = {
  ONLINE: "Online", ON_CAMPUS: "On Campus", HYBRID: "Hybrid", BLENDED: "Blended",
};
const TYPE_LABELS: Record<string, string> = {
  BACHELOR: "Bachelor's", MASTER: "Master's", PHD: "PhD",
  DIPLOMA: "Diploma", CERTIFICATE: "Certificate", FOUNDATION: "Foundation",
  PROFESSIONAL: "Professional", MICROCREDENTIAL: "Microcredential", SHORT_COURSE: "Short Course",
};
const MODULE_STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  FAILED:    "bg-red-100 text-red-600",
  WITHDRAWN: "bg-slate-100 text-slate-500",
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function StudentProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();
  const utils    = api.useUtils();

  const [program, setProgram]             = useState<Program | null>(null);
  const [loading, setLoading]             = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [enrolling, setEnrolling]         = useState(false);
  const [enrollError, setEnrollError]     = useState<string | null>(null);
  const [user, setUser]                   = useState<any>(null);
  const [moduleStatuses, setModuleStatuses] = useState<CourseEnrollmentStatus[]>([]);

  const { data: existingEnrollment, isLoading: enrollmentLoading } =
    api.enrollment.checkProgramEnrollment.useQuery(
      { programId: id ?? "" },
      { enabled: !!id && !!user, staleTime: 0 },
    );

  const isEnrolled = !!existingEnrollment;

  const enrollMutation = api.enrollment.enrollInProgram.useMutation({
    onSuccess: async (data) => {
      if (data.type === "enrolled") {
        await utils.enrollment.checkProgramEnrollment.invalidate({ programId: id });
        setEnrolling(false);
      } else if (data.type === "payment_required") {
        router.push(`/payment?enrollmentId=${data.enrollmentId}&paymentId=${data.paymentId}&amount=${data.amount}&title=${encodeURIComponent(data.programTitle ?? "")}`);
      }
    },
    onError: (e) => { setEnrollError(e.message); setEnrolling(false); },
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    void init();
  }, []);

  // Fetch program data
  useEffect(() => {
    if (!id) return;
    const fetchProgram = async () => {
      const { data } = await supabase
        .from("Program")
        .select(`
          id, title, type, level, field, deliveryMode,
          durationMonths, localPrice, foreignPrice,
          scholarshipAvailable, description, entryRequirements,
          careerOutcomes, language, creditPoints,
          institution:Institution(name, logoUrl, type, description, city),
          courses:Course(id, title, code, isMandatory, orderIndex, description)
        `)
        .eq("id", id)
        .eq("isPublished", true)
        .eq("approvalStatus", "APPROVED")
        .single();

      if (data) {
        setProgram({
          ...data,
          institution: Array.isArray(data.institution) ? data.institution[0] ?? null : data.institution,
          localPrice:  data.localPrice  ? Number(data.localPrice)  : null,
          foreignPrice: data.foreignPrice ? Number(data.foreignPrice) : null,
          courses: ((data.courses as any[]) ?? [])
            .sort((a, b) => a.orderIndex - b.orderIndex),
        } as Program);
      }
      setLoading(false);
    };
    void fetchProgram();
  }, [id]);

  // Fetch module enrollment statuses when enrolled
  useEffect(() => {
    if (!isEnrolled || !existingEnrollment?.id) return;
    const fetchModuleStatuses = async () => {
      const { data } = await supabase
        .from("CourseEnrollment")
        .select("courseId, status")
        .eq("enrollmentId", existingEnrollment.id);
      if (data) setModuleStatuses(data as CourseEnrollmentStatus[]);
    };
    void fetchModuleStatuses();
  }, [isEnrolled, existingEnrollment]);

  const moduleStatusMap = Object.fromEntries(
    moduleStatuses.map((m) => [m.courseId, m.status])
  );

  const handleEnroll = () => {
    if (!user) { router.push(`/login?redirect=/dashboard/student/programs/${id}`); return; }
    setEnrolling(true);
    setEnrollError(null);
    enrollMutation.mutate({ programId: id! });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-medium text-slate-600">Program not found.</p>
          <button onClick={() => router.push("/dashboard/student/programs")}
            className="mt-3 text-sm text-brand hover:underline">
            Back to Programs
          </button>
        </div>
      </div>
    );
  }

  const isFree = !program.localPrice || program.localPrice === 0;
  const mandatoryCount = program.courses.filter((c) => c.isMandatory).length;
  const electiveCount  = program.courses.length - mandatoryCount;
  const completedCount = moduleStatuses.filter((m) => m.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push("/dashboard/student/programs")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Programs
          </button>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">

            {/* Left — program info */}
            <div className="lg:col-span-2">
              {/* Badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand-dim">
                  <Award className="h-3.5 w-3.5" />
                  {TYPE_LABELS[program.type] ?? program.type}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                  {program.level.replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {program.field.replace(/_/g, " ")}
                </span>
                {program.scholarshipAvailable && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                    <GraduationCap className="h-3.5 w-3.5" /> Scholarship Available
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl font-bold leading-tight text-slate-900">{program.title}</h1>

              {/* Institution line */}
              {program.institution && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {program.institution.name}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{program.institution.type.replace(/_/g, " ")}</span>
                  {program.institution.city && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{program.institution.city}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Meta pills */}
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  program.durationMonths && {
                    icon: <Clock className="h-4 w-4" />,
                    label: program.durationMonths >= 12
                      ? `${Math.round(program.durationMonths / 12)} Year${program.durationMonths >= 24 ? "s" : ""}`
                      : `${program.durationMonths} Months`,
                  },
                  { icon: <Globe className="h-4 w-4" />, label: DELIVERY_LABELS[program.deliveryMode] ?? program.deliveryMode },
                  { icon: <Layers className="h-4 w-4" />, label: `${program.courses.length} Modules` },
                  program.language.length > 0 && { icon: <BookOpen className="h-4 w-4" />, label: program.language.join(", ") },
                  program.creditPoints && { icon: <BadgeCheck className="h-4 w-4" />, label: `${program.creditPoints} Credits` },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    <span className="text-slate-400">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Description */}
              {program.description && (
                <p className="mt-6 leading-relaxed text-slate-600">{program.description}</p>
              )}
            </div>

            {/* Right — enrollment card (sticky on desktop) */}
            <div>
              <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">

                {/* Price */}
                <div className="mb-5 border-b border-slate-100 pb-5">
                  {isFree ? (
                    <div>
                      <span className="text-3xl font-black text-brand">Free</span>
                      <p className="mt-0.5 text-sm text-slate-400">No payment required</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-black text-slate-900">
                        LKR {program.localPrice?.toLocaleString()}
                      </span>
                      {program.foreignPrice && (
                        <p className="mt-0.5 text-sm text-slate-400">
                          USD {program.foreignPrice.toLocaleString()} for international students
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Enroll / enrolled state */}
                {enrollmentLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : isEnrolled ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 rounded-xl bg-brand-subtle px-4 py-3 text-sm font-semibold text-brand-dim">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      You are enrolled in this program
                    </div>
                    {isEnrolled && program.courses.length > 0 && (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                        <p className="text-xs text-slate-400">Module progress</p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900">
                          {completedCount}/{program.courses.length}
                          <span className="ml-1 text-xs font-normal text-slate-400">completed</span>
                        </p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                          <div
                            className="h-1.5 rounded-full bg-brand transition-all"
                            style={{ width: `${program.courses.length > 0 ? Math.round((completedCount / program.courses.length) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button className="w-full rounded-xl py-3" onClick={() => router.push("/dashboard/student")}>
                      Go to My Learning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full rounded-xl py-3.5"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</>
                        : isFree ? "Enroll for Free" : "Enroll Now"
                      }
                    </Button>
                    {enrollError && (
                      <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{enrollError}
                      </p>
                    )}
                    {!user && (
                      <p className="text-center text-xs text-slate-400">You'll be asked to sign in first</p>
                    )}
                  </div>
                )}

                {/* Included features */}
                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                  {[
                    { icon: <Layers className="h-3.5 w-3.5" />,      label: `${program.courses.length} modules included` },
                    { icon: <Globe className="h-3.5 w-3.5" />,       label: DELIVERY_LABELS[program.deliveryMode] ?? program.deliveryMode },
                    ...(program.creditPoints ? [{ icon: <Award className="h-3.5 w-3.5" />, label: `${program.creditPoints} credit points` }] : []),
                    ...(program.scholarshipAvailable ? [{ icon: <GraduationCap className="h-3.5 w-3.5" />, label: "Scholarship available" }] : []),
                    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Certificate on completion" },
                  ].map(({ icon, label }, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="flex-shrink-0 text-slate-400">{icon}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">

            {/* Modules */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Program Modules</h2>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {mandatoryCount} core · {electiveCount} elective
                  </p>
                </div>
                <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-dim">
                  {program.courses.length} total
                </span>
              </div>

              <div className="space-y-2">
                {program.courses.map((course, idx) => {
                  const moduleStatus = moduleStatusMap[course.id];
                  const isExpanded   = expandedCourse === course.id;

                  return (
                    <div
                      key={course.id}
                      className={`overflow-hidden rounded-xl border bg-white transition ${
                        moduleStatus === "COMPLETED"
                          ? "border-emerald-100"
                          : moduleStatus === "ACTIVE"
                            ? "border-blue-100"
                            : "border-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left"
                      >
                        {/* Index / completion indicator */}
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          moduleStatus === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : moduleStatus === "ACTIVE"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          {moduleStatus === "COMPLETED"
                            ? <CheckCircle2 className="h-4 w-4" />
                            : idx + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{course.title}</p>
                          {course.code && (
                            <span className="font-mono text-xs text-slate-400">{course.code}</span>
                          )}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {!course.isMandatory && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                              Elective
                            </span>
                          )}
                          {moduleStatus && (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${MODULE_STATUS_STYLES[moduleStatus] ?? ""}`}>
                              {moduleStatus.charAt(0) + moduleStatus.slice(1).toLowerCase()}
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                          }
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                          {course.description && (
                            <p className="mb-3 text-sm leading-relaxed text-slate-500">{course.description}</p>
                          )}
                          {isEnrolled && moduleStatus && (
                            <button
                              onClick={() => router.push(`/dashboard/student/courses/${course.id}/learn`)}
                              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                moduleStatus === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-brand text-white hover:bg-brand-dim"
                              }`}
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              {moduleStatus === "COMPLETED" ? "Review Module" : "Go to Module"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Entry Requirements */}
            {program.entryRequirements && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-slate-900">Entry Requirements</h2>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-6">
                  <p className="text-sm leading-relaxed text-amber-900">{program.entryRequirements}</p>
                </div>
              </section>
            )}

            {/* Career Outcomes */}
            {program.careerOutcomes && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-slate-900">Career Outcomes</h2>
                <p className="leading-relaxed text-slate-600">{program.careerOutcomes}</p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Institution card */}
            {program.institution && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">About the Institution</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    {program.institution.logoUrl
                      ? <img src={program.institution.logoUrl} alt={program.institution.name} className="h-10 w-10 rounded-lg object-cover" />
                      : <Building2 className="h-5 w-5 text-slate-400" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{program.institution.name}</p>
                    <p className="text-xs text-slate-400">{program.institution.type.replace(/_/g, " ")}</p>
                    {program.institution.city && (
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />{program.institution.city}
                      </p>
                    )}
                  </div>
                </div>
                {program.institution.description && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-500">{program.institution.description}</p>
                )}
              </div>
            )}

            {/* Quick facts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-900">Quick Facts</h3>
              <div className="space-y-3">
                {[
                  { label: "Type",      value: TYPE_LABELS[program.type] ?? program.type },
                  { label: "Level",     value: program.level.replace(/_/g, " ") },
                  { label: "Delivery",  value: DELIVERY_LABELS[program.deliveryMode] ?? program.deliveryMode },
                  ...(program.durationMonths ? [{
                    label: "Duration",
                    value: program.durationMonths >= 12
                      ? `${Math.round(program.durationMonths / 12)} Year${program.durationMonths >= 24 ? "s" : ""}`
                      : `${program.durationMonths} Months`,
                  }] : []),
                  ...(program.creditPoints ? [{ label: "Credits", value: `${program.creditPoints} points` }] : []),
                  { label: "Language",  value: program.language.join(", ") || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}