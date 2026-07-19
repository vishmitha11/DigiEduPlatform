import { CAREER_GOALS, INTEREST_CATEGORIES } from "~/lib/taxonomy/programTaxonomy";
import { PROGRAM_FIELD_TO_INTERESTS } from "~/lib/taxonomy/programFieldMapping";

const VALID_INTEREST_IDS = new Set<string>(INTEREST_CATEGORIES.map((c) => c.id));

const WEIGHT_INTEREST = 50;
const WEIGHT_CAREER = 30;

interface ScoringStudent {
  interests: string[];
  careerGoals: string[];
}

interface ScoringProgramCandidate {
  field: string;
  interestTags: string[];
}

// Program.interestTags is free-text in practice (seeded with values like
// "economics"/"justice" that don't correspond to any INTEREST_CATEGORIES
// id), so it can't be trusted wholesale as a match source. Only entries
// that are actually valid taxonomy ids are kept; PROGRAM_FIELD_TO_INTERESTS
// (keyed off the fixed ProgramField enum) is always merged in as the
// reliable baseline, so scoring works today and improves automatically if
// interestTags is ever populated with real taxonomy ids later.
export function getEffectiveInterestTags(program: {
  field: string;
  interestTags: string[];
}): string[] {
  const validTaggedIds = program.interestTags.filter((tag) => VALID_INTEREST_IDS.has(tag));
  const fieldMapped = PROGRAM_FIELD_TO_INTERESTS[program.field] ?? [];
  return [...new Set([...fieldMapped, ...validTaggedIds])];
}

export interface ScoreBreakdown {
  interestScore: number;
  careerScore: number;
  total: number;
  // Whether this program has any genuine relevance to the student's
  // interests/career goals — mode/budget/region are eligibility (already
  // enforced by passesHardFilters before this runs), not relevance, so
  // they don't factor into the score at all: every candidate reaching
  // this function already satisfies them, so scoring them again would
  // just add a constant that inflates every program's total equally
  // without differentiating anything.
  isRelevant: boolean;
}

export function scoreProgram(
  student: ScoringStudent,
  program: ScoringProgramCandidate,
): ScoreBreakdown {
  const tagSet = new Set(getEffectiveInterestTags(program));

  const interestOverlap = student.interests.filter((i) => tagSet.has(i)).length;
  const interestScore =
    student.interests.length > 0
      ? (interestOverlap / student.interests.length) * WEIGHT_INTEREST
      : 0;

  // A career goal matches if any of its related interests appear in the
  // program's effective tags — reuses CAREER_GOALS.relatedInterests
  // instead of maintaining a separate program-to-career-goal mapping.
  const careerOverlap = student.careerGoals.filter((goalId) => {
    const goal = CAREER_GOALS.find((g) => g.id === goalId);
    return goal?.relatedInterests.some((ri) => tagSet.has(ri)) ?? false;
  }).length;
  const careerScore =
    student.careerGoals.length > 0
      ? (careerOverlap / student.careerGoals.length) * WEIGHT_CAREER
      : 0;

  return {
    interestScore,
    careerScore,
    total: interestScore + careerScore,
    isRelevant: interestOverlap > 0 || careerOverlap > 0,
  };
}
