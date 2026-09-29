-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('REGISTERED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SESSION_VERIFY', 'SIGN_IN');

-- DropForeignKey
ALTER TABLE "OtpCode" DROP CONSTRAINT "OtpCode_sessionId_fkey";

-- DropIndex
DROP INDEX "OtpCode_mobile_createdAt_idx";

-- AlterTable
ALTER TABLE "AssessmentSession" ADD COLUMN     "answeredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastQuestionId" INTEGER,
ADD COLUMN     "moduleResponses" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "moduleScores" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "purpose" "OtpPurpose" NOT NULL DEFAULT 'SESSION_VERIFY',
ALTER COLUMN "sessionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_mobile_idx" ON "AuthSession"("mobile");

-- CreateIndex
CREATE INDEX "OtpCode_mobile_purpose_createdAt_idx" ON "OtpCode"("mobile", "purpose", "createdAt");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
