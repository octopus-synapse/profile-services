-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_hasCompletedOnboarding_idx" ON "User"("hasCompletedOnboarding");
