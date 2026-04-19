-- AlterTable
ALTER TABLE "share_analytics" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "os" TEXT;

-- CreateIndex
CREATE INDEX "share_analytics_deviceType_idx" ON "share_analytics"("deviceType");
