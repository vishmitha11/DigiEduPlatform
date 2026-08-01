"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  BookOpen,
  Briefcase,
  CheckCircle,
  XCircle,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  UserX,
  UserCheck,
  ChevronDown,
  Loader2,
  Plus,
  Pencil,
  UserCog,
  Globe,
  MapPin,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Calendar,
  Mail,
} from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import {
  suspendUser,
  reactivateUser,
  deleteUser,
  suspendInstitution,
  reactivateInstitution,
  deleteInstitution,
  approveLecturer,
  rejectLecturer,
  approveInstitution,
  rejectInstitution,
  approveEmployer,
  rejectEmployer,
  toggleProgram,
  deleteProgram,
  toggleJob,
  deleteJob,
  createInstitution,
  updateInstitution,
  assignManager,
  removeManager,
  updateManagerPermissions,
  reApproveLecturer,
  reApproveEmployer,
  createInstitutionAccount,
  deleteInstitutionAccount,
} from "../actions";

// ── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalInstitutions: number;
  totalPrograms: number;
  totalJobs: number;
}

interface RecentUser {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  isActive: boolean;
  createdAt: string;
  // Lecturer/employer profiles that signed up but never completed profile
  // setup (no Lecturer/Employer row yet, so not approvable yet either)
  awaitingSetup?: boolean;
}

interface PendingInstitution {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
  createdAt: string;
}

interface PendingEmployer {
  id: string;
  companyName: string;
  industry: string | null;
  createdAt: string;
  profile: { fullName: string | null; email: string | null }[] | null;
}

interface AdminProgram {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: string;
  institution: { name: string }[] | null;
}

interface AdminJob {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  employer: { companyName: string }[] | null;
}

interface PendingLecturer {
  id: string;
  title: string | null;
  specialization: string[];
  createdAt: string;
  profile: { fullName: string | null; email: string | null }[] | null;
}

interface RejectedLecturer {
  id: string;
  profileId: string;
  title: string | null;
  specialization: string[];
  createdAt: string;
  profile: { fullName: string | null; email: string | null }[] | null;
}

interface RejectedEmployer {
  id: string;
  profileId: string;
  companyName: string;
  industry: string | null;
  createdAt: string;
  profile: { fullName: string | null; email: string | null }[] | null;
}

interface ApprovedLecturer {
  id: string;
  title: string | null;
  institutionId: string | null;
  profile: { fullName: string | null; email: string | null }[] | null;
}

interface ManagerRecord {
  id: string;
  canEditProfile: boolean;
  canManagePrograms: boolean;
  canViewAnalytics: boolean;
  canPostAnnouncements: boolean;
  assignedAt: string;
  lecturer:
    | {
        id: string;
        title: string | null;
        profile: { fullName: string | null; email: string | null }[] | null;
      }[]
    | null;
}

interface ApprovedInstitution {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
  email: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  managers: ManagerRecord[] | null;
  account: { id: string }[] | null;
}

interface InstFormValues {
  name: string;
  type: string;
  country: string;
  email: string;
  website: string;
  description: string;
}

interface ManagerPerms {
  canEditProfile: boolean;
  canManagePrograms: boolean;
  canViewAnalytics: boolean;
  canPostAnnouncements: boolean;
}

const BLANK_FORM: InstFormValues = {
  name: "",
  type: "",
  country: "",
  email: "",
  website: "",
  description: "",
};

const DEFAULT_PERMS: ManagerPerms = {
  canEditProfile: false,
  canManagePrograms: true,
  canViewAnalytics: true,
  canPostAnnouncements: false,
};

const INSTITUTION_TYPES: { value: string; label: string }[] = [
  { value: "PUBLIC_UNIVERSITY", label: "Public University" },
  { value: "PRIVATE_UNIVERSITY", label: "Private University" },
  { value: "FOREIGN_UNIVERSITY", label: "Foreign University" },
  { value: "TRAINING_INSTITUTE", label: "Training Institute" },
  { value: "PROFESSIONAL_BODY", label: "Professional Body" },
  { value: "CORPORATE_ACADEMY", label: "Corporate Academy" },
];

interface Props {
  stats: Stats;
  recentUsers: RecentUser[];
  pendingInstitutions: PendingInstitution[];
  pendingEmployers: PendingEmployer[];
  pendingLecturers: PendingLecturer[];
  allUsers: RecentUser[];
  allPrograms: AdminProgram[];
  allJobs: AdminJob[];
  allInstitutions: ApprovedInstitution[];
  approvedLecturers: ApprovedLecturer[];
  rejectedLecturers: RejectedLecturer[];
  rejectedEmployers: RejectedEmployer[];
  currentUserId: string;
}

type TabType =
  | "overview"
  | "users"
  | "institutions"
  | "rejections"
  | "institutionList"
  | "programs"
  | "jobs";

