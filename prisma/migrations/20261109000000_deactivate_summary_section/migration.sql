-- Retire the legacy "Summary" resume section.
--
-- The professional summary now lives on the profile (`User.bio`) and the
-- per-resume `Resume.summary` scalar (which resume exports already render via
-- the DSL "summary from root" path). The `summary_v1` SectionType is kept
-- (Restrict FK + translations + export title) but deactivated so it leaves the
-- editor catalog. Any content a user typed into an actual Summary *section* is
-- preserved into `Resume.summary` before those sections are removed.

-- 1) Deactivate the section type (idempotent with the seed's isActive:false).
UPDATE "SectionType" SET "isActive" = false WHERE "semanticKind" = 'SUMMARY';

-- 2) Preserve content: copy each summary section's text into the resume's
--    summary scalar when that scalar is still empty, so nothing is lost.
UPDATE "Resume" r
SET "summary" = sub.text
FROM (
  SELECT rs."resumeId" AS resume_id, (si."content" ->> 'text') AS text
  FROM "ResumeSection" rs
  JOIN "SectionType" st ON st."id" = rs."sectionTypeId"
  JOIN "SectionItem" si ON si."resumeSectionId" = rs."id"
  WHERE st."semanticKind" = 'SUMMARY'
) sub
WHERE r."id" = sub.resume_id
  AND COALESCE(btrim(r."summary"), '') = ''
  AND COALESCE(btrim(sub.text), '') <> '';

-- 3) Remove the now-redundant summary sections (their items cascade-delete).
DELETE FROM "ResumeSection"
WHERE "sectionTypeId" IN (
  SELECT "id" FROM "SectionType" WHERE "semanticKind" = 'SUMMARY'
);
