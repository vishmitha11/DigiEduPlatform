"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, X, Building2, Users, Award, Rocket } from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import ProfileSetupShell, {
  ReviewSection,
  ReviewGrid,
  ReviewItem,
  ReviewTags,
  labelClass,
  inputClass,
  type ProfileSetupStepDef,
} from "./ProfileSetupShell";

const SUBJECT_AREAS = [
  "Business & Management", "IT & Computer Science", "AI & Data Science",
  "Engineering", "Education & Psychology", "Law", "Arts & Humanities",
  "Healthcare", "Mathematics", "Languages",
];

const TITLES = ["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Eng."];

// Optional field, but if filled it should look like a phone number.
function isValidPhone(v: string): boolean {
  return !v || /^[0-9+\-\s()]{7,20}$/.test(v);
}

const STEPS: ProfileSetupStepDef[] = [
  {
    id: "personal",
    label: "Personal",
    title: "Personal Details",
    sidebarTitle: "Share Your\nExpertise.",
    sidebarBody: "A few essentials so students and institutions know who they're learning from.",
  },
  {
    id: "institution",
    label: "Institution",
    title: "Institution Affiliation",
    sidebarTitle: "Teach\nAnywhere.",
    sidebarBody: "Affiliate with an institution, or continue independently as a freelance lecturer.",
  },
  {
    id: "expertise",
    label: "Expertise",
    title: "Your Expertise",
    sidebarTitle: "Build &\nPublish.",
    sidebarBody: "Your subject areas and background help students find the right guidance.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review your information",
    sidebarTitle: "Almost\nThere.",
    sidebarBody: "Take a last look — your profile will be reviewed by our team before you get full access.",
  },
];

const FEATURES = [
  { icon: Users, label: "Reach Students", sub: "Publish courses and guide learners across the platform" },
  { icon: BookOpen, label: "Build Programs", sub: "Structure content into courses and full programs" },
  { icon: Rocket, label: "Grow Your Reach", sub: "Independent or affiliated — teach on your own terms" },
  { icon: Award, label: "Trusted Process", sub: "Every lecturer is reviewed before going live" },
];


