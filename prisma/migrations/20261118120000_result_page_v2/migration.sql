-- AlterTable
ALTER TABLE "FunnelEvent" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "variant" TEXT;

-- CreateTable
CREATE TABLE "CallbackRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "childClass" TEXT,
    "deepDiveDone" BOOLEAN NOT NULL DEFAULT false,
    "tappedPay" BOOLEAN NOT NULL DEFAULT false,
    "preferredTime" TEXT,
    "source" TEXT NOT NULL DEFAULT 'page',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "payLinkSentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallbackRequest_sessionId_idx" ON "CallbackRequest"("sessionId");

-- CreateIndex
CREATE INDEX "CallbackRequest_status_requestedAt_idx" ON "CallbackRequest"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "CallbackRequest" ADD CONSTRAINT "CallbackRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

