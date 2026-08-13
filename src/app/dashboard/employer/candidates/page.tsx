"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search, SearchX, Users } from "lucide-react";
import { api } from "~/trpc/react";
import Card from "~/app/components/ui/Card";
import Button from "~/app/components/ui/Button";
import Select from "~/app/components/ui/Select";
import FilterRail from "./_components/FilterRail";
import CandidateCard from "./_components/CandidateCard";
import type { CandidateFilters } from "./_components/candidateTypes";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: CandidateFilters = {
  jobId: "",
  search: "",
  fieldsOfStudy: [],
  verifiedOnly: false,
  hasPublishedResearch: false,
  hasCredentials: false,
  minGpa: "",
  gradYear: "",
  minMatchScore: 0,
  sortBy: "match",
};

export default function CandidateSearchPage() {
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const { data: jobs = [], isLoading: jobsLoading } = api.job.getMyListings.useQuery();
  const publishedJobs = jobs.filter((j) => j.status === "PUBLISHED");

  // Default the job selector to the employer's first published listing
  // once it loads.
  useEffect(() => {
    if (!filters.jobId && publishedJobs.length > 0) {
      setFilters((f) => ({ ...f, jobId: publishedJobs[0]!.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedJobs.length]);

  const patchFilters = (patch: Partial<CandidateFilters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const clearAll = () => {
    setPage(1);
    setFilters((f) => ({ ...DEFAULT_FILTERS, jobId: f.jobId }));
  };

  const { data, isLoading, isFetching, error } = api.candidate.search.useQuery(
    {
      jobId: filters.jobId,
      search: filters.search.trim() || undefined,
      fieldsOfStudy: filters.fieldsOfStudy,
      verifiedOnly: filters.verifiedOnly,
      hasPublishedResearch: filters.hasPublishedResearch,
      hasCredentials: filters.hasCredentials,
      minGpa: filters.minGpa.trim() || undefined,
      gradYear: filters.gradYear ? Number(filters.gradYear) : undefined,
      minMatchScore: filters.minMatchScore,
      sortBy: filters.sortBy,
      page,
      pageSize: PAGE_SIZE,
    },
    { enabled: !!filters.jobId },
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  if (jobsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (publishedJobs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">Publish a job to search candidates</p>
          <p className="mt-1 px-6 text-sm text-slate-400">
            Candidate search unlocks once you have at least one published job listing.
          </p>
          <Link href="/dashboard/employer/jobs/new" className="mt-4 inline-block">
            <Button variant="primary" size="sm">
              Post a Job
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Find Candidates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search verified students and graduates who&apos;ve opted into a public passport.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FilterRail
            filters={filters}
            onChange={patchFilters}
            onClearAll={clearAll}
            facets={data?.facets}
          />

          <div>
            <Card className="mb-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.search}
                    onChange={(e) => patchFilters({ search: e.target.value })}
                    placeholder="Search by name, skill, institution or field of study…"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="sm:w-56">
                  <Select
                    value={filters.sortBy}
                    onChange={(e) =>
                      patchFilters({ sortBy: e.target.value as CandidateFilters["sortBy"] })
                    }
                  >
                    <option value="match">Sort: Best match</option>
                    <option value="gpa">Sort: Highest GPA</option>
                    <option value="gradYear">Sort: Graduating soonest</option>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {isLoading ? (
                  "Searching…"
                ) : (
                  <>
                    <strong className="text-slate-900">{data?.total ?? 0}</strong> candidate
                    {data?.total === 1 ? "" : "s"} match your criteria
                    {isFetching && !isLoading && (
                      <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                  </>
                )}
              </p>
            </div>

            {error && (
              <Card className="mb-3">
                <p className="text-sm text-red-600">{error.message}</p>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : data && data.results.length > 0 ? (
              <>
                {data.results.map((candidate) => (
                  <CandidateCard key={candidate.studentId} candidate={candidate} jobId={filters.jobId} />
                ))}

                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Card className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                  <SearchX className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-bold text-slate-900">No candidates match these filters</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try widening your match score or removing a field of study.
                </p>
                <Button variant="ghost" size="sm" className="mt-4" onClick={clearAll}>
                  Clear all filters
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
