"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Circle, Lock, Menu, X,
  ChevronLeft, ChevronRight, FileText, Video, Link2,
  ExternalLink, Loader2, BookOpen, ClipboardList,
  AlertCircle, Upload, Send, Clock, Award, BarChart3,
  ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon,
  Presentation,
} from "lucide-react";
import { api } from "~/trpc/react";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(mins: number | null | undefined): string | null {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ?? null;
}

// ── Resource type icon ────────────────────────────────────────────────────

function ResourceIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  switch (type) {
    case "PDF":           return <FileText className={`${className} text-red-500`} />;
    case "VIDEO_UPLOAD":  return <Video className={`${className} text-blue-500`} />;
    case "VIDEO_LINK":    return <Video className={`${className} text-purple-500`} />;
    case "IMAGE":         return <ImageIcon className={`${className} text-green-500`} />;
    case "PRESENTATION":  return <Presentation className={`${className} text-orange-500`} />;
    case "EXTERNAL_LINK": return <Link2 className={`${className} text-slate-500`} />;
    default:              return <FileText className={`${className} text-slate-400`} />;
  }
}

// ── Content Viewer ────────────────────────────────────────────────────────

function ContentViewer({ resource }: { resource: any }) {
  const [pdfError, setPdfError] = useState(false);

  if (!resource) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <BookOpen className="h-16 w-16 text-slate-200" />
        <p className="font-medium text-slate-500">Select a resource to begin</p>
        <p className="text-sm text-slate-400">Choose from the sidebar on the left</p>
      </div>
    );
  }

  // ── PDF ──
  if (resource.type === "PDF" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-slate-800">{resource.title}</span>
          </div>
          <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
        </div>
        {!pdfError ? (
          <iframe
            src={`${resource.fileUrl}#toolbar=1&view=FitH`}
            className="flex-1 rounded-xl border border-slate-200 bg-white"
            onError={() => setPdfError(true)}
            title={resource.title}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white">
            <FileText className="h-12 w-12 text-red-200" />
            <p className="text-sm text-slate-500">PDF preview not available</p>
            <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
              <ExternalLink className="h-4 w-4" /> Open PDF
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── Video upload ──
  if (resource.type === "VIDEO_UPLOAD" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-800">{resource.title}</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-black">
          <video
            src={resource.fileUrl}
            controls
            className="h-full w-full"
            controlsList="nodownload"
          >
            Your browser doesn't support video playback.
          </video>
        </div>
      </div>
    );
  }

  // ── Video link (YouTube / Vimeo) ──
  if (resource.type === "VIDEO_LINK" && resource.externalUrl) {
    const ytId     = getYoutubeId(resource.externalUrl);
    const vimeoId  = getVimeoId(resource.externalUrl);
    const embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
      : vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}`
        : null;

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-slate-800">{resource.title}</span>
          </div>
          <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            <ExternalLink className="h-3.5 w-3.5" /> Open original
          </a>
        </div>
        {embedUrl ? (
          <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-black">
            <iframe
              src={embedUrl}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={resource.title}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white">
            <Video className="h-12 w-12 text-purple-200" />
            <p className="text-sm text-slate-500">This video platform isn't supported for inline embedding</p>
            <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100">
              <ExternalLink className="h-4 w-4" /> Watch Video
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── External link ──
  if (resource.type === "EXTERNAL_LINK" && resource.externalUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
          <Link2 className="h-10 w-10 text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{resource.title}</h3>
          {resource.description && (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{resource.description}</p>
          )}
        </div>
        <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dim">
          <ExternalLink className="h-4 w-4" /> Open Resource
        </a>
        <p className="text-xs text-slate-400">{resource.externalUrl}</p>
      </div>
    );
  }

  // ── Image ──
  if (resource.type === "IMAGE" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold text-slate-800">{resource.title}</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
          <img src={resource.fileUrl} alt={resource.title} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      </div>
    );
  }

  // ── Fallback ──
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <ResourceIcon type={resource.type} className="h-12 w-12" />
      <div>
        <h3 className="font-semibold text-slate-800">{resource.title}</h3>
        {resource.description && <p className="mt-1 text-sm text-slate-500">{resource.description}</p>}
      </div>
      {(resource.fileUrl ?? resource.externalUrl) && (
        <a href={resource.fileUrl ?? resource.externalUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dim">
          <ExternalLink className="h-4 w-4" /> Open Resource
        </a>
      )}
    </div>
  );
}

// ── Assessment panel ──────────────────────────────────────────────────────

function AssessmentsPanel({ courseId }: { courseId: string }) {
  const utils = api.useUtils();
  const { data: assessments = [], isLoading } = api.studentCourse.getCourseAssessments.useQuery(
    { courseId }, { staleTime: 0 }
  );

  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting]        = useState<string | null>(null);
  const [submitError, setSubmitError]      = useState<Record<string, string>>({});

  const submitMutation = api.studentCourse.submitAssessment.useMutation({
    onSuccess: async (_, vars) => {
      await utils.studentCourse.getCourseAssessments.invalidate({ courseId });
      setSubmitting(null);
      setSubmissionText((p) => ({ ...p, [vars.assessmentId]: "" }));
    },
    onError: (e, vars) => {
      setSubmitError((p) => ({ ...p, [vars.assessmentId]: e.message }));
      setSubmitting(null);
    },
  });

  const ASSESSMENT_TYPE_COLORS: Record<string, string> = {
    ASSIGNMENT:   "bg-blue-50 text-blue-700",
    QUIZ:         "bg-violet-50 text-violet-700",
    EXAM:         "bg-red-50 text-red-700",
    PROJECT:      "bg-amber-50 text-amber-700",
    PRESENTATION: "bg-emerald-50 text-emerald-700",
  };
  const SUBMISSION_STATUS: Record<string, { label: string; color: string }> = {
    SUBMITTED:          { label: "Submitted",        color: "bg-blue-100 text-blue-700" },
    GRADED:             { label: "Graded",            color: "bg-emerald-100 text-emerald-700" },
    RESUBMIT_REQUIRED:  { label: "Resubmit Required", color: "bg-amber-100 text-amber-700" },
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;
  }

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <ClipboardList className="h-14 w-14 text-slate-200" />
        <p className="font-semibold text-slate-600">No assessments yet</p>
        <p className="text-sm text-slate-400">Your instructor hasn't added any assessments to this course.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assessments.map((a) => {
        const isExpanded = expandedId === a.id;
        const sub        = a.mySubmission;
        const subStatus  = sub ? SUBMISSION_STATUS[sub.status] : null;
        const isOverdue  = a.dueDate && !sub && new Date(a.dueDate) < new Date();

        return (
          <div key={a.id} className={`overflow-hidden rounded-xl border bg-white ${
            isOverdue ? "border-red-100" : "border-slate-200"
          }`}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ASSESSMENT_TYPE_COLORS[a.type] ?? "bg-slate-100 text-slate-600"}`}>
                    {a.type.charAt(0) + a.type.slice(1).toLowerCase()}
                  </span>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400">
                  {a.totalMarks  && <span className="flex items-center gap-1"><Award className="h-3 w-3" />{a.totalMarks} marks</span>}
                  {a.weightPercent && <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{Number(a.weightPercent)}% weight</span>}
                  {a.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                      <Clock className="h-3 w-3" />
                      {isOverdue ? "Overdue · " : "Due · "}
                      {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {subStatus && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${subStatus.color}`}>
                    {subStatus.label}
                  </span>
                )}
                {!sub && !isOverdue && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                {/* Instructions */}
                {a.instructions && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</p>
                    <p className="text-sm leading-relaxed text-slate-700">{a.instructions}</p>
                  </div>
                )}

                {/* Existing submission */}
                {sub && (
                  <div className={`rounded-xl border p-4 ${
                    sub.status === "GRADED" ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50"
                  }`}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your Submission</p>
                    {sub.submissionText && (
                      <p className="text-sm leading-relaxed text-slate-700">{sub.submissionText}</p>
                    )}
                    {sub.fileUrl && (
                      <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                        <FileText className="h-3.5 w-3.5" /> View submitted file
                      </a>
                    )}
                    {sub.status === "GRADED" && (
                      <div className="mt-3 flex items-center gap-4 border-t border-emerald-100 pt-3">
                        {sub.marksObtained != null && (
                          <span className="text-sm font-bold text-emerald-700">
                            {Number(sub.marksObtained)}/{a.totalMarks} marks
                          </span>
                        )}
                        {sub.feedback && (
                          <p className="text-xs text-slate-600 italic">"{sub.feedback}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit / resubmit form */}
                {(!sub || sub.status === "RESUBMIT_REQUIRED") && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {sub?.status === "RESUBMIT_REQUIRED" ? "Resubmit" : "Submit"} Your Work
                    </p>
                    <textarea
                      value={submissionText[a.id] ?? ""}
                      onChange={(e) => setSubmissionText((p) => ({ ...p, [a.id]: e.target.value }))}
                      placeholder="Write your answer or describe your submission…"
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-subtle resize-none"
                    />
                    {submitError[a.id] && (
                      <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />{submitError[a.id]}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        if (!submissionText[a.id]?.trim()) {
                          setSubmitError((p) => ({ ...p, [a.id]: "Please write a response before submitting." }));
                          return;
                        }
                        setSubmitting(a.id);
                        setSubmitError((p) => ({ ...p, [a.id]: "" }));
                        submitMutation.mutate({
                          assessmentId: a.id,
                          submissionText: submissionText[a.id] ?? null,
                        });
                      }}
                      disabled={submitting === a.id}
                      className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dim disabled:opacity-60"
                    >
                      {submitting === a.id
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                        : <><Send className="h-4 w-4" /> Submit</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function CourseLearningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils  = api.useUtils();

  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [mainTab, setMainTab]                 = useState<"CONTENT" | "ASSESSMENTS">("CONTENT");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ── Data ─────────────────────────────────────────────────────────────
  const { data: course, isLoading } = api.studentCourse.getCourseDetail.useQuery(
    { courseId: id },
    { staleTime: 0 }
  );

  const toggleComplete = api.studentCourse.toggleResourceComplete.useMutation({
    onSuccess: async () => {
      await utils.studentCourse.getCourseDetail.invalidate({ courseId: id });
      await utils.studentCourse.getMyEnrollments.invalidate();
    },
  });

  // ── Set first resource active on load ─────────────────────────────────
  useEffect(() => {
    if (!course || activeResourceId) return;
    const firstSection  = course.sections.find((s) => s.isUnlocked && s.resources.length > 0);
    const firstResource = firstSection?.resources[0];
    if (firstResource) {
      setActiveResourceId(firstResource.id);
      setExpandedSections(new Set([firstSection.id]));
    }
  }, [course]);

  // ── Flat list of all accessible resources for prev/next ───────────────
  const allResources = course?.sections
    .filter((s) => s.isUnlocked)
    .flatMap((s) => s.resources) ?? [];

  const activeIndex   = allResources.findIndex((r) => r.id === activeResourceId);
  const activeResource = allResources[activeIndex] ?? null;
  const prevResource  = allResources[activeIndex - 1] ?? null;
  const nextResource  = allResources[activeIndex + 1] ?? null;

  const selectResource = useCallback((resourceId: string, sectionId: string) => {
    setActiveResourceId(resourceId);
    setExpandedSections((p) => new Set([...p, sectionId]));
    setSidebarOpen(false);
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((p) => {
      const n = new Set(p);
      n.has(sectionId) ? n.delete(sectionId) : n.add(sectionId);
      return n;
    });
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-brand" />
          <p className="text-sm text-slate-500">Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-medium text-slate-600">Course not found or you're not enrolled.</p>
          <button onClick={() => router.push("/dashboard/student")}
            className="mt-3 text-sm text-brand hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalResources    = course.totalResources;
  const completedResources = course.completedResources;
  const progressPercent   = course.progressPercent;

  // ── Sidebar content ───────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Course title + progress */}
      <div className="border-b border-slate-200 bg-white px-4 py-5">
        <h2 className="mb-1 font-bold leading-snug text-slate-900 line-clamp-2">{course.title}</h2>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>{completedResources}/{totalResources} completed</span>
          <span className={`font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${progressPercent === 100 ? "bg-emerald-500" : "bg-brand"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {course.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isLocked   = !section.isUnlocked;

          return (
            <div key={section.id} className="border-b border-slate-100 last:border-0">
              {/* Section header */}
              <button
                onClick={() => !isLocked && toggleSection(section.id)}
                disabled={isLocked}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
                }`}
              >
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  section.isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : isLocked
                      ? "bg-slate-100 text-slate-400"
                      : "bg-brand-subtle text-brand-dim"
                }`}>
                  {section.isComplete
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : isLocked
                      ? <Lock className="h-3 w-3" />
                      : section.completedResources
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{section.title}</p>
                  <p className="text-xs text-slate-400">
                    {section.completedResources}/{section.totalResources} done
                  </p>
                </div>
                {!isLocked && (
                  isExpanded
                    ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                )}
              </button>

              {/* Resources */}
              {isExpanded && !isLocked && (
                <div className="pb-1">
                  {section.resources.map((resource) => {
                    const isActive    = resource.id === activeResourceId;
                    const isCompleted = resource.isCompleted;

                    return (
                      <button
                        key={resource.id}
                        onClick={() => selectResource(resource.id, section.id)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          isActive
                            ? "bg-brand-subtle border-r-2 border-brand"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Complete indicator */}
                        <div className="flex-shrink-0">
                          {isCompleted
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            : <Circle className="h-4 w-4 text-slate-300" />
                          }
                        </div>

                        {/* Resource icon + title */}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs ${isActive ? "font-semibold text-brand-dim" : isCompleted ? "text-slate-500" : "text-slate-700"}`}>
                            {resource.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ResourceIcon type={resource.type} className="h-3 w-3" />
                            {resource.durationMins && (
                              <span className="text-xs text-slate-400">{formatDuration(resource.durationMins)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assessments tab */}
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => { setMainTab("ASSESSMENTS"); setSidebarOpen(false); }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            mainTab === "ASSESSMENTS"
              ? "bg-brand-subtle text-brand-dim"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Assessments
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">

      {/* ── Top bar ── */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        {/* Left: back + hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/student`)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Center: course title */}
        <p className="hidden max-w-sm truncate text-sm font-semibold text-slate-800 sm:block">
          {course.title}
        </p>

        {/* Right: tabs + progress */}
        <div className="flex items-center gap-3">
          {/* Content / Assessments toggle */}
          <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex">
            {([
              { key: "CONTENT",     label: "Content",     icon: BookOpen },
              { key: "ASSESSMENTS", label: "Assessments", icon: ClipboardList },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMainTab(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mainTab === key
                    ? "bg-white text-brand-dim shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Progress badge */}
          <div className="flex items-center gap-2">
            <div className="hidden h-1.5 w-24 rounded-full bg-slate-200 sm:block">
              <div
                className={`h-1.5 rounded-full transition-all ${progressPercent === 100 ? "bg-emerald-500" : "bg-brand"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${progressPercent === 100 ? "text-emerald-600" : "text-brand"}`}>
              {progressPercent}%
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — desktop always visible ── */}
        <aside className="hidden w-72 flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <SidebarContent />
        </aside>

        {/* ── Sidebar — mobile slide-out drawer ── */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-40 w-80 overflow-hidden border-r border-slate-200 bg-white shadow-2xl lg:hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="font-semibold text-slate-800">Course Content</p>
                <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarContent />
              </div>
            </aside>
          </>
        )}

        {/* ── Main content area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">

          {/* Assessments view */}
          {mainTab === "ASSESSMENTS" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-6 flex items-center gap-3">
                  <button
                    onClick={() => setMainTab("CONTENT")}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Content
                  </button>
                </div>
                <h2 className="mb-6 text-xl font-bold text-slate-900">Assessments</h2>
                <AssessmentsPanel courseId={id} />
              </div>
            </div>
          )}

          {/* Content view */}
          {mainTab === "CONTENT" && (
            <>
              {/* Resource viewer */}
              <div className="flex-1 overflow-hidden p-4">
                <ContentViewer resource={activeResource} />
              </div>

              {/* Bottom action bar */}
              {activeResource && (
                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">

                    {/* Prev */}
                    <button
                      onClick={() => prevResource && selectResource(prevResource.id,
                        course.sections.find((s) => s.resources.some((r) => r.id === prevResource.id))?.id ?? ""
                      )}
                      disabled={!prevResource}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    {/* Mark complete */}
                    <button
                      onClick={() => toggleComplete.mutate({ resourceId: activeResource.id, courseId: id })}
                      disabled={toggleComplete.isPending}
                      className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition ${
                        activeResource.isCompleted
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-brand text-white hover:bg-brand-dim"
                      }`}
                    >
                      {toggleComplete.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : activeResource.isCompleted
                          ? <><CheckCircle2 className="h-4 w-4" /> Completed</>
                          : <><Circle className="h-4 w-4" /> Mark as Complete</>
                      }
                    </button>

                    {/* Next */}
                    <button
                      onClick={() => {
                        if (nextResource) {
                          selectResource(nextResource.id,
                            course.sections.find((s) => s.resources.some((r) => r.id === nextResource.id))?.id ?? ""
                          );
                        }
                      }}
                      disabled={!nextResource}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Resource info */}
                  {(activeResource.description) && (
                    <p className="mt-2 text-center text-xs text-slate-400">{activeResource.description}</p>
                  )}
                </div>
              )}

              {/* Course complete banner */}
              {progressPercent === 100 && (
                <div className="flex-shrink-0 border-t border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-sm font-semibold text-emerald-700">
                    <Award className="h-5 w-5" />
                    You&apos;ve completed this course! Great work.
                    <button
                      onClick={() => router.push("/dashboard/student")}
                      className="ml-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}