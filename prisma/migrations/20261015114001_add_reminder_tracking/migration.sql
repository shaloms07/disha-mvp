-- AlterTable
ALTER TABLE "AssessmentSession" ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder2hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder72hSentAt" TIMESTAMP(3);
