-- CreateEnum
CREATE TYPE "EmailDeliveryMode" AS ENUM ('INSTANT', 'DAILY', 'OFF');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailDigestSentAt" TIMESTAMP(3),
ADD COLUMN     "emailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "emailDelivery" "EmailDeliveryMode" NOT NULL DEFAULT 'INSTANT',
ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Notification_emailDigestSentAt_idx" ON "Notification"("emailDigestSentAt");
