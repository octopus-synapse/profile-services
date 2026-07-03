-- Desired role for the market-relative Readiness Score. Soft reference to a
-- RoleTitle (no FK — that taxonomy is re-imported) + the label snapshot that
-- coverage matches against. Additive + nullable, no backfill.

ALTER TABLE "Resume" ADD COLUMN "targetRoleId" TEXT;
ALTER TABLE "Resume" ADD COLUMN "targetRoleLabel" TEXT;