export default function LecturerProfileSetup() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [skippingAll, setSkippingAll] = useState(false);
  const [error, setError] = useState<React.ReactNode>("");

  // Step 0 — Personal
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isVisiting, setIsVisiting] = useState(false);

  // Step 1 — Institution
  const [institutionId, setInstitutionId] = useState<string>("");
  const [institutionSearch, setInstitutionSearch] = useState("");

  // Step 2 — Expertise
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Pre-fill from any existing Lecturer/Profile row so revisiting this flow
  // to edit doesn't show a blank form.
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHydrating(false);
        return;
      }
      const [{ data: profileRaw }, { data: lecturerRaw }] = await Promise.all([
        supabase.from("Profile").select("phone, city").eq("id", user.id).single(),
        supabase
          .from("Lecturer")
          .select("title, specialization, qualifications, experienceYears, bio, linkedinUrl, institutionId, isVisiting, hourlyRate")
          .eq("profileId", user.id)
          .maybeSingle(),
      ]);
      const profile = profileRaw as { phone: string | null; city: string | null } | null;
      const lecturer = lecturerRaw as {
        title: string | null;
        specialization: string[];
        qualifications: string | null;
        experienceYears: number | null;
        bio: string | null;
        linkedinUrl: string | null;
        institutionId: string | null;
        isVisiting: boolean;
        hourlyRate: number | null;
      } | null;
      if (profile) {
        setPhone(profile.phone ?? "");
        setCity(profile.city ?? "");
      }
      if (lecturer) {
        setTitle(lecturer.title ?? "");
        setSpecializations(lecturer.specialization ?? []);
        setQualifications(lecturer.qualifications ?? "");
        setExperienceYears(lecturer.experienceYears != null ? String(lecturer.experienceYears) : "");
        setBio(lecturer.bio ?? "");
        setLinkedinUrl(lecturer.linkedinUrl ?? "");
        setInstitutionId(lecturer.institutionId ?? "");
        setIsVisiting(lecturer.isVisiting ?? false);
        setHourlyRate(lecturer.hourlyRate != null ? String(lecturer.hourlyRate) : "");
      }
      setHydrating(false);
    })();
    // Deliberately run once on mount only — `supabase` is a fresh client
    // instance each render, not a value this effect should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReviewStep = step === STEPS.length - 1;

  const { data: institutions = [], isLoading: institutionsLoading } =
    api.institution.list.useQuery(undefined, { enabled: step === 1 });

  const toggleSpecialization = (s: string) => {
    setSpecializations((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const filteredInstitutions = institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      i.city?.toLowerCase().includes(institutionSearch.toLowerCase()),
  );

  const selectedInstitution = institutions.find((i) => i.id === institutionId);

  // A step only counts as complete once its actually-required fields are all
  // filled. Institution has no required field — Independent is a valid choice.
  function getStepCompletion(): boolean[] {
    const years = Number(experienceYears);
    return [
      !!(title && phone && city) && isValidPhone(phone),
      true,
      specializations.length > 0 && !!qualifications && !!experienceYears && years >= 0 && years <= 60,
    ];
  }

  // Skip bypasses this entirely — Continue is the only action that enforces
  // the step's required fields.
  function handleNext() {
    const completedSteps = getStepCompletion();
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

  function handleSkipStep() {
    setError("");
    setStep((s) => s + 1);
  }

  async function submitProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const res = await fetch("/api/profile-setup/lecturer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        phone: phone || null,
        city: city || null,
        title: title || null,
        institutionId: institutionId || null,
        specialization: specializations,
        qualifications: qualifications || null,
        experienceYears: experienceYears ? parseInt(experienceYears) : null,
        bio: bio || null,
        linkedinUrl: linkedinUrl || null,
        isVisiting,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      }),
    });

    const result = await res.json() as { error?: string };
    if (!res.ok) throw new Error(result.error ?? "Something went wrong");
  }

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await submitProfile();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAll = async () => {
    setError("");
    setSkippingAll(true);
    try {
      await submitProfile();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSkippingAll(false);
    }
  };

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <ProfileSetupShell
      logoIcon={BookOpen}
      role="LECTURER"
      heading="Lecturer Profile Setup"
      subheading="Share your expertise with students across the platform."
      steps={STEPS}
      currentStep={step}
      completedSteps={getStepCompletion()}
      features={FEATURES}
      onBack={() => step > 0 && setStep((s) => s - 1)}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isLastStep={isReviewStep}
      submitting={loading}
      error={error}
      onSkipAll={handleSkipAll}
      skippingAll={skippingAll}
      onSkipStep={!isReviewStep ? handleSkipStep : undefined}
    >
      {/* Step 0: Personal Details */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Title <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    title === t ? "border-brand bg-brand/5 text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone Number <span className="text-red-400">*</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>City <span className="text-red-400">*</span></label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Colombo" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>LinkedIn URL <span className="text-ink-muted">(optional)</span></label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-navy-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Visiting Lecturer</p>
              <p className="text-xs text-ink-secondary">Available for guest lectures</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisiting(!isVisiting)}
              className={`relative h-6 w-11 rounded-full transition ${isVisiting ? "bg-brand" : "bg-navy-border"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isVisiting ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Your lecturer profile will be reviewed by our team before you can access full features.
          </div>
        </div>
      )}

      {/* Step 1: Institution Affiliation */}
      {step === 1 && (
        <div className="space-y-5">
          <p className="-mt-2 text-sm text-ink-secondary">
            Select the institution you&apos;re affiliated with, or continue as independent.
          </p>

          {selectedInstitution && (
            <div className="flex items-center justify-between rounded-lg border border-brand/30 bg-brand/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-ink">{selectedInstitution.name}</p>
                  <p className="text-xs text-brand">
                    {selectedInstitution.type}{selectedInstitution.city ? ` · ${selectedInstitution.city}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setInstitutionId("")} className="text-ink-muted hover:text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setInstitutionId("")}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
              institutionId === "" ? "border-brand bg-brand/5" : "border-navy-border hover:border-navy-border-strong"
            }`}
          >
            <p className={`font-medium ${institutionId === "" ? "text-brand" : "text-ink-secondary"}`}>Independent / Freelance</p>
            <p className="text-xs text-ink-muted">Not affiliated with any institution</p>
          </button>

          <div>
            <label className={labelClass}>Search Institutions</label>
            <input
              type="text"
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              placeholder="Search by name or city..."
              className={inputClass}
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-navy-border">
            {institutionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                {institutionSearch ? "No institutions match your search" : "No institutions available"}
              </div>
            ) : (
              filteredInstitutions.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => setInstitutionId(inst.id)}
                  className={`flex w-full items-center gap-3 border-b border-navy-border px-4 py-3 text-left transition last:border-0 hover:bg-navy-card ${
                    institutionId === inst.id ? "bg-brand/5" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Building2 className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${institutionId === inst.id ? "text-brand" : "text-ink"}`}>{inst.name}</p>
                    <p className="text-xs text-ink-muted">{inst.type}{inst.city ? ` · ${inst.city}` : ""}</p>
                  </div>
                  {institutionId === inst.id && <div className="ml-auto h-2 w-2 rounded-full bg-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 2: Expertise */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Subject Areas <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_AREAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialization(s)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    specializations.includes(s) ? "border-brand bg-brand/5 text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                  }`}
                >
                  {s}
                  {specializations.includes(s) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Qualifications <span className="text-red-400">*</span></label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g. PhD Computer Science - University of Colombo"
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Years of Experience <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="5"
                min="0"
                max="60"
                className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
            </div>
            <div>
              <label className={labelClass}>Hourly Rate (LKR) <span className="text-ink-muted">(optional)</span></label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="2500"
                min="0"
                className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Bio <span className="text-ink-muted">(optional)</span></label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell students about your background and teaching philosophy..."
              rows={4}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {isReviewStep && (
        <div className="space-y-5">
          <ReviewSection title="Personal Details" onEdit={() => setStep(0)}>
            <ReviewGrid>
              <ReviewItem label="Title" value={title} />
              <ReviewItem label="Phone Number" value={phone} />
              <ReviewItem label="City" value={city} />
              <ReviewItem label="LinkedIn" value={linkedinUrl} />
              <ReviewItem label="Visiting Lecturer" value={isVisiting ? "Yes" : "No"} />
            </ReviewGrid>
          </ReviewSection>

          <ReviewSection title="Institution" onEdit={() => setStep(1)}>
            <ReviewGrid>
              <ReviewItem label="Affiliation" value={selectedInstitution?.name ?? "Independent / Freelance"} />
            </ReviewGrid>
          </ReviewSection>

          <ReviewSection title="Expertise" onEdit={() => setStep(2)}>
            <ReviewTags label="Subject Areas" values={specializations} />
            <ReviewGrid>
              <ReviewItem label="Qualifications" value={qualifications} />
              <ReviewItem label="Years of Experience" value={experienceYears} />
              <ReviewItem label="Hourly Rate (LKR)" value={hourlyRate} />
            </ReviewGrid>
          </ReviewSection>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Your lecturer profile will be reviewed by our team before you can access full features.
          </div>
        </div>
      )}
    </ProfileSetupShell>
  );
}
