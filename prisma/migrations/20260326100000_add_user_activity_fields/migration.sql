-- Add user activity tracking fields and theme style DSL support
-- These columns support user activity monitoring, soft-delete, and theme styling

-- User activity tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Create index for efficient active user queries
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Theme Style DSL support
-- Format: { "work_experience_v1": { container: {...}, title: {...}, content: {...} } }
ALTER TABLE "ResumeTheme" ADD COLUMN IF NOT EXISTS "sectionStyles" JSONB NOT NULL DEFAULT '{}';
