-- =============================================================================
-- iNEXORA — Supabase Setup Script (IDEMPOTENT)
-- Safe to run multiple times — will not error if already applied.
-- Run this in Supabase SQL Editor after every `prisma migrate reset`.
-- Keep this file in sync with schema.prisma
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMA GRANTS
-- GRANT statements are naturally idempotent — safe to re-run anytime.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUTH TRIGGER
-- DROP IF EXISTS + CREATE OR REPLACE = always safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Read role from signup metadata, default to STUDENT
  user_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'STUDENT');

  -- Guard against unexpected role values
  IF user_role NOT IN ('STUDENT', 'LECTURER', 'EMPLOYER', 'INSTITUTION', 'ADMIN') THEN
    user_role := 'STUDENT';
  END IF;

  INSERT INTO public."Profile" (
    id, email, "fullName", role,
    "isVerified", "isActive", is_admin,
    "createdAt", "updatedAt"
  )
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role::public."Role",
    false,
    -- isActive means "not suspended by an admin" and must start true for
    -- every role. Lecturer/employer/institution moderation is gated by
    -- their own approvalStatus columns, NOT by isActive — starting it
    -- false makes the middleware treat new signups as suspended and lock
    -- them out before they can even complete profile setup.
    true,
    CASE WHEN user_role = 'ADMIN' THEN true ELSE false END,
    NOW(), NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent natively.
-- CREATE POLICY is NOT — wrapped in DO blocks to skip if already exists.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: drops a policy only if it exists (used to cleanly replace outdated ones)
-- Usage pattern: DROP then CREATE inside the same DO block.

-- ── Profile ──────────────────────────────────────────────────────────────────

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own profile" ON "Profile"
    FOR SELECT TO authenticated
    USING (id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON "Profile"
    FOR UPDATE TO authenticated
    USING (id = auth.uid()::text)
    WITH CHECK (id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Student ───────────────────────────────────────────────────────────────────

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can insert own student profile" ON "Student"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own student profile" ON "Student"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own student profile" ON "Student"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "profileId")
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── StudentQualification ──────────────────────────────────────────────────────
-- Prior-education entries collected as a repeatable list in profile-setup's
-- Education step. Profile-setup writes replace the whole list wholesale
-- (delete-then-insert), so students need SELECT/INSERT/DELETE.

ALTER TABLE "StudentQualification" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own qualifications" ON "StudentQualification"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own qualifications" ON "StudentQualification"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can delete own qualifications" ON "StudentQualification"
    FOR DELETE TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Lecturer ──────────────────────────────────────────────────────────────────

ALTER TABLE "Lecturer" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can insert own lecturer profile" ON "Lecturer"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own lecturer profile" ON "Lecturer"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own lecturer profile" ON "Lecturer"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "profileId")
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Employer ──────────────────────────────────────────────────────────────────

ALTER TABLE "Employer" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can insert own employer profile" ON "Employer"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own employer profile" ON "Employer"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own employer profile" ON "Employer"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "profileId")
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Institution ───────────────────────────────────────────────────────────────
-- No INSERT policy — institution creation must go through a server-side route
-- using the service role (needs atomic Institution + InstitutionAccount creation).

ALTER TABLE "Institution" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Institution admins can read own institution" ON "Institution"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount"
        WHERE "InstitutionAccount"."institutionId" = "Institution".id
          AND "InstitutionAccount"."profileId" = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Institution admins can update own institution" ON "Institution"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount"
        WHERE "InstitutionAccount"."institutionId" = "Institution".id
          AND "InstitutionAccount"."profileId" = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── InstitutionAccount ────────────────────────────────────────────────────────

ALTER TABLE "InstitutionAccount" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own institution account" ON "InstitutionAccount"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own institution account" ON "InstitutionAccount"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Enrollment ────────────────────────────────────────────────────────────────

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own enrollments" ON "Enrollment"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (
        SELECT "profileId" FROM "Student" WHERE id = "studentId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── Credential ────────────────────────────────────────────────────────────────

ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own credentials" ON "Credential"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (
        SELECT "profileId" FROM "Student" WHERE id = "studentId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE POLICIES — library-resources bucket
-- Bucket must exist in Supabase Storage dashboard before running this.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload to library"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'library-resources');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access to library"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'library-resources');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can delete from library"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'library-resources');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BACKFILL — only needed if OAuth users signed up before the trigger existed
-- Uncomment and run manually when needed. Safe to run multiple times (LEFT JOIN guard).
-- ─────────────────────────────────────────────────────────────────────────────

-- INSERT INTO public."Profile" (id, email, "fullName", role, "isVerified", "isActive", is_admin, "createdAt", "updatedAt")
-- SELECT
--   u.id::text,
--   COALESCE(u.email, ''),
--   COALESCE(u.raw_user_meta_data->>'full_name', ''),
--   COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'role'), ''), 'STUDENT')::public."Role",
--   false, true, false,
--   NOW(), NOW()
-- FROM auth.users u
-- LEFT JOIN public."Profile" p ON p.id = u.id::text
-- WHERE p.id IS NULL;

