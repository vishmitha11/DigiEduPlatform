import {
  BookOpen,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  Sparkles,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

// Link mode navigates via href; controlled mode (id) is for the
// admin/institution tab SPAs, which keep internal activeTab state.
export type NavItem =
  | { label: string; icon: LucideIcon; href: string }
  | { label: string; icon: LucideIcon; id: string };

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const studentNav: NavSection[] = [
  {
    label: "Learning",
    items: [
      { label: "My Learning", icon: BookOpen, href: "/dashboard/student" },
      { label: "Programs", icon: GraduationCap, href: "/dashboard/student/programs" },
      { label: "Courses", icon: Layers, href: "/dashboard/student/courses" },
      { label: "Library", icon: Library, href: "/dashboard/student/library" },
      { label: "My Profile", icon: UserCircle, href: "/dashboard/student/profile" },
    ],
  },
  {
    label: "Career",
    items: [
      { label: "Recommended for You", icon: Sparkles, href: "/dashboard/student/recommendations" },
      { label: "Careers", icon: Briefcase, href: "/dashboard/student/careers" },
    ],
  },
];

export const lecturerNav: NavSection[] = [
  {
    label: "Teaching",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Modules", icon: Layers, href: "/dashboard/lecturer/modules" },
      { label: "Courses", icon: BookOpen, href: "/dashboard/lecturer/courses" },
      { label: "Assessments", icon: FileText, href: "/dashboard/lecturer/assessments" },
      { label: "Resources", icon: FolderOpen, href: "/dashboard/lecturer/resources" },
      { label: "Students", icon: Users, href: "/dashboard/lecturer/students" },
    ],
  },
];

export const employerNav: NavSection[] = [
  {
    items: [{ label: "Overview", icon: LayoutDashboard, href: "/dashboard" }],
  },
];

// adminNav / institutionNav are added in their retheme phases — their items
// use controlled ids that must match the existing activeTab values inside
// AdminDashboard.tsx / InstitutionDashboard.tsx, not invented here.
