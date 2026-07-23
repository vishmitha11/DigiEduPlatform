"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, Loader2, CheckCircle2, AlertCircle,
  FileText, Video, Link2, AlignLeft, ChevronDown, ChevronUp,
  Users, BookOpen, PlayCircle, Lock,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import Button from "~/app/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────

interface CourseDetail {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  localPrice: number | null;
  foreignPrice: number | null;
  createdAt: string;
  createdBy: {
    title: string | null; bio: string | null;
    profile: { fullName: string | null } | null;
  } | null;
  sections: {
    id: string; title: string; description: string | null;
    instructions: string | null; orderIndex: number;
    resources: {
      id: string; title: string; type: string;
      durationMins: number | null; description: string | null;
    }[];
  }[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  PDF:           <FileText className="h-4 w-4 text-red-500" />,
  VIDEO_UPLOAD:  <Video className="h-4 w-4 text-blue-500" />,
  VIDEO_LINK:    <Video className="h-4 w-4 text-purple-500" />,
  IMAGE:         <FileText className="h-4 w-4 text-green-500" />,
  PRESENTATION:  <FileText className="h-4 w-4 text-orange-500" />,
  EXTERNAL_LINK: <Link2 className="h-4 w-4 text-slate-500" />,
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  PDF: "PDF", VIDEO_UPLOAD: "Video", VIDEO_LINK: "Video Link",
  IMAGE: "Image", PRESENTATION: "Slides", EXTERNAL_LINK: "Link",
};

function formatDuration(mins: number | null | undefined): string | null {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function StudentCourseDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();
  const utils    = api.useUtils();

  const [course, setCourse]                   = useState<CourseDetail | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [enrolling, setEnrolling]             = useState(false);
  const [enrollError, setEnrollError]         = useState<string | null>(null);
  const [user, setUser]                       = useState<any>(null);

  const { data: existingEnrollment, isLoading: enrollmentLoading } =
    api.enrollment.checkCourseEnrollment.useQuery(
      { courseId: id ?? "" },
      { enabled: !!id && !!user, staleTime: 0 },
    );

  const isEnrolled = !!existingEnrollment;

  const enrollMutation = api.enrollment.enrollInCourse.useMutation({
    onSuccess: async (data) => {
      if (data.type === "enrolled") {
        await utils.enrollment.checkCourseEnrollment.invalidate({ courseId: id });
        setEnrolling(false);
      } else if (data.type === "payment_required") {
        router.push(`/payment?paymentId=${data.paymentId}&amount=${data.amount}&title=${encodeURIComponent(data.courseTitle ?? "")}`);
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

  useEffect(() => {
    if (!id) return;
    const fetchCourse = async () => {
      const { data } = await supabase
        .from("Course")
        .select(`
          id, title, code, description, localPrice, foreignPrice, createdAt,
          createdBy:Lecturer!Course_createdById_fkey(title, bio, profile:Profile(fullName)),
          sections:CourseSection(
            id, title, description, instructions, orderIndex,
            resources:CourseResource(id, title, type, durationMins, description)
          )
        `)
        .eq("id", id)
        .eq("isStandalone", true)
        .eq("isPublished", true)
        .single();

      if (data) {
        const sorted = ((data.sections as any[]) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
        setCourse({
          ...data,
          localPrice:  data.localPrice  ? Number(data.localPrice)  : null,
          foreignPrice: data.foreignPrice ? Number(data.foreignPrice) : null,
          createdBy: Array.isArray(data.createdBy) ? data.createdBy[0] ?? null : data.createdBy,
          sections: sorted,
        } as CourseDetail);
        if (sorted[0]) setExpandedSection(sorted[0].id);
      }
      setLoading(false);
    };
    void fetchCourse();
  }, [id]);

  const handleEnroll = () => {
    if (!user) { router.push(`/login?redirect=/dashboard/student/courses/${id}`); return; }
    setEnrolling(true);
    setEnrollError(null);
    enrollMutation.mutate({ courseId: id! });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-medium text-slate-600">Course not found.</p>
          <button onClick={() => router.push("/dashboard/student/courses")}
            className="mt-3 text-sm text-brand hover:underline">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const isFree          = !course.localPrice || course.localPrice === 0;
  const totalResources  = course.sections.reduce((s, sec) => s + sec.resources.length, 0);
  const totalMins       = course.sections.reduce(
    (s, sec) => s + sec.resources.reduce((rs, r) => rs + (r.durationMins ?? 0), 0), 0,
  );
  const instructor      = course.createdBy;
  const instructorName  = instructor?.profile?.fullName
    ? `${instructor.title ? `${instructor.title} ` : ""}${instructor.profile.fullName}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push("/dashboard/student/courses")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </button>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">

            {/* Left — course info */}
            <div className="lg:col-span-2">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand-dim">
                <BookOpen className="h-3.5 w-3.5" /> Standalone Course
              </span>

              <h1 className="font-display text-3xl font-bold leading-tight text-slate-900">{course.title}</h1>

              {course.code && (
                <span className="mt-2 inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500">
                  {course.code}
                </span>
              )}

              {instructorName && (
                <p className="mt-4 flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  Taught by <span className="ml-1 font-semibold text-slate-800">{instructorName}</span>
                </p>
              )}

              {course.description && (
                <p className="mt-4 leading-relaxed text-slate-500">{course.description}</p>
              )}

              {/* Meta pills */}
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { icon: <BookOpen className="h-4 w-4" />,  label: `${totalResources} Resources` },
                  totalMins > 0 && { icon: <Clock className="h-4 w-4" />, label: formatDuration(totalMins) ?? "" },
                  { icon: <FileText className="h-4 w-4" />,  label: `${course.sections.length} Sections` },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    <span className="text-slate-400">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — enrollment card (sticky) */}
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
                        LKR {course.localPrice?.toLocaleString()}
                      </span>
                      {course.foreignPrice && (
                        <p className="mt-0.5 text-sm text-slate-400">
                          USD {course.foreignPrice.toLocaleString()} for international students
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
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> You are enrolled
                    </div>
                    <Button className="w-full rounded-xl py-3.5" onClick={() => router.push(`/dashboard/student`)}>
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

                {/* What's included */}
                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                  {[
                    { icon: <FileText className="h-3.5 w-3.5" />,    label: `${totalResources} learning resources` },
                    { icon: <BookOpen className="h-3.5 w-3.5" />,    label: `${course.sections.length} sections` },
                    totalMins > 0 && { icon: <Clock className="h-3.5 w-3.5" />, label: `${formatDuration(totalMins)} of content` },
                    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Progress tracking" },
                    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Certificate on completion" },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="flex-shrink-0 text-slate-400">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Course Content</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {course.sections.length} sections · {totalResources} resources
                {totalMins > 0 && ` · ${formatDuration(totalMins)}`}
              </p>
            </div>

            <div className="space-y-3">
              {course.sections.map((section, idx) => {
                const isExpanded = expandedSection === section.id;
                const secMins    = section.resources.reduce((s, r) => s + (r.durationMins ?? 0), 0);

                return (
                  <div
                    key={section.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Section header */}
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                        isExpanded ? "bg-white" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-xs font-bold text-brand-dim">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{section.title}</p>
                        {section.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">{section.description}</p>
                        )}
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3 text-xs text-slate-400">
                        <span>{section.resources.length} resources</span>
                        {secMins > 0 && <span>{formatDuration(secMins)}</span>}
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />
                        }
                      </div>
                    </button>

                    {/* Section body */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 pb-5 pt-4">

                        {/* Instructions */}
                        {section.instructions && (
                          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <AlignLeft className="h-3.5 w-3.5" /> Instructions
                            </p>
                            <p className="text-xs leading-relaxed text-amber-800 line-clamp-3">
                              {section.instructions}
                            </p>
                          </div>
                        )}

                        {/* Resources */}
                        {section.resources.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">No resources in this section yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {section.resources.map((r) => (
                              <div
                                key={r.id}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                                  isEnrolled
                                    ? "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white cursor-pointer"
                                    : "border-slate-100 bg-slate-50"
                                }`}
                              >
                                {/* Type icon */}
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                  {RESOURCE_ICONS[r.type]}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                    <span>{RESOURCE_TYPE_LABELS[r.type] ?? r.type}</span>
                                    {r.durationMins && (
                                      <>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />{formatDuration(r.durationMins)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {r.description && (
                                    <p className="mt-0.5 truncate text-xs text-slate-400">{r.description}</p>
                                  )}
                                </div>

                                {/* Lock for non-enrolled */}
                                {!isEnrolled && (
                                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructor sidebar */}
          {instructor && instructorName && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">Your Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xl font-black text-brand-dim">
                    {instructorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{instructorName}</p>
                    {instructor.title && (
                      <p className="text-xs text-slate-400">{instructor.title}</p>
                    )}
                  </div>
                </div>
                {instructor.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-500">{instructor.bio}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}