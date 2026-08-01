"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  GraduationCap,
  Compass,
  BookOpen,
  Users,
  Rocket,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Globe,
  Flag,
  Phone,
  MapPin,
  Building2,
  Award,
  Star,
  Zap,
  HeartHandshake,
  Plus,
  Trash2,
  Sprout,
  Flame,
  RefreshCw,
  CheckCircle2,
  Monitor,
  Code2,
  Smartphone,
  BarChart3,
  Shield,
  Cloud,
  Palette,
  Briefcase,
  Megaphone,
  DollarSign,
  HeartPulse,
  Scale,
  UtensilsCrossed,
  Camera,
  Leaf,
  Brain,
  Languages as LanguagesIcon,
  Shirt,
  Truck,
  Dumbbell,
  FlaskConical,
  Plane,
  Search,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import {
  INTEREST_CATEGORIES,
  CAREER_GOALS,
  SKILL_LEVELS,
  DELIVERY_MODES,
  BUDGET_TIERS,
  CONTRIBUTION_GOALS,
  OPPORTUNITY_INTERESTS,
  type InterestCategoryId,
  type CareerGoalId,
  type ContributionGoalId,
  type OpportunityInterestId,
} from "~/lib/taxonomy/programTaxonomy";
import { COUNTRIES } from "~/lib/countries";
import ProfileSetupShell, {
  ReviewSection,
  ReviewGrid,
  ReviewItem,
  ReviewTags,
  labelClass,
  inputClass,
  fieldIconClass,
  inputWithIconClass,
  selectWithIconClass,
  selectChevronClass,
  type ProfileSetupStepDef,
} from "./ProfileSetupShell";

// ── Static data ────────────────────────────────────────────────────────────
const EDUCATION_LEVELS = [
  { value: "O/L", label: "O/L Completed" },
  { value: "A/L", label: "A/L Completed" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "DEGREE", label: "Undergraduate Degree" },
  { value: "POSTGRAD", label: "Postgraduate" },
];

const ACADEMIC_STATUSES = ["Full-time", "Part-time", "Exchange Student"];

const EMPLOYMENT_STATUSES = [
  { value: "STUDENT", label: "Full-time Student" },
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self Employed" },
  { value: "UNEMPLOYED", label: "Unemployed" },
];

const EMPLOYMENT_STATUS_ICONS: Record<string, LucideIcon> = {
  STUDENT: GraduationCap,
  EMPLOYED: Briefcase,
  SELF_EMPLOYED: Rocket,
  UNEMPLOYED: Search,
};

const SKILL_DISPLAY: Record<string, { label: string; description: string }> = {
  beginner: { label: "Beginner", description: "New to the field, exploring from scratch" },
  intermediate: { label: "Intermediate", description: "Some experience, ready to go deeper" },
  advanced: { label: "Advanced", description: "Strong foundation, pursuing mastery" },
};

const SKILL_LEVEL_ICONS: Record<string, LucideIcon> = {
  beginner: Sprout,
  intermediate: Flame,
  advanced: Zap,
};

const MODE_DISPLAY: Record<string, { label: string; description: string }> = {
  online: { label: "Online", description: "Fully remote, learn from anywhere" },
  hybrid: { label: "Hybrid", description: "Mix of online and in-person sessions" },
  in_person: { label: "In Person", description: "On-campus, face-to-face learning" },
};

const DELIVERY_MODE_ICONS: Record<string, LucideIcon> = {
  online: Monitor,
  hybrid: RefreshCw,
  in_person: Building2,
};

// Decorative only — lets the interest grid read at a glance instead of as a wall of text.
const INTEREST_ICONS: Record<InterestCategoryId, LucideIcon> = {
  "software-engineering": Code2,
  "mobile-development": Smartphone,
  "data-ai": BarChart3,
  cybersecurity: Shield,
  "cloud-infrastructure": Cloud,
  design: Palette,
  "business-management": Briefcase,
  marketing: Megaphone,
  "finance-accounting": DollarSign,
  "human-resources": Users,
  engineering: Building2,
  "healthcare-medicine": HeartPulse,
  "law-legal-studies": Scale,
  "education-teaching": GraduationCap,
  "hospitality-tourism": UtensilsCrossed,
  "media-communication": Camera,
  "architecture-construction": Building2,
  "agriculture-environment": Leaf,
  "psychology-social-sciences": Brain,
  "languages-linguistics": LanguagesIcon,
  "fashion-textile": Shirt,
  "logistics-supply-chain": Truck,
  "sports-fitness": Dumbbell,
  "natural-sciences": FlaskConical,
  "aviation-maritime": Plane,
};

const CONTRIBUTION_GOAL_ICONS: Record<ContributionGoalId, LucideIcon> = {
  "innovate-build": Zap,
  "solve-global-problems": Globe,
  "advance-research": FlaskConical,
  "create-impact": Users,
  "lead-inspire": Star,
  "empower-communities": HeartHandshake,
};

