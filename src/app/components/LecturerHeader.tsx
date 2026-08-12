"use client";
import { useState, useRef, useEffect } from "react";
import {
  Menu, X, LogOut, ChevronDown, AlertCircle, Settings,
  LayoutDashboard, Layers, GraduationCap, FileText, Users,
  ClipboardList,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "~/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  fullName: string | null;
  role: string | null;
  avatarUrl: string | null;
}

const lecturerNavigation = [
  { name: "Dashboard",   path: "/dashboard",                    icon: LayoutDashboard },
  { name: "My Modules",  path: "/dashboard/lecturer/modules",   icon: Layers },
  { name: "My Courses",  path: "/dashboard/lecturer/courses",   icon: GraduationCap },
  { name: "Assessments", path: "/dashboard/lecturer/assessments", icon: ClipboardList },
  { name: "Resources",   path: "/dashboard/lecturer/resources",  icon: FileText },
  { name: "Students",    path: "/dashboard/lecturer/students",  icon: Users },
];

export default function LecturerHeader() {
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
      .select("fullName, role, avatarUrl")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) void fetchProfile(user.id);
    };
    void getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const displayName = profile?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0];
  const avatarLetter = profile?.fullName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase();

  const isActive = (path: string) =>
    path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-navy-border bg-navy-base font-sans">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.png" alt="iNEXORA" className="h-10 w-36" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-1 md:flex">
              {lecturerNavigation.map(({ name, path, icon: Icon }) => (
                <Link
                  key={path}
                  href={path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(path)
                      ? "bg-brand/10 text-brand"
                      : "text-ink-secondary hover:bg-navy-surface hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </Link>
              ))}
            </div>

            {/* Profile Dropdown */}
            <div className="hidden items-center gap-3 md:flex">
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                Lecturer
              </span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-full border border-navy-border bg-navy-surface px-3 py-2 transition hover:bg-navy-card"
                >
                  <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand text-xs font-bold text-navy-base">
                    {profile?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                  <span className="text-sm font-medium text-ink">{displayName}</span>
                  <ChevronDown className={`h-4 w-4 text-ink-muted transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-navy-border-strong bg-navy-card py-2 shadow-lg">
                    <div className="mb-1 border-b border-navy-border px-4 py-2">
                      <p className="text-xs font-semibold uppercase text-ink-muted">Logged in as</p>
                      <p className="truncate text-sm font-medium text-ink">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { router.push("/settings"); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-ink-secondary transition hover:bg-navy-surface hover:text-ink"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button
                      onClick={() => { setShowSignOutConfirm(true); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition hover:bg-navy-surface"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-ink-secondary md:hidden">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-navy-border py-3 md:hidden">
            {lecturerNavigation.map(({ name, path, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                  isActive(path) ? "bg-brand/10 text-brand" : "text-ink-secondary hover:bg-navy-surface"
                }`}
              >
                <Icon className="h-4 w-4" />{name}
              </Link>
            ))}
            <div className="mt-3 space-y-1 border-t border-navy-border px-4 pt-3">
              <Link href="/settings" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 text-sm font-medium text-ink-secondary"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); setShowSignOutConfirm(true); }}
                className="flex items-center gap-3 py-2 text-sm font-medium text-red-400"
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
          <div className="w-full max-w-sm rounded-2xl border border-navy-border bg-navy-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-amber-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-ink">Sign Out?</h3>
            </div>
            <p className="mb-6 text-ink-secondary">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-xl bg-navy-surface px-4 py-2.5 text-sm font-semibold text-ink-secondary hover:bg-navy-border"
              >
                Cancel
              </button>
              <button onClick={handleSignOut}
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