// ── Shared micro-components ────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function PermToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
        value
          ? "border-blue-200 bg-blue-50"
          : "border-slate-100 bg-slate-50 hover:border-slate-200"
      }`}
    >
      <div>
        <p
          className={`text-sm font-semibold ${value ? "text-blue-900" : "text-slate-700"}`}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      {value ? (
        <ToggleRight className="h-6 w-6 flex-shrink-0 text-blue-600" />
      ) : (
        <ToggleLeft className="h-6 w-6 flex-shrink-0 text-slate-300" />
      )}
    </button>
  );
}

function ApprovalSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            {count} pending
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-50">
        {count === 0 ? empty : children}
      </div>
    </div>
  );
}

function EmptyApproval({ label }: { label: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
      <p className="font-medium text-slate-900">All caught up!</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProfile = (
  profile: any,
): { fullName: string | null; email: string | null } | null =>
  Array.isArray(profile) ? (profile[0] ?? null) : (profile ?? null);

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminDashboard({
  stats,
  recentUsers,
  pendingInstitutions,
  pendingEmployers,
  pendingLecturers,
  rejectedLecturers: initialRejectedLecturers,
  rejectedEmployers: initialRejectedEmployers,
  allUsers,
  allPrograms,
  allJobs,
  allInstitutions,
  approvedLecturers,
  currentUserId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [suspendConfirm, setSuspendConfirm] = useState<{
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [instSearch, setInstSearch] = useState("");
  const [instFilter, setInstFilter] = useState("ALL");
  const [programSearch, setProgramSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [jobSearch, setJobSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("ALL");

  const [users, setUsers] = useState<RecentUser[]>(allUsers);
  const [programs, setPrograms] = useState<AdminProgram[]>(allPrograms);
  const [jobs, setJobs] = useState<AdminJob[]>(allJobs);
  const [pendingInst, setPendingInst] =
    useState<PendingInstitution[]>(pendingInstitutions);
  const [approvedInst, setApprovedInst] =
    useState<ApprovedInstitution[]>(allInstitutions);
  const [lecturers, setLecturers] =
    useState<PendingLecturer[]>(pendingLecturers);
  const [employers, setEmployers] =
    useState<PendingEmployer[]>(pendingEmployers);
  const [rejectedLecturers, setRejectedLecturers] = useState<
    RejectedLecturer[]
  >(initialRejectedLecturers);
  const [rejectedEmployers, setRejectedEmployers] = useState<
    RejectedEmployer[]
  >(initialRejectedEmployers);

  const [instModal, setInstModal] = useState<"closed" | "create" | "edit">(
    "closed",
  );
  const [editingInst, setEditingInst] = useState<ApprovedInstitution | null>(
    null,
  );
  const [instForm, setInstForm] = useState<InstFormValues>(BLANK_FORM);
  const [instFormLoading, setInstFormLoading] = useState(false);
  const [instFormError, setInstFormError] = useState<string | null>(null);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState<
    string | null
  >(null);

  const [managerPanel, setManagerPanel] = useState<ApprovedInstitution | null>(
    null,
  );
  const [lecturerSearch, setLecturerSearch] = useState("");
  const [perms, setPerms] = useState<ManagerPerms>(DEFAULT_PERMS);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // ── Action wrapper ────────────────────────────────────────────────────────

  const run = async (
    id: string,
    action: () => Promise<void>,
    optimistic: () => void,
  ) => {
    setLoadingId(id);
    setErrorMsg(null);
    optimistic();
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Action failed");
      } finally {
        setLoadingId(null);
      }
    });
  };

  // ── Standard actions ──────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSuspendUser = (id: string, isActive: boolean, name: string) => {
    setSuspendConfirm({ id, name, isActive });
  };

  // Add a function to actually perform the suspension after confirmation
  const performSuspendUser = (id: string, isActive: boolean) => {
    run(
      id,
      () => (isActive ? suspendUser(id) : reactivateUser(id)),
      () => {
        setUsers((p) =>
          p.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)),
        );
        setSuspendConfirm(null);
      },
    );
  };

  // Update the handleDeleteUser function to use confirmation
  const handleDeleteUser = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // Add function to actually perform deletion
  const performDeleteUser = async (id: string) => {
    run(
      `del-${id}`,
      () => deleteUser(id),
      () => {
        setUsers((p) => p.filter((u) => u.id !== id));
        setRejectedLecturers((p) => p.filter((l) => l.profileId !== id));
        setRejectedEmployers((p) => p.filter((e) => e.profileId !== id));
        setDeleteConfirm(null);
      },
    );
  };

  const handleSuspendInst = (id: string, isActive: boolean) =>
    run(
      id,
      () => (isActive ? suspendInstitution(id) : reactivateInstitution(id)),
      () =>
        setApprovedInst((p) =>
          p.map((i) => (i.id === id ? { ...i, isActive: !isActive } : i)),
        ),
    );

  const handleDeleteInst = async (id: string) => {
    if (!confirm("Permanently delete this institution? This cannot be undone."))
      return;
    run(
      `del-inst-${id}`,
      () => deleteInstitution(id),
      () => setApprovedInst((p) => p.filter((i) => i.id !== id)),
    );
  };

  const handleApproveInst = (id: string) =>
    run(
      id,
      () => approveInstitution(id),
      () => setPendingInst((p) => p.filter((i) => i.id !== id)),
    );
  const handleRejectInst = (id: string) =>
    run(
      id,
      () => rejectInstitution(id),
      () => setPendingInst((p) => p.filter((i) => i.id !== id)),
    );
  const handleApproveLecturer = (id: string) =>
    run(
      id,
      () => approveLecturer(id),
      () => setLecturers((p) => p.filter((l) => l.id !== id)),
    );
  const handleRejectLecturer = (id: string) =>
    run(
      id,
      () => rejectLecturer(id),
      () => setLecturers((p) => p.filter((l) => l.id !== id)),
    );
  const handleApproveEmployer = (id: string) =>
    run(
      id,
      () => approveEmployer(id),
      () => setEmployers((p) => p.filter((e) => e.id !== id)),
    );
  const handleRejectEmployer = (id: string) =>
    run(
      id,
      () => rejectEmployer(id),
      () => setEmployers((p) => p.filter((e) => e.id !== id)),
    );

  const handleReApproveLecturer = (id: string) =>
    run(
      id,
      () => reApproveLecturer(id),
      () => setRejectedLecturers((p) => p.filter((l) => l.id !== id)),
    );
  const handleReApproveEmployer = (id: string) =>
    run(
      id,
      () => reApproveEmployer(id),
      () => setRejectedEmployers((p) => p.filter((e) => e.id !== id)),
    );

  const handleToggleProgram = (id: string, current: boolean) =>
    run(
      id,
      () => toggleProgram(id, current),
      () =>
        setPrograms((p) =>
          p.map((pr) => (pr.id === id ? { ...pr, isPublished: !current } : pr)),
        ),
    );
  const handleDeleteProgram = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    run(
      id,
      () => deleteProgram(id),
      () => setPrograms((p) => p.filter((pr) => pr.id !== id)),
    );
  };

  const handleToggleJob = (id: string, current: boolean) =>
    run(
      id,
      () => toggleJob(id, current),
      () =>
        setJobs((p) =>
          p.map((j) => (j.id === id ? { ...j, isActive: !current } : j)),
        ),
    );
  const handleDeleteJob = async (id: string) => {
    if (!confirm("Delete this job listing?")) return;
    run(
      id,
      () => deleteJob(id),
      () => setJobs((p) => p.filter((j) => j.id !== id)),
    );
  };

  // ── Institution account actions ───────────────────────────────────────────

  const handleCreateInstitutionAccount = async (institutionId: string) => {
    setLoadingId(`inst-acc-${institutionId}`);
    setErrorMsg(null);
    try {
      const result = await createInstitutionAccount(institutionId);
      setApprovedInst((p) =>
        p.map((i) =>
          i.id === institutionId ? { ...i, account: [{ id: "pending" }] } : i,
        ),
      );
      if (result?.link) {
        // Copy to clipboard and alert
        await navigator.clipboard.writeText(result.link);
        alert(
          `Account created! Reset link copied to clipboard:\n\n${result.link}`,
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteInstitutionAccount = async (institutionId: string) => {
    run(
      `inst-del-acc-${institutionId}`,
      () => deleteInstitutionAccount(institutionId),
      () =>
        setApprovedInst((p) =>
          p.map((i) => (i.id === institutionId ? { ...i, account: [] } : i)),
        ),
    );
    setDeleteAccountConfirm(null);
  };

  // ── Institution CRUD ──────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingInst(null);
    setInstForm(BLANK_FORM);
    setInstFormError(null);
    setInstModal("create");
  };
  const openEdit = (inst: ApprovedInstitution) => {
    setEditingInst(inst);
    setInstForm({
      name: inst.name,
      type: inst.type ?? "",
      country: inst.country ?? "",
      email: inst.email ?? "",
      website: "",
      description: "",
    });
    setInstFormError(null);
    setInstModal("edit");
  };
  const closeInstModal = () => {
    setInstModal("closed");
    setEditingInst(null);
    setInstForm(BLANK_FORM);
    setInstFormError(null);
  };

  const handleInstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.name.trim()) {
      setInstFormError("Institution name is required.");
      return;
    }
    setInstFormLoading(true);
    setInstFormError(null);
    try {
      if (instModal === "create") {
        await createInstitution({
          name: instForm.name,
          type: instForm.type,
          country: instForm.country,
          email: instForm.email,
          website: instForm.website || undefined,
          description: instForm.description || undefined,
        });
        closeInstModal();
        router.refresh();
        return;
      } else if (instModal === "edit" && editingInst) {
        await updateInstitution(editingInst.id, {
          name: instForm.name,
          type: instForm.type || undefined,
          country: instForm.country || undefined,
          email: instForm.email || undefined,
          website: instForm.website || undefined,
          description: instForm.description || undefined,
        });
        setApprovedInst((p) =>
          p.map((i) =>
            i.id === editingInst.id
              ? {
                  ...i,
                  name: instForm.name,
                  type: instForm.type || i.type,
                  country: instForm.country || i.country,
                }
              : i,
          ),
        );
      }
      closeInstModal();
    } catch (err) {
      setInstFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setInstFormLoading(false);
    }
  };

  // ── Manager panel actions ─────────────────────────────────────────────────

  const openManagerPanel = (inst: ApprovedInstitution) => {
    setManagerPanel(inst);
    setLecturerSearch("");
    setManagerError(null);
    setEditingManagerId(null);
    const existing = inst.managers?.[0];
    setPerms(
      existing
        ? {
            canEditProfile: existing.canEditProfile,
            canManagePrograms: existing.canManagePrograms,
            canViewAnalytics: existing.canViewAnalytics,
            canPostAnnouncements: existing.canPostAnnouncements,
          }
        : DEFAULT_PERMS,
    );
  };
  const closeManagerPanel = () => {
    setManagerPanel(null);
    setManagerError(null);
    setEditingManagerId(null);
  };

  const handleAssign = async (lecturerId: string) => {
    if (!managerPanel) return;
    setManagerLoading(true);
    setManagerError(null);
    try {
      await assignManager({
        institutionId: managerPanel.id,
        lecturerId,
        canEditProfile: perms.canEditProfile,
        canManagePrograms: perms.canManagePrograms,
        canViewAnalytics: perms.canViewAnalytics,
        canPostAnnouncements: perms.canPostAnnouncements,
      });
      const lec = approvedLecturers.find((l) => l.id === lecturerId);
      const newRecord: ManagerRecord = {
        id: crypto.randomUUID(),
        ...perms,
        assignedAt: new Date().toISOString(),
        lecturer: lec
          ? [{ id: lec.id, title: lec.title, profile: lec.profile }]
          : null,
      };
      const update = (inst: ApprovedInstitution) =>
        inst.id === managerPanel.id
          ? { ...inst, managers: [...(inst.managers ?? []), newRecord] }
          : inst;
      setApprovedInst((p) => p.map(update));
      setManagerPanel((prev) => (prev ? update(prev) : null));
    } catch (err) {
      setManagerError(
        err instanceof Error ? err.message : "Failed to assign manager.",
      );
    } finally {
      setManagerLoading(false);
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    if (!managerPanel || !confirm("Remove this manager from the institution?"))
      return;
    setManagerLoading(true);
    setManagerError(null);
    try {
      await removeManager(managerId);
      const filter = (inst: ApprovedInstitution) =>
        inst.id === managerPanel.id
          ? {
              ...inst,
              managers: (inst.managers ?? []).filter((m) => m.id !== managerId),
            }
          : inst;
      setApprovedInst((p) => p.map(filter));
      setManagerPanel((prev) => (prev ? filter(prev) : null));
    } catch (err) {
      setManagerError(
        err instanceof Error ? err.message : "Failed to remove manager.",
      );
    } finally {
      setManagerLoading(false);
    }
  };

  const handleUpdatePerms = async (managerId: string) => {
    setManagerLoading(true);
    setManagerError(null);
    try {
      await updateManagerPermissions(managerId, perms);
      const update = (inst: ApprovedInstitution) =>
        inst.id === managerPanel?.id
          ? {
              ...inst,
              managers: (inst.managers ?? []).map((m) =>
                m.id === managerId ? { ...m, ...perms } : m,
              ),
            }
          : inst;
      setApprovedInst((p) => p.map(update));
      setManagerPanel((prev) => (prev ? update(prev) : null));
      setEditingManagerId(null);
    } catch (err) {
      setManagerError(
        err instanceof Error ? err.message : "Failed to update permissions.",
      );
    } finally {
      setManagerLoading(false);
    }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const q = userSearch.toLowerCase();
        return (
          (u.fullName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)) &&
          (userRoleFilter === "ALL" || u.role === userRoleFilter)
        );
      }),
    [users, userSearch, userRoleFilter],
  );

  const filteredInst = useMemo(
    () =>
      approvedInst.filter((i) => {
        const q = instSearch.toLowerCase();
        return (
          (i.name.toLowerCase().includes(q) ||
            i.country?.toLowerCase().includes(q) ||
            i.type?.toLowerCase().includes(q)) &&
          (instFilter === "ALL" ||
            (instFilter === "ACTIVE" && i.isActive) ||
            (instFilter === "SUSPENDED" && !i.isActive))
        );
      }),
    [approvedInst, instSearch, instFilter],
  );

  const filteredPrograms = useMemo(
    () =>
      programs.filter((p) => {
        const inst = Array.isArray(p.institution) ? p.institution[0] : null;
        const q = programSearch.toLowerCase();
        return (
          (p.title.toLowerCase().includes(q) ||
            inst?.name.toLowerCase().includes(q)) &&
          (programFilter === "ALL" ||
            (programFilter === "PUBLISHED" && p.isPublished) ||
            (programFilter === "DRAFT" && !p.isPublished))
        );
      }),
    [programs, programSearch, programFilter],
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter((j) => {
        const emp = Array.isArray(j.employer) ? j.employer[0] : null;
        const q = jobSearch.toLowerCase();
        return (
          (j.title.toLowerCase().includes(q) ||
            emp?.companyName.toLowerCase().includes(q)) &&
          (jobFilter === "ALL" ||
            (jobFilter === "ACTIVE" && j.isActive) ||
            (jobFilter === "INACTIVE" && !j.isActive))
        );
      }),
    [jobs, jobSearch, jobFilter],
  );

  const filteredLecturers = useMemo(() => {
    const q = lecturerSearch.toLowerCase();
    return approvedLecturers.filter((l) => {
      const p = getProfile(l.profile);
      return (
        p?.fullName?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q)
      );
    });
  }, [approvedLecturers, lecturerSearch]);

  const assignedLecturerIds = useMemo(
    () =>
      new Set(
        (managerPanel?.managers ?? [])
          .map((m) => {
            const l = Array.isArray(m.lecturer)
              ? m.lecturer[0]
              : (m.lecturer as any);
            return l?.id;
          })
          .filter(Boolean),
      ),
    [managerPanel],
  );

  // ── UI constants ──────────────────────────────────────────────────────────

  const roleColors: Record<string, string> = {
    STUDENT: "bg-blue-100 text-blue-700",
    LECTURER: "bg-violet-100 text-violet-700",
    INSTITUTION: "bg-teal-100 text-teal-700",
    EMPLOYER: "bg-orange-100 text-orange-700",
    ADMIN: "bg-red-100 text-red-700",
  };

  const totalPending = pendingInst.length + employers.length + lecturers.length;
  const totalRejected = rejectedLecturers.length + rejectedEmployers.length;

  const navItems: {
    id: TabType;
    label: string;
    icon: typeof Users;
    badge?: number;
  }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users, badge: users.length },
    {
      id: "institutions",
      label: "Approvals",
      icon: CheckCircle,
      badge: totalPending,
    },
    {
      id: "rejections",
      label: "Rejections",
      icon: XCircle,
      badge: totalRejected,
    },
    {
      id: "institutionList",
      label: "Institutions",
      icon: Building2,
      badge: approvedInst.length,
    },
    {
      id: "programs",
      label: "Programs",
      icon: BookOpen,
      badge: programs.length,
    },
    { id: "jobs", label: "Jobs", icon: Briefcase, badge: jobs.length },
  ];

  function ActionBtn({
    id,
    onClick,
    color,
    children,
  }: {
    id: string;
    onClick: () => void;
    color: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={loadingId === id}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${color}`}
      >
        {loadingId === id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }

  function PermSection({
    localPerms,
    setLocalPerms,
  }: {
    localPerms: ManagerPerms;
    setLocalPerms: React.Dispatch<React.SetStateAction<ManagerPerms>>;
  }) {
    return (
      <div className="space-y-2">
        <PermToggle
          label="Manage Programs"
          description="Create, edit and publish programs"
          value={localPerms.canManagePrograms}
          onChange={(v) =>
            setLocalPerms((p) => ({ ...p, canManagePrograms: v }))
          }
        />
        <PermToggle
          label="Edit Institution Profile"
          description="Update institution details and branding"
          value={localPerms.canEditProfile}
          onChange={(v) => setLocalPerms((p) => ({ ...p, canEditProfile: v }))}
        />
        <PermToggle
          label="View Analytics"
          description="Access enrollment and performance data"
          value={localPerms.canViewAnalytics}
          onChange={(v) =>
            setLocalPerms((p) => ({ ...p, canViewAnalytics: v }))
          }
        />
        <PermToggle
          label="Post Announcements"
          description="Publish announcements to students"
          value={localPerms.canPostAnnouncements}
          onChange={(v) =>
            setLocalPerms((p) => ({ ...p, canPostAnnouncements: v }))
          }
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} flex flex-col bg-slate-900 text-white transition-all duration-300 md:w-64`}
      >
        <div className="flex items-center gap-3 border-b border-slate-700 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">iNEXORA</p>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setManagerPanel(null);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activeTab === id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              {badge !== undefined && badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {managerPanel
                  ? `Managers — ${managerPanel.name}`
                  : activeTab === "overview"
                    ? "Dashboard Overview"
                    : activeTab === "institutions"
                      ? "Approvals"
                      : activeTab === "institutionList"
                        ? "Institutions"
                        : activeTab.charAt(0).toUpperCase() +
                          activeTab.slice(1)}
              </h1>
              <p className="text-xs text-slate-500">
                iNEXORA Platform Administration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {errorMsg && (
              <p className="max-w-xs truncate text-sm text-red-500">
                {errorMsg}
              </p>
            )}
            {totalPending > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {totalPending} pending
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* ══════ OVERVIEW ══════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Total Users",
                    value: users.length,
                    icon: Users,
                    bg: "bg-blue-50",
                    text: "text-blue-600",
                  },
                  {
                    label: "Institutions",
                    value: approvedInst.length,
                    icon: Building2,
                    bg: "bg-violet-50",
                    text: "text-violet-600",
                  },
                  {
                    label: "Programs",
                    value: programs.length,
                    icon: BookOpen,
                    bg: "bg-emerald-50",
                    text: "text-emerald-600",
                  },
                  {
                    label: "Job Listings",
                    value: jobs.length,
                    icon: Briefcase,
                    bg: "bg-orange-50",
                    text: "text-orange-600",
                  },
                ].map(({ label, value, icon: Icon, bg, text }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {value.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}
                      >
                        <Icon className={`h-6 w-6 ${text}`} />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>Active on platform</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-bold text-slate-900">Recent Signups</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {recentUsers.slice(0, 5).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {u.fullName?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {u.fullName ?? "Unknown"}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[u.role ?? ""] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {u.role ?? "unknown"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="font-bold text-slate-900">
                      Pending Approvals
                    </h2>
                    {totalPending > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                        {totalPending}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {totalPending === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                        <p className="text-sm font-medium text-slate-700">
                          All caught up!
                        </p>
                        <p className="text-xs text-slate-400">
                          No pending approvals at this time
                        </p>
                      </div>
                    ) : (
                      <>
                        {lecturers.slice(0, 2).map((lec) => {
                          const p = getProfile(lec.profile);
                          return (
                            <div
                              key={lec.id}
                              className="flex items-center gap-3 px-6 py-3"
                            >
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                {p?.fullName?.charAt(0).toUpperCase() ?? "?"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {lec.title ? `${lec.title} ` : ""}
                                  {p?.fullName ?? "Unknown"}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {p?.email}
                                </p>
                              </div>
                              <span className="flex-shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                Lecturer
                              </span>
                              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                Pending
                              </span>
                            </div>
                          );
                        })}
                        {employers.slice(0, 2).map((emp) => {
                          const p = getProfile(emp.profile);
                          return (
                            <div
                              key={emp.id}
                              className="flex items-center gap-3 px-6 py-3"
                            >
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                                {emp.companyName?.charAt(0).toUpperCase() ??
                                  "?"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {emp.companyName}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {p?.fullName} · {p?.email}
                                </p>
                              </div>
                              <span className="flex-shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                Employer
                              </span>
                              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                Pending
                              </span>
                            </div>
                          );
                        })}
                        {totalPending > 4 && (
                          <div className="px-6 py-3">
                            <button
                              onClick={() => setActiveTab("institutions")}
                              className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            >
                              View all {totalPending} pending approvals →
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ USERS ═════════════════════════════════════════════════ */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-9 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Student</option>
                    <option value="LECTURER">Lecturer</option>
                    <option value="EMPLOYER">Employer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {filteredUsers.length} users found
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {filteredUsers.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-slate-500">
                      No users match your search
                    </p>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-6 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${u.isActive ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-400"}`}
                          >
                            {u.fullName?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {u.fullName ?? "Unknown"}
                            </p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                            <p className="text-xs text-slate-400">
                              Joined{" "}
                              {new Date(u.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {/* In the Users tab, replace the ActionBtn section for suspend/reactivate and delete */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[u.role ?? ""] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {u.role ?? "unknown"}
                          </span>
                          {!u.isActive && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                              Suspended
                            </span>
                          )}
                          {u.awaitingSetup && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Awaiting profile setup
                            </span>
                          )}
                          {u.id === currentUserId ? (
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                              You
                            </span>
                          ) : (
                            <>
                              {/* Suspend/Reinstate button - now opens confirmation modal */}
                              <button
                                onClick={() =>
                                  handleSuspendUser(
                                    u.id,
                                    u.isActive,
                                    u.fullName ?? "this user",
                                  )
                                }
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 px-3 py-1.5 text-xs font-semibold transition ${
                                  u.isActive
                                    ? "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-100 hover:text-amber-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserX className="h-3.5 w-3.5" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Reinstate
                                  </>
                                )}
                              </button>

                              {/* Delete button - now opens confirmation modal */}
                              <button
                                onClick={() =>
                                  handleDeleteUser(
                                    u.id,
                                    u.fullName ?? "this user",
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════ APPROVALS ═════════════════════════════════════════════ */}
          {activeTab === "institutions" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Pending Lecturers",
                    value: lecturers.length,
                    icon: Users,
                    bg: "bg-blue-50",
                    text: "text-blue-600",
                    border: "border-blue-100",
                  },
                  {
                    label: "Pending Employers",
                    value: employers.length,
                    icon: Briefcase,
                    bg: "bg-orange-50",
                    text: "text-orange-600",
                    border: "border-orange-100",
                  },
                ].map(({ label, value, icon: Icon, bg, text, border }) => (
                  <div
                    key={label}
                    className={`rounded-xl border ${border} bg-white p-5 shadow-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {value}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}
                      >
                        <Icon className={`h-6 w-6 ${text}`} />
                      </div>
                    </div>
                    <p
                      className={`mt-3 text-xs font-medium ${value > 0 ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {value > 0 ? `${value} awaiting review` : "All caught up"}
                    </p>
                  </div>
                ))}
              </div>

              <ApprovalSection
                title="Pending Lecturer Approvals"
                count={lecturers.length}
                empty={<EmptyApproval label="No pending lecturer approvals" />}
              >
                {lecturers.map((lec) => {
                  const p = getProfile(lec.profile);
                  return (
                    <div
                      key={lec.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                          <Users className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {lec.title ? `${lec.title} ` : ""}
                            {p?.fullName ?? "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lec.specialization.slice(0, 2).join(", ")}{" "}
                            {p?.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            Applied{" "}
                            {new Date(lec.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <ActionBtn
                          id={lec.id}
                          onClick={() => handleApproveLecturer(lec.id)}
                          color="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </ActionBtn>
                        <ActionBtn
                          id={lec.id}
                          onClick={() => handleRejectLecturer(lec.id)}
                          color="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </ActionBtn>
                      </div>
                    </div>
                  );
                })}
              </ApprovalSection>

              <ApprovalSection
                title="Pending Employer Verifications"
                count={employers.length}
                empty={
                  <EmptyApproval label="No pending employer verifications" />
                }
              >
                {employers.map((emp) => {
                  const p = getProfile(emp.profile);
                  return (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                          <Briefcase className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {emp.companyName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {emp.industry} · {p?.fullName} · {p?.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            Applied{" "}
                            {new Date(emp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <ActionBtn
                          id={emp.id}
                          onClick={() => handleApproveEmployer(emp.id)}
                          color="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Verify
                        </ActionBtn>
                        <ActionBtn
                          id={emp.id}
                          onClick={() => handleRejectEmployer(emp.id)}
                          color="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </ActionBtn>
                      </div>
                    </div>
                  );
                })}
              </ApprovalSection>
            </div>
          )}

          {/* ══════ SUSPEND/REINSTATE USER CONFIRM ════════════════════════════════ */}
          {suspendConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      suspendConfirm.isActive
                        ? "bg-amber-100"
                        : "bg-emerald-100"
                    }`}
                  >
                    {suspendConfirm.isActive ? (
                      <UserX className="h-5 w-5 text-amber-600" />
                    ) : (
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {suspendConfirm.isActive
                      ? "Suspend User?"
                      : "Reinstate User?"}
                  </h3>
                </div>
                <p className="mb-6 text-sm text-slate-600">
                  {suspendConfirm.isActive ? (
                    <>
                      Suspend{" "}
                      <span className="font-semibold text-slate-900">
                        {suspendConfirm.name}
                      </span>
                      ? They will lose access to the platform until reinstated.
                    </>
                  ) : (
                    <>
                      Reinstate{" "}
                      <span className="font-semibold text-slate-900">
                        {suspendConfirm.name}
                      </span>
                      ? They will regain access to the platform.
                    </>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSuspendConfirm(null)}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      performSuspendUser(
                        suspendConfirm.id,
                        suspendConfirm.isActive,
                      )
                    }
                    disabled={loadingId === suspendConfirm.id}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                      suspendConfirm.isActive
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {loadingId === suspendConfirm.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {suspendConfirm.isActive
                      ? "Yes, Suspend"
                      : "Yes, Reinstate"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════ DELETE USER CONFIRM ═══════════════════════════════════════════ */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete User?
                  </h3>
                </div>
                <p className="mb-2 text-sm text-slate-600">
                  Permanently delete{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteConfirm.name}
                  </span>
                  ?
                </p>
                <p className="mb-6 text-xs text-red-500">
                  This action cannot be undone. All user data will be
                  permanently removed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => performDeleteUser(deleteConfirm.id)}
                    disabled={loadingId === `del-${deleteConfirm.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {loadingId === `del-${deleteConfirm.id}` && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Yes, Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════ INSTITUTION LIST ══════════════════════════════════════ */}
          {activeTab === "institutionList" && !managerPanel && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, country or type…"
                    value={instSearch}
                    onChange={(e) => setInstSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={instFilter}
                    onChange={(e) => setInstFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-9 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="ALL">All Institutions</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                  <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Institution
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {filteredInst.length} institutions found
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {filteredInst.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-slate-500">
                      No institutions match your search
                    </p>
                  ) : (
                    filteredInst.map((inst) => {
                      const managers = inst.managers ?? [];
                      const firstLec = managers[0]
                        ? Array.isArray(managers[0].lecturer)
                          ? managers[0].lecturer[0]
                          : ((managers[0].lecturer as any) ?? null)
                        : null;
                      const firstProfile = firstLec
                        ? getProfile(firstLec.profile)
                        : null;
                      const hasAccount =
                        Array.isArray(inst.account) && inst.account.length > 0;

                      return (
                        <div
                          key={inst.id}
                          className="flex items-center gap-4 px-6 py-4"
                        >
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${inst.isActive ? "bg-violet-100" : "bg-red-100"}`}
                          >
                            <Building2
                              className={`h-5 w-5 ${inst.isActive ? "text-violet-600" : "text-red-400"}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {inst.name}
                              </p>
                              {inst.type && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                  {inst.type}
                                </span>
                              )}
                              {!inst.isActive && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                                  Suspended
                                </span>
                              )}
                              {hasAccount && (
                                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                                  Account Active
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 text-xs text-slate-400">
                              {inst.country && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {inst.country}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <UserCog className="h-3 w-3" />
                                {managers.length === 0 ? (
                                  <span className="text-amber-500 italic">
                                    No manager
                                  </span>
                                ) : managers.length === 1 ? (
                                  <span>
                                    {firstProfile?.fullName ??
                                      "Manager assigned"}
                                  </span>
                                ) : (
                                  <span>{managers.length} managers</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                            <button
                              onClick={() => openEdit(inst)}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => openManagerPanel(inst)}
                              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              Managers
                              {managers.length > 0
                                ? ` (${managers.length})`
                                : ""}
                            </button>
                            {hasAccount ? (
                              <ActionBtn
                                id={`inst-del-acc-${inst.id}`}
                                onClick={() => setDeleteAccountConfirm(inst.id)}
                                color="bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Delete Account
                              </ActionBtn>
                            ) : (
                              <ActionBtn
                                id={`inst-acc-${inst.id}`}
                                onClick={() =>
                                  handleCreateInstitutionAccount(inst.id)
                                }
                                color="bg-teal-50 text-teal-700 hover:bg-teal-100"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Create Account
                              </ActionBtn>
                            )}
                            <ActionBtn
                              id={inst.id}
                              onClick={() =>
                                handleSuspendInst(inst.id, inst.isActive)
                              }
                              color={
                                inst.isActive
                                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }
                            >
                              {inst.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Reactivate
                                </>
                              )}
                            </ActionBtn>
                            <ActionBtn
                              id={`del-inst-${inst.id}`}
                              onClick={() => handleDeleteInst(inst.id)}
                              color="bg-red-600 text-white hover:bg-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </ActionBtn>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════ MANAGER PANEL ═════════════════════════════════════════ */}
          {activeTab === "institutionList" && managerPanel && (
            <div className="space-y-5">
              <button
                onClick={closeManagerPanel}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Institutions
              </button>

              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                  <Building2 className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {managerPanel.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {[managerPanel.type, managerPanel.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="font-bold text-slate-900">
                      Current Managers
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {(managerPanel.managers ?? []).length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(managerPanel.managers ?? []).length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <UserCog className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                        <p className="font-medium text-slate-600">
                          No managers yet
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Assign an approved lecturer using the panel on the
                          right.
                        </p>
                      </div>
                    ) : (
                      (managerPanel.managers ?? []).map((mgr) => {
                        const lec = Array.isArray(mgr.lecturer)
                          ? mgr.lecturer[0]
                          : ((mgr.lecturer as any) ?? null);
                        const profile = lec ? getProfile(lec.profile) : null;
                        const isEditing = editingManagerId === mgr.id;
                        return (
                          <div key={mgr.id} className="space-y-3 p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                                  {profile?.fullName?.charAt(0).toUpperCase() ??
                                    "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {lec?.title ? `${lec.title} ` : ""}
                                    {profile?.fullName ?? "Unknown"}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {profile?.email}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    Assigned{" "}
                                    {new Date(
                                      mgr.assignedAt,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingManagerId(null);
                                    } else {
                                      setEditingManagerId(mgr.id);
                                      setPerms({
                                        canEditProfile: mgr.canEditProfile,
                                        canManagePrograms:
                                          mgr.canManagePrograms,
                                        canViewAnalytics: mgr.canViewAnalytics,
                                        canPostAnnouncements:
                                          mgr.canPostAnnouncements,
                                      });
                                    }
                                  }}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    isEditing
                                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                                >
                                  {isEditing ? (
                                    "Cancel"
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Pencil className="h-3 w-3" />
                                      Permissions
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRemoveManager(mgr.id)}
                                  disabled={managerLoading}
                                  className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                >
                                  {managerLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserX className="h-3 w-3" />
                                  )}
                                  Remove
                                </button>
                              </div>
                            </div>
                            {!isEditing && (
                              <div className="flex flex-wrap gap-1.5 pl-12">
                                {[
                                  {
                                    label: "Programs",
                                    val: mgr.canManagePrograms,
                                  },
                                  {
                                    label: "Edit Profile",
                                    val: mgr.canEditProfile,
                                  },
                                  {
                                    label: "Analytics",
                                    val: mgr.canViewAnalytics,
                                  },
                                  {
                                    label: "Announcements",
                                    val: mgr.canPostAnnouncements,
                                  },
                                ].map(({ label, val }) => (
                                  <span
                                    key={label}
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${val ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                            {isEditing && (
                              <div className="space-y-2 pl-12">
                                <PermSection
                                  localPerms={perms}
                                  setLocalPerms={setPerms}
                                />
                                {managerError && (
                                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                                    {managerError}
                                  </p>
                                )}
                                <button
                                  onClick={() => handleUpdatePerms(mgr.id)}
                                  disabled={managerLoading}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {managerLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                  Save Permissions
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="font-bold text-slate-900">
                      Assign a Manager
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Set permissions below, then pick an approved lecturer
                    </p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email…"
                        value={lecturerSearch}
                        onChange={(e) => setLecturerSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        Permissions for new assignment
                      </p>
                      <PermSection
                        localPerms={perms}
                        setLocalPerms={setPerms}
                      />
                    </div>
                    {managerError && !editingManagerId && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        {managerError}
                      </p>
                    )}
                    <div className="max-h-64 divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-100">
                      {filteredLecturers.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-400">
                          {lecturerSearch
                            ? "No lecturers match your search"
                            : "No approved lecturers available"}
                        </p>
                      ) : (
                        filteredLecturers.map((lec) => {
                          const p = getProfile(lec.profile);
                          const already = assignedLecturerIds.has(lec.id);
                          return (
                            <div
                              key={lec.id}
                              className="flex items-center justify-between px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                  {p?.fullName?.charAt(0).toUpperCase() ?? "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {lec.title ? `${lec.title} ` : ""}
                                    {p?.fullName ?? "Unknown"}
                                  </p>
                                  <p className="truncate text-xs text-slate-400">
                                    {p?.email}
                                  </p>
                                </div>
                              </div>
                              {already ? (
                                <span className="ml-2 flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  Assigned
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAssign(lec.id)}
                                  disabled={managerLoading}
                                  className="ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {managerLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  )}
                                  Assign
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ REJECTIONS ════════════════════════════════════════════ */}
          {activeTab === "rejections" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Rejected Lecturers",
                    value: rejectedLecturers.length,
                    icon: Users,
                    bg: "bg-violet-50",
                    text: "text-violet-600",
                    border: "border-violet-100",
                  },
                  {
                    label: "Rejected Employers",
                    value: rejectedEmployers.length,
                    icon: Briefcase,
                    bg: "bg-orange-50",
                    text: "text-orange-600",
                    border: "border-orange-100",
                  },
                ].map(({ label, value, icon: Icon, bg, text, border }) => (
                  <div
                    key={label}
                    className={`rounded-xl border ${border} bg-white p-5 shadow-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">
                          {value}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}
                      >
                        <Icon className={`h-6 w-6 ${text}`} />
                      </div>
                    </div>
                    <p
                      className={`mt-3 text-xs font-medium ${value > 0 ? "text-red-500" : "text-emerald-600"}`}
                    >
                      {value > 0
                        ? `${value} previously rejected`
                        : "No rejections"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h2 className="font-bold text-slate-900">
                    Rejected Lecturers
                  </h2>
                  {rejectedLecturers.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      {rejectedLecturers.length}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  {rejectedLecturers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <XCircle className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                      <p className="font-medium text-slate-900">
                        No rejected lecturers
                      </p>
                      <p className="text-sm text-slate-500">
                        Rejected applications will appear here
                      </p>
                    </div>
                  ) : (
                    rejectedLecturers.map((lec) => {
                      const p = getProfile(lec.profile);
  const displayName = p?.fullName ?? "this user";
                      return (
                        <div
                          key={lec.id}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                              <Users className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {lec.title ? `${lec.title} ` : ""}
                                {p?.fullName ?? "Unknown"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {lec.specialization?.slice(0, 2).join(", ")} ·{" "}
                                {p?.email}
                              </p>
                              <p className="text-xs text-slate-400">
                                Applied{" "}
                                {new Date(lec.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ActionBtn
                              id={lec.id}
                              onClick={() => handleReApproveLecturer(lec.id)}
                              color="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Re-approve
                            </ActionBtn>
                            <ActionBtn
                              id={`del-${lec.id}`}
                              onClick={() => handleDeleteUser(lec.profileId, displayName)}
                              color="bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </ActionBtn>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h2 className="font-bold text-slate-900">
                    Rejected Employers
                  </h2>
                  {rejectedEmployers.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      {rejectedEmployers.length}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  {rejectedEmployers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <XCircle className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                      <p className="font-medium text-slate-900">
                        No rejected employers
                      </p>
                      <p className="text-sm text-slate-500">
                        Rejected applications will appear here
                      </p>
                    </div>
                  ) : (
                    rejectedEmployers.map((emp) => {
                      const p = getProfile(emp.profile);
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                              <Briefcase className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {emp.companyName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {emp.industry} · {p?.fullName} · {p?.email}
                              </p>
                              <p className="text-xs text-slate-400">
                                Applied{" "}
                                {new Date(emp.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ActionBtn
                              id={emp.id}
                              onClick={() => handleReApproveEmployer(emp.id)}
                              color="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Re-approve
                            </ActionBtn>
                            <ActionBtn
                              id={`del-${emp.id}`}
                              onClick={() => handleDeleteUser(emp.profileId, emp.companyName ?? "this employer")}
                              color="bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </ActionBtn>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════ PROGRAMS ══════════════════════════════════════════════ */}
          {activeTab === "programs" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search programs…"
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-9 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="ALL">All Programs</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                  <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {filteredPrograms.length} programs found
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {filteredPrograms.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-slate-500">
                      No programs match your search
                    </p>
                  ) : (
                    filteredPrograms.map((program) => {
                      const inst = Array.isArray(program.institution)
                        ? program.institution[0]
                        : (program.institution as { name: string } | null);
                      return (
                        <div
                          key={program.id}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                              <BookOpen className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {program.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {inst?.name ?? "Unknown"} ·{" "}
                                {new Date(
                                  program.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${program.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {program.isPublished ? "Published" : "Draft"}
                            </span>
                            <ActionBtn
                              id={program.id}
                              onClick={() =>
                                handleToggleProgram(
                                  program.id,
                                  program.isPublished,
                                )
                              }
                              color={
                                program.isPublished
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }
                            >
                              {program.isPublished ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" />
                                  Publish
                                </>
                              )}
                            </ActionBtn>
                            <ActionBtn
                              id={`del-${program.id}`}
                              onClick={() => handleDeleteProgram(program.id)}
                              color="bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </ActionBtn>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════ JOBS ══════════════════════════════════════════════════ */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search jobs or employers…"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 py-2.5 pr-8 pl-9 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="ALL">All Jobs</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {filteredJobs.length} jobs found
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {filteredJobs.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-slate-500">
                      No jobs match your search
                    </p>
                  ) : (
                    filteredJobs.map((job) => {
                      const emp = Array.isArray(job.employer)
                        ? job.employer[0]
                        : null;
                      return (
                        <div
                          key={job.id}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                              <Briefcase className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {job.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {emp?.companyName ?? "Unknown"} ·{" "}
                                {job.type.replace("_", " ")} ·{" "}
                                {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${job.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {job.isActive ? "Active" : "Inactive"}
                            </span>
                            <ActionBtn
                              id={job.id}
                              onClick={() =>
                                handleToggleJob(job.id, job.isActive)
                              }
                              color={
                                job.isActive
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }
                            >
                              {job.isActive ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" />
                                  Activate
                                </>
                              )}
                            </ActionBtn>
                            <ActionBtn
                              id={`del-${job.id}`}
                              onClick={() => handleDeleteJob(job.id)}
                              color="bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </ActionBtn>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══════ INSTITUTION CREATE / EDIT MODAL ══════════════════════════ */}
      {instModal !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {instModal === "create"
                    ? "Create New Institution"
                    : `Edit — ${editingInst?.name}`}
                </h2>
              </div>
              <button
                onClick={closeInstModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInstSubmit} className="space-y-4 p-6">
              <Field label="Institution Name" required>
                <input
                  type="text"
                  value={instForm.name}
                  placeholder="e.g. University of Colombo"
                  onChange={(e) =>
                    setInstForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <div className="relative">
                    <select
                      value={instForm.type}
                      onChange={(e) =>
                        setInstForm((f) => ({ ...f, type: e.target.value }))
                      }
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      <option value="">Select type…</option>
                      {INSTITUTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
                <Field label="Country">
                  <input
                    type="text"
                    value={instForm.country}
                    placeholder="e.g. Sri Lanka"
                    onChange={(e) =>
                      setInstForm((f) => ({ ...f, country: e.target.value }))
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Email">
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={instForm.email}
                    placeholder="admin@institution.edu"
                    onChange={(e) =>
                      setInstForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Website">
                <div className="relative">
                  <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={instForm.website}
                    placeholder="https://…"
                    onChange={(e) =>
                      setInstForm((f) => ({ ...f, website: e.target.value }))
                    }
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Description">
                <textarea
                  value={instForm.description}
                  rows={3}
                  placeholder="Short description…"
                  onChange={(e) =>
                    setInstForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={`${inputCls} resize-none`}
                />
              </Field>
              {instFormError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {instFormError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeInstModal}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={instFormLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {instFormLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {instModal === "create"
                    ? "Create Institution"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ DELETE INSTITUTION ACCOUNT CONFIRM ═══════════════════════ */}
      {deleteAccountConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <UserX className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">
                Delete Institution Account?
              </h3>
            </div>
            <p className="mb-2 text-slate-600">
              This will permanently delete the login account for{" "}
              <span className="font-semibold text-slate-900">
                {approvedInst.find((i) => i.id === deleteAccountConfirm)
                  ?.name ?? "this institution"}
              </span>
              .
            </p>
            <p className="mb-6 text-sm text-red-600">
              The institution will immediately lose access to the platform.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAccountConfirm(null)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleDeleteInstitutionAccount(deleteAccountConfirm)
                }
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ SIGN OUT CONFIRM ══════════════════════════════════════════ */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Sign Out?</h3>
            </div>
            <p className="mb-6 text-slate-600">
              Are you sure you want to sign out of the admin panel?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