-- =============================================================================
-- iNEXORA — Complete RLS Policy Expansion (IDEMPOTENT)
-- Run this in Supabase SQL Editor, then add to setup.sql and migration.
-- Covers all tables not yet protected + fills gaps on existing ones.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: Admin bypass
-- Admins can read/write everything. Applied to every table.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Profile (gaps: admin bypass) ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can read all profiles" ON "Profile"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all profiles" ON "Profile"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Student (gaps: admin bypass) ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can read all students" ON "Student"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Lecturer (gaps: admin bypass, public read for discovery) ─────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can read all lecturers" ON "Lecturer"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can read own lecturers" ON "Lecturer"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "Lecturer"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Employer (gaps: admin bypass) ────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can read all employers" ON "Employer"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Enrollment (gaps: INSERT, UPDATE, admin bypass) ──────────────────────────

DO $$ BEGIN
  CREATE POLICY "Students can insert own enrollment" ON "Enrollment"
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid()::text = (SELECT "profileId" FROM "Student" WHERE id = "studentId")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can read own program enrollments" ON "Enrollment"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        JOIN "Program" prog ON prog."institutionId" = ia."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND prog.id = "Enrollment"."programId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all enrollments" ON "Enrollment"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all enrollments" ON "Enrollment"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Credential (gaps: INSERT, admin bypass) ───────────────────────────────────

ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read all credentials" ON "Credential"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Institution (gaps: admin bypass) ─────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can read all institutions" ON "Institution"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all institutions" ON "Institution"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert institutions" ON "Institution"
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete institutions" ON "Institution"
    FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── InstitutionManager ────────────────────────────────────────────────────────

