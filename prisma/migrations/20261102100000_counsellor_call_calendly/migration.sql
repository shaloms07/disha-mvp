-- AlterTable
ALTER TABLE "CounsellorCall" ADD COLUMN     "calendlyEventUri" TEXT,
ADD COLUMN     "calendlyInviteeUri" TEXT,
ADD COLUMN     "rescheduleUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CounsellorCall_calendlyInviteeUri_key" ON "CounsellorCall"("calendlyInviteeUri");