const POPULAR_SKILLS = ["Python", "Leadership", "Communication", "Problem Solving", "Project Management"];

// Only the first page of interests shows by default — "Show more" reveals the rest,
// keeping the initial selection quick instead of a 24-item wall.
const INITIAL_INTEREST_COUNT = 12;

// ── Steps ──────────────────────────────────────────────────────────────────
const STEPS: ProfileSetupStepDef[] = [
  {
    id: "basic",
    label: "Basic Info",
    title: "Tell us a bit about yourself",
    sidebarTitle: "Your Journey.\nYour Purpose.",
    sidebarBody: "A few essentials help us tailor programs and eligibility to where you actually are.",
  },
  {
    id: "education",
    label: "Education",
    title: "Your academic background",
    sidebarTitle: "Learn & Grow.\nAt Your Pace.",
    sidebarBody: "Your education details shape which programs and pathways make sense for you.",
  },
  {
    id: "interests",
    label: "Interests & Goals",
    title: "What excites you, and where you're headed",
    sidebarTitle: "Discover What\nDrives You.",
    sidebarBody: "Interests and goals are the core signals our recommendation engine uses to match you with programs.",
  },
  {
    id: "preferences",
    label: "Preferences",
    title: "How you like to learn",
    sidebarTitle: "Learn Your\nWay.",
    sidebarBody: "Skill level, delivery mode, and budget help us filter out programs that wouldn't be a fit.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review your information",
    sidebarTitle: "Almost\nThere.",
    sidebarBody: "Take a last look before we save your profile and personalize your dashboard.",
  },
];

const FEATURES = [
  { icon: Compass, label: "Personalized Journey", sub: "Recommendations tailored to your goals and interests" },
  { icon: BookOpen, label: "Learn & Grow", sub: "Structured programs and credentials that build real skills" },
  { icon: Users, label: "Connect & Collaborate", sub: "Reach lecturers, institutions, and employers on one platform" },
  { icon: Rocket, label: "Opportunities", sub: "Discover programs and jobs matched to where you want to go" },
];

// ── Form state ─────────────────────────────────────────────────────────────
interface QualificationRow {
  key: string;
  qualification: string;
  institute: string;
  yearCompleted: string;
  grade: string;
}

interface FormState {
  phone: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  district: string;
  nationality: string;
  countryCode: string;
  educationLevel: string;
  employmentStatus: string;
  institute: string;
  fieldOfStudy: string;
  degreeProgram: string;
  yearOrGrade: string;
  enrollmentStartDate: string;
  expectedGraduationDate: string;
  academicStatus: string;
  gpa: string;
  qualifications: QualificationRow[];
  interests: InterestCategoryId[];
  careerGoals: CareerGoalId[];
  contributionGoals: ContributionGoalId[];
  opportunityInterests: OpportunityInterestId[];
  skills: string[];
  skillLevel: string;
  preferredMode: string;
  budgetTierId: string;
}

const DEFAULT: FormState = {
  phone: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  district: "",
  nationality: "",
  countryCode: "",
  educationLevel: "",
  employmentStatus: "",
  institute: "",
  fieldOfStudy: "",
  degreeProgram: "",
  yearOrGrade: "",
  enrollmentStartDate: "",
  expectedGraduationDate: "",
  academicStatus: "",
  gpa: "",
  qualifications: [],
  interests: [],
  careerGoals: [],
  contributionGoals: [],
  opportunityInterests: [],
  skills: [],
  skillLevel: "",
  preferredMode: "",
  budgetTierId: "",
};

// Same treatment as a selected Employment Status card — solid brand border +
// a soft brand tint — applied to a field once it holds a real value.
function fieldClass(base: string, hasValue: unknown): string {
  if (!hasValue) return base;
  return base.replace("border-navy-border", "border-brand").replace("bg-navy-surface", "bg-brand/5");
}

// Optional field, but if filled it should look like a phone number.
function isValidPhone(v: string): boolean {
  return !v || /^[0-9+\-\s()]{7,20}$/.test(v);
}

// Date of birth must be a real, past date, with a 13-year minimum-age floor.
function isValidDateOfBirth(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  if (isNaN(d.getTime()) || d.getTime() > Date.now()) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs >= 13 * 365.25 * 24 * 60 * 60 * 1000;
}

// A step only counts as complete once its actually-required fields (the ones
// not marked "(optional)" in the UI) are all filled and, where applicable,
// actually valid — not just any one of them present.
function getStepCompletion(form: FormState): boolean[] {
  return [
    !!(form.dateOfBirth && form.countryCode) && isValidDateOfBirth(form.dateOfBirth) && isValidPhone(form.phone),
    !!form.educationLevel,
    form.interests.length > 0 && form.careerGoals.length > 0,
    !!(form.skillLevel && form.preferredMode && form.budgetTierId),
  ];
}

