"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, GraduationCap, X } from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import {
  INTEREST_CATEGORIES,
  CAREER_GOALS,
  SKILL_LEVELS,
  DELIVERY_MODES,
  BUDGET_TIERS,
  type InterestCategoryId,
  type CareerGoalId,
} from "~/lib/taxonomy/programTaxonomy";

// ── Countries ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GH", name: "Ghana" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KW", name: "Kuwait" },
  { code: "LB", name: "Lebanon" },
  { code: "LK", name: "Sri Lanka" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "MM", name: "Myanmar" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VN", name: "Vietnam" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
].sort((a, b) => a.name.localeCompare(b.name));

// ── Static data ────────────────────────────────────────────────────────────
const EDUCATION_LEVELS = [
  { value: "O/L", label: "O/L Completed" },
  { value: "A/L", label: "A/L Completed" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "DEGREE", label: "Undergraduate Degree" },
  { value: "POSTGRAD", label: "Postgraduate" },
];

const EMPLOYMENT_STATUSES = [
  { value: "STUDENT", label: "Full-time Student", icon: "🎓" },
  { value: "EMPLOYED", label: "Employed", icon: "💼" },
  { value: "SELF_EMPLOYED", label: "Self Employed", icon: "🚀" },
  { value: "UNEMPLOYED", label: "Unemployed", icon: "🔍" },
];

const SKILL_DISPLAY: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  beginner: {
    label: "Beginner",
    description: "New to the field, exploring from scratch",
    icon: "🌱",
  },
  intermediate: {
    label: "Intermediate",
    description: "Some experience, ready to go deeper",
    icon: "🔥",
  },
  advanced: {
    label: "Advanced",
    description: "Strong foundation, pursuing mastery",
    icon: "⚡",
  },
};

const MODE_DISPLAY: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  online: {
    label: "Online",
    description: "Fully remote, learn from anywhere",
    icon: "💻",
  },
  hybrid: {
    label: "Hybrid",
    description: "Mix of online and in-person sessions",
    icon: "🔄",
  },
  in_person: {
    label: "In Person",
    description: "On-campus, face-to-face learning",
    icon: "🏛️",
  },
};

const STEPS = [
  { id: "personal", label: "Personal", description: "Basic information" },
  { id: "academic", label: "Academic", description: "Your background" },
  { id: "interests", label: "Interests", description: "What excites you" },
  { id: "goals", label: "Goals", description: "Where you want to go" },
  {
    id: "preferences",
    label: "Preferences",
    description: "How you learn best",
  },
  { id: "location", label: "Location", description: "Where you are based" },
];

// ── Form state ─────────────────────────────────────────────────────────────
interface FormState {
  phone: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  district: string;
  educationLevel: string;
  employmentStatus: string;
  interests: InterestCategoryId[];
  careerGoals: CareerGoalId[];
  skillLevel: string;
  preferredMode: string;
  budgetTierId: string;
  countryCode: string;
}

const DEFAULT: FormState = {
  phone: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  district: "",
  educationLevel: "",
  employmentStatus: "",
  interests: [],
  careerGoals: [],
  skillLevel: "",
  preferredMode: "",
  budgetTierId: "",
  countryCode: "",
};

// ── Step completion checker (mirrors server logic) ─────────────────────────
function getStepCompletion(form: FormState): boolean[] {
  return [
    !!(
      form.phone ||
      form.dateOfBirth ||
      form.gender ||
      form.city ||
      form.district
    ),
    !!(form.educationLevel || form.employmentStatus),
    form.interests.length > 0,
    form.careerGoals.length > 0,
    !!(form.skillLevel && form.preferredMode && form.budgetTierId),
    !!form.countryCode,
  ];
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  navy: "#0A0F1E",
  navySurface: "#141C36",
  navyCard: "#1E2B55",
  navyBorder: "rgba(136,153,187,0.12)",
  gold: "#22C55E",
  accent: "#A3E635",
  textPrimary: "#F5F5F0",
  textSecondary: "rgba(136,153,187,0.70)",
  textMuted: "rgba(136,153,187,0.40)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(136,153,187,0.07)",
  border: "1.5px solid rgba(136,153,187,0.12)",
  borderRadius: "8px",
  padding: "11px 14px",
  color: C.textPrimary,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "Inter, sans-serif",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: C.textSecondary,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: "8px",
  display: "block",
};

