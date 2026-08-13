"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import JobForm from "../../_components/JobForm";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = api.job.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Job listing not found.</p>
      </div>
    );
  }

  return <JobForm mode="edit" jobId={id} initialData={job} />;
}
