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
  LayoutDashboard,
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

const studentNavigation = [
  { name: "My Learning", path: "/dashboard/student",           icon: BookOpen },
  { name: "Programs",    path: "/dashboard/student/programs",  icon: GraduationCap },
  { name: "Courses",     path: "/dashboard/student/courses",   icon: GraduationCap },
  { name: "Library",     path: "/dashboard/student/library",   icon: Library },
  { name: "Careers",     path: "/dashboard/student/careers",   icon: Briefcase },
  { name: "My Profile",  path: "/dashboard/student/profile",   icon: UserCircle },
  { name: "Dashboard",   path: "/dashboard",                   icon: LayoutDashboard },
];

export default function StudentHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
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
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    path === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(path);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.png" alt="iNEXORA" className="h-10 w-36" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-1 md:flex">
              {studentNavigation.map(({ name, path, icon: Icon }) => (
                <Link
                  key={path}
                  href={path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(path)
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </Link>
              ))}
            </div>

            {/* Profile Dropdown */}
            <div className="hidden items-center gap-3 md:flex">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Student
              </span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {avatarLetter}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
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
              </div>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 py-3 md:hidden">
            {studentNavigation.map(({ name, path, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                  isActive(path)
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {name}
              </Link>
            ))}
            <div className="mt-3 space-y-1 border-t border-slate-100 px-4 pt-3">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 text-sm font-medium text-slate-700"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSignOutConfirm(true);
                }}
                className="flex items-center gap-3 py-2 text-sm font-medium text-red-600"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

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