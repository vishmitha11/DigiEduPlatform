// Shared types for JobForm / JobPreviewCard — kept in their own module so
// the two components don't need to import from each other.

export interface JobFormValues {
  title: string;
  department: string;
  numberOfOpenings: string;
  description: string;
  type: string;
  workModel: string;
  location: string;
  experienceLevel: string;
  minimumEducation: string;
  requiredQualifications: string[];
  preferredFields: string[];
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  displaySalaryPublicly: boolean;
  applicationDeadline: string;
}

// Loosely typed to match whatever shape api.job.getById / getMyListings
// returns (Prisma Decimal fields arrive as objects with toString()).
export interface JobListingInitialData {
  title: string;
  department: string | null;
  numberOfOpenings: number | null;
  description: string | null;
  type: string;
  workModel: string | null;
  location: string | null;
  experienceLevel: string | null;
  minimumEducation: string | null;
  requiredQualifications: string[];
  preferredFields: string[];
  requirements: string | null;
  salaryMin: { toString(): string } | null;
  salaryMax: { toString(): string } | null;
  displaySalaryPublicly: boolean;
  applicationDeadline: string | Date | null;
}
