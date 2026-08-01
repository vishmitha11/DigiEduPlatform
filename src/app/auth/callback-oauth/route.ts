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
        // isActive means "not suspended by an admin" — always true at signup.
        // Lecturer/employer moderation is gated by their approvalStatus
        // instead; setting isActive false here made the middleware treat
        // brand-new accounts as suspended and lock them out of profile-setup.
        await supabase
          .from("Profile")
          .update({
            role: role as "STUDENT" | "LECTURER" | "EMPLOYER",
            isActive: true,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", data.user.id);
      }

      // OAuth providers only give us name + email, so consent was never
      // captured — gate on it once before letting the user continue,
      // regardless of which step they were originally headed to.
      const { data: profile } = await supabase
        .from("Profile")
        .select("termsAcceptedAt")
        .eq("id", data.user.id)
        .single();

      if (!profile?.termsAcceptedAt) {
        return NextResponse.redirect(
          `${origin}/auth/complete-profile?next=${encodeURIComponent(next)}`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange failed:", error?.message);
  }

  return NextResponse.redirect(
    `${origin}/login?message=Could not authenticate. Please try again.`
  );
}