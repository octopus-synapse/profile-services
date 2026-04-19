-- CreateTable
CREATE TABLE "platform_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "props" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_event_event_occurredAt_idx" ON "platform_event"("event", "occurredAt");

-- CreateIndex
CREATE INDEX "platform_event_userId_occurredAt_idx" ON "platform_event"("userId", "occurredAt");
