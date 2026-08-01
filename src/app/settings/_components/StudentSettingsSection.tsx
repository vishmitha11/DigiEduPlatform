"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

export default function StudentSettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Academic & Career Profile</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your education, interests, career goals, and learning preferences.
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <GraduationCap className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Managed through Profile Setup</p>
          <p className="mt-1 text-sm text-gray-500">
            These details power your program recommendations. You can revisit and update any step —
            education, interests, career goals, skill level, delivery mode, and budget — at any time.
          </p>
          <Link
            href="/profile-setup"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Edit in Profile Setup <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
