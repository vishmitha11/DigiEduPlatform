import { createClient } from "~/lib/supabase/server";
import Header from "~/app/components/Header";
import LecturerHeader from "~/app/components/LecturerHeader";
import StudentSidebar from "~/app/components/StudentSidebar";
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

  if (role === "STUDENT") {
    return (
      <>
        <StudentSidebar />
        <div className="md:pl-64">
          <main>{children}</main>
          <Footer />
        </div>
      </>
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