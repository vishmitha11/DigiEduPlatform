"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Globe, Pencil } from "lucide-react";
import { api } from "~/trpc/react";
import { createClient } from "~/lib/supabase/client";
import Card from "~/app/components/ui/Card";
import Input from "~/app/components/ui/Input";
import Select from "~/app/components/ui/Select";
import Button from "~/app/components/ui/Button";
import TagInput from "./TagInput";
import JobPreviewCard from "./JobPreviewCard";
import type { JobFormValues, JobListingInitialData } from "./jobFormTypes";

// ── Types ──────────────────────────────────────────────────────────────────

const BLANK: JobFormValues = {
  title: "", department: "", numberOfOpenings: "1", description: "",
  type: "FULL_TIME", workModel: "", location: "", experienceLevel: "",
  minimumEducation: "", requiredQualifications: [], preferredFields: [],
  requirements: "", salaryMin: "", salaryMax: "", displaySalaryPublicly: true,
  applicationDeadline: "",
};

function fromInitialData(data: JobListingInitialData): JobFormValues {
  return {
    title: data.title,
    department: data.department ?? "",
    numberOfOpenings: data.numberOfOpenings?.toString() ?? "1",
    description: data.description ?? "",
    type: data.type,
    workModel: data.workModel ?? "",
    location: data.location ?? "",
    experienceLevel: data.experienceLevel ?? "",
    minimumEducation: data.minimumEducation ?? "",
    requiredQualifications: data.requiredQualifications,
    preferredFields: data.preferredFields,
    requirements: data.requirements ?? "",
    salaryMin: data.salaryMin ? data.salaryMin.toString() : "",
    salaryMax: data.salaryMax ? data.salaryMax.toString() : "",
    displaySalaryPublicly: data.displaySalaryPublicly,
    applicationDeadline: data.applicationDeadline
      ? new Date(data.applicationDeadline).toISOString().slice(0, 10)
      : "",
  };
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time",
  INTERNSHIP: "Internship", CONTRACT: "Contract", OVERSEAS: "Overseas",
};

const WORK_MODEL_LABELS: Record<string, string> = {
  ON_SITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote",
};

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  ENTRY_LEVEL: "Entry-level", JUNIOR: "Junior", MID_LEVEL: "Mid-level",
  SENIOR_LEVEL: "Senior-level", EXECUTIVE: "Executive",
};

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  HIGH_SCHOOL: "High School", DIPLOMA: "Diploma", BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree", PHD: "PhD", NOT_REQUIRED: "Not required",
};

