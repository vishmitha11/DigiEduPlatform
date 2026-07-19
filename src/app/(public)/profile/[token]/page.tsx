"use client";

import { use } from "react";
import {
  BadgeCheck,
  Building2,
  Link as LinkIcon,
  Loader2,
  Lock,
  MapPin,
  User,
} from "lucide-react";
import { api } from "~/trpc/react";
import Card from "~/app/components/ui/Card";
import Badge from "~/app/components/ui/Badge";
import StatusPill from "~/app/components/ui/StatusPill";
import ProgressBar from "~/app/components/ui/ProgressBar";

const JOURNEY_ICONS: Record<string, string> = {
  discover: "🔍",
  learnAndGrow: "📚",
  applyAndExperience: "💼",
  getRecognized: "🏆",
  leadAndInspire: "🌟",
};

export default function PublicStudentProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const { data: profile, isLoading, error } = api.studentProfile.getPublicProfile.useQuery(
    { token },
    { retry: false },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Generic message for both "doesn't exist" and "private" — never
  // distinguish the two cases to the visitor.
  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <Lock className="h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-600">This profile isn&apos;t available.</p>
        <p className="text-sm text-slate-400">
          It may be private, or the link may no longer be valid.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {profile.header && (
              <Card>
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                    {profile.header.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.header.avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-slate-900">
                        {profile.header.fullName ?? "Student"}
                      </h1>
                      {profile.header.isVerified && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                          <BadgeCheck className="h-4 w-4" /> Verified
                        </span>
                      )}
                    </div>
                    {profile.header.tagline && (
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {profile.header.tagline}
                      </p>
                    )}
                    {profile.header.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5" /> {profile.header.location}
                      </p>
                    )}
                    {profile.header.personalStatement && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {profile.header.personalStatement}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {profile.journey && (
              <Card title="Journey">
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
            )}

            {profile.education && (
              <Card title="Education">
                {profile.education.enrollments.length === 0 &&
                profile.education.credentials.length === 0 ? (
                  <p className="text-sm text-slate-400">No education records to show.</p>
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
            )}

            {profile.researchPapers && (
              <Card title="Research Papers">
                {profile.researchPapers.length === 0 ? (
                  <p className="text-sm text-slate-400">No research papers to show.</p>
                ) : (
                  <div className="space-y-2">
                    {profile.researchPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {paper.title}
                          </p>
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
                        <StatusPill status={paper.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {profile.programs && profile.courses && (
              <Card title="Programs & Courses">
                {profile.programs.length === 0 && profile.courses.length === 0 ? (
                  <p className="text-sm text-slate-400">No enrollments to show.</p>
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
                          <span className="text-xs font-bold text-blue-600">
                            {p.progressPercent}%
                          </span>
                        </div>
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
                          <span className="text-xs font-bold text-violet-600">
                            {c.progressPercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          {(profile.currentInstitute !== undefined || profile.sidebar) && (
            <div className="space-y-6">
              {profile.currentInstitute !== undefined && (
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
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No active institute enrollment.</p>
                  )}
                </Card>
              )}

              {profile.sidebar && (
                <Card title="Quick Facts">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Programs</span>
                      <span className="font-semibold text-slate-800">
                        {profile.sidebar.totalPrograms}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Research Papers</span>
                      <span className="font-semibold text-slate-800">
                        {profile.sidebar.totalResearchPapers}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
