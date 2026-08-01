"use client";

import AppShell from "~/app/components/AppShell";
import { studentNav, lecturerNav, employerNav, type NavSection } from "~/app/components/nav";

// Server layouts can't pass nav configs to AppShell directly — the icon
// components inside them aren't serializable across the RSC boundary. This
// client wrapper takes only a plain role string and resolves the config
// on the client side.
const SHELL_CONFIG: Record<
  "STUDENT" | "LECTURER" | "EMPLOYER",
  { sections: NavSection[]; homeHref: string; roleLabel: string }
> = {
  STUDENT: {
    sections: studentNav,
    homeHref: "/dashboard/student",
    roleLabel: "Student",
  },
  LECTURER: {
    sections: lecturerNav,
    homeHref: "/dashboard",
    roleLabel: "Lecturer",
  },
  EMPLOYER: {
    sections: employerNav,
    homeHref: "/dashboard",
    roleLabel: "Employer",
  },
};

export default function DashboardShell({
  role,
  children,
}: {
  role: keyof typeof SHELL_CONFIG;
  children: React.ReactNode;
}) {
  const config = SHELL_CONFIG[role];
  return (
    <AppShell
      sections={config.sections}
      homeHref={config.homeHref}
      roleLabel={config.roleLabel}
    >
      {children}
    </AppShell>
  );
}
