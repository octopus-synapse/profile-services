-- P1-035 follow-up — extend AuditAction with the values written by
-- ExportAuditHandler, SocialAuditHandler, and VersionAuditHandler.
-- Same root cause as 20260505180000: strict mode crashes the
-- originating use-case if the enum value is unknown.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_FOLLOWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONNECTION_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHARE_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESUME_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESUME_VERSION_RESTORED';
