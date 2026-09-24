CREATE TABLE "billing_domain_event_outbox" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_domain_event_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_domain_event_outbox_eventId_key"
  ON "billing_domain_event_outbox"("eventId");
CREATE INDEX "billing_domain_event_outbox_pending_idx"
  ON "billing_domain_event_outbox"("publishedAt", "nextAttemptAt", "occurredAt");
