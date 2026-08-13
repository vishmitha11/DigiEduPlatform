-- CreateEnum
CREATE TYPE "StudentAvailability" AS ENUM ('AVAILABLE', 'OPEN_TO_OFFERS', 'NOT_AVAILABLE');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "availability" "StudentAvailability",
ADD COLUMN     "employmentTypePreference" "JobType"[] DEFAULT ARRAY[]::"JobType"[],
ADD COLUMN     "workModelPreference" "WorkModel"[] DEFAULT ARRAY[]::"WorkModel"[];
