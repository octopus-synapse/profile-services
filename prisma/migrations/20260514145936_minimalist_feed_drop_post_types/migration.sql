-- Minimalist Feed Refactor
-- ============================
-- Removes the post-type taxonomy (ACHIEVEMENT/OPPORTUNITY/LEARNING/BUILD/
-- QUESTION/REPOST/CHALLENGE), reactions (LIKE/CELEBRATE/LOVE/INSIGHTFUL/
-- CURIOUS), anonymous-mode, and the JSON `data` blob from `Post`. Promotes
-- poll/code to first-class columns. Adds `User.headline` and a `recruiter`
-- role gated on `Permission.JOB_CREATE`.
--
-- DESTRUCTIVE: all existing posts are deleted because `Post.type` is
-- required today and the new schema has no replacement. Take a snapshot
-- before running in any environment above dev.

-- ===========================================================================
-- 1. Wipe all existing posts (cascade derruba likes/comments/bookmarks/etc.)
-- ===========================================================================
DELETE FROM "Post";

-- ===========================================================================
-- 2. Drop dead indexes that referenced columns we're about to drop
-- ===========================================================================
DROP INDEX IF EXISTS "Post_type_createdAt_idx";

-- ===========================================================================
-- 3. Drop legacy Post columns
-- ===========================================================================
ALTER TABLE "Post"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "subtype",
  DROP COLUMN IF EXISTS "hardSkills",
  DROP COLUMN IF EXISTS "softSkills",
  DROP COLUMN IF EXISTS "data",
  DROP COLUMN IF EXISTS "coAuthors",
  DROP COLUMN IF EXISTS "codeSnippet",
  DROP COLUMN IF EXISTS "isAnonymous",
  DROP COLUMN IF EXISTS "anonymousCategory";

-- ===========================================================================
-- 4. Add new Post columns
-- ===========================================================================
ALTER TABLE "Post"
  ADD COLUMN "isRepost"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "pollOptions"  JSONB,
  ADD COLUMN "codeSnippet"  TEXT,
  ADD COLUMN "codeLanguage" VARCHAR(40);

-- ===========================================================================
-- 5. Drop reactionType from PostLike (only LIKE remains; presence = like)
-- ===========================================================================
ALTER TABLE "PostLike" DROP COLUMN IF EXISTS "reactionType";

-- ===========================================================================
-- 6. Drop legacy enums
-- ===========================================================================
DROP TYPE IF EXISTS "PostType";
DROP TYPE IF EXISTS "AnonymousCategory";
DROP TYPE IF EXISTS "ReactionType";

-- ===========================================================================
-- 7. Add User.headline (one-line professional headline shown in feed)
-- ===========================================================================
ALTER TABLE "User" ADD COLUMN "headline" VARCHAR(120);

-- ===========================================================================
-- 8. RBAC: introduce `recruiter` role and gate JOB_CREATE to it (+admin auto-grant)
-- ===========================================================================
-- 8a. Insert recruiter role if not present (idempotent via WHERE NOT EXISTS).
INSERT INTO "Role" ("id", "name", "displayName", "description", "isSystem", "priority", "createdAt", "updatedAt")
SELECT
  uuidv7(),
  'recruiter',
  'Recruiter',
  'Can publish job postings via /v1/jobs.',
  TRUE,
  20,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'recruiter');

-- 8b. Grant Permission.JOB_CREATE (resource=job, action=create) to recruiter.
--
-- Permission rows are populated by the authorization seed runner
-- (`src/bounded-contexts/identity/authorization/seeds/seed.runner.ts`),
-- which runs AFTER `prisma migrate deploy`. On a fresh DB the
-- `(SELECT id FROM Permission ...)` subquery returns NULL and the
-- INSERT violates `RolePermission.permissionId NOT NULL` (Postgres
-- 23502). The seed runner reconciles the recruiter→job:create grant
-- via SYSTEM_ROLES on its own, so guarding the INSERT with EXISTS
-- makes it a no-op on fresh DBs without losing the grant. On older
-- DBs where Permission/Role were already seeded the INSERT proceeds
-- as before.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "assignedAt")
SELECT
  uuidv7(),
  (SELECT "id" FROM "Role" WHERE "name" = 'recruiter'),
  (SELECT "id" FROM "Permission" WHERE "resource" = 'job' AND "action" = 'create'),
  NOW()
WHERE EXISTS (SELECT 1 FROM "Permission" WHERE "resource" = 'job' AND "action" = 'create')
  AND EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'recruiter')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    JOIN "Role" r ON r."id" = rp."roleId"
    JOIN "Permission" p ON p."id" = rp."permissionId"
    WHERE r."name" = 'recruiter' AND p."resource" = 'job' AND p."action" = 'create'
  );

-- 8c. Revoke Permission.JOB_CREATE from `user` role (MEMBER no longer publishes jobs).
DELETE FROM "RolePermission"
WHERE "roleId" = (SELECT "id" FROM "Role" WHERE "name" = 'user')
  AND "permissionId" = (SELECT "id" FROM "Permission" WHERE "resource" = 'job' AND "action" = 'create');
