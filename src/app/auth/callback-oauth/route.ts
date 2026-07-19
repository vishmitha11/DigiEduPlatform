import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/redirect";
  const role = searchParams.get("role");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // If a role was passed (OAuth signup flow), update both metadata and
      // the Profile record directly — the trigger fires on INSERT before
      // updateUser runs, so we patch Profile here to guarantee the correct role.
      if (role && ["STUDENT", "LECTURER", "EMPLOYER"].includes(role)) {
        await supabase.auth.updateUser({ data: { role } });
        await supabase
          .from("Profile")
          .update({
            role: role as "STUDENT" | "LECTURER" | "EMPLOYER",
            isActive: role === "STUDENT",
            updatedAt: new Date().toISOString(),
          })
          .eq("id", data.user.id);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange failed:", error?.message);
  }

  return NextResponse.redirect(
    `${origin}/login?message=Could not authenticate. Please try again.`
  );
}