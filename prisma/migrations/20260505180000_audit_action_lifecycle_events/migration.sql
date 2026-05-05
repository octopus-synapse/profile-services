-- P1-035 — extend AuditAction with auth/session lifecycle values written
-- by AuthAuditHandler. Strict-mode audit log requires the enum to accept
-- these values; without them, login flows crash with
-- PrismaClientValidationError on the audit_log INSERT.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_LOGGED_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_LOGGED_OUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSION_TERMINATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TOKEN_REFRESHED';
