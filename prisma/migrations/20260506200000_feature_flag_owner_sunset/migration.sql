-- P2-107 — Add owner and sunsetDate to FeatureFlag for cleanup hygiene.
-- Both nullable so the migration is non-blocking for existing rows; the
-- registry side enforces `owner` at flag registration time going forward.

ALTER TABLE "FeatureFlag"
  ADD COLUMN "owner"      TEXT,
  ADD COLUMN "sunsetDate" TIMESTAMP(3);
