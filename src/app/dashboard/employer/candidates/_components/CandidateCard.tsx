"use client";

import Link from "next/link";
import { Award, BadgeCheck, Building2, Calendar, Mail, MapPin } from "lucide-react";
import { api } from "~/trpc/react";
import Card from "~/app/components/ui/Card";
import Badge from "~/app/components/ui/Badge";
import StatusPill from "~/app/components/ui/StatusPill";
import ProgressBar from "~/app/components/ui/ProgressBar";
import Button from "~/app/components/ui/Button";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODEL_LABELS, type CandidateResult } from "./candidateTypes";

const AVATAR_TINTS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
];

function getInitials(fullName: string | null): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

// Deterministic pseudo-random tint per name so the same candidate always
// gets the same avatar color across renders/pages.
function tintForName(fullName: string | null): string {
  const key = fullName ?? "?";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]!;
}

export default function CandidateCard({
  candidate,
  jobId,
}: {
  candidate: CandidateResult;
  jobId: string;
}) {
  const invite = api.candidate.invite.useMutation();

  const matchTone: "success" | "brand" | "warning" =
    candidate.matchScore >= 90 ? "success" : candidate.matchScore >= 70 ? "brand" : "warning";
  const matchTextColor =
    candidate.matchScore >= 90
      ? "text-emerald-600"
      : candidate.matchScore >= 70
        ? "text-brand"
        : "text-amber-600";

  const passportHref = candidate.shareToken ? `/profile/${candidate.shareToken}` : null;

  return (
    <Card className="mb-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${tintForName(candidate.fullName)}`}
        >
          {getInitials(candidate.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">{candidate.fullName ?? "Student"}</h3>
            {candidate.isVerified && (
              <Badge tone="info">
                <BadgeCheck className="mr-1 inline h-3 w-3" /> Verified
              </Badge>
            )}
            {candidate.availability && <StatusPill status={candidate.availability} />}
          </div>

          {/* Raw fieldOfStudy/degreeProgram as returned by the router — never
              the internal taxonomy classifier, which stays scoped to
              filtering/facets only. */}
          {(candidate.degreeProgram ?? candidate.fieldOfStudy) && (
            <p className="mt-0.5 text-sm text-slate-600">
              {[candidate.degreeProgram, candidate.fieldOfStudy]
                .filter((v, i, arr) => !!v && arr.indexOf(v) === i)
                .join(" · ")}
            </p>
          )}

          {candidate.tagline && <p className="mt-1 text-sm text-slate-600">{candidate.tagline}</p>}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {candidate.institute && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {candidate.institute}
              </span>
            )}
            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {candidate.location}
              </span>
            )}
            {candidate.expectedGraduationDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Grad{" "}
                {new Date(candidate.expectedGraduationDate).getFullYear()}
              </span>
            )}
            {candidate.gpa && (
              <span className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> GPA {candidate.gpa}
              </span>
            )}
          </div>

          {(candidate.employmentTypePreference.length > 0 ||
            candidate.workModelPreference.length > 0 ||
            candidate.papersCount > 0 ||
            candidate.credentialsCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.employmentTypePreference.map((t) => (
                <Badge key={t} tone="neutral">
                  {EMPLOYMENT_TYPE_LABELS[t as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? t}
                </Badge>
              ))}
              {candidate.workModelPreference.map((m) => (
                <Badge key={m} tone="info">
                  {WORK_MODEL_LABELS[m as keyof typeof WORK_MODEL_LABELS] ?? m}
                </Badge>
              ))}
              {candidate.papersCount > 0 && (
                <Badge tone="info">
                  {candidate.papersCount} paper{candidate.papersCount > 1 ? "s" : ""}
                </Badge>
              )}
              {candidate.credentialsCount > 0 && (
                <Badge tone="success">
                  {candidate.credentialsCount} credential
                  {candidate.credentialsCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}

          {candidate.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-full flex-shrink-0 sm:w-40">
          <div className="text-right">
            <p className="text-xs text-slate-400">Match to this role</p>
            <p className={`text-2xl font-bold ${matchTextColor}`}>{candidate.matchScore}%</p>
          </div>
          <ProgressBar value={candidate.matchScore} tone={matchTone} className="mt-1" />

          <div className="mt-4 flex flex-col gap-2">
            {passportHref ? (
              <Link
                href={passportHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View Passport
              </Link>
            ) : (
              <Button variant="ghost" size="sm" className="w-full" disabled>
                View Passport
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              loading={invite.isPending}
              disabled={invite.isSuccess}
              onClick={() => invite.mutate({ studentId: candidate.studentId, jobId })}
            >
              <Mail className="h-3.5 w-3.5" />
              {invite.isSuccess ? "Invited" : "Invite"}
            </Button>
            {invite.isError && (
              <p className="text-xs text-red-600">{invite.error.message}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
