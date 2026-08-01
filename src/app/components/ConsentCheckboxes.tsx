"use client";

export interface ConsentState {
  termsAccepted: boolean;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
}

export const DEFAULT_CONSENT: ConsentState = {
  termsAccepted: false,
  dataProcessingConsent: false,
  marketingConsent: false,
};

// Shared between signup and the OAuth complete-profile gate — consent
// capture applies to every signup path, not just the email/password one.
// termsAccepted is the only required checkbox; the other two are Tier 3
// opt-ins per the platform's data-tier framework and never block submit.
export default function ConsentCheckboxes({
  value,
  onChange,
  className = "",
}: {
  value: ConsentState;
  onChange: (value: ConsentState) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.termsAccepted}
          onChange={(e) => onChange({ ...value, termsAccepted: e.target.checked })}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
        />
        <span className="text-slate-600">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
            Privacy Policy
          </a>
          <span className="text-red-500"> *</span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.dataProcessingConsent}
          onChange={(e) => onChange({ ...value, dataProcessingConsent: e.target.checked })}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
        />
        <span className="text-slate-600">
          Use my profile to power personalized program recommendations
          <span className="text-slate-400"> (optional)</span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.marketingConsent}
          onChange={(e) => onChange({ ...value, marketingConsent: e.target.checked })}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
        />
        <span className="text-slate-600">
          Send me updates about new programs and features
          <span className="text-slate-400"> (optional)</span>
        </span>
      </label>
    </div>
  );
}
