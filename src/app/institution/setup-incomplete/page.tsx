import { Building2 } from "lucide-react";

export default function InstitutionSetupIncompletePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Building2 className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          Institution Setup Incomplete
        </h1>
        <p className="mb-6 text-slate-500">
          Your account is registered as an institution manager, but it isn&apos;t
          linked to an institution yet. Please contact your platform
          administrator to finish setting up your account.
        </p>
        <a
          href="mailto:support@inexora.lk"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
