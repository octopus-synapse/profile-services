-- One-shot cleanup for OnboardingProgress.username values that pre-date
-- the strict UsernameSchema enforcement in SaveProgressUseCase.
--
-- Affected rows have free-string names like "Enzo Patti" (uppercase +
-- space) saved by an older code path. After the resume-style refactor
-- the validator rejects those, so any user whose progress carries one
-- can't advance past the username step until they pick a new value.
--
-- Resetting the field to NULL lets the gate fire the usual "choose a
-- username" UX instead of trapping the user behind a 400.
--
-- Usage:
--   PGPASSWORD=postgres psql -h localhost -U postgres -d profile_dev \
--     -p 5432 -f scripts/ops/cleanup-corrupted-onboarding-usernames.sql
--
-- Or for prod (substitute the DATABASE_URL):
--   psql "$DATABASE_URL" -f scripts/ops/cleanup-corrupted-onboarding-usernames.sql

\echo 'Counting OnboardingProgress rows with invalid username values …'

SELECT count(*) AS rows_to_reset
FROM "OnboardingProgress"
WHERE username IS NOT NULL
  AND (
    username !~ '^[a-z0-9_]+$'
    OR length(username) NOT BETWEEN 3 AND 30
  );

\echo 'Sample of values that will be reset (LIMIT 20):'

SELECT "userId", username, "updatedAt"
FROM "OnboardingProgress"
WHERE username IS NOT NULL
  AND (
    username !~ '^[a-z0-9_]+$'
    OR length(username) NOT BETWEEN 3 AND 30
  )
ORDER BY "updatedAt" DESC
LIMIT 20;

\echo 'Resetting invalid usernames to NULL …'

UPDATE "OnboardingProgress"
SET username = NULL,
    "updatedAt" = now()
WHERE username IS NOT NULL
  AND (
    username !~ '^[a-z0-9_]+$'
    OR length(username) NOT BETWEEN 3 AND 30
  );

\echo 'Done.'
