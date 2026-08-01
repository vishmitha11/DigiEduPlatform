"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Circle, Lock, Menu, X,
  ChevronLeft, ChevronRight, FileText, Video, Link2,
  ExternalLink, Loader2, BookOpen, ClipboardList,
  AlertCircle, Send, Clock, Award, BarChart3,
  ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon,
  Presentation, Layers, Building2, Globe, Users,
  GraduationCap,
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
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ?? null;
}

const DELIVERY_LABELS: Record<string, string> = {
  ONLINE: "Online", ON_CAMPUS: "On Campus", HYBRID: "Hybrid", BLENDED: "Blended",
};
const TYPE_LABELS: Record<string, string> = {
  BACHELOR: "Bachelor's", MASTER: "Master's", PHD: "PhD",
  DIPLOMA: "Diploma", CERTIFICATE: "Certificate", FOUNDATION: "Foundation",
  PROFESSIONAL: "Professional", MICROCREDENTIAL: "Microcredential", SHORT_COURSE: "Short Course",
};

// ── ProgressBar ───────────────────────────────────────────────────────────

function ProgressBar({ percent, color = "brand", thin = false }: {
  percent: number; color?: "brand" | "emerald"; thin?: boolean;
}) {
  const h = thin ? "h-1" : "h-1.5";
  const fill = percent === 100 ? "bg-emerald-500"
    : color === "emerald" ? "bg-emerald-500"
    : "bg-brand";
  return (
    <div className={`${h} w-full rounded-full bg-slate-100`}>
      <div className={`${h} rounded-full transition-all duration-500 ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
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

function ContentViewer({ resource }: { resource: any | null }) {
  const [pdfError, setPdfError] = useState(false);
  useEffect(() => { setPdfError(false); }, [resource?.id]);

  if (!resource) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <BookOpen className="h-16 w-16 text-slate-200" />
        <p className="font-medium text-slate-500">Select a resource to begin</p>
        <p className="text-sm text-slate-400">Choose from the sidebar on the left</p>
      </div>
    );
  }

  const CoursePill = () => (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 shrink-0">
      {resource._courseTitle}
    </span>
  );

  if (resource.type === "PDF" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800 truncate">{resource.title}</span>
            <CoursePill />
          </div>
          <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer"
            className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
        </div>
        {!pdfError ? (
          <iframe src={`${resource.fileUrl}#toolbar=1&view=FitH`}
            className="flex-1 rounded-xl border border-slate-200 bg-white"
            onError={() => setPdfError(true)} title={resource.title} />
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

  if (resource.type === "VIDEO_UPLOAD" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800 truncate">{resource.title}</span>
            <CoursePill />
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-black">
          <video src={resource.fileUrl} controls className="h-full w-full" controlsList="nodownload">
            Your browser doesn't support video playback.
          </video>
        </div>
      </div>
    );
  }

  if (resource.type === "VIDEO_LINK" && resource.externalUrl) {
    const ytId     = getYoutubeId(resource.externalUrl);
    const vimeoId  = getVimeoId(resource.externalUrl);
    const embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
      : vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-4 w-4 text-purple-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800 truncate">{resource.title}</span>
            <CoursePill />
          </div>
          <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer"
            className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            <ExternalLink className="h-3.5 w-3.5" /> Open original
          </a>
        </div>
        {embedUrl ? (
          <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-black">
            <iframe src={embedUrl} className="h-full w-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={resource.title} />
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

  if (resource.type === "EXTERNAL_LINK" && resource.externalUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
          <Link2 className="h-10 w-10 text-slate-400" />
        </div>
        <div>
          <div className="mb-2"><CoursePill /></div>
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

  if (resource.type === "IMAGE" && resource.fileUrl) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800 truncate">{resource.title}</span>
            <CoursePill />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
          <img src={resource.fileUrl} alt={resource.title} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <ResourceIcon type={resource.type} className="h-12 w-12" />
      <div>
        <div className="mb-1"><CoursePill /></div>
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

// ── Assessments panel ─────────────────────────────────────────────────────

function ModuleAssessmentsSection({ module }: { module: any }) {
  const utils = api.useUtils();
  const { data: assessments = [], isLoading } = api.studentCourse.getCourseAssessments.useQuery(
    { courseId: module.id }, { staleTime: 0 }
  );
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting]         = useState<string | null>(null);
  const [submitError, setSubmitError]       = useState<Record<string, string>>({});

  const submitMutation = api.studentCourse.submitAssessment.useMutation({
    onSuccess: async (_, vars) => {
      await utils.studentCourse.getCourseAssessments.invalidate({ courseId: module.id });
      setSubmitting(null);
      setSubmissionText((p) => ({ ...p, [vars.assessmentId]: "" }));
    },
    onError: (e, vars) => {
      setSubmitError((p) => ({ ...p, [vars.assessmentId]: e.message }));
      setSubmitting(null);
    },
  });

  const TYPE_COLORS: Record<string, string> = {
    ASSIGNMENT: "bg-blue-50 text-blue-700", QUIZ: "bg-violet-50 text-violet-700",
    EXAM: "bg-red-50 text-red-700", PROJECT: "bg-amber-50 text-amber-700",
    PRESENTATION: "bg-emerald-50 text-emerald-700",
  };
  const SUB_STATUS: Record<string, { label: string; color: string }> = {
    SUBMITTED:         { label: "Submitted",         color: "bg-blue-100 text-blue-700" },
    GRADED:            { label: "Graded",             color: "bg-emerald-100 text-emerald-700" },
    RESUBMIT_REQUIRED: { label: "Resubmit Required",  color: "bg-amber-100 text-amber-700" },
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-subtle shrink-0">
          <GraduationCap className="h-4 w-4 text-brand-dim" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate">{module.title}</h3>
          {module.code && <p className="font-mono text-xs text-slate-400">{module.code}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20"><ProgressBar percent={module.progressPercent} color="brand" thin /></div>
          <span className="text-xs font-bold text-brand">{module.progressPercent}%</span>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-400" /></div>
      ) : assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">No assessments for this module</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assessments.map((a) => {
            const isExpanded = expandedId === a.id;
            const sub        = a.mySubmission;
            const subStatus  = sub ? SUB_STATUS[sub.status] : null;
            const isOverdue  = a.dueDate && !sub && new Date(a.dueDate) < new Date();
            return (
              <div key={a.id} className={`overflow-hidden rounded-xl border bg-white ${isOverdue ? "border-red-100" : "border-slate-200"}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[a.type] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.type.charAt(0) + a.type.slice(1).toLowerCase()}
                      </span>
                      <h4 className="font-semibold text-slate-900">{a.title}</h4>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400">
                      {a.totalMarks && <span className="flex items-center gap-1"><Award className="h-3 w-3" />{a.totalMarks} marks</span>}
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
                  <div className="flex shrink-0 items-center gap-2">
                    {subStatus && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${subStatus.color}`}>{subStatus.label}</span>}
                    {!sub && !isOverdue && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending</span>}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                    {a.instructions && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</p>
                        <p className="text-sm leading-relaxed text-slate-700">{a.instructions}</p>
                      </div>
                    )}
                    {sub && (
                      <div className={`rounded-xl border p-4 ${sub.status === "GRADED" ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your Submission</p>
                        {sub.submissionText && <p className="text-sm leading-relaxed text-slate-700">{sub.submissionText}</p>}
                        {sub.fileUrl && (
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                            <FileText className="h-3.5 w-3.5" /> View submitted file
                          </a>
                        )}
                        {sub.status === "GRADED" && (
                          <div className="mt-3 flex items-center gap-4 border-t border-emerald-100 pt-3">
                            {sub.marksObtained != null && (
                              <span className="text-sm font-bold text-emerald-700">{Number(sub.marksObtained)}/{a.totalMarks} marks</span>
                            )}
                            {sub.feedback && <p className="text-xs text-slate-600 italic">"{sub.feedback}"</p>}
                          </div>
                        )}
                      </div>
                    )}
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
                            submitMutation.mutate({ assessmentId: a.id, submissionText: submissionText[a.id] ?? null });
                          }}
                          disabled={submitting === a.id}
                          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dim disabled:opacity-60"
                        >
                          {submitting === a.id
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                            : <><Send className="h-4 w-4" /> Submit</>}
                        </button>
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
  );
}

// ── Overview panel ────────────────────────────────────────────────────────

function ProgramOverviewPanel({ program, onGoToContent }: { program: any; onGoToContent: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-dim">
            <Award className="h-3.5 w-3.5" />{TYPE_LABELS[program.type] ?? program.type}
          </span>
          {program.institution && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="h-3.5 w-3.5" />{program.institution.name}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5" />{DELIVERY_LABELS[program.deliveryMode] ?? program.deliveryMode}
          </span>
          {program.durationMonths && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {program.durationMonths >= 12
                ? `${Math.round(program.durationMonths / 12)} yr${program.durationMonths >= 24 ? "s" : ""}`
                : `${program.durationMonths} months`}
            </span>
          )}
        </div>
        {program.description && <p className="text-sm leading-relaxed text-slate-600">{program.description}</p>}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Total Modules",  value: program.totalModules,      color: "text-brand",  bg: "bg-brand-subtle" },
            { label: "Completed",      value: program.completedModules,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Progress",       value: `${program.programProgress}%`, color: "text-brand", bg: "bg-brand-subtle" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex flex-col items-center justify-center rounded-xl ${bg} px-3 py-4`}>
              <span className={`text-2xl font-black ${color}`}>{value}</span>
              <span className="mt-0.5 text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{program.completedModules}/{program.totalModules} modules complete</span>
            <span className={`font-bold ${program.programProgress === 100 ? "text-emerald-600" : "text-brand"}`}>
              {program.programProgress}%
            </span>
          </div>
          <ProgressBar percent={program.programProgress} color="brand" />
        </div>
        {program.programProgress === 100 && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
            <Award className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-800">Program Complete! Excellent work.</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-700">Module Progress</h3>
        <div className="space-y-3">
          {program.courses.map((mod: any, idx: number) => {
            const isDone   = mod.progressPercent === 100;
            const isLocked = !mod.isUnlocked;
            return (
              <div key={mod.id} className={`rounded-xl border bg-white p-4 transition ${isDone ? "border-emerald-100" : isLocked ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isDone ? "bg-emerald-100 text-emerald-700" : isLocked ? "bg-slate-100 text-slate-400" : "bg-brand-subtle text-brand-dim"}`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{mod.title}</h4>
                        {mod.code && <p className="font-mono text-xs text-slate-400">{mod.code}</p>}
                        {mod.lecturerName && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                            <Users className="h-3 w-3" />{mod.lecturerName}
                          </p>
                        )}
                      </div>
                      {mod.isEnrolled && !isLocked && (
                        <button onClick={() => onGoToContent(mod.id)}
                          className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isDone ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-brand text-white hover:bg-brand-dim"}`}>
                          {isDone ? <><CheckCircle2 className="h-3.5 w-3.5" /> Review</> : <><PlayCircle className="h-3.5 w-3.5" /> {mod.progressPercent > 0 ? "Continue" : "Start"}</>}
                        </button>
                      )}
                    </div>
                    {mod.isEnrolled && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{mod.completedResources}/{mod.totalResources} resources</span>
                          <span className={`font-bold ${isDone ? "text-emerald-600" : "text-brand"}`}>{mod.progressPercent}%</span>
                        </div>
                        <ProgressBar percent={mod.progressPercent} color="brand" thin />
                      </div>
                    )}
                    {isLocked && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-500">
                        <Lock className="h-3 w-3" /> Complete previous module to unlock
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ProgramConductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils  = api.useUtils();

  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [mainTab, setMainTab]                   = useState<"CONTENT" | "ASSESSMENTS" | "OVERVIEW">("OVERVIEW");
  const [expandedModules, setExpandedModules]   = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ── Single tRPC query — all data comes from here ──────────────────────
  const { data: program, isLoading } = api.studentProgram.getProgramDetail.useQuery(
    { programId: id },
    { staleTime: 0 }
  );

  const toggleComplete = api.studentCourse.toggleResourceComplete.useMutation({
    onSuccess: async () => {
      await utils.studentProgram.getProgramDetail.invalidate({ programId: id });
    },
  });

  // ── Auto-open first active module ─────────────────────────────────────
  useEffect(() => {
    if (!program || activeResourceId) return;
    const firstActive = program.courses.find((m: any) => m.isUnlocked && m.progressPercent < 100);
    if (firstActive) {
      setExpandedModules(new Set([firstActive.id]));
      const firstSection = firstActive.sections.find((s: any) => s.isUnlocked && s.resources.length > 0);
      if (firstSection?.resources[0]) {
        setExpandedSections(new Set([firstSection.id]));
        setActiveResourceId(firstSection.resources[0].id);
        setMainTab("CONTENT");
      }
    }
  }, [program]);

  // ── Flat resource list for prev/next ──────────────────────────────────
  const allResources = (program?.courses ?? [])
    .filter((m: any) => m.isUnlocked)
    .flatMap((m: any) =>
      m.sections
        .filter((s: any) => s.isUnlocked)
        .flatMap((s: any) =>
          s.resources.map((r: any) => ({
            ...r,
            _sectionId:   s.id,
            _moduleId:    m.id,
            _courseId:    m.id,
            _courseTitle: m.title,
          }))
        )
    );

  const activeIndex    = allResources.findIndex((r) => r.id === activeResourceId);
  const activeResource = allResources[activeIndex] ?? null;
  const prevResource   = allResources[activeIndex - 1] ?? null;
  const nextResource   = allResources[activeIndex + 1] ?? null;

  const selectResource = useCallback((resourceId: string, sectionId: string, moduleId: string) => {
    setActiveResourceId(resourceId);
    setExpandedModules((p) => new Set([...p, moduleId]));
    setExpandedSections((p) => new Set([...p, sectionId]));
    setSidebarOpen(false);
    setMainTab("CONTENT");
  }, []);

  const goToContent = useCallback((moduleId: string) => {
    const mod = program?.courses.find((m: any) => m.id === moduleId);
    if (!mod) return;
    const firstSection = mod.sections.find((s: any) => s.isUnlocked && s.resources.length > 0);
    if (firstSection?.resources[0]) {
      selectResource(firstSection.resources[0].id, firstSection.id, moduleId);
    }
  }, [program, selectResource]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-brand" />
          <p className="text-sm text-slate-500">Loading program…</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-medium text-slate-600">Program not found or you're not enrolled.</p>
          <button onClick={() => router.push("/dashboard/student/programs")}
            className="mt-3 text-sm text-brand hover:underline">Back to Programs</button>
        </div>
      </div>
    );
  }

  // ── Sidebar ───────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-5">
        <h2 className="mb-1 font-bold leading-snug text-slate-900 line-clamp-2">{program.title}</h2>
        <p className="mb-3 text-xs text-slate-400">{program.completedResources}/{program.totalResources} resources</p>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>{program.completedModules}/{program.totalModules} modules</span>
          <span className={`font-bold ${program.programProgress === 100 ? "text-emerald-600" : "text-brand"}`}>
            {program.programProgress}%
          </span>
        </div>
        <ProgressBar percent={program.programProgress} color="brand" />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {program.courses.map((mod: any, modIdx: number) => {
          const isModExpanded = expandedModules.has(mod.id);
          const isModLocked   = !mod.isUnlocked;
          const isModDone     = mod.progressPercent === 100;

          return (
            <div key={mod.id} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => !isModLocked && setExpandedModules((p) => { const n = new Set(p); n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id); return n; })}
                disabled={isModLocked}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isModLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isModDone ? "bg-emerald-100 text-emerald-700" : isModLocked ? "bg-slate-100 text-slate-400" : "bg-brand-subtle text-brand-dim"}`}>
                  {isModDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isModLocked ? <Lock className="h-3 w-3" /> : modIdx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{mod.title}</p>
                  <p className="text-xs text-slate-400">{mod.code ? `${mod.code} · ` : ""}{mod.completedResources}/{mod.totalResources}</p>
                </div>
                {!isModLocked && (isModExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
              </button>

              {isModExpanded && !isModLocked && mod.isEnrolled && (
                <div className="pb-1 pl-4">
                  {mod.sections.map((sec: any) => {
                    const isSecExpanded = expandedSections.has(sec.id);
                    const isSecLocked   = !sec.isUnlocked;
                    return (
                      <div key={sec.id}>
                        <button
                          onClick={() => !isSecLocked && setExpandedSections((p) => { const n = new Set(p); n.has(sec.id) ? n.delete(sec.id) : n.add(sec.id); return n; })}
                          disabled={isSecLocked}
                          className={`flex w-full items-center gap-2.5 py-2 pr-4 text-left transition ${isSecLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}
                        >
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${sec.isComplete ? "bg-emerald-100 text-emerald-600" : isSecLocked ? "bg-slate-100 text-slate-400" : "bg-brand-subtle text-brand-dim"}`}>
                            {sec.isComplete ? <CheckCircle2 className="h-3 w-3" /> : isSecLocked ? <Lock className="h-2.5 w-2.5" /> : <span className="text-xs">{sec.completedResources}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-700">{sec.title}</p>
                            <p className="text-xs text-slate-400">{sec.completedResources}/{sec.totalResources} done</p>
                          </div>
                          {!isSecLocked && (isSecExpanded
                            ? <ChevronUp className="h-3 w-3 shrink-0 text-slate-400" />
                            : <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                          )}
                        </button>

                        {isSecExpanded && !isSecLocked && (
                          <div className="pb-1 pl-4">
                            {sec.resources.map((r: any) => {
                              const isActive = r.id === activeResourceId;
                              return (
                                <button key={r.id}
                                  onClick={() => selectResource(r.id, sec.id, mod.id)}
                                  className={`flex w-full items-center gap-2.5 py-2 pr-4 text-left transition ${isActive ? "bg-brand-subtle border-r-2 border-brand" : "hover:bg-slate-50"}`}
                                >
                                  <div className="shrink-0">
                                    {r.isCompleted
                                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                      : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`truncate text-xs ${isActive ? "font-semibold text-brand-dim" : r.isCompleted ? "text-slate-400" : "text-slate-700"}`}>
                                      {r.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <ResourceIcon type={r.type} className="h-2.5 w-2.5" />
                                      {r.durationMins && <span className="text-xs text-slate-400">{formatDuration(r.durationMins)}</span>}
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
              )}

              {isModExpanded && !isModLocked && !mod.isEnrolled && (
                <div className="pb-2 pl-10 pr-4">
                  <p className="text-xs text-slate-400 italic">Not enrolled in this module</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 p-3 space-y-1">
        <button onClick={() => { setMainTab("OVERVIEW"); setSidebarOpen(false); }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mainTab === "OVERVIEW" ? "bg-brand-subtle text-brand-dim" : "text-slate-600 hover:bg-slate-50"}`}>
          <Layers className="h-4 w-4" /> Program Overview
        </button>
        <button onClick={() => { setMainTab("ASSESSMENTS"); setSidebarOpen(false); }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mainTab === "ASSESSMENTS" ? "bg-brand-subtle text-brand-dim" : "text-slate-600 hover:bg-slate-50"}`}>
          <ClipboardList className="h-4 w-4" /> All Assessments
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/student/programs/${id}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 lg:hidden">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="hidden max-w-sm flex-col items-center sm:flex">
          <p className="truncate text-sm font-semibold text-slate-800">{program.title}</p>
          {activeResource && mainTab === "CONTENT" && (
            <p className="text-xs text-slate-400 truncate">{activeResource._courseTitle} · {activeResource.title}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex">
            {([
              { key: "CONTENT",     label: "Content",     icon: BookOpen },
              { key: "OVERVIEW",    label: "Overview",    icon: Layers },
              { key: "ASSESSMENTS", label: "Assessments", icon: ClipboardList },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setMainTab(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${mainTab === key ? "bg-white text-brand-dim shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-1.5 w-20 rounded-full bg-slate-200 sm:block">
              <div className={`h-1.5 rounded-full transition-all ${program.programProgress === 100 ? "bg-emerald-500" : "bg-brand"}`}
                style={{ width: `${program.programProgress}%` }} />
            </div>
            <span className={`text-xs font-bold ${program.programProgress === 100 ? "text-emerald-600" : "text-brand"}`}>
              {program.programProgress}%
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 w-80 overflow-hidden border-r border-slate-200 bg-white shadow-2xl lg:hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="font-semibold text-slate-800">Program Content</p>
                <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden"><SidebarContent /></div>
            </aside>
          </>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">

          {mainTab === "OVERVIEW" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl">
                <button onClick={() => setMainTab("CONTENT")}
                  className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="h-4 w-4" /> Back to Content
                </button>
                <h2 className="mb-6 text-xl font-bold text-slate-900">Program Overview</h2>
                <ProgramOverviewPanel program={program} onGoToContent={goToContent} />
              </div>
            </div>
          )}

          {mainTab === "ASSESSMENTS" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl">
                <button onClick={() => setMainTab("CONTENT")}
                  className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="h-4 w-4" /> Back to Content
                </button>
                <h2 className="mb-6 text-xl font-bold text-slate-900">All Assessments</h2>
                {program.courses.filter((m: any) => m.isEnrolled).length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <ClipboardList className="h-14 w-14 text-slate-200" />
                    <p className="font-semibold text-slate-600">No enrolled modules</p>
                  </div>
                ) : (
                  program.courses
                    .filter((m: any) => m.isEnrolled)
                    .map((m: any) => <ModuleAssessmentsSection key={m.id} module={m} />)
                )}
              </div>
            </div>
          )}

          {mainTab === "CONTENT" && (
            <>
              <div className="flex-1 overflow-hidden p-4">
                <ContentViewer resource={activeResource} />
              </div>

              {activeResource && (
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => prevResource && selectResource(prevResource.id, prevResource._sectionId, prevResource._moduleId)}
                      disabled={!prevResource}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    <button
                      onClick={() => toggleComplete.mutate({ resourceId: activeResource.id, courseId: activeResource._courseId })}
                      disabled={toggleComplete.isPending}
                      className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition ${activeResource.isCompleted ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-brand text-white hover:bg-brand-dim"}`}
                    >
                      {toggleComplete.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : activeResource.isCompleted
                          ? <><CheckCircle2 className="h-4 w-4" /> Completed</>
                          : <><Circle className="h-4 w-4" /> Mark as Complete</>}
                    </button>

                    <button
                      onClick={() => nextResource && selectResource(nextResource.id, nextResource._sectionId, nextResource._moduleId)}
                      disabled={!nextResource}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>{activeResource._courseTitle}</span>
                    <span>›</span>
                    <span>{program.courses.flatMap((m: any) => m.sections).find((s: any) => s.id === activeResource._sectionId)?.title}</span>
                    {activeResource.durationMins && (
                      <><span>·</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(activeResource.durationMins)}</span></>
                    )}
                  </div>
                </div>
              )}

              {program.programProgress === 100 && (
                <div className="shrink-0 border-t border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-sm font-semibold text-emerald-700">
                    <Award className="h-5 w-5" />
                    You&apos;ve completed the entire program! Outstanding work.
                    <button onClick={() => router.push("/dashboard/student")}
                      className="ml-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
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