"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Search, Filter, Clock, Globe, DollarSign,
  GraduationCap, Building2, ChevronDown, Loader2, X,
  CheckCircle2, Layers,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import Button from "~/app/components/ui/Button";
import Badge from "~/app/components/ui/Badge";
import EmptyState from "~/app/components/ui/EmptyState";

// ── Types ─────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
  slug: string;
  type: string;
  level: string;
  field: string;
  deliveryMode: string;
  durationMonths: number | null;
  localPrice: number | null;
  foreignPrice: number | null;
  scholarshipAvailable: boolean;
  description: string | null;
  language: string[];
  institution: { name: string; logoUrl: string | null; type: string } | null;
  _count: { courses: number; enrollments: number };
}

// ── Constants ──────────────────────────────────────────────────────────────

const PROGRAM_TYPES = [
  "FOUNDATION", "DIPLOMA", "CERTIFICATE", "BACHELOR",
  "MASTER", "PHD", "PROFESSIONAL", "MICROCREDENTIAL", "SHORT_COURSE",
];

const FIELDS = [
  "ENGINEERING", "INFORMATION_TECHNOLOGY", "BUSINESS_MANAGEMENT",
  "DATA_SCIENCE", "ARTIFICIAL_INTELLIGENCE", "MEDICINE", "LAW",
  "EDUCATION", "ARTS", "OTHER",
];

const DELIVERY_MODES = ["ONLINE", "ON_CAMPUS", "HYBRID", "BLENDED"];

const LEVEL_COLORS: Record<string, string> = {
  ENTRY:          "bg-green-100 text-green-700",
  UNDERGRADUATE:  "bg-blue-100 text-blue-700",
  POSTGRADUATE:   "bg-violet-100 text-violet-700",
  RESEARCH:       "bg-orange-100 text-orange-700",
};

const TYPE_COLORS: Record<string, string> = {
  BACHELOR:       "bg-blue-50 text-blue-700",
  MASTER:         "bg-violet-50 text-violet-700",
  PHD:            "bg-purple-50 text-purple-700",
  DIPLOMA:        "bg-emerald-50 text-emerald-700",
  CERTIFICATE:    "bg-orange-50 text-orange-700",
  FOUNDATION:     "bg-yellow-50 text-yellow-700",
  PROFESSIONAL:   "bg-slate-50 text-slate-700",
  MICROCREDENTIAL:"bg-pink-50 text-pink-700",
  SHORT_COURSE:   "bg-teal-50 text-teal-700",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [priceFilter, setPriceFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("Program")
        .select(`
          id, title, slug, type, level, field, deliveryMode,
          durationMonths, localPrice, foreignPrice,
          scholarshipAvailable, description, language,
          institution:Institution(name, logoUrl, type)
        `)
        .eq("isPublished", true)
        .eq("approvalStatus", "APPROVED")
        .eq("isActive", true)
        .order("createdAt", { ascending: false });

      if (data) {
        // Fetch enrollment counts separately
        const programIds = data.map((p) => p.id);
        const { data: courseCounts } = await supabase
          .from("Course")
          .select("programId")
          .in("programId", programIds)
          .eq("isPublished", true);

        const courseCountMap: Record<string, number> = {};
        courseCounts?.forEach((c) => {
          courseCountMap[c.programId] = (courseCountMap[c.programId] ?? 0) + 1;
        });

        setPrograms(
          data.map((p) => ({
            ...p,
            institution: Array.isArray(p.institution) ? p.institution[0] ?? null : p.institution,
            localPrice: p.localPrice ? Number(p.localPrice) : null,
            foreignPrice: p.foreignPrice ? Number(p.foreignPrice) : null,
            _count: { courses: courseCountMap[p.id] ?? 0, enrollments: 0 },
          })) as Program[],
        );
      }
      setLoading(false);
    };
    void fetchPrograms();
  }, []);

  // ── Filters ────────────────────────────────────────────────────────────

  const filtered = programs.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.title.toLowerCase().includes(q) ||
      (p.institution?.name.toLowerCase().includes(q) ?? false) ||
      p.field.toLowerCase().includes(q);
    const matchType   = typeFilter === "ALL"  || p.type === typeFilter;
    const matchField  = fieldFilter === "ALL" || p.field === fieldFilter;
    const matchMode   = modeFilter === "ALL"  || p.deliveryMode === modeFilter;
    const matchPrice  =
      priceFilter === "ALL" ||
      (priceFilter === "FREE" && (!p.localPrice || p.localPrice === 0)) ||
      (priceFilter === "PAID" && p.localPrice && p.localPrice > 0);
    return matchSearch && matchType && matchField && matchMode && matchPrice;
  });

  const activeFilters = [typeFilter, fieldFilter, modeFilter, priceFilter].filter(
    (f) => f !== "ALL",
  ).length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              Explore Programs
            </h1>
            <p className="mt-3 text-lg text-slate-500">
              Discover degree programs, diplomas and certificates from top institutions
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, institutions, fields…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-subtle"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              showFilters || activeFilters > 0
                ? "border-brand/30 bg-brand-subtle text-brand-dim"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Quick type pills */}
          <div className="flex flex-wrap gap-2">
            {["ALL", "BACHELOR", "MASTER", "DIPLOMA", "CERTIFICATE", "SHORT_COURSE"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  typeFilter === t
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {t === "ALL" ? "All Types" : t.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} program{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
            {[
              { label: "Field", value: fieldFilter, set: setFieldFilter, options: FIELDS },
              { label: "Delivery Mode", value: modeFilter, set: setModeFilter, options: DELIVERY_MODES },
            ].map(({ label, value, set, options }) => (
              <div key={label}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-brand"
                  >
                    <option value="ALL">All</option>
                    {options.map((o) => (
                      <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Price
              </label>
              <div className="flex gap-2">
                {["ALL", "FREE", "PAID"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriceFilter(p)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
                      priceFilter === p
                        ? "border-brand/30 bg-brand-subtle text-brand-dim"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p === "ALL" ? "Any" : p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Programs grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={BookOpen} title="No programs found" description="Try adjusting your filters" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {filtered.map((program) => (
              <div
                key={program.id}
                onClick={() => router.push(`/dashboard/student/programs/${program.id}`)}
                className="flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/30 hover:shadow-md"
              >
                {/* Card header */}
                <div className="p-5 pb-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_COLORS[program.type] ?? "bg-slate-50 text-slate-700"}`}>
                        {program.type.replace(/_/g, " ")}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LEVEL_COLORS[program.level] ?? "bg-slate-100 text-slate-600"}`}>
                        {program.level}
                      </span>
                    </div>
                    {program.scholarshipAvailable && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Scholarship
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold leading-snug text-slate-900">{program.title}</h3>

                  {program.institution && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {program.institution.name}
                    </div>
                  )}

                  {program.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400 leading-relaxed">
                      {program.description}
                    </p>
                  )}
                </div>

                {/* Stats strip */}
                <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  {program.durationMonths && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {program.durationMonths} months
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {program.deliveryMode.replace(/_/g, " ")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {program._count.courses} modules
                  </span>
                </div>

                {/* Price + CTA */}
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-4">
                  <div>
                    {program.localPrice && program.localPrice > 0 ? (
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          LKR {program.localPrice.toLocaleString()}
                        </p>
                        {program.foreignPrice && (
                          <p className="text-xs text-slate-400">
                            USD {program.foreignPrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge tone="success">Free</Badge>
                    )}
                  </div>
                  <Button
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/student/programs/${program.id}`); }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}