"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, X, type LucideIcon } from "lucide-react";
import { BRAND_PANEL_OVERLAY, BRAND_PANEL_PHOTOS, type BrandPanelRole } from "~/app/components/TrustBadges";

// Shared dark-theme form field styles — imported by every role's profile-setup
// step file instead of each declaring its own (light-theme) copy.
export const labelClass = "mb-1.5 block text-sm font-medium text-ink-secondary";
export const inputClass =
  "w-full rounded-lg border border-navy-border bg-navy-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand";
export const fieldIconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted";
export const inputWithIconClass =
  "w-full rounded-lg border border-navy-border bg-navy-surface py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand";
export const selectWithIconClass =
  "w-full appearance-none rounded-lg border border-navy-border bg-navy-surface py-3 pl-10 pr-9 text-sm text-ink outline-none transition focus:border-brand";
export const selectChevronClass = "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted";

export interface ProfileSetupStepDef {
  id: string;
  label: string;
  title: string;
  sidebarTitle: string;
  sidebarBody: string;
}

export interface ProfileSetupFeature {
  icon: LucideIcon;
  label: string;
  sub: string;
}

interface ProfileSetupShellProps {
  logoIcon: LucideIcon;
  role: BrandPanelRole;
  heading: string;
  subheading: string;
  steps: ProfileSetupStepDef[];
  currentStep: number;
  /** Per-step "has real data" flag for steps before the current one — drives the glow (complete) vs. "!" badge (skipped/incomplete) in the stepper. Steps without an entry are treated as complete once passed. */
  completedSteps?: boolean[];
  features: ProfileSetupFeature[];
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isLastStep: boolean;
  submitting: boolean;
  error?: React.ReactNode;
  onSkipAll?: () => void;
  skippingAll?: boolean;
  onSkipStep?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  children: React.ReactNode;
}

export default function ProfileSetupShell({
  logoIcon: LogoIcon,
  role,
  heading,
  subheading,
  steps,
  currentStep,
  completedSteps = [],
  features,
  onBack,
  onNext,
  onSubmit,
  isLastStep,
  submitting,
  error,
  onSkipAll,
  skippingAll,
  onSkipStep,
  nextLabel = "Continue",
  submitLabel = "Complete Setup",
  children,
}: ProfileSetupShellProps) {
  const current = steps[currentStep]!;

  return (
    <div className="flex h-screen font-sans">
      {/* ── LEFT: BRAND PANEL ─────────────────────────────────────────── */}
      <div className="relative hidden h-screen lg:flex lg:w-[400px] flex-shrink-0 flex-col justify-between overflow-hidden px-11 py-14">
        <div
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url('${BRAND_PANEL_PHOTOS[role]}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1)",
          }}
        />
        <div className="absolute inset-0 -z-10" style={{ background: BRAND_PANEL_OVERLAY }} />
        <div
          className="absolute top-0 right-0 w-[380px] h-[300px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(56,189,248,0.07) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[320px] h-[260px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(34,197,94,0.08) 0%, transparent 65%)" }}
        />

        <div className="relative flex items-center gap-2">
          <LogoIcon className="h-5 w-5 text-brand" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            iNEX<span className="text-brand">ORA</span>
          </span>
        </div>

        <div className="relative ">
          <div className="mb-7 h-0.5 w-10 rounded-full bg-brand" />
          <h1 className="font-display text-3xl font-bold leading-[1.15] mb-4 text-white">
            Your Journey.
            <br />
            Your Purpose.
          </h1>
          <p className="text-sm leading-relaxed mb-8 max-w-xs text-white/60">
            A few details help us match you with the right programs, people, and opportunities.
          </p>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative space-y-8 mt-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-1.5 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold text-white">Your privacy matters</span>
            </div>
            <p className="text-xs leading-relaxed text-white/50">
              Your information is used to power your profile and can be updated anytime from Settings.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT: FORM PANEL ─────────────────────────────────────────── */}
      <div className="relative h-screen flex-1 overflow-y-auto border-l border-navy-border bg-navy-base">
        <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10 lg:py-14">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">{heading}</h1>
              <p className="mt-1 text-sm text-ink-secondary">{subheading}</p>
            </div>
            {onSkipAll && (
              <button
                onClick={onSkipAll}
                disabled={skippingAll}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-navy-border bg-navy-surface px-3.5 py-2 text-xs font-medium text-ink-secondary transition hover:bg-navy-card disabled:opacity-50"
              >
                {skippingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Skip all
              </button>
            )}
          </div>

          {/* Stepper */}
          <div className="mb-8">
            <div className="mb-2 flex items-center">
              {steps.map((s, i) => {
                const isPassed = i < currentStep;
                const isIncomplete = isPassed && completedSteps[i] === false;
                const isComplete = isPassed && !isIncomplete;
                return (
                <div key={s.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                          isComplete
                            ? "border-brand bg-brand text-white"
                            : isIncomplete
                              ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                              : i === currentStep
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-navy-border bg-navy-surface text-ink-muted"
                        }`}
                      >
                        {isPassed ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      {isIncomplete && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-navy-base ring-2 ring-navy-base">
                          !
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1.5 whitespace-nowrap text-[11px] font-medium ${
                        i === currentStep ? "text-brand" : isIncomplete ? "text-yellow-400" : "text-ink-muted"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 rounded ${isComplete ? "bg-brand" : isIncomplete ? "bg-yellow-400" : "bg-navy-border"}`} />
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Step card */}
          <div className="rounded-2xl border border-navy-border bg-navy-surface p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="font-display text-lg font-bold text-ink">{current.title}</h2>
            </div>
            {children}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className={`flex items-center gap-1.5 rounded-lg border border-navy-border bg-navy-surface px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-navy-card ${
                currentStep === 0 ? "invisible" : ""
              }`}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <span className="text-xs text-ink-muted">
              {currentStep + 1} / {steps.length}
            </span>

            <div className="flex items-center gap-2.5">
              {!isLastStep && onSkipStep && (
                <button
                  onClick={onSkipStep}
                  className="rounded-lg border border-navy-border px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-navy-card"
                >
                  Skip
                </button>
              )}

              {isLastStep ? (
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{submitting ? "Saving…" : submitLabel}</span>
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <span>{nextLabel}</span> <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review helpers, shared across all three role setups ────────────────────
export function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-navy-border bg-navy-card/40 p-5">
      <div className="mb-4 flex items-center justify-between border-b border-navy-border pb-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

export function ReviewGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

export function ReviewItem({ label, value }: { label: string; value?: string }) {
  const hasValue = Boolean(value);
  return (
    <div className={`rounded-lg px-3 py-2.5 ${hasValue ? "bg-brand/5" : "bg-navy-surface/60"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {hasValue ? (
        <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm italic text-ink-muted">Not provided</p>
      )}
    </div>
  );
}

export function ReviewTags({ label, values }: { label: string; values: string[] }) {
  const hasValues = values.length > 0;
  return (
    <div className={`mb-3 rounded-lg px-3 py-2.5 last:mb-0 ${hasValues ? "bg-brand/5" : "bg-navy-surface/60"}`}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {hasValues ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-ink-muted">Not provided</p>
      )}
    </div>
  );
}
