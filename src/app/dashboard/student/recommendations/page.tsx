"use client";

import { useRouter } from "next/navigation";
import {
  Sparkles, Clock, Globe, Building2, Layers, Loader2, ArrowRight,
} from "lucide-react";
import { api } from "~/trpc/react";

const LEVEL_COLORS: Record<string, string> = {
  ENTRY:          "bg-green-100 text-green-700",
  UNDERGRADUATE:  "bg-blue-100 text-blue-700",
  POSTGRADUATE:   "bg-violet-100 text-violet-700",
  RESEARCH:       "bg-orange-100 text-orange-700",
};

const TYPE_COLORS: Record<string, string> = {
  BACHELOR:       "bg-blue-50 text-blue-700",
  MASTER:         "bg-violet-50 text-violet-700",
  PHD:            "bg-purple-50 text-purple-700",
  DIPLOMA:        "bg-emerald-50 text-emerald-700",
  CERTIFICATE:    "bg-orange-50 text-orange-700",
  FOUNDATION:     "bg-yellow-50 text-yellow-700",
  PROFESSIONAL:   "bg-slate-50 text-slate-700",
  MICROCREDENTIAL:"bg-pink-50 text-pink-700",
  SHORT_COURSE:   "bg-teal-50 text-teal-700",
};

function matchLabel(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Strong Match", className: "bg-green-100 text-green-700" };
  if (score >= 40) return { label: "Good Match", className: "bg-amber-400 text-amber-950 shadow-sm shadow-amber-300/50" };
  return { label: "Possible Match", className: "bg-slate-100 text-slate-600" };
}

export default function RecommendationsPage() {
  const router = useRouter();
  const { data, isLoading } = api.studentProfile.getRecommendations.useQuery();
  const logInteraction = api.studentProfile.logInteraction.useMutation();

  const goToProgram = (programId: string, rankPosition: number, score: number) => {
    logInteraction.mutate({ programId, action: "CLICKED", rankPosition, score });
    router.push(`/dashboard/student/programs/${programId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Personalised for you
            </div>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Recommended for You
            </h1>
            <p className="mt-3 text-lg text-slate-500">
              Programs matched to your interests, goals and preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : data?.profileIncomplete ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-600">
              Complete your profile to get personalised recommendations
            </p>
            <p className="mt-1 text-sm text-slate-400">
              A couple of quick questions about your interests and goals is all it takes.
            </p>
            <button
              onClick={() => router.push("/profile-setup")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Complete Profile
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : !data?.recommendations.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-600">No matches yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Try widening your budget or delivery mode preferences in your profile.
            </p>
            <button
              onClick={() => router.push("/profile-setup")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Edit Preferences
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {data.recommendations.map((program, index) => {
              const match = matchLabel(program.matchScore);
              const rankPosition = index + 1;
              return (
                <div
                  key={program.id}
                  onClick={() => goToProgram(program.id, rankPosition, program.matchScore)}
                  className="flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="p-5 pb-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_COLORS[program.type] ?? "bg-slate-50 text-slate-700"}`}>
                          {program.type.replace(/_/g, " ")}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LEVEL_COLORS[program.level] ?? "bg-slate-100 text-slate-600"}`}>
                          {program.level}
                        </span>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${match.className}`}>
                        {match.label}
                      </span>
                    </div>

                    <h3 className="font-bold leading-snug text-slate-900">{program.title}</h3>

                    {program.institution && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {program.institution.name}
                      </div>
                    )}

                    {program.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-400 leading-relaxed">
                        {program.description}
                      </p>
                    )}
                  </div>

                  <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                    {program.durationMonths && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {program.durationMonths} months
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {program.deliveryMode.replace(/_/g, " ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {program.courses.length} modules
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-4">
                    <div>
                      {program.localPrice && Number(program.localPrice) > 0 ? (
                        <div>
                          <p className="text-base font-bold text-slate-900">
                            LKR {Number(program.localPrice).toLocaleString()}
                          </p>
                          {program.foreignPrice && (
                            <p className="text-xs text-slate-400">
                              USD {Number(program.foreignPrice).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                          Free
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); goToProgram(program.id, rankPosition, program.matchScore); }}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
