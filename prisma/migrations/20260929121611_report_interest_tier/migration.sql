-- AlterTable
-- updatedAt backfills existing rows from createdAt rather than a fixed
-- default, then behaves as a normal @updatedAt column from here on.
ALTER TABLE "ReportInterestLead" ADD COLUMN     "tierLevel" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

UPDATE "ReportInterestLead" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "ReportInterestLead" ALTER COLUMN "updatedAt" SET NOT NULL;
