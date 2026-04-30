-- Drop the legacy `User.hasCompletedOnboarding` boolean column.
-- The new source of truth is `User.onboardingCompletedAt` (DateTime?).
-- Code that needs the boolean now derives it from
-- `onboardingCompletedAt IS NOT NULL`.
--
-- Index on the legacy column is dropped first (auto-named by Prisma
-- as `User_hasCompletedOnboarding_idx`).

DROP INDEX IF EXISTS "User_hasCompletedOnboarding_idx";

ALTER TABLE "User" DROP COLUMN IF EXISTS "hasCompletedOnboarding";
