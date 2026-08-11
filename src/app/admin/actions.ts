"use server";

import { createAdminClient } from "~/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { db } from "~/server/db";

// ── Users ──────────────────────────────────────────────────────────────────

export async function suspendUser(profileId: string) {
  const supabase = createAdminClient();

  // Suspend the profile, and if this user is a lecturer, sync their
  // approvalStatus too — independent of each other, run concurrently.
  await Promise.all([
    db.profile.update({
      where: { id: profileId },
      data: { isActive: false },
    }),
    db.lecturer.updateMany({
      where: { profileId },
      data: { approvalStatus: "SUSPENDED" },
    }),
  ]);

  // Block login
  await supabase.auth.admin.updateUserById(profileId, {
    ban_duration: "876600h",
  });

  revalidatePath("/admin");
}

export async function reactivateUser(profileId: string) {
  const supabase = createAdminClient();

  // Reactivate the profile, and if lecturer, restore approvalStatus —
  // independent of each other, run concurrently.
  await Promise.all([
    db.profile.update({
      where: { id: profileId },
      data: { isActive: true },
    }),
    db.lecturer.updateMany({
      where: { profileId },
      data: { approvalStatus: "APPROVED" },
    }),
  ]);

  // Unban
  await supabase.auth.admin.updateUserById(profileId, {
    ban_duration: "none",
  });

  revalidatePath("/admin");
}

export async function deleteUser(id: string) {
  const supabase = createAdminClient();

  // A profile is at most one of Student/Lecturer/Employer — these three
  // lookups are independent, run them concurrently.
  const [{ data: students }, { data: lecturers }, { data: employers }] = await Promise.all([
    supabase.from("Student").select("id").eq("profileId", id),
    supabase.from("Lecturer").select("id").eq("profileId", id),
    supabase.from("Employer").select("id").eq("profileId", id),
  ]);

  const student = students?.[0] ?? null;
  const lecturer = lecturers?.[0] ?? null;
  const employer = employers?.[0] ?? null;

  async function cleanupStudent() {
    if (!student) return;
    await Promise.all([
      supabase.from("AssessmentSubmission").delete().eq("studentId", student.id),
      supabase.from("JobApplication").delete().eq("studentId", student.id),
    ]);

    const { data: enrollments } = await supabase
      .from("Enrollment")
      .select("id")
      .eq("studentId", student.id);

    if (enrollments && enrollments.length > 0) {
      const enrollmentIds = enrollments.map((e) => e.id);
      // Children of Enrollment must go before Enrollment itself, but the
      // three child tables are independent of each other.
      await Promise.all([
        supabase.from("CourseEnrollment").delete().in("enrollmentId", enrollmentIds),
        supabase.from("Credential").delete().in("enrollmentId", enrollmentIds),
        supabase.from("Payment").delete().in("enrollmentId", enrollmentIds),
      ]);
      await supabase.from("Enrollment").delete().eq("studentId", student.id);
    }

    await supabase.from("Credential").delete().eq("studentId", student.id);
    await supabase.from("Student").delete().eq("profileId", id);
  }

  async function cleanupLecturer() {
    if (!lecturer) return;
    // Both leaf children of Lecturer, independent of each other.
    await Promise.all([
      supabase.from("InstitutionManager").delete().eq("lecturerId", lecturer.id),
      supabase.from("CourseLecturer").delete().eq("lecturerId", lecturer.id),
    ]);
    await supabase.from("Lecturer").delete().eq("profileId", id);
  }

  async function cleanupEmployer() {
    if (!employer) return;
    const { data: jobs } = await supabase
      .from("JobListing")
      .select("id")
      .eq("employerId", employer.id);

    if (jobs && jobs.length > 0) {
      const jobIds = jobs.map((j) => j.id);
      await supabase.from("JobApplication").delete().in("jobId", jobIds);
      await supabase.from("JobListing").delete().eq("employerId", employer.id);
    }

    await supabase.from("Employer").delete().eq("profileId", id);
  }

  // The three role-specific cleanups (disjoint id spaces) and the five
  // profile-scoped leaf-table deletes are all independent of each other —
  // only the final Profile delete needs everything above to finish first.
  await Promise.all([
    cleanupStudent(),
    cleanupLecturer(),
    cleanupEmployer(),
    supabase.from("Notification").delete().eq("profileId", id),
    supabase.from("Subscription").delete().eq("profileId", id),
    supabase.from("Payment").delete().eq("profileId", id),
    supabase.from("Announcement").delete().eq("publishedBy", id),
    supabase.from("InstitutionAccount").delete().eq("profileId", id),
  ]);

  await supabase.from("Profile").delete().eq("id", id);

  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError && !authError.message.includes("User not found")) {
    throw new Error(authError.message);
  }

  revalidatePath("/admin");
}

