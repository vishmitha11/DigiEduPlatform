"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Copy,
  Link as LinkIcon,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
  User,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";
import Button from "~/app/components/ui/Button";
import Card from "~/app/components/ui/Card";
import Input from "~/app/components/ui/Input";
import Select from "~/app/components/ui/Select";
import Badge from "~/app/components/ui/Badge";
import StatusPill from "~/app/components/ui/StatusPill";
import ProgressBar from "~/app/components/ui/ProgressBar";

// ── Journey stages ────────────────────────────────────────────────────────

const JOURNEY_ICONS: Record<string, string> = {
  discover: "🔍",
  learnAndGrow: "📚",
  applyAndExperience: "💼",
  getRecognized: "🏆",
  leadAndInspire: "🌟",
};

const VISIBILITY_LABELS: { key: VisibilityKey; label: string }[] = [
  { key: "header", label: "Header (name, avatar, tagline, bio)" },
  { key: "journey", label: "Journey progress tracker" },
  { key: "education", label: "Education status" },
  { key: "currentInstitute", label: "Current institute" },
  { key: "researchPapers", label: "Research papers" },
  { key: "programs", label: "Programs & courses" },
  { key: "sidebar", label: "Sidebar summary" },
];

type VisibilityKey =
  | "header"
  | "journey"
  | "education"
  | "currentInstitute"
  | "researchPapers"
  | "programs"
  | "sidebar";

type VisibilityState = Record<VisibilityKey, boolean>;

const DEFAULT_VISIBILITY: VisibilityState = {
  header: true,
  journey: true,
  education: true,
  currentInstitute: true,
  researchPapers: true,
  programs: true,
  sidebar: true,
};

