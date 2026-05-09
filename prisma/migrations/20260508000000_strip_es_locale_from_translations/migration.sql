-- Strip 'es' locale keys from JSONB translation columns.
-- 'es' was never served to users (silent fallback to 'en') and is dead data.
-- Idempotent: only runs on rows that actually contain the 'es' key.

UPDATE "SectionType"
SET "translations" = "translations" - 'es'
WHERE "translations" ? 'es';

UPDATE "OnboardingStep"
SET "translations" = "translations" - 'es'
WHERE "translations" ? 'es';
