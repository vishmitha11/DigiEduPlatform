import { createClient } from "~/lib/supabase/server";
import Header from "~/app/components/Header";
import LecturerHeader from "~/app/components/LecturerHeader";
import DashboardShell from "~/app/components/DashboardShell";
import Footer from "~/app/components/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("Profile")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  if (role === "STUDENT" || role === "EMPLOYER") {
    return (
      <DashboardShell role={role}>
        <main>{children}</main>
        <Footer />
      </DashboardShell>
    );
  }

  return (
    <>
      {role === "LECTURER" ? <LecturerHeader /> : <Header />}
      <main>{children}</main>
      <Footer />
    </>
  );
}