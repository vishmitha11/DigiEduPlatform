"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Users, Building2, Award, Rocket, Loader2 } from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import ProfileSetupShell, {
  ReviewSection,
  ReviewGrid,
  ReviewItem,
  labelClass,
  inputClass,
  type ProfileSetupStepDef,
} from "./ProfileSetupShell";

const INDUSTRIES = [
  "Information Technology", "Finance & Banking", "Healthcare", "Education",
  "Manufacturing", "Retail & E-commerce", "Hospitality & Tourism",
  "Construction & Engineering", "Media & Marketing", "Logistics & Supply Chain",
  "Telecommunications", "Other",
];

// Optional field, but if filled it should look like a phone number.
function isValidPhone(v: string): boolean {
  return !v || /^[0-9+\-\s()]{7,20}$/.test(v);
}

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "500+", label: "500+ employees" },
];

const STEPS: ProfileSetupStepDef[] = [
  {
    id: "company",
    label: "Company Info",
    title: "Company Information",
    sidebarTitle: "Find Top\nTalent.",
    sidebarBody: "Tell us about your company so we can connect you with the right graduates.",
  },
  {
    id: "contact",
    label: "Contact Details",
    title: "Contact Details",
    sidebarTitle: "Stay\nConnected.",
    sidebarBody: "Contact details help candidates and our team reach you when it matters.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review your information",
    sidebarTitle: "Almost\nThere.",
    sidebarBody: "Take a last look — your profile will be reviewed by our team before you can post jobs.",
  },
];

const FEATURES = [
  { icon: Users, label: "Verified Talent", sub: "Browse graduates from institutions across the platform" },
  { icon: Building2, label: "Company Profile", sub: "A public profile that represents your organization" },
  { icon: Rocket, label: "Post Opportunities", sub: "List jobs and internships once your profile is approved" },
  { icon: Award, label: "Trusted Process", sub: "Every employer is reviewed before going live" },
];


export default function EmployerProfileSetup() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [skippingAll, setSkippingAll] = useState(false);
  const [error, setError] = useState<React.ReactNode>("");

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // Pre-fill from any existing Employer/Profile row so revisiting this flow
  // to edit doesn't show a blank form.
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHydrating(false);
        return;
      }
      const [{ data: profileRaw }, { data: employerRaw }] = await Promise.all([
        supabase.from("Profile").select("phone, city").eq("id", user.id).single(),
        supabase.from("Employer").select("companyName, industry, companySize, website, description").eq("profileId", user.id).maybeSingle(),
      ]);
      const profile = profileRaw as { phone: string | null; city: string | null } | null;
      const employer = employerRaw as {
        companyName: string | null;
        industry: string | null;
        companySize: string | null;
        website: string | null;
        description: string | null;
      } | null;
      if (profile) {
        setPhone(profile.phone ?? "");
        setCity(profile.city ?? "");
      }
      if (employer) {
        setCompanyName(employer.companyName ?? "");
        setIndustry(employer.industry ?? "");
        setCompanySize(employer.companySize ?? "");
        setWebsite(employer.website ?? "");
        setDescription(employer.description ?? "");
      }
      setHydrating(false);
    })();
    // Deliberately run once on mount only — `supabase` is a fresh client
    // instance each render, not a value this effect should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReviewStep = step === STEPS.length - 1;

  // A step only counts as complete once its actually-required fields (the
  // ones not marked "(optional)" in the UI) are all filled.
  function getStepCompletion(): boolean[] {
    return [
      !!(companyName && industry),
      !!(phone && city) && isValidPhone(phone),
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

    const res = await fetch("/api/profile-setup/employer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        companyName,
        industry: industry || null,
        companySize: companySize || null,
        website: website || null,
        description: description || null,
        phone: phone || null,
        city: city || null,
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

  const companySizeLabel = COMPANY_SIZES.find((s) => s.value === companySize)?.label;

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <ProfileSetupShell
      logoIcon={Briefcase}
      role="EMPLOYER"
      heading="Employer Profile Setup"
      subheading="Find the best talent from graduates across the platform."
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
      {/* Step 0: Company Information */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corporation"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Industry <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setIndustry(ind)}
                  className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                    industry === ind ? "border-brand bg-brand/5 text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Company Size</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COMPANY_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setCompanySize(s.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    companySize === s.value ? "border-brand bg-brand/5 text-brand" : "border-navy-border text-ink-secondary hover:border-navy-border-strong"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Contact Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone Number <span className="text-red-400">*</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 11 234 5678"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Colombo"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Website <span className="text-ink-muted">(optional)</span></label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Company Description <span className="text-ink-muted">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell students about your company and culture..."
              rows={4}
              className={inputClass}
            />
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Your employer profile will be reviewed by our team before you can post jobs.
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {isReviewStep && (
        <div className="space-y-5">
          <ReviewSection title="Company Information" onEdit={() => setStep(0)}>
            <ReviewGrid>
              <ReviewItem label="Company Name" value={companyName} />
              <ReviewItem label="Industry" value={industry} />
              <ReviewItem label="Company Size" value={companySizeLabel} />
            </ReviewGrid>
          </ReviewSection>

          <ReviewSection title="Contact Details" onEdit={() => setStep(1)}>
            <ReviewGrid>
              <ReviewItem label="Phone Number" value={phone} />
              <ReviewItem label="City" value={city} />
              <ReviewItem label="Website" value={website} />
            </ReviewGrid>
          </ReviewSection>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Your employer profile will be reviewed by our team before you can post jobs.
          </div>
        </div>
      )}
    </ProfileSetupShell>
  );
}
