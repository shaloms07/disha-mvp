-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CounsellorCallStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "AssessmentSession" ADD COLUMN     "deepDiveCompletedAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralCountedAt" TIMESTAMP(3),
ADD COLUMN     "referredByCode" TEXT,
ADD COLUMN     "unlockedAt" TIMESTAMP(3),
ADD COLUMN     "unlockedVia" TEXT,
ADD COLUMN     "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL,
    "metaMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounsellorCall" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "CounsellorCallStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounsellorCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessage_metaMessageId_idx" ON "WhatsAppMessage"("metaMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_sessionId_template_key_key" ON "WhatsAppMessage"("sessionId", "template", "key");

-- CreateIndex
CREATE INDEX "CounsellorCall_sessionId_idx" ON "CounsellorCall"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSession_referralCode_key" ON "AssessmentSession"("referralCode");

-- CreateIndex
CREATE INDEX "AssessmentSession_referredByCode_idx" ON "AssessmentSession"("referredByCode");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounsellorCall" ADD CONSTRAINT "CounsellorCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

