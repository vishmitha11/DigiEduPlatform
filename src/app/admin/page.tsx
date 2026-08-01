import { createClient } from "~/lib/supabase/server";
import { createAdminClient } from "~/lib/supabase/admin";
import AdminDashboard from "./components/AdminDashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminSupabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalPrograms },
    { count: totalJobs },
    { data: recentUsers },
    { data: pendingInstitutions },
    { data: pendingEmployers },
    { data: pendingLecturers },
    { data: allUsers },
    { data: allPrograms },
    { data: allJobs },
    { data: allInstitutions },
    { data: approvedLecturers },
    { data: rejectedLecturers },  // ← new
    { data: rejectedEmployers },  // ← new
  ] = await Promise.all([
    adminSupabase.from("Profile").select("*", { count: "exact", head: true }),
    adminSupabase.from("Program").select("*", { count: "exact", head: true }),
    adminSupabase.from("JobListing").select("*", { count: "exact", head: true }),
    adminSupabase
      .from("Profile")
      .select("id, fullName, email, role, isActive, createdAt")
      .order("createdAt", { ascending: false })
      .limit(5),
    adminSupabase
      .from("Institution")
      .select("id, name, type, country, city, createdAt")
      .eq("approvalStatus", "PENDING"),
    adminSupabase
      .from("Employer")
      .select("id, companyName, industry, createdAt, profile:Profile(fullName, email)")
      .eq("approvalStatus", "PENDING"),
    adminSupabase
      .from("Lecturer")
      .select("id, title, specialization, createdAt, profile:Profile(fullName, email)")
      .eq("approvalStatus", "PENDING"),
    adminSupabase
      .from("Profile")
      .select(`
        id, fullName, email, role, isActive, createdAt,
        lecturer:Lecturer(approvalStatus),
        employer:Employer(approvalStatus)
      `)
      .order("createdAt", { ascending: false })
      .limit(100),
    adminSupabase
      .from("Program")
      .select("id, title, isPublished, createdAt, institution:Institution(name)")
      .order("createdAt", { ascending: false })
      .limit(100),
    adminSupabase
      .from("JobListing")
      .select("id, title, type, isActive, createdAt, employer:Employer(companyName)")
      .order("createdAt", { ascending: false })
      .limit(100),
    adminSupabase
      .from("Institution")
      .select(`
        id, name, type, country, city, email, isActive, isVerified, createdAt,
        account:InstitutionAccount(id),
        managers:InstitutionManager(
          id, canEditProfile, canManagePrograms, canViewAnalytics, canPostAnnouncements, assignedAt,
          lecturer:Lecturer(id, title, profile:Profile(fullName, email))
        )
      `)
      .eq("approvalStatus", "APPROVED")
      .order("createdAt", { ascending: false }),
    adminSupabase
      .from("Lecturer")
      .select("id, title, institutionId, profile:Profile(fullName, email)")
      .eq("approvalStatus", "APPROVED")
      .order("createdAt", { ascending: false }),
    // ── Rejected ──────────────────────────────────────────────────────────
    adminSupabase
      .from("Lecturer")
      .select("id, profileId, title, specialization, createdAt, profile:Profile(fullName, email)")
      .eq("approvalStatus", "REJECTED")
      .order("createdAt", { ascending: false }),
    adminSupabase
      .from("Employer")
      .select("id, profileId, companyName, industry, createdAt, profile:Profile(fullName, email)")
      .eq("approvalStatus", "REJECTED")
      .order("createdAt", { ascending: false }),
  ]);

  // Lecturers/employers with PENDING or REJECTED status live in the
  // Approvals/Rejected tabs, so the Users tab excludes them. But profiles
  // that signed up and never completed profile setup have no Lecturer/
  // Employer row at all — without the awaitingSetup case they'd be
  // invisible everywhere in the admin panel.
  const filteredUsers = (allUsers ?? []).flatMap((u) => {
    if (u.role === "STUDENT" || u.role === "ADMIN") {
      return [{ ...u, awaitingSetup: false }];
    }
    if (u.role === "LECTURER") {
      const lec = Array.isArray(u.lecturer) ? u.lecturer[0] : null;
      if (!lec) return [{ ...u, awaitingSetup: true }];
      return lec.approvalStatus === "APPROVED" || lec.approvalStatus === "SUSPENDED"
        ? [{ ...u, awaitingSetup: false }]
        : [];
    }
    if (u.role === "EMPLOYER") {
      const emp = Array.isArray(u.employer) ? u.employer[0] : null;
      if (!emp) return [{ ...u, awaitingSetup: true }];
      return emp.approvalStatus === "APPROVED" || emp.approvalStatus === "SUSPENDED"
        ? [{ ...u, awaitingSetup: false }]
        : [];
    }
    return [];
  });

  const stats = {
    totalUsers: totalUsers ?? 0,
    totalInstitutions: allInstitutions?.length ?? 0,
    totalPrograms: totalPrograms ?? 0,
    totalJobs: totalJobs ?? 0,
  };

  return (
    <AdminDashboard
      stats={stats}
      recentUsers={recentUsers ?? []}
      pendingInstitutions={pendingInstitutions ?? []}
      pendingEmployers={pendingEmployers ?? []}
      pendingLecturers={pendingLecturers ?? []}
      rejectedLecturers={rejectedLecturers ?? []}   // ← new
      rejectedEmployers={rejectedEmployers ?? []}   // ← new
      allUsers={filteredUsers}
      allPrograms={allPrograms ?? []}
      allJobs={allJobs ?? []}
      allInstitutions={allInstitutions ?? []}
      approvedLecturers={approvedLecturers ?? []}
      currentUserId={user?.id ?? ""}
    />
  );
}