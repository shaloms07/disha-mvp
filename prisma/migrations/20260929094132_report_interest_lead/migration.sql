-- CreateTable
CREATE TABLE "ReportInterestLead" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportInterestLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportInterestLead_sessionId_idx" ON "ReportInterestLead"("sessionId");

-- AddForeignKey
ALTER TABLE "ReportInterestLead" ADD CONSTRAINT "ReportInterestLead_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
