-- Close the DRAFT-listing leak: the public read policy on "JobListing" only
-- checked isActive, so any authenticated client could read (and see raw,
-- unmasked salary figures for) DRAFT job listings by querying Supabase
-- directly, bypassing the job.listPublic tRPC procedure's status/masking
-- logic entirely. Require status = 'PUBLISHED' too.
DROP POLICY IF EXISTS "Anyone can read active job listings" ON "JobListing";

CREATE POLICY "Anyone can read active job listings" ON "JobListing"
  FOR SELECT TO authenticated
  USING ("isActive" = true AND "status" = 'PUBLISHED');
