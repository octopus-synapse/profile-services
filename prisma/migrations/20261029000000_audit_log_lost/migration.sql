-- AuditLogLost: audit fallback table for events whose User row was
-- removed in the race window between the auth event publish and the
-- audit handler firing. AuditLog.userId is a hard FK by compliance
-- choice (LGPD Art. 16 / GDPR Art. 30); this table absorbs the
-- exception cases without weakening the primary contract.
--
-- See docs/audits/integration-test-triage-2026-05-21.md (bug #4).

CREATE TABLE "AuditLogLost" (
  "id"             TEXT NOT NULL DEFAULT uuidv7(),
  "originalUserId" TEXT NOT NULL,
  "action"         "AuditAction" NOT NULL,
  "entityType"     TEXT NOT NULL,
  "entityId"       TEXT NOT NULL,
  "eventPayload"   JSONB NOT NULL,
  "reason"         TEXT NOT NULL,
  "attemptedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLogLost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLogLost_originalUserId_attemptedAt_idx"
  ON "AuditLogLost"("originalUserId", "attemptedAt");

CREATE INDEX "AuditLogLost_attemptedAt_idx"
  ON "AuditLogLost"("attemptedAt");
