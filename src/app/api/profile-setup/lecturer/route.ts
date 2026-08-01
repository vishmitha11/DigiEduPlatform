import { NextResponse } from "next/server";
import { createAdminClient } from "~/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      userId: string;
      phone: string | null;
      city: string | null;
      title: string | null;
      specialization: string[];
      qualifications: string | null;
      experienceYears: number | null;
      bio: string | null;
      linkedinUrl: string | null;
      institutionId: string | null;
      isVisiting: boolean;
      hourlyRate: number | null;
    };

    const supabase = createAdminClient();

    // Update profile contact info — do NOT set isVerified
    const { error: profileError } = await supabase
      .from("Profile")
      .update({
        phone: body.phone,
        city: body.city,
      })
      .eq("id", body.userId);

    if (profileError) throw new Error(profileError.message);

    // Re-submitting (editing an existing profile) must not silently reset an
    // approved lecturer's status — only the fields admins actually vet
    // (credentials, not bio/contact polish) trigger re-review.
    const { data: existingRaw } = await supabase
      .from("Lecturer")
      .select("id, approvalStatus, title, specialization, qualifications, experienceYears, institutionId")
      .eq("profileId", body.userId)
      .maybeSingle();

    const existing = existingRaw as {
      id: string;
      approvalStatus: string;
      title: string | null;
      specialization: string[];
      qualifications: string | null;
      experienceYears: number | null;
      institutionId: string | null;
    } | null;

    const keyFieldsChanged =
      existing?.title !== body.title ||
      existing?.qualifications !== body.qualifications ||
      existing?.experienceYears !== body.experienceYears ||
      existing?.institutionId !== body.institutionId ||
      JSON.stringify([...(existing?.specialization ?? [])].sort()) !==
        JSON.stringify([...body.specialization].sort());

    const approvalStatus = !existing
      ? "PENDING"
      : existing.approvalStatus === "SUSPENDED"
        ? "SUSPENDED"
        : existing.approvalStatus === "APPROVED"
          ? keyFieldsChanged
            ? "PENDING"
            : "APPROVED"
          : "PENDING";

    const { error: lecturerError } = await supabase
      .from("Lecturer")
      .upsert(
        {
          id: existing?.id ?? crypto.randomUUID(),
          profileId: body.userId,
          title: body.title,
          specialization: body.specialization,
          qualifications: body.qualifications,
          experienceYears: body.experienceYears,
          bio: body.bio,
          linkedinUrl: body.linkedinUrl,
          institutionId: body.institutionId,
          isVisiting: body.isVisiting,
          hourlyRate: body.hourlyRate,
          approvalStatus,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "profileId" },
      );

    if (lecturerError) throw new Error(lecturerError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}