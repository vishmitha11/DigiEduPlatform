import { getRegionForCountry } from "~/lib/taxonomy/regionTaxonomy";

interface StudentFilterContext {
  countryCode: string | null;
  budgetTierMaxUsd: number | null;
  preferredMode: string | null;
  skillLevel: string | null;
}

interface ProgramFilterCandidate {
  id: string;
  acceptsInternational: boolean;
  restrictedRegions: string[];
  priceUsd: number | null;
  deliveryMode: string | null;
  minSkillLevel: string | null;
}

export function passesHardFilters(
  student: StudentFilterContext,
  program: ProgramFilterCandidate
): boolean {
  if (student.countryCode) {
    const studentRegion = getRegionForCountry(student.countryCode);

    if (!program.acceptsInternational) {
      return false;
    }

    if (studentRegion && program.restrictedRegions.includes(studentRegion)) {
      return false;
    }
  }

  if (
    student.budgetTierMaxUsd !== null &&
    program.priceUsd !== null &&
    program.priceUsd > student.budgetTierMaxUsd
  ) {
    return false;
  }

  if (
    student.preferredMode &&
    program.deliveryMode &&
    student.preferredMode !== program.deliveryMode &&
    student.preferredMode !== "any"
  ) {
    return false;
  }

  return true;
}