// Shared types for FilterRail / CandidateCard — kept in their own module so
// the components don't need to import from each other, mirroring
// ../../jobs/_components/jobFormTypes.ts's convention.

import type { ProgramField } from "@prisma/client";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "OVERSEAS";
export type WorkModelType = "ON_SITE" | "HYBRID" | "REMOTE";

export interface CandidateFilters {
  jobId: string;
  search: string;
  employmentTypes: EmploymentType[];
  workModels: WorkModelType[];
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
  employmentTypePreference: string[];
  workModelPreference: string[];
  availability: string | null;
  papersCount: number;
  credentialsCount: number;
  matchScore: number;
  shareToken: string | null;
}

export interface CandidateFacets {
  employmentTypes: Record<string, number>;
  workModels: Record<string, number>;
  fieldsOfStudy: { field: ProgramField; count: number }[];
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  OVERSEAS: "Overseas",
};

export const WORK_MODEL_LABELS: Record<WorkModelType, string> = {
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

// ProgramField enum values are SCREAMING_SNAKE_CASE — turn e.g.
// "DATA_SCIENCE" into "Data Science" for filter chip / badge labels.
export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
