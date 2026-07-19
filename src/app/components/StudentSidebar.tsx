"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  AlertCircle,
  Settings,
  BookOpen,
  GraduationCap,
  Library,
  Briefcase,
  Layers,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "~/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  fullName: string | null;
  role: string | null;
}

const HOME_PATH = "/dashboard/student";

const navSections = [
  {
    label: "Learning",
    items: [
      { name: "My Learning", path: HOME_PATH,                       icon: BookOpen },
      { name: "Programs",    path: "/dashboard/student/programs",   icon: GraduationCap },
      { name: "Courses",     path: "/dashboard/student/courses",    icon: Layers },
      { name: "Library",     path: "/dashboard/student/library",    icon: Library },
      { name: "My Profile",  path: "/dashboard/student/profile",    icon: UserCircle },
    ],
  },
  {
    label: "Career",
    items: [
      { name: "Recommended for You", path: "/dashboard/student/recommendations", icon: Sparkles },
      { name: "Careers",             path: "/dashboard/student/careers",         icon: Briefcase },
    ],
  },
];

export default function StudentSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("Profile")
      .select("fullName, role")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) void fetchProfile(user.id);
    };
    void getUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close the mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowSignOutConfirm(false);
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const displayName =
    profile?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0];
  const avatarLetter =
    profile?.fullName?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase();

  const isActive = (path: string) =>
    path === HOME_PATH ? pathname === HOME_PATH : pathname.startsWith(path);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
        <Link href={HOME_PATH} className="flex items-center">
          <img src="/logo.png" alt="iNEXORA" className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-600"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <Link href={HOME_PATH} className="flex items-center">
            <img src="/logo.png" alt="iNEXORA" className="h-9 w-auto" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-slate-500 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map(({ name, path, icon: Icon }) => (
                  <Link
                    key={path}
                    href={path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(path)
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom profile block */}
        <div className="relative flex-shrink-0 border-t border-slate-100 p-3" ref={profileRef}>
          {isProfileOpen && (
            <div className="absolute bottom-full left-3 right-3 z-50 mb-2 rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
              <div className="mb-1 border-b border-slate-50 px-4 py-2">
                <p className="text-xs font-semibold text-slate-400 uppercase">
                  Logged in as
                </p>
                <p className="truncate text-sm font-medium text-slate-900">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  router.push("/settings");
                  setIsProfileOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-600"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(true);
                  setIsProfileOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-slate-700">{displayName}</p>
              <p className="text-xs font-semibold text-emerald-600">Student</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Sign Out Confirm */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Sign Out?</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
