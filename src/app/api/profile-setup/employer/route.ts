import { NextResponse } from "next/server";
import { createAdminClient } from "~/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      userId: string;
      companyName: string;
      industry: string | null;
      companySize: string | null;
      website: string | null;
      description: string | null;
      phone: string | null;
      city: string | null;
    };

    const supabase = createAdminClient();

    // The Profile update and the Employer lookup touch different tables and
    // don't depend on each other — run them concurrently instead of paying
    // two sequential round-trips.
    const [{ error: profileError }, { data: existingRaw }] = await Promise.all([
      supabase
        .from("Profile")
        .update({
          phone: body.phone,
          city: body.city,
        })
        .eq("id", body.userId),
      // Re-submitting (editing an existing profile) must not silently reset
      // an approved employer's status — only the fields admins actually vet
      // (company identity, not website/description polish) trigger re-review.
      supabase
        .from("Employer")
        .select("id, approvalStatus, isVerified, companyName, industry, companySize")
        .eq("profileId", body.userId)
        .maybeSingle(),
    ]);

    if (profileError) throw new Error(profileError.message);

    const existing = existingRaw as {
      id: string;
      approvalStatus: string;
      isVerified: boolean;
      companyName: string;
      industry: string | null;
      companySize: string | null;
    } | null;

    const keyFieldsChanged =
      existing?.companyName !== body.companyName ||
      existing?.industry !== body.industry ||
      existing?.companySize !== body.companySize;

    const approvalStatus = !existing
      ? "PENDING"
      : existing.approvalStatus === "SUSPENDED"
        ? "SUSPENDED"
        : existing.approvalStatus === "APPROVED"
          ? keyFieldsChanged
            ? "PENDING"
            : "APPROVED"
          : "PENDING";

    const { error: employerError } = await supabase
      .from("Employer")
      .upsert(
        {
          id: existing?.id ?? crypto.randomUUID(),
          profileId: body.userId,
          companyName: body.companyName,
          industry: body.industry,
          companySize: body.companySize,
          website: body.website,
          description: body.description,
          isVerified: existing?.isVerified ?? false,
          approvalStatus,
        },
        { onConflict: "profileId" },
      );

    if (employerError) throw new Error(employerError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}