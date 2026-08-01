"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import ConsentCheckboxes, {
  DEFAULT_CONSENT,
  type ConsentState,
} from "~/app/components/ConsentCheckboxes";

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const next = searchParams.get("next") ?? "/profile-setup";

  const [checking, setChecking] = useState(true);
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("Profile")
        .select("termsAcceptedAt")
        .eq("id", user.id)
        .single();
      // Already completed this gate (e.g. back button) — skip straight through.
      if (profile?.termsAcceptedAt) {
        router.replace(next);
        return;
      }
      setChecking(false);
    })();
  }, [router, supabase, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!consent.termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("Profile")
        .update({
          marketingConsent: consent.marketingConsent,
          dataProcessingConsent: consent.dataProcessingConsent,
          termsAcceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updateError) throw updateError;

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">One quick thing before you continue</h1>
          <p className="mt-2 text-sm text-gray-500">
            We just need your agreement to our Terms and Privacy Policy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <ConsentCheckboxes value={consent} onChange={setConsent} />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Saving..." : <>Continue<ChevronRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileForm />
    </Suspense>
  );
}
