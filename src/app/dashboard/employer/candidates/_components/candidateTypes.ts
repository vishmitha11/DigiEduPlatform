// Shared types for FilterRail / CandidateCard — kept in their own module so
// the components don't need to import from each other, mirroring
// ../../jobs/_components/jobFormTypes.ts's convention.

import type { ProgramField } from "@prisma/client";

export interface CandidateFilters {
  jobId: string;
  search: string;
  fieldsOfStudy: ProgramField[];
  verifiedOnly: boolean;
  hasPublishedResearch: boolean;
  hasCredentials: boolean;
  minGpa: string;
  gradYear: string; // "" = any year
  minMatchScore: number;
  sortBy: "match" | "gpa" | "gradYear";
}

// Loosely typed to match whatever api.candidate.search.useQuery returns
// (superjson deserializes Prisma DateTime fields into real Date objects on
// the client) — same convention as JobListingInitialData in jobFormTypes.ts.
export interface CandidateResult {
  studentId: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  tagline: string | null;
  location: string | null;
  institute: string | null;
  fieldOfStudy: string | null;
  degreeProgram: string | null;
  yearOrGrade: string | null;
  expectedGraduationDate: Date | null;
  gpa: string | null;
  skills: string[];
  papersCount: number;
  credentialsCount: number;
  matchScore: number;
  shareToken: string | null;
}

export interface CandidateFacets {
  fieldsOfStudy: { field: ProgramField; count: number }[];
}

// ProgramField enum values are SCREAMING_SNAKE_CASE — turn e.g.
// "DATA_SCIENCE" into "Data Science" for filter chip / badge labels.
export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
