"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "~/lib/supabase/client";

export default function PrivacySection() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("Profile")
        .select("dataProcessingConsent, marketingConsent")
        .eq("id", user.id)
        .single();
      if (data) {
        setDataProcessingConsent(!!data.dataProcessingConsent);
        setMarketingConsent(!!data.marketingConsent);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("Profile")
        .update({
          dataProcessingConsent,
          marketingConsent,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const toggles = [
    {
      id: "recommendations",
      label: "Personalized recommendations",
      description: "Use my profile to power personalized program recommendations",
      value: dataProcessingConsent,
      onChange: setDataProcessingConsent,
    },
    {
      id: "marketing",
      label: "Product & marketing updates",
      description: "Send me updates about new programs and features",
      value: marketingConsent,
      onChange: setMarketingConsent,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Privacy & Communications</h2>
        <p className="mt-1 text-sm text-gray-500">
          Control how your data is used beyond running your account. Read the full{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
            Privacy Policy
          </a>.
        </p>
      </div>

      <div className="space-y-3">
        {toggles.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500">{t.description}</p>
            </div>
            <button
              type="button"
              onClick={() => t.onChange(!t.value)}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                t.value ? "bg-brand" : "bg-gray-200"
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                t.value ? "left-5" : "left-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Preferences saved!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