// ── Lecturers ──────────────────────────────────────────────────────────────

export async function approveLecturer(id: string) {
  const supabase = createAdminClient();

  const { data: lec, error: fetchError } = await supabase
    .from("Lecturer")
    .select("profileId")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Independent of each other once profileId is known — run concurrently.
  const [{ error: profileError }, { error }] = await Promise.all([
    supabase
      .from("Profile")
      .update({ isActive: true, isVerified: true })
      .eq("id", lec.profileId),
    supabase
      .from("Lecturer")
      .update({ approvalStatus: "APPROVED" })
      .eq("id", id),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function rejectLecturer(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Lecturer")
    .update({ approvalStatus: "REJECTED" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ── Institutions ───────────────────────────────────────────────────────────

export async function approveInstitution(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Institution")
    .update({ isVerified: true, isActive: true, approvalStatus: "APPROVED" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function rejectInstitution(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Institution")
    .update({ isActive: false, approvalStatus: "REJECTED" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function suspendInstitution(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Institution")
    .update({ isActive: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function reactivateInstitution(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Institution")
    .update({ isActive: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteInstitution(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("Institution").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createInstitution(data: {
  name: string;
  type: string;
  country: string;
  email?: string;
  city?: string;
  website?: string;
  description?: string;
}) {
  const supabase = createAdminClient();

  const baseSlug = data.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: newInst, error } = await supabase
    .from("Institution")
    .insert({
      id: crypto.randomUUID(),
      name: data.name,
      slug,
      type: data.type,
      country: data.country,
      city: data.city ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      description: data.description ?? null,
      isActive: true,
      isVerified: true,
      approvalStatus: "APPROVED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return newInst;
}

export async function updateInstitution(
  id: string,
  data: {
    name?: string;
    type?: string;
    country?: string;
    city?: string;
    email?: string;
    website?: string;
    description?: string;
  },
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Institution")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createInstitutionAccount(institutionId: string) {
  const supabase = createAdminClient();

  const { data: institution, error: instError } = await supabase
    .from("Institution")
    .select("id, name, email")
    .eq("id", institutionId)
    .single();

  if (instError || !institution) throw new Error("Institution not found");
  if (!institution.email) throw new Error("Institution has no email address set");

  const { data: existing } = await supabase
    .from("InstitutionAccount")
    .select("id")
    .eq("institutionId", institutionId)
    .maybeSingle();

  if (existing) throw new Error("Account already exists for this institution");

  let userId: string;

  const { data: { users } } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existingAuthUser = users?.find((u) => u.email === institution.email) ?? null;

  if (existingAuthUser) {
    userId = existingAuthUser.id;
    if (!userId) throw new Error("Existing auth user has no id");
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: institution.name, role: "INSTITUTION" },
    });
  } else {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: institution.email,
      email_confirm: true,
      user_metadata: { full_name: institution.name, role: "INSTITUTION" },
    });
    if (authError) throw new Error(authError.message);
    if (!authData.user?.id) throw new Error("Auth user creation returned no id");
    userId = authData.user.id;
  }

  const { data: existingProfile } = await supabase
    .from("Profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    await supabase.from("Profile").update({
      isActive: true,
      isVerified: true,
      fullName: institution.name,
      role: "INSTITUTION",
    }).eq("id", userId);
  } else {
    const { error: profileCreateError } = await supabase.from("Profile").insert({
      id: userId,
      email: institution.email,
      fullName: institution.name,
      role: "INSTITUTION",
      isActive: true,
      isVerified: true,
      is_admin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (profileCreateError) throw new Error(profileCreateError.message);
  }

  const { error: accError } = await supabase
    .from("InstitutionAccount")
    .insert({
      id: crypto.randomUUID(),
      profileId: userId,
      institutionId: institutionId,
    });

  if (accError) throw new Error(accError.message);

  // Generate recovery link for admin to share manually
  const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: institution.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
    },
  });
  
  if (resetError) {
    await supabase.from("InstitutionAccount").delete().eq("institutionId", institutionId);
    await supabase.from("Profile").delete().eq("id", userId);
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(resetError.message);
  }

  revalidatePath("/admin");
  return { link: linkData.properties?.action_link };
}

export async function deleteInstitutionAccount(institutionId: string) {
  const supabase = createAdminClient();

  const { data: account } = await supabase
    .from("InstitutionAccount")
    .select("profileId")
    .eq("institutionId", institutionId)
    .maybeSingle();

  if (!account) throw new Error("No account found for this institution");

  await supabase.from("InstitutionAccount").delete().eq("institutionId", institutionId);
  await supabase.from("Profile").delete().eq("id", account.profileId);

  const { error: authError } = await supabase.auth.admin.deleteUser(account.profileId);
  if (authError && !authError.message.includes("User not found")) {
    throw new Error(authError.message);
  }

  revalidatePath("/admin");
}

// ── Employers ──────────────────────────────────────────────────────────────

export async function approveEmployer(id: string) {
  const supabase = createAdminClient();

  const { data: emp, error: fetchError } = await supabase
    .from("Employer")
    .select("profileId")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Independent of each other once profileId is known — run concurrently.
  const [{ error: profileError }, { error }] = await Promise.all([
    supabase
      .from("Profile")
      .update({ isActive: true, isVerified: true })
      .eq("id", emp.profileId),
    supabase
      .from("Employer")
      .update({ isVerified: true, approvalStatus: "APPROVED" })
      .eq("id", id),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function rejectEmployer(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Employer")
    .update({ isVerified: false, approvalStatus: "REJECTED" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ── Re-approve rejected ────────────────────────────────────────────────────

export async function reApproveLecturer(id: string) {
  const supabase = createAdminClient();

  const { data: lec, error: fetchError } = await supabase
    .from("Lecturer")
    .select("profileId")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Independent of each other once profileId is known — run concurrently.
  const [{ error: profileError }, { error }] = await Promise.all([
    supabase
      .from("Profile")
      .update({ isActive: true, isVerified: true })
      .eq("id", lec.profileId),
    supabase
      .from("Lecturer")
      .update({ approvalStatus: "APPROVED" })
      .eq("id", id),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function reApproveEmployer(id: string) {
  const supabase = createAdminClient();

  const { data: emp, error: fetchError } = await supabase
    .from("Employer")
    .select("profileId")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Independent of each other once profileId is known — run concurrently.
  const [{ error: profileError }, { error }] = await Promise.all([
    supabase
      .from("Profile")
      .update({ isActive: true, isVerified: true })
      .eq("id", emp.profileId),
    supabase
      .from("Employer")
      .update({ isVerified: true, approvalStatus: "APPROVED" })
      .eq("id", id),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// ── Programs ───────────────────────────────────────────────────────────────

export async function toggleProgram(id: string, current: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Program")
    .update({ isPublished: !current })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteProgram(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("Program").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ── Jobs ───────────────────────────────────────────────────────────────────

export async function toggleJob(id: string, current: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("JobListing")
    .update({ isActive: !current })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteJob(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("JobListing").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ── Institution Managers ───────────────────────────────────────────────────

export async function assignManager(data: {
  institutionId: string;
  lecturerId: string;
  canEditProfile?: boolean;
  canManagePrograms?: boolean;
  canViewAnalytics?: boolean;
  canPostAnnouncements?: boolean;
  assignedBy?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("InstitutionManager").insert({
    id: crypto.randomUUID(),
    institutionId: data.institutionId,
    lecturerId: data.lecturerId,
    canEditProfile: data.canEditProfile ?? false,
    canManagePrograms: data.canManagePrograms ?? true,
    canViewAnalytics: data.canViewAnalytics ?? true,
    canPostAnnouncements: data.canPostAnnouncements ?? false,
    assignedAt: new Date().toISOString(),
    assignedBy: data.assignedBy ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function removeManager(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("InstitutionManager")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateManagerPermissions(
  id: string,
  perms: {
    canEditProfile: boolean;
    canManagePrograms: boolean;
    canViewAnalytics: boolean;
    canPostAnnouncements: boolean;
  },
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("InstitutionManager")
    .update(perms)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}