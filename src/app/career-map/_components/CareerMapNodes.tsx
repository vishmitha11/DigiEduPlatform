"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  GraduationCap,
  BookOpen,
  Target,
  Award,
  Rocket,
  Building2,
  type LucideIcon,
} from "lucide-react";

// Shared, quiet card language — no glow/gradients, matches the rest of the
// app's icon-chip + navy-surface card pattern (e.g. ProfileSetupShell's
// feature list) instead of default ReactFlow boxes.
const cardBase =
  "rounded-xl border border-navy-border bg-navy-surface px-4 py-3 shadow-sm transition-colors hover:border-navy-border-strong";
const iconChip = "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10";

function EdgeHandles({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
  return direction === "horizontal" ? (
    <>
      <Handle type="target" position={Position.Left} className="!border-navy-border-strong !bg-navy-card" />
      <Handle type="source" position={Position.Right} className="!border-navy-border-strong !bg-navy-card" />
    </>
  ) : (
    <>
      <Handle type="target" position={Position.Top} className="!border-navy-border-strong !bg-navy-card" />
      <Handle type="source" position={Position.Bottom} className="!border-navy-border-strong !bg-navy-card" />
    </>
  );
}

// ── Student (center anchor) ─────────────────────────────────────────────────
export interface StudentNodeData {
  name: string;
}

export function StudentNode({ data }: NodeProps<StudentNodeData>) {
  const initial = data.name.trim().charAt(0).toUpperCase() || "S";
  return (
    <div className="flex w-[180px] flex-col items-center gap-2 rounded-2xl border border-brand/40 bg-navy-card px-4 py-4 text-center shadow-sm">
      <EdgeHandles />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-navy-base">
        {initial}
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{data.name}</p>
        <p className="text-[11px] text-ink-muted">Your journey</p>
      </div>
    </div>
  );
}

// ── Generic info node (education level, target career) ──────────────────────
export interface InfoNodeData {
  icon: "education" | "target";
  label: string;
  sublabel: string;
}

const INFO_ICONS: Record<InfoNodeData["icon"], LucideIcon> = {
  education: GraduationCap,
  target: Target,
};

export function InfoNode({ data }: NodeProps<InfoNodeData>) {
  const Icon = INFO_ICONS[data.icon];
  return (
    <div className={`${cardBase} flex w-[210px] items-center gap-3`}>
      <EdgeHandles />
      <div className={iconChip}>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] uppercase tracking-wide text-ink-muted">{data.sublabel}</p>
        <p className="truncate text-sm font-medium text-ink">{data.label}</p>
      </div>
    </div>
  );
}

// ── Enrolled program ─────────────────────────────────────────────────────────
export interface ProgramNodeData {
  title: string;
  level: string | null;
  status: string;
}

export function ProgramNode({ data }: NodeProps<ProgramNodeData>) {
  const isCompleted = data.status === "COMPLETED";
  return (
    <div className={`${cardBase} w-[220px]`}>
      <EdgeHandles />
      <div className="mb-2 flex items-start gap-3">
        <div className={iconChip}>
          <BookOpen className="h-4 w-4 text-brand" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{data.title}</p>
          {data.level && <p className="truncate text-[11px] text-ink-muted">{data.level}</p>}
        </div>
      </div>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          isCompleted ? "bg-brand/10 text-brand" : "bg-amber-500/10 text-amber-400"
        }`}
      >
        {data.status}
      </span>
    </div>
  );
}

// ── Earned credential ─────────────────────────────────────────────────────────
export interface CredentialNodeData {
  title: string;
  credentialType: string;
}

export function CredentialNode({ data }: NodeProps<CredentialNodeData>) {
  return (
    <div className={`${cardBase} flex w-[210px] items-center gap-3`}>
      <EdgeHandles />
      <div className={iconChip}>
        <Award className="h-4 w-4 text-brand" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{data.title}</p>
        <p className="truncate text-[11px] text-ink-muted">{data.credentialType}</p>
      </div>
    </div>
  );
}

// ── AI-generated career cluster (group header) ───────────────────────────────
export interface ClusterNodeData {
  name: string;
}

export function ClusterNode({ data }: NodeProps<ClusterNodeData>) {
  return (
    <div className="flex w-[210px] items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 shadow-sm">
      <EdgeHandles />
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/15">
        <Building2 className="h-4 w-4 text-brand" />
      </div>
      <p className="truncate text-sm font-semibold text-brand">{data.name}</p>
    </div>
  );
}

// ── AI-generated role within a cluster ────────────────────────────────────────
export interface RoleNodeData {
  title: string;
  skill: string;
}

export function RoleNode({ data }: NodeProps<RoleNodeData>) {
  return (
    <div className={`${cardBase} w-[220px]`}>
      <EdgeHandles />
      <p className="mb-1.5 text-sm font-semibold text-ink">{data.title}</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-navy-card px-2 py-0.5 text-[10px] font-medium text-ink-secondary">
        <Rocket className="h-3 w-3 text-brand" />
        {data.skill}
      </span>
    </div>
  );
}

// ── Empty state (no programs/credentials yet) ─────────────────────────────────
export interface EmptyStateNodeData {
  label: string;
}

export function EmptyStateNode({ data }: NodeProps<EmptyStateNodeData>) {
  return (
    <div className="flex w-[210px] items-center gap-3 rounded-xl border border-dashed border-navy-border-strong bg-navy-surface/60 px-4 py-3">
      <EdgeHandles />
      <div className={iconChip}>
        <Rocket className="h-4 w-4 text-brand" />
      </div>
      <p className="text-sm font-medium text-ink-secondary">{data.label}</p>
    </div>
  );
}

export const careerMapNodeTypes = {
  student: StudentNode,
  info: InfoNode,
  program: ProgramNode,
  credential: CredentialNode,
  cluster: ClusterNode,
  role: RoleNode,
  empty: EmptyStateNode,
};
