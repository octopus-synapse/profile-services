-- Drop the duplicated `emailContact` column from `Resume`.
-- Email lives on `User.email` and is read via the `user` relation.
-- Existing values are copied to the user record only when the user has
-- no email — which never happens since signup requires it — so the data
-- is safe to discard.

ALTER TABLE "Resume" DROP COLUMN IF EXISTS "emailContact";
