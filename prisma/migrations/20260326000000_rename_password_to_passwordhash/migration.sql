-- Rename password column to passwordHash for clarity
-- This aligns with security best practices naming conventions

ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
