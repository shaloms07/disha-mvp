-- CreateTable
CREATE TABLE "WhatsAppChatMessage" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChatMessage_metaMessageId_key" ON "WhatsAppChatMessage"("metaMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppChatMessage_mobile_createdAt_idx" ON "WhatsAppChatMessage"("mobile", "createdAt");