const textareaCls = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function JobForm({
  mode,
  jobId,
  initialData,
}: {
  mode: "create" | "edit";
  jobId?: string;
  initialData?: JobListingInitialData;
}) {
  const router = useRouter();
  const supabase = createClient();
  const utils = api.useUtils();

  const [form, setForm] = useState<JobFormValues>(
    initialData ? fromInitialData(initialData) : BLANK,
  );
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [formError, setFormError] = useState<string | null>(null);

  const [company, setCompany] = useState<{
    companyName: string | null;
    industry: string | null;
    website: string | null;
    logoUrl: string | null;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: employer } = await supabase
        .from("Employer")
        .select("companyName, industry, website, logoUrl")
        .eq("profileId", user.id)
        .maybeSingle();
      setCompany({
        companyName: (employer as { companyName?: string })?.companyName ?? null,
        industry: (employer as { industry?: string })?.industry ?? null,
        website: (employer as { website?: string })?.website ?? null,
        logoUrl: (employer as { logoUrl?: string })?.logoUrl ?? null,
        email: user.email ?? null,
      });
    })();
    // Deliberately run once on mount only — `supabase` is a fresh client
    // instance each render, not a value this effect should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createJob = api.job.create.useMutation({
    onSuccess: () => {
      void utils.job.getMyListings.invalidate();
      router.push("/dashboard");
    },
    onError: (e) => setFormError(e.message),
  });

  const updateJob = api.job.update.useMutation({
    onSuccess: () => {
      void utils.job.getMyListings.invalidate();
      router.push("/dashboard");
    },
    onError: (e) => setFormError(e.message),
  });

  const isSaving = createJob.isPending || updateJob.isPending;

  const validate = (): string | null => {
    if (form.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (form.description.trim().length < 20) return "Please provide a role description (at least 20 characters).";
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      return "Minimum salary cannot exceed maximum salary.";
    }
    if (form.applicationDeadline) {
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      if (new Date(form.applicationDeadline) < todayUtc) {
        return "Application deadline cannot be in the past.";
      }
    }
    return null;
  };

  const handleSave = (status: "DRAFT" | "PUBLISHED") => {
    setFormError(null);
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    const payload = {
      title: form.title.trim(),
      department: form.department.trim() || null,
      numberOfOpenings: form.numberOfOpenings ? parseInt(form.numberOfOpenings, 10) : null,
      description: form.description.trim(),
      type: form.type as "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "OVERSEAS",
      workModel: (form.workModel || null) as "ON_SITE" | "HYBRID" | "REMOTE" | null,
      location: form.location.trim() || null,
      experienceLevel: (form.experienceLevel || null) as "ENTRY_LEVEL" | "JUNIOR" | "MID_LEVEL" | "SENIOR_LEVEL" | "EXECUTIVE" | null,
      minimumEducation: (form.minimumEducation || null) as "HIGH_SCHOOL" | "DIPLOMA" | "BACHELOR" | "MASTER" | "PHD" | "NOT_REQUIRED" | null,
      requiredQualifications: form.requiredQualifications,
      preferredFields: form.preferredFields,
      requirements: form.requirements.trim() || null,
      salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : null,
      salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : null,
      displaySalaryPublicly: form.displaySalaryPublicly,
      applicationDeadline: form.applicationDeadline || null,
      status,
    };

    if (mode === "edit" && jobId) {
      updateJob.mutate({ id: jobId, data: payload });
    } else {
      createJob.mutate(payload);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (viewMode === "preview") {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Listing Preview</h1>
            <Button variant="ghost" onClick={() => setViewMode("edit")}>
              <Pencil className="h-4 w-4" /> Back to Edit
            </Button>
          </div>
          <JobPreviewCard
            form={form}
            companyName={company?.companyName}
            logoUrl={company?.logoUrl}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === "edit" ? "Edit Job Listing" : "Post a New Job"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "edit" ? "Update the details of this listing." : "Fill in the role details below."}
          </p>
        </div>

        {/* Role details */}
        <Card title="Role Details">
          <div className="space-y-4">
            <Field label="Job Title" required>
              <Input
                value={form.title}
                placeholder="e.g. Software Engineer"
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <Input
                  value={form.department}
                  placeholder="e.g. Engineering"
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </Field>
              <Field label="Number of Openings">
                <Input
                  type="number" min="1" value={form.numberOfOpenings}
                  onChange={(e) => setForm((f) => ({ ...f, numberOfOpenings: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Description" required>
              <textarea
                rows={5}
                value={form.description}
                placeholder="Describe the role, responsibilities, and what makes it a great opportunity…"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${textareaCls} resize-none`}
              />
            </Field>
          </div>
        </Card>

        {/* Employment type */}
        <Card title="Employment Type">
          <Field label="Job Type" required>
            <Select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
        </Card>

        {/* Work model & location */}
        <Card title="Work Model & Location">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Work Model">
                <Select
                  value={form.workModel}
                  onChange={(e) => setForm((f) => ({ ...f, workModel: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {Object.entries(WORK_MODEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  placeholder="e.g. Colombo, Sri Lanka"
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Experience Level">
              <Select
                value={form.experienceLevel}
                onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
              >
                <option value="">Select…</option>
                {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {/* Required qualifications */}
        <Card title="Required Qualifications">
          <div className="space-y-4">
            <Field label="Minimum Education">
              <Select
                value={form.minimumEducation}
                onChange={(e) => setForm((f) => ({ ...f, minimumEducation: e.target.value }))}
              >
                <option value="">Select…</option>
                {Object.entries(EDUCATION_LEVEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Preferred Fields of Study">
              <TagInput
                value={form.preferredFields}
                onChange={(tags) => setForm((f) => ({ ...f, preferredFields: tags }))}
                placeholder="e.g. Computer Science"
              />
            </Field>
            <Field label="Required Skills">
              <TagInput
                value={form.requiredQualifications}
                onChange={(tags) => setForm((f) => ({ ...f, requiredQualifications: tags }))}
                placeholder="e.g. React, SQL"
              />
            </Field>
            <Field label="Additional Requirements">
              <textarea
                rows={3}
                value={form.requirements}
                placeholder="Any other requirements (optional)"
                onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                className={`${textareaCls} resize-none`}
              />
            </Field>
          </div>
        </Card>

        {/* Compensation & timeline */}
        <Card title="Compensation & Timeline">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum Salary (LKR)">
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.salaryMin}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                />
              </Field>
              <Field label="Maximum Salary (LKR)">
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.salaryMax}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Application Deadline">
              <Input
                type="date"
                value={form.applicationDeadline}
                onChange={(e) => setForm((f) => ({ ...f, applicationDeadline: e.target.value }))}
              />
            </Field>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, displaySalaryPublicly: !f.displaySalaryPublicly }))}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                form.displaySalaryPublicly
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <div className={`h-4 w-4 rounded-full border-2 transition ${
                form.displaySalaryPublicly ? "border-blue-600 bg-blue-600" : "border-slate-300"
              }`} />
              Display salary publicly
            </button>
          </div>
        </Card>

        {/* Company details (read-only) */}
        <Card title="Company Details">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Name</p>
              <p className="mt-1 text-slate-800">{company?.companyName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry</p>
              <p className="mt-1 text-slate-800">{company?.industry ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</p>
              <p className="mt-1 flex items-center gap-1 text-slate-800">
                <Globe className="h-3.5 w-3.5 text-slate-400" /> {company?.website ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Email</p>
              <p className="mt-1 text-slate-800">{company?.email ?? "—"}</p>
            </div>
          </div>
        </Card>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 pb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => setViewMode("preview")}>
            <Eye className="h-4 w-4" /> Preview Listing
          </Button>
          <Button variant="ghost" loading={isSaving} onClick={() => handleSave("DRAFT")}>
            Save Draft
          </Button>
          <Button variant="primary" loading={isSaving} onClick={() => handleSave("PUBLISHED")}>
            Publish Job
          </Button>
        </div>
      </div>
    </div>
  );
}
