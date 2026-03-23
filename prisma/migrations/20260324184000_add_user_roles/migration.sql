-- Add roles array to User table
-- Default value is ['role_user'] for all existing and new users

ALTER TABLE "User" ADD COLUMN "roles" TEXT[] DEFAULT ARRAY['role_user']::TEXT[];

-- Create GIN index for efficient role queries
CREATE INDEX "idx_user_roles" ON "User" USING GIN ("roles");
