-- This migration is not validated against the shadow database
-- because it references auth.users which is Supabase-specific.
-- prisma-client-js skip-validate
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
    CASE WHEN user_role IN ('STUDENT', 'ADMIN') THEN true ELSE false END,
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