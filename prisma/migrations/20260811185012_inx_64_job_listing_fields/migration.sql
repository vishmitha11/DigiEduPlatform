-- CreateEnum
CREATE TYPE "JobListingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "WorkModel" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY_LEVEL', 'JUNIOR', 'MID_LEVEL', 'SENIOR_LEVEL', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "JobListing" ADD COLUMN     "department" TEXT,
ADD COLUMN     "displaySalaryPublicly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "minimumEducation" "EducationLevel",
ADD COLUMN     "numberOfOpenings" INTEGER DEFAULT 1,
ADD COLUMN     "status" "JobListingStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "workModel" "WorkModel";
