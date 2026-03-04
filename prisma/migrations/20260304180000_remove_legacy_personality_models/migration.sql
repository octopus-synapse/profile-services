-- Migration: Remove Legacy Personality Models
-- Migrates data from legacy models (Achievement, Publication, Talk, OpenSourceContribution, BugBounty, Hackathon)
-- to the generic SectionItem model, then drops the legacy tables.
--
-- This is a one-way migration. Data is preserved in the generic sections format.

-- ============================================================================
-- STEP 1: Ensure SectionTypes exist for legacy models
-- ============================================================================

-- Note: SectionTypes should already exist from seeds. This is a safety check.
-- If they don't exist, the migration will fail and you need to run seeds first.

DO $$
DECLARE
  achievement_type_id TEXT;
  publication_type_id TEXT;
  talk_type_id TEXT;
  open_source_type_id TEXT;
  bug_bounty_type_id TEXT;
  hackathon_type_id TEXT;
BEGIN
  -- Get SectionType IDs
  SELECT id INTO achievement_type_id FROM "SectionType" WHERE key = 'achievement_v1' LIMIT 1;
  SELECT id INTO publication_type_id FROM "SectionType" WHERE key = 'publication_v1' LIMIT 1;
  SELECT id INTO talk_type_id FROM "SectionType" WHERE key = 'talk_v1' LIMIT 1;
  SELECT id INTO open_source_type_id FROM "SectionType" WHERE key = 'open_source_v1' LIMIT 1;
  SELECT id INTO bug_bounty_type_id FROM "SectionType" WHERE key = 'bug_bounty_v1' LIMIT 1;
  SELECT id INTO hackathon_type_id FROM "SectionType" WHERE key = 'hackathon_v1' LIMIT 1;

  -- Validate all types exist
  IF achievement_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType achievement_v1 not found. Run seeds first.';
  END IF;
  IF publication_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType publication_v1 not found. Run seeds first.';
  END IF;
  IF talk_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType talk_v1 not found. Run seeds first.';
  END IF;
  IF open_source_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType open_source_v1 not found. Run seeds first.';
  END IF;
  IF bug_bounty_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType bug_bounty_v1 not found. Run seeds first.';
  END IF;
  IF hackathon_type_id IS NULL THEN
    RAISE EXCEPTION 'SectionType hackathon_v1 not found. Run seeds first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create ResumeSections for each legacy model's data
-- ============================================================================

-- Achievement sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  a."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = a."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "Achievement") a
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'achievement_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = a."resumeId" AND rs."sectionTypeId" = st.id
);

-- Publication sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  p."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = p."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "Publication") p
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'publication_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = p."resumeId" AND rs."sectionTypeId" = st.id
);

-- Talk sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  t."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = t."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "Talk") t
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'talk_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = t."resumeId" AND rs."sectionTypeId" = st.id
);

-- OpenSource sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  o."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = o."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "OpenSourceContribution") o
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'open_source_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = o."resumeId" AND rs."sectionTypeId" = st.id
);

-- BugBounty sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  b."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = b."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "BugBounty") b
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'bug_bounty_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = b."resumeId" AND rs."sectionTypeId" = st.id
);

