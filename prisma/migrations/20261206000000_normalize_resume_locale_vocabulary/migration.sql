-- ADR-003 §11: `pt-BR` / `en` from `@packages/i18n` is the one locale
-- vocabulary. `Resume.language` and `Resume.primaryLanguage` shipped as free
-- strings defaulting to 'pt-br', which no locale-aware code path recognised —
-- `parseLocale('pt-br')` returned 'en', so every resume claimed to be English.
--
-- Rewrite the data, then move the defaults. Case- and separator-insensitive so
-- 'pt_BR' / 'PT-br' / bare 'pt' collapse too; an unserved region on a served
-- language ('en-US', 'pt-PT') follows the same exact-or-prefix rule the
-- application normalizer uses. Anything unrecognised is left untouched rather
-- than guessed at — `parseLocale` degrades it to the default at read time, and
-- leaving it visible keeps the row auditable.

UPDATE "Resume"
SET "language" = 'pt-BR'
WHERE "language" <> 'pt-BR'
  AND (lower(replace("language", '_', '-')) = 'pt'
       OR lower(replace("language", '_', '-')) LIKE 'pt-%');

UPDATE "Resume"
SET "language" = 'en'
WHERE "language" <> 'en'
  AND (lower(replace("language", '_', '-')) = 'en'
       OR lower(replace("language", '_', '-')) LIKE 'en-%');

UPDATE "Resume"
SET "primaryLanguage" = 'pt-BR'
WHERE "primaryLanguage" <> 'pt-BR'
  AND (lower(replace("primaryLanguage", '_', '-')) = 'pt'
       OR lower(replace("primaryLanguage", '_', '-')) LIKE 'pt-%');

UPDATE "Resume"
SET "primaryLanguage" = 'en'
WHERE "primaryLanguage" <> 'en'
  AND (lower(replace("primaryLanguage", '_', '-')) = 'en'
       OR lower(replace("primaryLanguage", '_', '-')) LIKE 'en-%');

ALTER TABLE "Resume" ALTER COLUMN "language" SET DEFAULT 'pt-BR';
ALTER TABLE "Resume" ALTER COLUMN "primaryLanguage" SET DEFAULT 'pt-BR';
