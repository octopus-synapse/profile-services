-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'welcome',
    "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "personalInfo" JSONB,
    "professionalProfile" JSONB,
    "experiences" JSONB,
    "noExperience" BOOLEAN NOT NULL DEFAULT false,
    "education" JSONB,
    "noEducation" BOOLEAN NOT NULL DEFAULT false,
    "skills" JSONB,
    "noSkills" BOOLEAN NOT NULL DEFAULT false,
    "languages" JSONB,
    "templateSelection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_userId_idx" ON "OnboardingProgress"("userId");

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