-- Hackathon sections
INSERT INTO "ResumeSection" (id, "resumeId", "sectionTypeId", "isVisible", "order", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  h."resumeId",
  st.id,
  true,
  COALESCE((SELECT MAX("order") + 1 FROM "ResumeSection" WHERE "resumeId" = h."resumeId"), 0),
  NOW(),
  NOW()
FROM (SELECT DISTINCT "resumeId" FROM "Hackathon") h
CROSS JOIN (SELECT id FROM "SectionType" WHERE key = 'hackathon_v1' LIMIT 1) st
WHERE NOT EXISTS (
  SELECT 1 FROM "ResumeSection" rs 
  WHERE rs."resumeId" = h."resumeId" AND rs."sectionTypeId" = st.id
);

-- ============================================================================
-- STEP 3: Migrate data to SectionItem
-- ============================================================================

-- Migrate Achievement data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  a.id,
  rs.id,
  jsonb_build_object(
    'type', a.type,
    'title', a.title,
    'description', a.description,
    'badgeUrl', a."badgeUrl",
    'verificationUrl', a."verificationUrl",
    'achievedAt', a."achievedAt",
    'value', a.value,
    'rank', a.rank
  ),
  true,
  a."order",
  a."createdAt",
  a."updatedAt"
FROM "Achievement" a
JOIN "ResumeSection" rs ON rs."resumeId" = a."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'achievement_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = a.id);

-- Migrate Publication data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  p.id,
  rs.id,
  jsonb_build_object(
    'title', p.title,
    'publisher', p.publisher,
    'publicationType', p."publicationType",
    'url', p.url,
    'publishedAt', p."publishedAt",
    'abstract', p.abstract,
    'coAuthors', p."coAuthors",
    'citations', p.citations
  ),
  true,
  p."order",
  p."createdAt",
  p."updatedAt"
FROM "Publication" p
JOIN "ResumeSection" rs ON rs."resumeId" = p."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'publication_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = p.id);

-- Migrate Talk data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  t.id,
  rs.id,
  jsonb_build_object(
    'title', t.title,
    'event', t.event,
    'eventType', t."eventType",
    'location', t.location,
    'date', t.date,
    'description', t.description,
    'slidesUrl', t."slidesUrl",
    'videoUrl', t."videoUrl",
    'attendees', t.attendees
  ),
  true,
  t."order",
  t."createdAt",
  t."updatedAt"
FROM "Talk" t
JOIN "ResumeSection" rs ON rs."resumeId" = t."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'talk_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = t.id);

-- Migrate OpenSourceContribution data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  o.id,
  rs.id,
  jsonb_build_object(
    'projectName', o."projectName",
    'projectUrl', o."projectUrl",
    'role', o.role,
    'description', o.description,
    'technologies', o.technologies,
    'commits', o.commits,
    'prsCreated', o."prsCreated",
    'prsMerged', o."prsMerged",
    'issuesClosed', o."issuesClosed",
    'stars', o.stars,
    'startDate', o."startDate",
    'endDate', o."endDate",
    'isCurrent', o."isCurrent"
  ),
  true,
  o."order",
  o."createdAt",
  o."updatedAt"
FROM "OpenSourceContribution" o
JOIN "ResumeSection" rs ON rs."resumeId" = o."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'open_source_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = o.id);

-- Migrate BugBounty data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  b.id,
  rs.id,
  jsonb_build_object(
    'platform', b.platform,
    'company', b.company,
    'severity', b.severity,
    'vulnerabilityType', b."vulnerabilityType",
    'cveId', b."cveId",
    'reward', b.reward,
    'currency', b.currency,
    'reportUrl', b."reportUrl",
    'reportedAt', b."reportedAt",
    'resolvedAt', b."resolvedAt"
  ),
  true,
  b."order",
  b."createdAt",
  b."updatedAt"
FROM "BugBounty" b
JOIN "ResumeSection" rs ON rs."resumeId" = b."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'bug_bounty_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = b.id);

-- Migrate Hackathon data
INSERT INTO "SectionItem" (id, "resumeSectionId", content, "isVisible", "order", "createdAt", "updatedAt")
SELECT
  h.id,
  rs.id,
  jsonb_build_object(
    'name', h.name,
    'organizer', h.organizer,
    'position', h.position,
    'projectName', h."projectName",
    'description', h.description,
    'technologies', h.technologies,
    'teamSize', h."teamSize",
    'demoUrl', h."demoUrl",
    'repoUrl', h."repoUrl",
    'date', h.date,
    'prize', h.prize
  ),
  true,
  h."order",
  h."createdAt",
  h."updatedAt"
FROM "Hackathon" h
JOIN "ResumeSection" rs ON rs."resumeId" = h."resumeId"
JOIN "SectionType" st ON st.id = rs."sectionTypeId" AND st.key = 'hackathon_v1'
WHERE NOT EXISTS (SELECT 1 FROM "SectionItem" si WHERE si.id = h.id);

-- ============================================================================
-- STEP 4: Drop legacy tables
-- ============================================================================

DROP TABLE IF EXISTS "Achievement" CASCADE;
DROP TABLE IF EXISTS "Publication" CASCADE;
DROP TABLE IF EXISTS "Talk" CASCADE;
DROP TABLE IF EXISTS "OpenSourceContribution" CASCADE;
DROP TABLE IF EXISTS "BugBounty" CASCADE;
DROP TABLE IF EXISTS "Hackathon" CASCADE;
