"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Search, Clock, Globe, DollarSign,
  Loader2, X, Users, FileText, Filter, BookOpen,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import Button from "~/app/components/ui/Button";
import Badge from "~/app/components/ui/Badge";
import EmptyState from "~/app/components/ui/EmptyState";

interface Course {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  deliveryMode: string | null;
  localPrice: number | null;
  foreignPrice: number | null;
  createdAt: string;
  createdBy: { title: string | null; profile: { fullName: string | null } | null } | null;
  _count: { sections: number; courseEnrollments: number };
}

const FIELDS_FILTER = ["All", "Free", "Paid"];

export default function CoursesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("All");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("Course")
        .select(`
          id, title, code, description, localPrice, foreignPrice, createdAt,
          createdBy:Lecturer!Course_createdById_fkey(
            title,
            profile:Profile(fullName)
          )
        `)
        .eq("isStandalone", true)
        .eq("isPublished", true)
        .order("createdAt", { ascending: false });

      if (data) {
        setCourses(
          data.map((c) => ({
            ...c,
            deliveryMode: null,
            localPrice: c.localPrice ? Number(c.localPrice) : null,
            foreignPrice: c.foreignPrice ? Number(c.foreignPrice) : null,
            createdBy: Array.isArray(c.createdBy)
              ? c.createdBy[0] ?? null
              : c.createdBy ?? null,
            _count: { sections: 0, courseEnrollments: 0 },
          })) as Course[],
        );
      }
      setLoading(false);
    };
    void fetchCourses();
  }, []);

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.title.toLowerCase().includes(q) ||
      (c.code?.toLowerCase().includes(q) ?? false) ||
      (c.createdBy?.profile?.fullName?.toLowerCase().includes(q) ?? false);
    const matchPrice =
      priceFilter === "All" ||
      (priceFilter === "Free" && (!c.localPrice || c.localPrice === 0)) ||
      (priceFilter === "Paid" && c.localPrice && c.localPrice > 0);
    return matchSearch && matchPrice;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              Browse Courses
            </h1>
            <p className="mt-3 text-lg text-slate-500">
              Standalone certificate courses from expert lecturers
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses or instructors…"
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
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {FIELDS_FILTER.map((f) => (
              <button
                key={f}
                onClick={() => setPriceFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  priceFilter === f
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-400">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No courses found" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {filtered.map((course) => {
              const isFree = !course.localPrice || course.localPrice === 0;
              const instructor = course.createdBy;
              const instructorName = instructor?.profile?.fullName
                ? `${instructor.title ? `${instructor.title} ` : ""}${instructor.profile.fullName}`
                : null;

              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
                  className="flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/30 hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                          <GraduationCap className="h-4 w-4 text-white" />
                        </div>
                        {course.code && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                            {course.code}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold leading-snug text-slate-900">
                        {course.title}
                      </h3>
                      {instructorName && (
                        <p className="mt-1 text-xs text-slate-400">{instructorName}</p>
                      )}
                    </div>

                    {course.description && (
                      <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                        {course.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                      {isFree ? (
                        <Badge tone="success">Free</Badge>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            LKR {course.localPrice?.toLocaleString()}
                          </p>
                          {course.foreignPrice && (
                            <p className="text-xs text-slate-400">
                              USD {course.foreignPrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/student/courses/${course.id}`); }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}