// ── Main component ─────────────────────────────────────────────────────────
export default function StudentProfileSetup() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [goalSearch, setGoalSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skippingAll, setSkippingAll] = useState(false);
  const [error, setError] = useState("");

  const upsertRecommendationProfile =
    api.studentProfile.upsertRecommendationProfile.useMutation();

  // Load existing data on mount to prepopulate form
  const { data: existingProfile, isLoading: profileLoading } =
    api.studentProfile.getMyFullProfile.useQuery(undefined, {
      retry: false,
      throwOnError: false,
    });

  useEffect(() => {
    if (existingProfile && !hydrated) {
      setForm({
        phone: existingProfile.phone ?? "",
        dateOfBirth: existingProfile.dateOfBirth ?? "",
        gender: existingProfile.gender ?? "",
        city: existingProfile.city ?? "",
        district: existingProfile.district ?? "",
        educationLevel: existingProfile.educationLevel ?? "",
        employmentStatus: existingProfile.employmentStatus ?? "",
        interests: (existingProfile.interests ?? []) as InterestCategoryId[],
        careerGoals: (existingProfile.careerGoals ?? []) as CareerGoalId[],
        skillLevel: existingProfile.skillLevel ?? "",
        preferredMode: existingProfile.preferredMode ?? "",
        budgetTierId: existingProfile.budgetTierId ?? "",
        countryCode: existingProfile.countryCode ?? "",
      });

      // Jump to first incomplete step
      const completedSteps = getStepCompletion({
        phone: existingProfile.phone ?? "",
        dateOfBirth: existingProfile.dateOfBirth ?? "",
        gender: existingProfile.gender ?? "",
        city: existingProfile.city ?? "",
        district: existingProfile.district ?? "",
        educationLevel: existingProfile.educationLevel ?? "",
        employmentStatus: existingProfile.employmentStatus ?? "",
        interests: (existingProfile.interests ?? []) as InterestCategoryId[],
        careerGoals: (existingProfile.careerGoals ?? []) as CareerGoalId[],
        skillLevel: existingProfile.skillLevel ?? "",
        preferredMode: existingProfile.preferredMode ?? "",
        budgetTierId: existingProfile.budgetTierId ?? "",
        countryCode: existingProfile.countryCode ?? "",
      });
      const firstIncomplete = completedSteps.findIndex((s) => !s);
      if (firstIncomplete !== -1) setStep(firstIncomplete);

      setHydrated(true);
    } else if (!profileLoading && !hydrated) {
      setHydrated(true);
    }
  }, [existingProfile, profileLoading, hydrated]);

  // ── Write helpers ──────────────────────────────────────────────────────
  async function writeProfileAndStudent() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Update Profile row
    const { error: profileError } = await supabase
      .from("Profile")
      .update({
        phone: form.phone || null,
        city: form.city || null,
        district: form.district || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        isVerified: true,
      })
      .eq("id", user.id);
    if (profileError) throw profileError;

    // Upsert Student row — handles both first visit and return visits
    const { error: studentError } = await supabase.from("Student").upsert(
      {
        id: crypto.randomUUID(),
        profileId: user.id,
        previousEducation: form.educationLevel || null,
        employmentStatus: form.employmentStatus || null,
        updatedAt: new Date().toISOString(),
      },
      {
        onConflict: "profileId",
        ignoreDuplicates: false,
      },
    );
    if (studentError) throw studentError;
  }

  // ── Skip all — saves what's filled and goes to dashboard ──────────────
  const handleSkipAll = async () => {
    setSkippingAll(true);
    setError("");
    try {
      await writeProfileAndStudent();

      // Save recommendation data if enough is filled
      await upsertRecommendationProfile.mutateAsync({
        interests: form.interests.length > 0 ? form.interests : undefined,
        careerGoals: form.careerGoals.length > 0 ? form.careerGoals : undefined,
        skillLevel: form.skillLevel || undefined,
        preferredMode: form.preferredMode || undefined,
        budgetTierId: form.budgetTierId || undefined,
        countryCode: form.countryCode || undefined,
      });

      router.push("/dashboard/student");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSkippingAll(false);
    }
  };

  // ── Skip current step — just advance ──────────────────────────────────
  function handleSkipStep() {
    setError("");
    setStep((s) => s + 1);
  }

  // ── Final submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await writeProfileAndStudent();

      await upsertRecommendationProfile.mutateAsync({
        interests: form.interests.length > 0 ? form.interests : undefined,
        careerGoals: form.careerGoals.length > 0 ? form.careerGoals : undefined,
        skillLevel: form.skillLevel || undefined,
        preferredMode: form.preferredMode || undefined,
        budgetTierId: form.budgetTierId || undefined,
        countryCode: form.countryCode || undefined,
      });

      router.push("/dashboard/student/recommendations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle helpers ─────────────────────────────────────────────────────
  function toggleInterest(id: InterestCategoryId) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((i) => i !== id)
        : f.interests.length < 8
          ? [...f.interests, id]
          : f.interests,
    }));
  }

  function toggleGoal(id: CareerGoalId) {
    setForm((f) => ({
      ...f,
      careerGoals: f.careerGoals.includes(id)
        ? f.careerGoals.filter((g) => g !== id)
        : f.careerGoals.length < 5
          ? [...f.careerGoals, id]
          : f.careerGoals,
    }));
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const relatedGoalIds = new Set(
    CAREER_GOALS.filter((g) =>
      g.relatedInterests.some((ri) =>
        form.interests.includes(ri as InterestCategoryId),
      ),
    ).map((g) => g.id),
  );
  const filteredGoals = CAREER_GOALS.filter((g) =>
    goalSearch
      ? g.label.toLowerCase().includes(goalSearch.toLowerCase())
      : true,
  );
  const suggestedGoals = filteredGoals.filter((g) => relatedGoalIds.has(g.id));
  const otherGoals = filteredGoals.filter((g) => !relatedGoalIds.has(g.id));
  const filteredCountries = COUNTRIES.filter((c) =>
    countrySearch
      ? c.name.toLowerCase().includes(countrySearch.toLowerCase())
      : true,
  );
  const selectedCountry = COUNTRIES.find((c) => c.code === form.countryCode);
  const isLastStep = step === STEPS.length - 1;
  const completedSteps = getStepCompletion(form);
  const progressPct = (step / (STEPS.length - 1)) * 100;

  // ── Loading state while fetching existing profile ──────────────────────
  if (profileLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${C.navy} 0%, #0E1426 50%, ${C.navySurface} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          style={{
            width: "32px",
            height: "32px",
            color: C.gold,
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${C.navy} 0%, #0E1426 50%, ${C.navySurface} 100%)`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 56px) 24px 80px",
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: "36px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(163,230,53,0.10)",
                border: "1px solid rgba(163,230,53,0.22)",
                borderRadius: "20px",
                padding: "4px 14px",
                marginBottom: "16px",
              }}
            >
              <GraduationCap
                style={{ width: "13px", height: "13px", color: C.accent }}
              />
              <span
                style={{
                  color: C.accent,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Profile Setup
              </span>
            </div>
            <h1
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: "clamp(22px, 4vw, 30px)",
                fontWeight: 700,
                color: C.textPrimary,
                margin: "0 0 8px",
                lineHeight: 1.2,
              }}
            >
              Set up your profile
            </h1>
            <p style={{ color: C.textSecondary, fontSize: "14px", margin: 0 }}>
              Skip any step and finish later. Progress is saved when you submit.
            </p>
          </div>

          {/* Skip all button */}
          <button
            onClick={handleSkipAll}
            disabled={skippingAll}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(136,153,187,0.07)",
              border: `1px solid ${C.navyBorder}`,
              borderRadius: "8px",
              padding: "9px 14px",
              color: C.textMuted,
              fontSize: "13px",
              cursor: skippingAll ? "not-allowed" : "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
              marginTop: "4px",
            }}
          >
            {skippingAll ? (
              <Loader2 style={{ width: "13px", height: "13px" }} />
            ) : (
              <X style={{ width: "13px", height: "13px" }} />
            )}
            Skip all
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                    background: completedSteps[i]
                      ? C.gold
                      : i === step
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(136,153,187,0.08)",
                    border:
                      i === step
                        ? `2px solid ${C.gold}`
                        : completedSteps[i]
                          ? `2px solid ${C.gold}`
                          : "2px solid rgba(136,153,187,0.20)",
                    color: completedSteps[i]
                      ? C.navy
                      : i === step
                        ? C.gold
                        : C.textMuted,
                  }}
                >
                  {completedSteps[i] ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: i === step ? C.gold : C.textMuted,
                    marginTop: "5px",
                    fontWeight: i === step ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              height: "3px",
              background: "rgba(136,153,187,0.10)",
              borderRadius: "2px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${C.gold}, ${C.accent})`,
                borderRadius: "2px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Step card */}
        <div
          style={{
            background: C.navyCard,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: "16px",
            padding: "clamp(24px, 4vw, 36px)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: "18px",
                fontWeight: 700,
                color: C.textPrimary,
                margin: "0 0 4px",
              }}
            >
              {STEPS[step]!.description}
            </h2>
            {step === 2 && (
              <p
                style={{ color: C.textSecondary, fontSize: "13px", margin: 0 }}
              >
                Select up to 8 fields.
                {form.interests.length > 0 && (
                  <span style={{ color: C.gold }}>
                    {" "}
                    {form.interests.length} selected
                  </span>
                )}
              </p>
            )}
            {step === 3 && (
              <p
                style={{ color: C.textSecondary, fontSize: "13px", margin: 0 }}
              >
                Select up to 5 goals.
                {form.careerGoals.length > 0 && (
                  <span style={{ color: C.gold }}>
                    {" "}
                    {form.careerGoals.length} selected
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Step 0: Personal */}
          {step === 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                }}
              >
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    style={inputStyle}
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input
                    style={inputStyle}
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["MALE", "FEMALE", "OTHER"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm((f) => ({ ...f, gender: g }))}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border:
                          form.gender === g
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                        background:
                          form.gender === g
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(136,153,187,0.05)",
                        color: form.gender === g ? C.gold : C.textSecondary,
                      }}
                    >
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                }}
              >
                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    style={inputStyle}
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <label style={labelStyle}>District / State</label>
                  <input
                    style={inputStyle}
                    type="text"
                    value={form.district}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, district: e.target.value }))
                    }
                    placeholder="District or State"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Academic */}
          {step === 1 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div>
                <label style={labelStyle}>Highest Education Level</label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {EDUCATION_LEVELS.map((e) => (
                    <button
                      key={e.value}
                      onClick={() =>
                        setForm((f) => ({ ...f, educationLevel: e.value }))
                      }
                      style={{
                        borderRadius: "9px",
                        padding: "12px 16px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "left",
                        border:
                          form.educationLevel === e.value
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                        background:
                          form.educationLevel === e.value
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(136,153,187,0.05)",
                        color:
                          form.educationLevel === e.value
                            ? C.gold
                            : C.textPrimary,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {e.label}
                      {form.educationLevel === e.value && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Employment Status</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {EMPLOYMENT_STATUSES.map((e) => (
                    <button
                      key={e.value}
                      onClick={() =>
                        setForm((f) => ({ ...f, employmentStatus: e.value }))
                      }
                      style={{
                        borderRadius: "10px",
                        padding: "14px 12px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "center",
                        border:
                          form.employmentStatus === e.value
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                        background:
                          form.employmentStatus === e.value
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(136,153,187,0.05)",
                        color:
                          form.employmentStatus === e.value
                            ? C.gold
                            : C.textSecondary,
                      }}
                    >
                      <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                        {e.icon}
                      </div>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: "9px",
              }}
            >
              {INTEREST_CATEGORIES.map((cat) => {
                const selected = form.interests.includes(cat.id);
                const maxed = form.interests.length >= 8 && !selected;
                return (
                  <button
                    key={cat.id}
                    onClick={() => !maxed && toggleInterest(cat.id)}
                    style={{
                      borderRadius: "10px",
                      padding: "12px 13px",
                      textAlign: "left",
                      cursor: maxed ? "not-allowed" : "pointer",
                      opacity: maxed ? 0.4 : 1,
                      transition: "all 0.2s",
                      border: selected
                        ? `1.5px solid ${C.gold}`
                        : `1.5px solid ${C.navyBorder}`,
                      background: selected
                        ? "rgba(34,197,94,0.10)"
                        : "rgba(136,153,187,0.05)",
                    }}
                  >
                    <div
                      style={{
                        color: selected ? C.gold : C.textPrimary,
                        fontSize: "13px",
                        fontWeight: 600,
                        marginBottom: "3px",
                      }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: "11px",
                        lineHeight: 1.4,
                      }}
                    >
                      {cat.subcategories.slice(0, 3).join(" · ")}
                      {cat.subcategories.length > 3 && " …"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Career Goals */}
          {step === 3 && (
            <div>
              <input
                type="text"
                placeholder="Search goals…"
                value={goalSearch}
                onChange={(e) => setGoalSearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: "18px" }}
              />
              {suggestedGoals.length > 0 && !goalSearch && (
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.gold,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                    }}
                  >
                    Suggested based on your interests
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {suggestedGoals.map((goal) => {
                      const selected = form.careerGoals.includes(goal.id);
                      const maxed = form.careerGoals.length >= 5 && !selected;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => !maxed && toggleGoal(goal.id)}
                          style={{
                            borderRadius: "20px",
                            padding: "7px 14px",
                            fontSize: "13px",
                            cursor: maxed ? "not-allowed" : "pointer",
                            opacity: maxed ? 0.4 : 1,
                            transition: "all 0.2s",
                            fontWeight: selected ? 700 : 400,
                            border: selected
                              ? `1.5px solid ${C.gold}`
                              : "1.5px solid rgba(34,197,94,0.25)",
                            background: selected
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(34,197,94,0.06)",
                            color: selected ? C.gold : C.textSecondary,
                          }}
                        >
                          {selected && "✓ "}
                          {goal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {otherGoals.length > 0 && (
                <div>
                  {suggestedGoals.length > 0 && !goalSearch && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: C.textMuted,
                        fontWeight: 600,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                      }}
                    >
                      All Goals
                    </div>
                  )}
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {otherGoals.map((goal) => {
                      const selected = form.careerGoals.includes(goal.id);
                      const maxed = form.careerGoals.length >= 5 && !selected;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => !maxed && toggleGoal(goal.id)}
                          style={{
                            borderRadius: "20px",
                            padding: "7px 14px",
                            fontSize: "13px",
                            cursor: maxed ? "not-allowed" : "pointer",
                            opacity: maxed ? 0.4 : 1,
                            transition: "all 0.2s",
                            fontWeight: selected ? 700 : 400,
                            border: selected
                              ? `1.5px solid ${C.gold}`
                              : `1.5px solid ${C.navyBorder}`,
                            background: selected
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(136,153,187,0.05)",
                            color: selected ? C.gold : C.textSecondary,
                          }}
                        >
                          {selected && "✓ "}
                          {goal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {filteredGoals.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: C.textMuted,
                    padding: "40px 0",
                    fontSize: "14px",
                  }}
                >
                  No goals match &quot;{goalSearch}&quot;
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "28px" }}
            >
              <div>
                <label style={labelStyle}>Current Skill Level</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  {SKILL_LEVELS.map((level) => {
                    const info = SKILL_DISPLAY[level]!;
                    const selected = form.skillLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() =>
                          setForm((f) => ({ ...f, skillLevel: level }))
                        }
                        style={{
                          borderRadius: "12px",
                          padding: "16px 10px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "center",
                          border: selected
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                          background: selected
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(136,153,187,0.05)",
                        }}
                      >
                        <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                          {info.icon}
                        </div>
                        <div
                          style={{
                            color: selected ? C.gold : C.textPrimary,
                            fontSize: "13px",
                            fontWeight: 600,
                            marginBottom: "3px",
                          }}
                        >
                          {info.label}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: "11px",
                            lineHeight: 1.4,
                          }}
                        >
                          {info.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Preferred Delivery Mode</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  {DELIVERY_MODES.map((mode) => {
                    const info = MODE_DISPLAY[mode]!;
                    const selected = form.preferredMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() =>
                          setForm((f) => ({ ...f, preferredMode: mode }))
                        }
                        style={{
                          borderRadius: "12px",
                          padding: "16px 10px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "center",
                          border: selected
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                          background: selected
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(136,153,187,0.05)",
                        }}
                      >
                        <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                          {info.icon}
                        </div>
                        <div
                          style={{
                            color: selected ? C.gold : C.textPrimary,
                            fontSize: "13px",
                            fontWeight: 600,
                            marginBottom: "3px",
                          }}
                        >
                          {info.label}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: "11px",
                            lineHeight: 1.4,
                          }}
                        >
                          {info.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Budget Range</label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {BUDGET_TIERS.map((tier) => {
                    const selected = form.budgetTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() =>
                          setForm((f) => ({ ...f, budgetTierId: tier.id }))
                        }
                        style={{
                          borderRadius: "9px",
                          padding: "12px 16px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: selected
                            ? `1.5px solid ${C.gold}`
                            : `1.5px solid ${C.navyBorder}`,
                          background: selected
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(136,153,187,0.05)",
                        }}
                      >
                        <span
                          style={{
                            color: selected ? C.gold : C.textPrimary,
                            fontSize: "14px",
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {tier.label}
                        </span>
                        {selected && <span style={{ color: C.gold }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Location */}
          {step === 5 && (
            <div>
              <p
                style={{
                  color: C.textSecondary,
                  fontSize: "13px",
                  marginTop: 0,
                  marginBottom: "18px",
                }}
              >
                Your location helps us filter programs by eligibility and
                delivery availability.
              </p>
              <input
                type="text"
                placeholder="Search your country…"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: "10px" }}
              />
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                {filteredCountries.map((country) => {
                  const selected = form.countryCode === country.code;
                  return (
                    <button
                      key={country.code}
                      onClick={() => {
                        setForm((f) => ({ ...f, countryCode: country.code }));
                        setCountrySearch("");
                      }}
                      style={{
                        borderRadius: "8px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: selected
                          ? `1.5px solid ${C.gold}`
                          : "1.5px solid transparent",
                        background: selected
                          ? "rgba(34,197,94,0.10)"
                          : "transparent",
                      }}
                    >
                      <span
                        style={{
                          color: selected ? C.gold : C.textPrimary,
                          fontSize: "14px",
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {country.name}
                      </span>
                      <span style={{ color: C.textMuted, fontSize: "12px" }}>
                        {country.code}
                      </span>
                    </button>
                  );
                })}
                {filteredCountries.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: C.textMuted,
                      padding: "40px 0",
                      fontSize: "14px",
                    }}
                  >
                    No results for &quot;{countrySearch}&quot;
                  </div>
                )}
              </div>
              {form.countryCode && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.18)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                  }}
                >
                  <span style={{ color: C.gold, fontSize: "13px" }}>
                    ✓ Selected: <strong>{selectedCountry?.name}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "14px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "8px",
              padding: "12px 16px",
            }}
          >
            <p style={{ color: "#F87171", fontSize: "13px", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "22px",
          }}
        >
          <button
            onClick={() => step > 0 && setStep((s) => s - 1)}
            style={{
              background: "rgba(228,228,228,0.06)",
              border: `1px solid ${C.navyBorder}`,
              borderRadius: "8px",
              padding: "11px 22px",
              color: step === 0 ? "transparent" : C.textPrimary,
              fontSize: "14px",
              cursor: step === 0 ? "default" : "pointer",
              fontWeight: 500,
              pointerEvents: step === 0 ? "none" : "auto",
            }}
          >
            ← Back
          </button>

          <span style={{ color: C.textMuted, fontSize: "13px" }}>
            {step + 1} / {STEPS.length}
          </span>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Skip this step — hidden on last step */}
            {!isLastStep && (
              <button
                onClick={handleSkipStep}
                style={{
                  background: "none",
                  border: `1px solid ${C.navyBorder}`,
                  borderRadius: "8px",
                  padding: "11px 18px",
                  color: C.textMuted,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Skip
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  background: submitting
                    ? "rgba(136,153,187,0.15)"
                    : "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 26px",
                  color: submitting ? C.textMuted : C.navy,
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {submitting && (
                  <Loader2 style={{ width: "15px", height: "15px" }} />
                )}
                {submitting ? "Saving…" : "Complete Setup"}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                style={{
                  background:
                    "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 26px",
                  color: C.navy,
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Next <ArrowRight style={{ width: "15px", height: "15px" }} />
              </button>
            )}
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            color: C.textMuted,
            fontSize: "12px",
            marginTop: "24px",
          }}
        >
          All fields are optional. Skipped steps can be completed anytime from
          your dashboard.
        </p>
      </div>
    </div>
  );
}