function newQualificationRow(): QualificationRow {
  return { key: crypto.randomUUID(), qualification: "", institute: "", yearCompleted: "", grade: "" };
}

// ── Main component ─────────────────────────────────────────────────────────
export default function StudentProfileSetup() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [goalSearch, setGoalSearch] = useState("");
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [showPriorEducation, setShowPriorEducation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skippingAll, setSkippingAll] = useState(false);
  const [error, setError] = useState<React.ReactNode>("");

  const upsertRecommendationProfile = api.studentProfile.upsertRecommendationProfile.useMutation();

  const { data: existingProfile, isLoading: profileLoading, isFetching: profileFetching } =
    api.studentProfile.getMyFullProfile.useQuery(undefined, {
      retry: false,
      throwOnError: false,
      refetchOnMount: "always",
    });

  useEffect(() => {
    if (profileFetching || hydrated) return;
    if (existingProfile) {
      const hydratedForm: FormState = {
        phone: existingProfile.phone ?? "",
        dateOfBirth: existingProfile.dateOfBirth ?? "",
        gender: existingProfile.gender ?? "",
        city: existingProfile.city ?? "",
        district: existingProfile.district ?? "",
        nationality: existingProfile.nationality ?? "",
        countryCode: existingProfile.countryCode ?? "",
        educationLevel: existingProfile.educationLevel ?? "",
        employmentStatus: existingProfile.employmentStatus ?? "",
        institute: existingProfile.institute ?? "",
        fieldOfStudy: existingProfile.fieldOfStudy ?? "",
        degreeProgram: existingProfile.degreeProgram ?? "",
        yearOrGrade: existingProfile.yearOrGrade ?? "",
        enrollmentStartDate: (existingProfile.enrollmentStartDate ?? "").slice(0, 7),
        expectedGraduationDate: (existingProfile.expectedGraduationDate ?? "").slice(0, 7),
        academicStatus: existingProfile.academicStatus ?? "",
        gpa: existingProfile.gpa ?? "",
        qualifications: (existingProfile.qualifications ?? []).map((q) => ({
          key: crypto.randomUUID(),
          qualification: q.qualification ?? "",
          institute: q.institute ?? "",
          yearCompleted: q.yearCompleted ?? "",
          grade: q.grade ?? "",
        })),
        interests: (existingProfile.interests ?? []) as InterestCategoryId[],
        careerGoals: (existingProfile.careerGoals ?? []) as CareerGoalId[],
        contributionGoals: (existingProfile.contributionGoals ?? []) as ContributionGoalId[],
        opportunityInterests: (existingProfile.opportunityInterests ?? []) as OpportunityInterestId[],
        skills: existingProfile.skills ?? [],
        skillLevel: existingProfile.skillLevel ?? "",
        preferredMode: existingProfile.preferredMode ?? "",
        budgetTierId: existingProfile.budgetTierId ?? "",
      };
      setForm(hydratedForm);
      if (hydratedForm.qualifications.length > 0) setShowPriorEducation(true);
      const completedSteps = getStepCompletion(hydratedForm);
      const firstIncomplete = completedSteps.findIndex((s) => !s);
      if (firstIncomplete !== -1) setStep(firstIncomplete);
      setHydrated(true);
    } else {
      setHydrated(true);
    }
  }, [existingProfile, profileFetching, hydrated]);

  async function writeProfileAndStudent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: profileError } = await supabase
      .from("Profile")
      .update({
        phone: form.phone || null,
        city: form.city || null,
        district: form.district || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        country: form.countryCode || null,
        isVerified: true,
      })
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { data: studentRow, error: studentError } = await supabase
      .from("Student")
      .upsert(
        {
          id: crypto.randomUUID(),
          profileId: user.id,
          previousEducation: form.educationLevel || null,
          employmentStatus: form.employmentStatus || null,
          institute: form.institute || null,
          fieldOfStudy: form.fieldOfStudy || null,
          degreeProgram: form.degreeProgram || null,
          yearOrGrade: form.yearOrGrade || null,
          enrollmentStartDate: form.enrollmentStartDate ? `${form.enrollmentStartDate}-01` : null,
          expectedGraduationDate: form.expectedGraduationDate ? `${form.expectedGraduationDate}-01` : null,
          academicStatus: form.academicStatus || null,
          gpa: form.gpa || null,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "profileId", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (studentError) throw studentError;

    // Prior-education entries are a small repeatable list — replacing the
    // whole set wholesale is simpler and safer here than diffing rows.
    const { error: deleteError } = await supabase
      .from("StudentQualification")
      .delete()
      .eq("studentId", studentRow.id);
    if (deleteError) throw deleteError;

    const rowsToInsert = form.qualifications.filter((q) => q.qualification);
    if (rowsToInsert.length > 0) {
      const { error: qualError } = await supabase.from("StudentQualification").insert(
        rowsToInsert.map((q) => ({
          id: crypto.randomUUID(),
          studentId: studentRow.id,
          qualification: q.qualification,
          institute: q.institute || null,
          yearCompleted: q.yearCompleted || null,
          grade: q.grade || null,
        })),
      );
      if (qualError) throw qualError;
    }
  }

  const recommendationInput = () => ({
    interests: form.interests.length > 0 ? form.interests : undefined,
    careerGoals: form.careerGoals.length > 0 ? form.careerGoals : undefined,
    skillLevel: form.skillLevel || undefined,
    preferredMode: form.preferredMode || undefined,
    budgetTierId: form.budgetTierId || undefined,
    countryCode: form.countryCode || undefined,
    contributionGoals: form.contributionGoals.length > 0 ? form.contributionGoals : undefined,
    opportunityInterests: form.opportunityInterests.length > 0 ? form.opportunityInterests : undefined,
    skills: form.skills.length > 0 ? form.skills : undefined,
  });

  const handleSkipAll = async () => {
    setSkippingAll(true);
    setError("");
    try {
      await writeProfileAndStudent();
      await upsertRecommendationProfile.mutateAsync(recommendationInput());
      router.push("/dashboard/student");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSkippingAll(false);
    }
  };

  function handleSkipStep() {
    setError("");
    setStep((s) => s + 1);
  }

  // Skip bypasses this entirely — Continue is the only action that enforces
  // the step's required fields.
  function handleNext() {
    const completedSteps = getStepCompletion(form);
    if (completedSteps[step] === false) {
      setError(
        <>
          Please fill in the required fields to <span className="font-bold text-white">Continue</span>, or use{" "}
          <span className="font-bold text-white">Skip</span> to move on without them.
        </>,
      );
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await writeProfileAndStudent();
      await upsertRecommendationProfile.mutateAsync(recommendationInput());
      router.push("/dashboard/student/recommendations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  function toggleInterest(id: InterestCategoryId) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((i) => i !== id)
        : f.interests.length < 8 ? [...f.interests, id] : f.interests,
    }));
  }

  function toggleGoal(id: CareerGoalId) {
    setForm((f) => ({
      ...f,
      careerGoals: f.careerGoals.includes(id)
        ? f.careerGoals.filter((g) => g !== id)
        : f.careerGoals.length < 5 ? [...f.careerGoals, id] : f.careerGoals,
    }));
  }

  function toggleContributionGoal(id: ContributionGoalId) {
    setForm((f) => ({
      ...f,
      contributionGoals: f.contributionGoals.includes(id)
        ? f.contributionGoals.filter((g) => g !== id)
        : f.contributionGoals.length < 3 ? [...f.contributionGoals, id] : f.contributionGoals,
    }));
  }

  function toggleOpportunityInterest(id: OpportunityInterestId) {
    setForm((f) => ({
      ...f,
      opportunityInterests: f.opportunityInterests.includes(id)
        ? f.opportunityInterests.filter((o) => o !== id)
        : [...f.opportunityInterests, id],
    }));
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed || form.skills.includes(trimmed) || form.skills.length >= 20) return;
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  function addQualificationRow() {
    setForm((f) => ({ ...f, qualifications: [...f.qualifications, newQualificationRow()] }));
  }

  function updateQualificationRow(key: string, patch: Partial<QualificationRow>) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.map((q) => (q.key === key ? { ...q, ...patch } : q)),
    }));
  }

  function removeQualificationRow(key: string) {
    setForm((f) => ({ ...f, qualifications: f.qualifications.filter((q) => q.key !== key) }));
  }

  function togglePriorEducation() {
    setShowPriorEducation((s) => {
      const next = !s;
      if (next && form.qualifications.length === 0) {
        setForm((f) => ({ ...f, qualifications: [newQualificationRow()] }));
      }
      return next;
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const relatedGoalIds = new Set(
    CAREER_GOALS.filter((g) => g.relatedInterests.some((ri) => form.interests.includes(ri))).map((g) => g.id),
  );
  const filteredGoals = CAREER_GOALS.filter((g) =>
    goalSearch ? g.label.toLowerCase().includes(goalSearch.toLowerCase()) : true,
  );
  const suggestedGoals = filteredGoals.filter((g) => relatedGoalIds.has(g.id));
  const otherGoals = filteredGoals.filter((g) => !relatedGoalIds.has(g.id));
  const visibleInterests = showAllInterests ? INTEREST_CATEGORIES : INTEREST_CATEGORIES.slice(0, INITIAL_INTEREST_COUNT);
  const selectedCountry = COUNTRIES.find((c) => c.code === form.countryCode);
  const isReviewStep = step === STEPS.length - 1;

  const educationLevelLabel = EDUCATION_LEVELS.find((e) => e.value === form.educationLevel)?.label;
  const employmentStatusLabel = EMPLOYMENT_STATUSES.find((e) => e.value === form.employmentStatus)?.label;
  const skillLevelLabel = form.skillLevel ? SKILL_DISPLAY[form.skillLevel]?.label : undefined;
  const modeLabel = form.preferredMode ? MODE_DISPLAY[form.preferredMode]?.label : undefined;
  const budgetLabel = BUDGET_TIERS.find((t) => t.id === form.budgetTierId)?.label;
  const interestLabels = INTEREST_CATEGORIES.filter((c) => form.interests.includes(c.id)).map((c) => c.label);
  const goalLabels = CAREER_GOALS.filter((g) => form.careerGoals.includes(g.id)).map((g) => g.label);
  const contributionGoalLabels = CONTRIBUTION_GOALS.filter((g) => form.contributionGoals.includes(g.id)).map((g) => g.label);
  const opportunityInterestLabels = OPPORTUNITY_INTERESTS.filter((o) => form.opportunityInterests.includes(o.id)).map((o) => o.label);

  if (profileLoading || (profileFetching && !hydrated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <ProfileSetupShell
      logoIcon={GraduationCap}
      role="STUDENT"
      heading="Set up your profile"
      subheading="Skip any step and finish later. Progress is saved when you submit."
      steps={STEPS}
      currentStep={step}
      completedSteps={getStepCompletion(form)}
      features={FEATURES}
      onBack={() => step > 0 && setStep((s) => s - 1)}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isLastStep={isReviewStep}
      submitting={submitting}
      error={error}
      onSkipAll={handleSkipAll}
      skippingAll={skippingAll}
      onSkipStep={!isReviewStep ? handleSkipStep : undefined}
    >
      {/* Step 0: Basic Info */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date of Birth <span className="text-red-400">*</span></label>
              <div className="relative">
                <Calendar className={fieldIconClass} />
                <input
                  type="date"
                  className={fieldClass(inputWithIconClass, form.dateOfBirth)}
                  value={form.dateOfBirth}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Gender <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <User className={fieldIconClass} />
                <select
                  className={fieldClass(selectWithIconClass, form.gender)}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className={selectChevronClass} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Country / Region <span className="text-red-400">*</span></label>
              <div className="relative">
                <Globe className={fieldIconClass} />
                <select
                  className={fieldClass(selectWithIconClass, form.countryCode)}
                  value={form.countryCode}
                  onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className={selectChevronClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nationality <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Flag className={fieldIconClass} />
                <select
                  className={fieldClass(selectWithIconClass, form.nationality)}
                  value={form.nationality}
                  onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                >
                  <option value="">Select nationality</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className={selectChevronClass} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Phone Number <span className="font-normal text-ink-muted">(optional)</span></label>
            <div className="relative">
              <Phone className={fieldIconClass} />
              <input
                type="tel"
                className={fieldClass(inputWithIconClass, form.phone)}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">Used for security and important updates.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <MapPin className={fieldIconClass} />
                <input
                  type="text"
                  className={fieldClass(inputWithIconClass, form.city)}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Colombo"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>District / State <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <MapPin className={fieldIconClass} />
                <input
                  type="text"
                  className={fieldClass(inputWithIconClass, form.district)}
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  placeholder="Western Province"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            Your country helps us filter programs by eligibility and delivery availability.
          </p>
        </div>
      )}

      {/* Step 1: Education */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Current Education Level <span className="text-red-400">*</span></label>
            <div className="relative">
              <GraduationCap className={fieldIconClass} />
              <select
                className={fieldClass(selectWithIconClass, form.educationLevel)}
                value={form.educationLevel}
                onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))}
              >
                <option value="">Select your current education level</option>
                {EDUCATION_LEVELS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <ChevronDown className={selectChevronClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Institute / University <span className="font-normal text-ink-muted">(optional)</span></label>
            <div className="relative">
              <Building2 className={fieldIconClass} />
              <input
                type="text"
                className={fieldClass(inputWithIconClass, form.institute)}
                value={form.institute}
                onChange={(e) => setForm((f) => ({ ...f, institute: e.target.value }))}
                placeholder="e.g. University of Colombo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Field of Study / Major <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <BookOpen className={fieldIconClass} />
                <input
                  type="text"
                  className={fieldClass(inputWithIconClass, form.fieldOfStudy)}
                  value={form.fieldOfStudy}
                  onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Degree Program <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Award className={fieldIconClass} />
                <input
                  type="text"
                  className={fieldClass(inputWithIconClass, form.degreeProgram)}
                  value={form.degreeProgram}
                  onChange={(e) => setForm((f) => ({ ...f, degreeProgram: e.target.value }))}
                  placeholder="e.g. BSc (Hons) in Computer Science"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Year / Grade <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Calendar className={fieldIconClass} />
                <input
                  type="text"
                  className={fieldClass(inputWithIconClass, form.yearOrGrade)}
                  value={form.yearOrGrade}
                  onChange={(e) => setForm((f) => ({ ...f, yearOrGrade: e.target.value }))}
                  placeholder="e.g. Year 2"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Academic Status <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Users className={fieldIconClass} />
                <select
                  className={fieldClass(selectWithIconClass, form.academicStatus)}
                  value={form.academicStatus}
                  onChange={(e) => setForm((f) => ({ ...f, academicStatus: e.target.value }))}
                >
                  <option value="">Select your academic status</option>
                  {ACADEMIC_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className={selectChevronClass} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Enrollment Start Date <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Calendar className={fieldIconClass} />
                <input
                  type="month"
                  className={fieldClass(inputWithIconClass, form.enrollmentStartDate)}
                  value={form.enrollmentStartDate}
                  onChange={(e) => setForm((f) => ({ ...f, enrollmentStartDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Expected Graduation Date <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="relative">
                <Calendar className={fieldIconClass} />
                <input
                  type="month"
                  className={fieldClass(inputWithIconClass, form.expectedGraduationDate)}
                  value={form.expectedGraduationDate}
                  onChange={(e) => setForm((f) => ({ ...f, expectedGraduationDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>GPA / Grade <span className="font-normal text-ink-muted">(optional)</span></label>
            <div className="relative">
              <Star className={fieldIconClass} />
              <input
                type="text"
                className={fieldClass(inputWithIconClass, form.gpa)}
                value={form.gpa}
                onChange={(e) => setForm((f) => ({ ...f, gpa: e.target.value }))}
                placeholder="e.g. 3.75/4.0, 85%, or First Class"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Employment Status <span className="font-normal text-ink-muted">(optional)</span></label>
            <div className="grid grid-cols-2 gap-2.5">
              {EMPLOYMENT_STATUSES.map((e) => {
                const Icon = EMPLOYMENT_STATUS_ICONS[e.value];
                const selected = form.employmentStatus === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, employmentStatus: e.value }))}
                    className={`rounded-lg border p-3 text-center transition ${
                      selected ? "border-brand bg-brand/5" : "border-navy-border hover:border-navy-border-strong"
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-brand/10" : "bg-navy-card"}`}>
                      {Icon && <Icon className={`h-4 w-4 ${selected ? "text-brand" : "text-ink-secondary"}`} />}
                    </div>
                    <div className={`text-sm font-semibold ${selected ? "text-brand" : "text-ink"}`}>{e.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-navy-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Have you completed any prior education?</p>
              <p className="text-xs text-ink-secondary">Add your previous education to help us understand your journey better.</p>
            </div>
            <button
              type="button"
              onClick={togglePriorEducation}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${showPriorEducation ? "bg-brand" : "bg-navy-border"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showPriorEducation ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          {showPriorEducation && (
            <div className="space-y-4">
              {form.qualifications.map((q, idx) => (
                <div key={q.key} className="rounded-lg border border-navy-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Previous Qualification {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeQualificationRow(q.key)}
                      className="text-ink-muted hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Qualification</label>
                      <div className="relative">
                        <Award className={fieldIconClass} />
                        <select
                          className={fieldClass(selectWithIconClass, q.qualification)}
                          value={q.qualification}
                          onChange={(e) => updateQualificationRow(q.key, { qualification: e.target.value })}
                        >
                          <option value="">Select qualification</option>
                          {EDUCATION_LEVELS.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                          ))}
                        </select>
                        <ChevronDown className={selectChevronClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Institute / School <span className="font-normal text-ink-muted">(optional)</span></label>
                      <div className="relative">
                        <Building2 className={fieldIconClass} />
                        <input
                          type="text"
                          className={fieldClass(inputWithIconClass, q.institute)}
                          value={q.institute}
                          onChange={(e) => updateQualificationRow(q.key, { institute: e.target.value })}
                          placeholder="Enter institute / school name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Year of Completion <span className="font-normal text-ink-muted">(optional)</span></label>
                        <div className="relative">
                          <Calendar className={fieldIconClass} />
                          <input
                            type="month"
                            className={fieldClass(inputWithIconClass, q.yearCompleted)}
                            value={q.yearCompleted}
                            onChange={(e) => updateQualificationRow(q.key, { yearCompleted: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Grade / Percentage <span className="font-normal text-ink-muted">(optional)</span></label>
                        <input
                          type="text"
                          className={fieldClass(inputClass, q.grade)}
                          value={q.grade}
                          onChange={(e) => updateQualificationRow(q.key, { grade: e.target.value })}
                          placeholder="Enter grade or percentage"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addQualificationRow}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-navy-border-strong py-3 text-sm font-semibold text-brand hover:border-brand/50 hover:bg-brand/5"
              >
                <Plus className="h-4 w-4" /> Add Another Previous Qualification
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Interests & Goals */}
      {step === 2 && (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                1. What are you most interested in? <span className="text-red-400">*</span> <span className="font-normal normal-case text-ink-muted">(Select up to 8)</span>
              </p>
              <span className="text-xs font-medium text-brand">{form.interests.length}/8 selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleInterests.map((cat) => {
                const Icon = INTEREST_ICONS[cat.id];
                const selected = form.interests.includes(cat.id);
                const maxed = form.interests.length >= 8 && !selected;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={maxed}
                    onClick={() => toggleInterest(cat.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected ? "border-brand bg-brand/5" : "border-navy-border hover:border-navy-border-strong"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${selected ? "text-brand" : "text-ink-muted"}`} />
                    <span className={`text-xs font-medium leading-tight ${selected ? "text-brand" : "text-ink-secondary"}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {INTEREST_CATEGORIES.length > INITIAL_INTEREST_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllInterests((s) => !s)}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                {showAllInterests ? (
                  <>Show fewer <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>Show {INTEREST_CATEGORIES.length - INITIAL_INTEREST_COUNT} more interests <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                2. How do you want to contribute to the world? <span className="font-normal normal-case text-ink-muted">(Select up to 3)</span>
              </p>
              <span className="text-xs font-medium text-brand">{form.contributionGoals.length}/3 selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CONTRIBUTION_GOALS.map((goal) => {
                const Icon = CONTRIBUTION_GOAL_ICONS[goal.id];
                const selected = form.contributionGoals.includes(goal.id);
                const maxed = form.contributionGoals.length >= 3 && !selected;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    disabled={maxed}
                    onClick={() => toggleContributionGoal(goal.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected ? "border-brand bg-brand/5 text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${selected ? "text-brand" : "text-ink-muted"}`} />
                    {goal.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              3. What type of opportunities interest you? <span className="font-normal normal-case text-ink-muted">(Select all that apply)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {OPPORTUNITY_INTERESTS.map((opp) => {
                const selected = form.opportunityInterests.includes(opp.id);
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => toggleOpportunityInterest(opp.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      selected ? "border-brand bg-brand/10 font-semibold text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                    }`}
                  >
                    {selected && "✓ "}{opp.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              4. Add your top skills <span className="font-normal normal-case text-ink-muted">(Optional)</span>
            </p>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
              placeholder="e.g., Machine Learning, Public Speaking, UI/UX Design…"
              className={`${inputClass} mb-2`}
            />
            {form.skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-brand/60 hover:text-brand">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span>Popular:</span>
              {POPULAR_SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  disabled={form.skills.includes(s)}
                  className="rounded-full border border-navy-border px-2.5 py-1 text-ink-secondary transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">What are your career goals? <span className="text-red-400">*</span></p>
              <span className="text-xs font-medium text-brand">{form.careerGoals.length}/5 selected</span>
            </div>

            {suggestedGoals.length > 0 && !goalSearch && (
              <div className="mb-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand">
                  Suggested based on your interests
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedGoals.map((goal) => {
                    const selected = form.careerGoals.includes(goal.id);
                    const maxed = form.careerGoals.length >= 5 && !selected;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        disabled={maxed}
                        onClick={() => toggleGoal(goal.id)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected ? "border-brand bg-brand/10 font-semibold text-brand" : "border-brand/30 bg-brand/5 text-ink-secondary"
                        }`}
                      >
                        {selected && "✓ "}{goal.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {suggestedGoals.length === 0 && !goalSearch && (
              <p className="mb-3 text-sm text-ink-muted">
                Pick a few interests above and we&apos;ll suggest matching goals here.
              </p>
            )}

            {(showAllGoals || goalSearch) ? (
              <>
                <input
                  type="text"
                  placeholder="Search goals…"
                  value={goalSearch}
                  onChange={(e) => setGoalSearch(e.target.value)}
                  className={`${inputClass} mb-3`}
                />
                {otherGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {otherGoals.map((goal) => {
                      const selected = form.careerGoals.includes(goal.id);
                      const maxed = form.careerGoals.length >= 5 && !selected;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          disabled={maxed}
                          onClick={() => toggleGoal(goal.id)}
                          className={`rounded-full border px-3.5 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            selected ? "border-brand bg-brand/10 font-semibold text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                          }`}
                        >
                          {selected && "✓ "}{goal.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {filteredGoals.length === 0 && (
                  <div className="py-6 text-center text-sm text-ink-muted">No goals match &quot;{goalSearch}&quot;</div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAllGoals(true)}
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                Browse all goals or search <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <div className="space-y-7">
          <div>
            <label className={labelClass}>Current Skill Level <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-2.5">
              {SKILL_LEVELS.map((level) => {
                const info = SKILL_DISPLAY[level]!;
                const Icon = SKILL_LEVEL_ICONS[level];
                const selected = form.skillLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, skillLevel: level }))}
                    className={`rounded-lg border p-3 text-center transition ${
                      selected ? "border-brand bg-brand/5" : "border-navy-border hover:border-navy-border-strong"
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-brand/10" : "bg-navy-card"}`}>
                      <Icon className={`h-4 w-4 ${selected ? "text-brand" : "text-ink-secondary"}`} />
                    </div>
                    <div className={`mb-0.5 text-sm font-semibold ${selected ? "text-brand" : "text-ink"}`}>{info.label}</div>
                    <div className="text-[11px] leading-tight text-ink-muted">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelClass}>Preferred Delivery Mode <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-2.5">
              {DELIVERY_MODES.map((mode) => {
                const info = MODE_DISPLAY[mode]!;
                const Icon = DELIVERY_MODE_ICONS[mode];
                const selected = form.preferredMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, preferredMode: mode }))}
                    className={`rounded-lg border p-3 text-center transition ${
                      selected ? "border-brand bg-brand/5" : "border-navy-border hover:border-navy-border-strong"
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-brand/10" : "bg-navy-card"}`}>
                      <Icon className={`h-4 w-4 ${selected ? "text-brand" : "text-ink-secondary"}`} />
                    </div>
                    <div className={`mb-0.5 text-sm font-semibold ${selected ? "text-brand" : "text-ink"}`}>{info.label}</div>
                    <div className="text-[11px] leading-tight text-ink-muted">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelClass}>Budget Range <span className="text-red-400">*</span></label>
            <div className="flex flex-col gap-2">
              {BUDGET_TIERS.map((tier) => {
                const selected = form.budgetTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, budgetTierId: tier.id }))}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                      selected ? "border-brand bg-brand/5 font-semibold text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                    }`}
                  >
                    <DollarSign className={`h-4 w-4 flex-shrink-0 ${selected ? "text-brand" : "text-ink-muted"}`} />
                    <span className="flex-1">{tier.label}</span>
                    {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {isReviewStep && (
        <div className="space-y-5">
          <ReviewSection title="Basic Information" onEdit={() => setStep(0)}>
            <ReviewGrid>
              <ReviewItem label="Phone Number" value={form.phone} />
              <ReviewItem label="Date of Birth" value={form.dateOfBirth} />
              <ReviewItem label="Gender" value={form.gender ? form.gender.charAt(0) + form.gender.slice(1).toLowerCase() : ""} />
              <ReviewItem label="City" value={form.city} />
              <ReviewItem label="District / State" value={form.district} />
              <ReviewItem label="Country / Region" value={selectedCountry?.name} />
              <ReviewItem label="Nationality" value={form.nationality} />
            </ReviewGrid>
          </ReviewSection>

          <ReviewSection title="Education" onEdit={() => setStep(1)}>
            <ReviewGrid>
              <ReviewItem label="Education Level" value={educationLevelLabel} />
              <ReviewItem label="Institute / University" value={form.institute} />
              <ReviewItem label="Field of Study / Major" value={form.fieldOfStudy} />
              <ReviewItem label="Degree Program" value={form.degreeProgram} />
              <ReviewItem label="Year / Grade" value={form.yearOrGrade} />
              <ReviewItem label="Academic Status" value={form.academicStatus} />
              <ReviewItem label="Enrollment Start Date" value={form.enrollmentStartDate} />
              <ReviewItem label="Expected Graduation Date" value={form.expectedGraduationDate} />
              <ReviewItem label="GPA / Grade" value={form.gpa} />
              <ReviewItem label="Employment Status" value={employmentStatusLabel} />
            </ReviewGrid>
            {form.qualifications.filter((q) => q.qualification).length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Prior Qualifications</p>
                <div className="space-y-2">
                  {form.qualifications.filter((q) => q.qualification).map((q) => (
                    <div key={q.key} className="rounded-lg bg-navy-card px-3 py-2 text-sm text-ink-secondary">
                      {EDUCATION_LEVELS.find((e) => e.value === q.qualification)?.label ?? q.qualification}
                      {q.institute && ` — ${q.institute}`}
                      {q.yearCompleted && ` (${q.yearCompleted})`}
                      {q.grade && `, ${q.grade}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ReviewSection>

          <ReviewSection title="Interests & Goals" onEdit={() => setStep(2)}>
            <ReviewTags label="Interests" values={interestLabels} />
            <ReviewTags label="Contribution Goals" values={contributionGoalLabels} />
            <ReviewTags label="Opportunity Interests" values={opportunityInterestLabels} />
            <ReviewTags label="Top Skills" values={form.skills} />
            <ReviewTags label="Career Goals" values={goalLabels} />
          </ReviewSection>

          <ReviewSection title="Preferences" onEdit={() => setStep(3)}>
            <ReviewGrid>
              <ReviewItem label="Skill Level" value={skillLevelLabel} />
              <ReviewItem label="Delivery Mode" value={modeLabel} />
              <ReviewItem label="Budget Range" value={budgetLabel} />
            </ReviewGrid>
          </ReviewSection>

          <p className="text-xs text-ink-muted">
            Anything left blank can be filled in anytime from your dashboard settings.
          </p>
        </div>
      )}
    </ProfileSetupShell>
  );
}
