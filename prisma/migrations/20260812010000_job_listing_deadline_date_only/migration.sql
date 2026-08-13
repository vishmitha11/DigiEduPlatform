-- JobListing.applicationDeadline was TIMESTAMP(3) but the Post a Job form
-- only ever collects a plain date (<input type="date">). Storing it as
-- DATE removes the time-of-day component so comparisons/round-trips can't
-- drift across timezone conversions.
ALTER TABLE "JobListing" ALTER COLUMN "applicationDeadline" SET DATA TYPE DATE;