ALTER TABLE "InstitutionManager" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Institution can read own managers" ON "InstitutionManager"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "InstitutionManager"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Lecturers can read own manager assignments" ON "InstitutionManager"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (SELECT "profileId" FROM "Lecturer" WHERE id = "lecturerId")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all institution managers" ON "InstitutionManager"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Program ───────────────────────────────────────────────────────────────────

ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read published programs" ON "Program"
    FOR SELECT TO authenticated
    USING ("isPublished" = true AND "isActive" = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can read own programs" ON "Program"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "Program"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can insert own programs" ON "Program"
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "Program"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can update own programs" ON "Program"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "Program"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Lecturers can read programs they created" ON "Program"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (SELECT "profileId" FROM "Lecturer" WHERE id = "Program"."createdById")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all programs" ON "Program"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Course ────────────────────────────────────────────────────────────────────

ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read published courses" ON "Course"
    FOR SELECT TO authenticated
    USING ("isPublished" = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own courses" ON "Course"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Program" prog
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND prog.id = "Course"."programId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Lecturers can read own courses" ON "Course"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (SELECT "profileId" FROM "Lecturer" WHERE id = "Course"."createdById")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all courses" ON "Course"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CourseSection ─────────────────────────────────────────────────────────────

ALTER TABLE "CourseSection" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enrolled students can read course sections" ON "CourseSection"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "CourseEnrollment" ce
        WHERE ce."courseId" = "CourseSection"."courseId"
          AND ce."studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own course sections" ON "CourseSection"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Course" c
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND c.id = "CourseSection"."courseId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all course sections" ON "CourseSection"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CourseResource ────────────────────────────────────────────────────────────

ALTER TABLE "CourseResource" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enrolled students can read course resources" ON "CourseResource"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "CourseEnrollment" ce
        WHERE ce."courseId" = "CourseResource"."courseId"
          AND ce."studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own course resources" ON "CourseResource"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Course" c
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND c.id = "CourseResource"."courseId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all course resources" ON "CourseResource"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CourseEnrollment ──────────────────────────────────────────────────────────

ALTER TABLE "CourseEnrollment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own course enrollments" ON "CourseEnrollment"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can read own course enrollments" ON "CourseEnrollment"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Course" c
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND c.id = "CourseEnrollment"."courseId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all course enrollments" ON "CourseEnrollment"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CourseLecturer ────────────────────────────────────────────────────────────

ALTER TABLE "CourseLecturer" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Lecturers can read own course assignments" ON "CourseLecturer"
    FOR SELECT TO authenticated
    USING (
      auth.uid()::text = (SELECT "profileId" FROM "Lecturer" WHERE id = "lecturerId")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own course lecturers" ON "CourseLecturer"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Course" c
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND c.id = "CourseLecturer"."courseId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all course lecturers" ON "CourseLecturer"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Assessment ────────────────────────────────────────────────────────────────

ALTER TABLE "Assessment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enrolled students can read assessments" ON "Assessment"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "CourseEnrollment" ce
        WHERE ce."courseId" = "Assessment"."courseId"
          AND ce."studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own assessments" ON "Assessment"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Course" c
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND c.id = "Assessment"."courseId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all assessments" ON "Assessment"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── AssessmentSubmission ──────────────────────────────────────────────────────

ALTER TABLE "AssessmentSubmission" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own submissions" ON "AssessmentSubmission"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own submissions" ON "AssessmentSubmission"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can read submissions for own courses" ON "AssessmentSubmission"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "Assessment" a
        JOIN "Course" c ON c.id = a."courseId"
        JOIN "Program" prog ON prog.id = c."programId"
        JOIN "InstitutionAccount" ia ON ia."institutionId" = prog."institutionId"
        WHERE ia."profileId" = auth.uid()::text
          AND a.id = "AssessmentSubmission"."assessmentId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all submissions" ON "AssessmentSubmission"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── ResourceProgress ──────────────────────────────────────────────────────────

ALTER TABLE "ResourceProgress" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own resource progress" ON "ResourceProgress"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own resource progress" ON "ResourceProgress"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all resource progress" ON "ResourceProgress"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── JobListing ────────────────────────────────────────────────────────────────

ALTER TABLE "JobListing" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read active job listings" ON "JobListing"
    FOR SELECT TO authenticated
    USING ("isActive" = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Employers can manage own job listings" ON "JobListing"
    FOR ALL TO authenticated
    USING (
      "employerId" = (SELECT id FROM "Employer" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all job listings" ON "JobListing"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── JobApplication ────────────────────────────────────────────────────────────

ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own job applications" ON "JobApplication"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own job applications" ON "JobApplication"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Employers can read applications for own jobs" ON "JobApplication"
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "JobListing" jl
        WHERE jl.id = "JobApplication"."jobId"
          AND jl."employerId" = (SELECT id FROM "Employer" WHERE "profileId" = auth.uid()::text)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Employers can update applications for own jobs" ON "JobApplication"
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "JobListing" jl
        WHERE jl.id = "JobApplication"."jobId"
          AND jl."employerId" = (SELECT id FROM "Employer" WHERE "profileId" = auth.uid()::text)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all job applications" ON "JobApplication"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Payment ───────────────────────────────────────────────────────────────────

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own payments" ON "Payment"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all payments" ON "Payment"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Subscription ──────────────────────────────────────────────────────────────

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own subscriptions" ON "Subscription"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all subscriptions" ON "Subscription"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Notification ──────────────────────────────────────────────────────────────

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own notifications" ON "Notification"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON "Notification"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "profileId")
    WITH CHECK (auth.uid()::text = "profileId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all notifications" ON "Notification"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Announcement ──────────────────────────────────────────────────────────────

ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read published announcements" ON "Announcement"
    FOR SELECT TO authenticated
    USING ("isPublished" = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Institution can manage own announcements" ON "Announcement"
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM "InstitutionAccount" ia
        WHERE ia."profileId" = auth.uid()::text
          AND ia."institutionId" = "Announcement"."institutionId"
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all announcements" ON "Announcement"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── LibraryResource ───────────────────────────────────────────────────────────

ALTER TABLE "LibraryResource" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read public library resources" ON "LibraryResource"
    FOR SELECT TO authenticated
    USING ("accessLevel" = 'PUBLIC' OR "isFree" = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Enrolled users can read enrolled library resources" ON "LibraryResource"
    FOR SELECT TO authenticated
    USING (
      "accessLevel" = 'ENROLLED' AND
      EXISTS (
        SELECT 1 FROM "Enrollment" e
        JOIN "Student" s ON s.id = e."studentId"
        WHERE s."profileId" = auth.uid()::text
          AND e.status = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all library resources" ON "LibraryResource"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── StudentProfile ────────────────────────────────────────────────────────────

ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own student profile" ON "StudentProfile"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own student profile" ON "StudentProfile"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can update own student profile" ON "StudentProfile"
    FOR UPDATE TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all student profiles" ON "StudentProfile"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── ProgramEmbeddingMeta ──────────────────────────────────────────────────────

ALTER TABLE "ProgramEmbeddingMeta" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read program embedding meta" ON "ProgramEmbeddingMeta"
    FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage program embedding meta" ON "ProgramEmbeddingMeta"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── RecommendationInteraction ─────────────────────────────────────────────────

ALTER TABLE "RecommendationInteraction" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Students can read own interactions" ON "RecommendationInteraction"
    FOR SELECT TO authenticated
    USING (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can insert own interactions" ON "RecommendationInteraction"
    FOR INSERT TO authenticated
    WITH CHECK (
      "studentId" = (SELECT id FROM "Student" WHERE "profileId" = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all interactions" ON "RecommendationInteraction"
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── InstitutionAccount (gaps: admin bypass) ───────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Admins can manage all institution accounts" ON "InstitutionAccount"
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM "Profile" p WHERE p.id = auth.uid()::text AND p.is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;