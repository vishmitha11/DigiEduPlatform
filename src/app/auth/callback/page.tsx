"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "~/lib/supabase/client";

export default function CallbackPage() {
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          window.location.href = "/login?message=Could not authenticate. Please try again.";
          return;
        }
        if (type === "magiclink" || type === "invite") {
          window.location.href = "/auth/set-password";
        } else {
          window.location.href = "/auth/redirect";
        }
      });
    } else {
      window.location.href = "/login?message=Could not authenticate. Please try again.";
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#0A0F1E" }}>
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#22C55E" }} />
    </div>
  );
}