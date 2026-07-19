"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, ChevronDown, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "~/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import ConfirmDialog from "~/app/components/ui/ConfirmDialog";
import type { NavItem, NavSection } from "~/app/components/nav";

interface Profile {
  fullName: string | null;
  role: string | null;
}

function itemKey(item: NavItem): string {
  return "href" in item ? item.href : item.id;
}

export default function AppShell({
  sections,
  homeHref,
  roleLabel,
  activeId,
  onSelect,
  children,
}: {
  sections: NavSection[];
  homeHref: string;
  roleLabel: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  children: React.ReactNode;
}) {
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

  const isItemActive = (item: NavItem): boolean => {
    if ("id" in item) return activeId === item.id;
    return item.href === homeHref
      ? pathname === homeHref
      : pathname.startsWith(item.href);
  };

  const handleItemClick = (item: NavItem) => {
    if ("id" in item) {
      onSelect?.(item.id);
      setMobileOpen(false);
    }
  };

  const itemClasses = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-brand-subtle text-brand"
        : "text-ink-secondary hover:bg-navy-surface hover:text-ink"
    }`;

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-navy-border bg-navy-base px-4 md:hidden">
        <Link href={homeHref} className="flex items-center">
          <img src="/logo.png" alt="iNEXORA" className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-ink-secondary"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-navy-border bg-navy-base transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-navy-border px-4">
          <Link href={homeHref} className="flex items-center">
            <img src="/logo.png" alt="iNEXORA" className="h-9 w-auto" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-ink-muted md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.label ?? sectionIndex} className="mb-6">
              {section.label && (
                <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  return "href" in item ? (
                    <Link
                      key={itemKey(item)}
                      href={item.href}
                      className={itemClasses(active)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={itemKey(item)}
                      onClick={() => handleItemClick(item)}
                      className={itemClasses(active)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom profile block */}
        <div
          className="relative flex-shrink-0 border-t border-navy-border p-3"
          ref={profileRef}
        >
          {isProfileOpen && (
            <div className="absolute right-3 bottom-full left-3 z-50 mb-2 rounded-xl border border-navy-border-strong bg-navy-card py-2 shadow-lg">
              <div className="mb-1 border-b border-navy-border px-4 py-2">
                <p className="text-xs font-semibold text-ink-muted uppercase">
                  Logged in as
                </p>
                <p className="truncate text-sm font-medium text-ink">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  router.push("/settings");
                  setIsProfileOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-ink-secondary transition-colors hover:bg-navy-surface hover:text-ink"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(true);
                  setIsProfileOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-navy-surface"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-3 rounded-xl border border-navy-border bg-navy-surface px-3 py-2 transition-colors hover:bg-navy-card"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-navy-base">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="text-xs font-semibold text-brand">{roleLabel}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-ink-muted transition-transform ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Content pane (light) */}
      <div className="md:pl-64">{children}</div>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign Out?"
        description="Are you sure you want to sign out?"
        confirmLabel="Yes, Sign Out"
        tone="danger"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}
