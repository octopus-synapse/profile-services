-- account_deletion_verification_purpose: add the ACCOUNT_DELETION value to the
-- VerificationPurpose enum so the shared single-use code table can gate the
-- two-step (code-confirmed) account deletion flow. Idempotent via IF NOT EXISTS.

ALTER TYPE "VerificationPurpose" ADD VALUE IF NOT EXISTS 'ACCOUNT_DELETION';
