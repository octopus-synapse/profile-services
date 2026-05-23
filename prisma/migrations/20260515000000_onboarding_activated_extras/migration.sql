-- Section-step keys the user explicitly opted into via the "what else?"
-- gate. Core required steps stay in the session payload regardless;
-- only optional extras (project, certification, award, publication, …)
-- get filtered against this list.
ALTER TABLE "OnboardingProgress"
ADD COLUMN "activatedExtras" TEXT[] DEFAULT ARRAY[]::TEXT[];
