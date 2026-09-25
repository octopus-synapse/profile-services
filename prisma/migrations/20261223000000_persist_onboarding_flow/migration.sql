ALTER TABLE "OnboardingProgress"
  ADD COLUMN "flowStep" TEXT,
  ADD COLUMN "flowCompletedSteps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "selectedPlan" TEXT,
  ADD COLUMN "selectedOfferCode" TEXT,
  ADD COLUMN "selectedLocale" TEXT,
  ADD COLUMN "flowDrafts" JSONB;

-- Old TTL values must not delete long-lived onboarding progress.
UPDATE "OnboardingProgress" SET "expiresAt" = NULL WHERE "expiresAt" IS NOT NULL;
