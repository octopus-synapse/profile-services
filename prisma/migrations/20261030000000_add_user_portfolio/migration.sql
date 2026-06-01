-- Add `User.portfolio`: a personal portfolio link collected in the
-- onboarding "Links" step. Additive, nullable, no backfill — distinct
-- from `website` (a general site) so the redesigned Links step can offer
-- GitHub / LinkedIn / Website / Portfolio as four separate inputs.
ALTER TABLE "User" ADD COLUMN "portfolio" TEXT;