export default function StudentProfilePage() {
  const utils = api.useUtils();
  const {
    data: profile,
    isLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = api.studentProfile.getMyProfile.useQuery();

  // ── Transient error banner ───────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const upsertProfile = api.studentProfile.upsertPublicProfile.useMutation({
    onSuccess: () => utils.studentProfile.getMyProfile.invalidate(),
    onError: (err) => showError(err.message || "Failed to save changes. Please try again."),
  });
  const addResearchPaper = api.studentProfile.addResearchPaper.useMutation({
    onSuccess: () => utils.studentProfile.getMyProfile.invalidate(),
    onError: (err) => showError(err.message || "Failed to add research paper. Please try again."),
  });
  const updateResearchPaper = api.studentProfile.updateResearchPaper.useMutation({
    onSuccess: () => utils.studentProfile.getMyProfile.invalidate(),
    onError: (err) => showError(err.message || "Failed to update research paper. Please try again."),
  });
  const deleteResearchPaper = api.studentProfile.deleteResearchPaper.useMutation({
    onSuccess: () => utils.studentProfile.getMyProfile.invalidate(),
    onError: (err) => showError(err.message || "Failed to delete research paper. Please try again."),
  });

  // ── Header edit state ────────────────────────────────────────────────
  const [editingHeader, setEditingHeader] = useState(false);
  const [tagline, setTagline] = useState("");
  const [personalStatement, setPersonalStatement] = useState("");
  const [location, setLocation] = useState("");

  // ── Visibility / public state ────────────────────────────────────────
  const [visibility, setVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [isPublic, setIsPublic] = useState(false);

  // ── Research paper form state ────────────────────────────────────────
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [paperTitle, setPaperTitle] = useState("");
  const [paperStatus, setPaperStatus] = useState<"PUBLISHED" | "UNDER_REVIEW">("UNDER_REVIEW");
  const [paperLink, setPaperLink] = useState("");

  // ── Copy link confirmation ───────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setTagline(profile.tagline ?? "");
    setPersonalStatement(profile.personalStatement ?? "");
    setLocation(profile.location ?? "");
    setVisibility(profile.visibility);
    setIsPublic(profile.isPublic);
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="font-medium text-slate-600">Couldn&apos;t load your profile.</p>
        <Button variant="secondary" size="sm" onClick={() => refetchProfile()}>
          Try again
        </Button>
      </div>
    );
  }

  const saveHeader = () => {
    upsertProfile.mutate(
      {
        tagline: tagline || undefined,
        personalStatement: personalStatement || undefined,
        location: location || undefined,
        isPublic,
        visibility,
      },
      { onSuccess: () => setEditingHeader(false) },
    );
  };

  const toggleVisibility = (key: VisibilityKey) => {
    const previous = visibility;
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    upsertProfile.mutate(
      {
        tagline: profile.tagline ?? undefined,
        personalStatement: profile.personalStatement ?? undefined,
        location: profile.location ?? undefined,
        isPublic,
        visibility: next,
      },
      { onError: () => setVisibility(previous) },
    );
  };

  const togglePublic = () => {
    const previous = isPublic;
    const next = !isPublic;
    setIsPublic(next);
    upsertProfile.mutate(
      {
        tagline: profile.tagline ?? undefined,
        personalStatement: profile.personalStatement ?? undefined,
        location: profile.location ?? undefined,
        isPublic: next,
        visibility,
      },
      { onError: () => setIsPublic(previous) },
    );
  };

  const resetPaperForm = () => {
    setShowPaperForm(false);
    setEditingPaperId(null);
    setPaperTitle("");
    setPaperStatus("UNDER_REVIEW");
    setPaperLink("");
  };

  const startEditPaper = (paper: (typeof profile.researchPapers)[number]) => {
    setEditingPaperId(paper.id);
    setPaperTitle(paper.title);
    setPaperStatus(paper.status as "PUBLISHED" | "UNDER_REVIEW");
    setPaperLink(paper.link ?? "");
    setShowPaperForm(true);
  };

  const submitPaperForm = () => {
    if (!paperTitle.trim()) return;
    const trimmedLink = paperLink.trim();
    if (editingPaperId) {
      // `null` explicitly clears an existing link server-side; `undefined`
      // would leave the previous value untouched (see studentProfile.ts).
      updateResearchPaper.mutate(
        {
          id: editingPaperId,
          title: paperTitle,
          status: paperStatus,
          link: trimmedLink === "" ? null : trimmedLink,
        },
        { onSuccess: resetPaperForm },
      );
    } else {
      addResearchPaper.mutate(
        {
          title: paperTitle,
          status: paperStatus,
          link: trimmedLink === "" ? undefined : trimmedLink,
        },
        { onSuccess: resetPaperForm },
      );
    }
  };

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/profile/${profile.shareToken}` : "";

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Couldn't copy the link. Please copy it manually.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your student passport and control what&apos;s shared publicly.
            </p>
          </div>
          <Button variant="secondary" onClick={copyShareLink}>
            {copied ? "Copied!" : <><Copy className="h-4 w-4" /> Copy Profile Link</>}
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Header card */}
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                    {profile.profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {profile.profile.fullName ?? "Student"}
                      </h2>
                      {profile.profile.isVerified && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                          <BadgeCheck className="h-4 w-4" /> Verified
                        </span>
                      )}
                    </div>
                    {!editingHeader ? (
                      <>
                        {profile.tagline && (
                          <p className="mt-1 text-sm font-medium text-slate-600">{profile.tagline}</p>
                        )}
                        {profile.location && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3.5 w-3.5" /> {profile.location}
                          </p>
                        )}
                        {profile.personalStatement && (
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {profile.personalStatement}
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                {!editingHeader && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingHeader(true)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>

              {editingHeader && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <Input
                    label="Tagline"
                    value={tagline}
                    maxLength={120}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Aspiring Software Engineer"
                  />
                  <Input
                    label="Location"
                    value={location}
                    maxLength={120}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Colombo, Sri Lanka"
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Personal Statement
                    </label>
                    <textarea
                      value={personalStatement}
                      maxLength={2000}
                      onChange={(e) => setPersonalStatement(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Tell visitors about yourself…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveHeader} loading={upsertProfile.isPending} size="sm">
                      Save
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingHeader(false)}>
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Journey tracker */}
            <Card title="Your Journey">
              <div className="flex flex-wrap gap-3">
                {profile.journey.map((stage) => (
                  <div
                    key={stage.key}
                    className={`flex flex-1 min-w-[140px] flex-col items-center gap-2 rounded-xl border p-4 text-center ${
                      stage.reached
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 opacity-60"
                    }`}
                  >
                    <span className="text-2xl">{JOURNEY_ICONS[stage.key] ?? "•"}</span>
                    <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                    {"placeholder" in stage && stage.placeholder ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Lock className="h-3 w-3" /> Coming soon
                      </span>
                    ) : stage.reached ? (
                      <Badge color="emerald">Reached</Badge>
                    ) : (
                      <Badge color="slate">Not yet</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Education status */}
            <Card title="Education Status">
              {profile.education.enrollments.length === 0 &&
              profile.education.credentials.length === 0 ? (
                <p className="text-sm text-slate-400">No education records yet.</p>
              ) : (
                <div className="space-y-3">
                  {profile.education.enrollments.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{e.programTitle}</p>
                        <p className="text-xs text-slate-500">
                          {e.field.replace(/_/g, " ")} · {e.institution ?? "—"}
                          {e.year ? ` · ${e.year}` : ""}
                        </p>
                      </div>
                      <StatusPill status={e.isCompleted ? "COMPLETED" : "ACTIVE"} />
                    </div>
                  ))}
                  {profile.education.credentials.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          {c.credentialType} {c.issuedBy ? `· ${c.issuedBy}` : ""}
                          {c.year ? ` · ${c.year}` : ""}
                        </p>
                      </div>
                      {c.isValid && <Badge color="emerald">Credential</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Research papers */}
            <Card
              title="Research Papers"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetPaperForm();
                    setShowPaperForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {showPaperForm && (
                <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Input
                    label="Title"
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    maxLength={200}
                  />
                  <Select
                    label="Status"
                    value={paperStatus}
                    onChange={(e) => setPaperStatus(e.target.value as "PUBLISHED" | "UNDER_REVIEW")}
                  >
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="PUBLISHED">Published</option>
                  </Select>
                  <Input
                    label="Link (optional)"
                    value={paperLink}
                    onChange={(e) => setPaperLink(e.target.value)}
                    placeholder="https://…"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={submitPaperForm}
                      loading={addResearchPaper.isPending || updateResearchPaper.isPending}
                    >
                      {editingPaperId ? "Update" : "Add"} Paper
                    </Button>
                    <Button variant="secondary" size="sm" onClick={resetPaperForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {profile.researchPapers.length === 0 ? (
                <p className="text-sm text-slate-400">No research papers added yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.researchPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{paper.title}</p>
                        {paper.link && (
                          <a
                            href={paper.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" /> View
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={paper.status} />
                        <button
                          onClick={() => startEditPaper(paper)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteResearchPaper.mutate({ id: paper.id })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Programs & courses */}
            <Card title="Ongoing Programs & Courses">
              {profile.programs.length === 0 && profile.courses.length === 0 ? (
                <p className="text-sm text-slate-400">No enrollments yet.</p>
              ) : (
                <div className="space-y-3">
                  {profile.programs.map((p) => (
                    <div key={p.enrollmentId} className="rounded-lg border border-slate-100 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar percent={p.progressPercent} />
                        </div>
                        <span className="text-xs font-bold text-blue-600">{p.progressPercent}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {p.completedCourses}/{p.totalCourses} modules completed
                      </p>
                    </div>
                  ))}
                  {profile.courses.map((c) => (
                    <div key={c.courseEnrollmentId} className="rounded-lg border border-slate-100 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                        <StatusPill status={c.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar percent={c.progressPercent} color="violet" />
                        </div>
                        <span className="text-xs font-bold text-violet-600">{c.progressPercent}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {c.completedResources}/{c.totalResources} resources completed
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current institute */}
            <Card title="Current Institute">
              {profile.currentInstitute ? (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {profile.currentInstitute.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.currentInstitute.logoUrl}
                        alt={profile.currentInstitute.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {profile.currentInstitute.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[profile.currentInstitute.city, profile.currentInstitute.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{profile.currentInstitute.programTitle}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No active institute enrollment yet.</p>
              )}
            </Card>

            {/* Announcements placeholder — no announcements-for-student query exists yet */}
            <Card title="Announcements">
              <p className="text-sm text-slate-400">No announcements to show right now.</p>
            </Card>

            {/* Sharing & visibility */}
            <Card title="Sharing & Visibility">
              <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {isPublic ? "Profile is public" : "Profile is private"}
                  </span>
                </div>
                <button
                  onClick={togglePublic}
                  className={`relative h-6 w-11 rounded-full transition ${
                    isPublic ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      isPublic ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Section Visibility
              </p>
              <div className="space-y-2">
                {VISIBILITY_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={visibility[key]}
                      onChange={() => toggleVisibility(key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {shareUrl && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Sparkles className="h-3.5 w-3.5" /> Shareable Link
                  </p>
                  <p className="truncate text-xs text-slate-400">{shareUrl}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
