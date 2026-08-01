"use client";

import { BadgeCheck, Lock, ShieldCheck, type LucideIcon } from "lucide-react";

// Shared by the signup page and every profile-setup flow so the brand
// panel's photo/overlay/badges stay in sync instead of drifting per file.

export type BrandPanelRole = "STUDENT" | "LECTURER" | "EMPLOYER";

// All photos: Unsplash License (free commercial use, no attribution required).
// Student: Bangun Stock Production — public/images/profile-setup-student.jpg
// Lecturer: photo-1758685848142-06e158cf64bc — public/images/profile-setup-lecturer.jpg
// Employer: Annika Palmari — public/images/profile-setup-employer.jpg
export const BRAND_PANEL_PHOTOS: Record<BrandPanelRole, string> = {
  STUDENT: "/images/profile-setup-student.jpg",
  LECTURER: "/images/profile-setup-lecturer.jpg",
  EMPLOYER: "/images/profile-setup-employer.jpg",
};

export const BRAND_PANEL_OVERLAY =
  "linear-gradient(180deg, rgba(10,15,30,0.72) 0%, rgba(10,15,30,0.88) 55%, rgba(10,15,30,0.99) 100%)";

export function brandPanelBackgroundImage(role: BrandPanelRole): string {
  return `${BRAND_PANEL_OVERLAY}, url('${BRAND_PANEL_PHOTOS[role]}')`;
}

// Genuinely true claims only — no fabricated certifications (ISO/SOC2/etc.)
// or third-party logos. See CLAUDE.md's honesty principle re: /privacy page.
export const TRUST_BADGES: { icon: LucideIcon; label: string }[] = [
  { icon: Lock, label: "TLS Encrypted" },
  { icon: BadgeCheck, label: "Verified Institutions" },
  { icon: ShieldCheck, label: "Privacy by Design" },
];

// A scalloped-circle "seal" outline, drawn with clip-path so it renders
// crisply at any size without a raster asset — placeholder styling for the
// development phase, swap for real artwork before this ships.
const SEAL_CLIP_PATH =
  "polygon(50% 0%, 61% 10%, 75% 6%, 80% 19%, 94% 21%, 94% 35%, 100% 50%, 94% 65%, 94% 79%, 80% 81%, 75% 94%, 61% 90%, 50% 100%, 39% 90%, 25% 94%, 20% 81%, 6% 79%, 6% 65%, 0% 50%, 6% 35%, 6% 21%, 20% 19%, 25% 6%, 39% 10%)";

export function TrustBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex w-[74px] flex-col items-center gap-1.5 text-center">
      <div
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center bg-gradient-to-br from-brand to-brand-dim shadow-[0_4px_16px_rgba(34,197,94,0.35)]"
        style={{ clipPath: SEAL_CLIP_PATH }}
      >
        <Icon className="h-5 w-5 text-[#0A0F1E]" strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-semibold leading-tight text-white/70">{label}</span>
    </div>
  );
}

export function TrustBadgeRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-between gap-2 px-1 ${className}`}>
      {TRUST_BADGES.map((badge) => (
        <TrustBadge key={badge.label} {...badge} />
      ))}
    </div>
  );
}
