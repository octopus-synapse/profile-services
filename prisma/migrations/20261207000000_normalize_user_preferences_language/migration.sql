-- ADR-003 §11: `pt-BR` / `en` from `@packages/i18n` is the one locale
-- vocabulary. `UserPreferences.language` is a free string that clients wrote
-- verbatim (`pt_BR`, `PT-br`, `en-US`), which no locale-aware read
-- recognised. Same rewrite as 20261206000000_normalize_resume_locale_vocabulary:
-- case- and separator-insensitive, exact-or-prefix on a served language.
-- Anything unrecognised is left untouched — the read boundary degrades it to
-- 'en' and the row stays auditable. The default stays 'en': this is the UI
-- locale, not the résumé's authored language.

UPDATE "UserPreferences"
SET "language" = 'pt-BR'
WHERE "language" <> 'pt-BR'
  AND (lower(replace("language", '_', '-')) = 'pt'
       OR lower(replace("language", '_', '-')) LIKE 'pt-%');

UPDATE "UserPreferences"
SET "language" = 'en'
WHERE "language" <> 'en'
  AND (lower(replace("language", '_', '-')) = 'en'
       OR lower(replace("language", '_', '-')) LIKE 'en-%');
