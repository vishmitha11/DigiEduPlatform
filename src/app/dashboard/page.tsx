import { redirect } from "next/navigation";
import { createClient } from "~/lib/supabase/server";
import { createAdminClient } from "~/lib/supabase/admin";
import LecturerDashboard from "./_components/LecturerDashboard";
import EmployerDashboard from "./_components/EmployerDashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: profile, error } = await adminSupabase
    .from("Profile")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("Profile error:", error);

  if (!profile) redirect("/login");

  switch (profile.role) {
    case "STUDENT":
      redirect("/dashboard/student");
    case "LECTURER":
      return <LecturerDashboard />;
    case "EMPLOYER":
      return <EmployerDashboard />;
    case "ADMIN":
      redirect("/admin");
    default:
      redirect("/profile-setup");
  }
}
