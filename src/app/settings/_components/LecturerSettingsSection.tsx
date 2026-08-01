"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export default function LecturerSettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Expertise & Teaching Profile</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your title, institution affiliation, subject areas, and credentials.
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <BookOpen className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Managed through Profile Setup</p>
          <p className="mt-1 text-sm text-gray-500">
            These details shape how students and institutions see you. You can revisit and update any
            step — personal details, institution affiliation, subject areas, and experience — at any time.
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
