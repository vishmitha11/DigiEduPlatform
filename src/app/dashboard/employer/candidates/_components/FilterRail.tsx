"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api } from "~/trpc/react";
import Card from "~/app/components/ui/Card";
import Input from "~/app/components/ui/Input";
import Select from "~/app/components/ui/Select";
import {
  formatEnumLabel,
  type CandidateFacets,
  type CandidateFilters,
} from "./candidateTypes";
import type { ProgramField } from "@prisma/client";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterGroup({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-900">
          {title}
          {!!count && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
              {count}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="mt-3 space-y-2.5">{children}</div>}
    </div>
  );
}

function CheckboxRow({
  label,
  meta,
  checked,
  onChange,
}: {
  label: string;
  meta?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 flex-shrink-0 accent-brand"
      />
      <span className="flex-1">{label}</span>
      {meta !== undefined && <span className="text-xs text-slate-400">{meta}</span>}
    </label>
  );
}

export default function FilterRail({
  filters,
  onChange,
  onClearAll,
  facets,
}: {
  filters: CandidateFilters;
  onChange: (patch: Partial<CandidateFilters>) => void;
  onClearAll: () => void;
  facets?: CandidateFacets;
}) {
  const { data: jobs = [] } = api.job.getMyListings.useQuery();
  const publishedJobs = jobs.filter((j) => j.status === "PUBLISHED");

  const toggleField = (value: ProgramField) => {
    onChange({
      fieldsOfStudy: filters.fieldsOfStudy.includes(value)
        ? filters.fieldsOfStudy.filter((v) => v !== value)
        : [...filters.fieldsOfStudy, value],
    });
  };

  return (
    <Card
      title="Filters"
      action={
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-brand hover:text-brand-dim"
        >
          Clear all
        </button>
      }
      className="sticky top-6"
    >
      <div className="space-y-1">
        <Field label="Job listing">
          <Select
            value={filters.jobId}
            onChange={(e) => onChange({ jobId: e.target.value })}
          >
            {publishedJobs.length === 0 && <option value="">No published jobs</option>}
            {publishedJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </Select>
        </Field>

        {facets && facets.fieldsOfStudy.length > 0 && (
          <FilterGroup title="Field of study" count={filters.fieldsOfStudy.length}>
            {facets.fieldsOfStudy.map(({ field, count }) => (
              <CheckboxRow
                key={field}
                label={formatEnumLabel(field)}
                meta={count}
                checked={filters.fieldsOfStudy.includes(field)}
                onChange={() => toggleField(field)}
              />
            ))}
          </FilterGroup>
        )}

        <FilterGroup title="Academic standing">
          <Field label="Minimum GPA">
            <Input
              value={filters.minGpa}
              placeholder="e.g. 3.0"
              onChange={(e) => onChange({ minGpa: e.target.value })}
            />
          </Field>
          <Field label="Graduation year">
            <Select
              value={filters.gradYear}
              onChange={(e) => onChange({ gradYear: e.target.value })}
            >
              <option value="">Any year</option>
              {GRAD_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </FilterGroup>

        <FilterGroup title="Match score">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Minimum match</span>
            <span className="font-bold text-brand">{filters.minMatchScore}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minMatchScore}
            onChange={(e) => onChange({ minMatchScore: Number(e.target.value) })}
            className="w-full accent-brand"
          />
        </FilterGroup>

        <FilterGroup title="Credibility">
          <CheckboxRow
            label="Verified profiles only"
            checked={filters.verifiedOnly}
            onChange={() => onChange({ verifiedOnly: !filters.verifiedOnly })}
          />
          <CheckboxRow
            label="Has published research"
            checked={filters.hasPublishedResearch}
            onChange={() => onChange({ hasPublishedResearch: !filters.hasPublishedResearch })}
          />
          <CheckboxRow
            label="Has credentials"
            checked={filters.hasCredentials}
            onChange={() => onChange({ hasCredentials: !filters.hasCredentials })}
          />
        </FilterGroup>
      </div>
    </Card>
  );
}
