import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { createAdminClient } from "~/lib/supabase/admin";
import InstitutionDashboard from "./components/InstitutionDashboard";
import { createClient } from "~/lib/supabase/server";

export default async function InstitutionPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("Profile")
    .select("id, fullName, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "INSTITUTION") redirect("/login");

  // Use admin client to bypass RLS
  const { data: account } = await adminSupabase
    .from("InstitutionAccount")
    .select(
      `
      id,
      institution:Institution(
        id, name, type, description, logoUrl, website,
        email, phone, address, city, country,
        isVerified, isActive,
        programs:Program(
          id, title, type, level, isPublished, approvalStatus,
          createdAt, durationMonths, deliveryMode,
          courses:Course(id, title, code, isMandatory, orderIndex)
        ),
        lecturers:Lecturer(
          id, title, specialization, approvalStatus,
          profile:Profile(fullName, email)
        ),
        announcements:Announcement(
          id, title, content, isPublished, createdAt
        )
      )
    `,
    )
    .eq("profileId", user.id)
    .single();

  // No InstitutionAccount row yet — redirecting to /login here would loop:
  // middleware forces any logged-in INSTITUTION-role user away from public
  // paths straight back to /institution. This page is itself under
  // /institution/*, so middleware lets it through without a bounce.
  if (!account?.institution) redirect("/institution/setup-incomplete");

  // Extract institution BEFORE using it
  const institution = Array.isArray(account.institution)
    ? account.institution[0]
    : account.institution;

  if (!institution) redirect("/institution/setup-incomplete");

  // NOW fetch pending and rejected lecturers using institution.id
  const pendingLecturers = (
    await db.lecturer.findMany({
      where: { institutionId: institution.id, approvalStatus: "PENDING" },
      select: {
        id: true,
        title: true,
        specialization: true,
        createdAt: true,
        profile: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  ).map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));

  const rejectedLecturers = (
    await db.lecturer.findMany({
      where: { institutionId: institution.id, approvalStatus: "REJECTED" },
      select: {
        id: true,
        profileId: true,
        title: true,
        specialization: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { fullName: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    })
  ).map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <InstitutionDashboard
      profile={profile}
      institution={institution}
      pendingLecturers={pendingLecturers}
      rejectedLecturers={rejectedLecturers}
    />
  );
}
