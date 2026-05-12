-- Add template selector to Resume (F3-PD-009d). Stored as free string;
-- Zod at the route layer narrows it to the allowed enum.
ALTER TABLE "Resume" ADD COLUMN "template" TEXT;
