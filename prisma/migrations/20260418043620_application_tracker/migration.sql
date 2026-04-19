-- CreateEnum
CREATE TYPE "JobApplicationEventType" AS ENUM ('SUBMITTED', 'VIEWED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN', 'FOLLOW_UP_SENT');

-- CreateTable
CREATE TABLE "JobApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "JobApplicationEventType" NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplicationEvent_applicationId_occurredAt_idx" ON "JobApplicationEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "JobApplicationEvent_type_occurredAt_idx" ON "JobApplicationEvent"("type", "occurredAt");

-- AddForeignKey
ALTER TABLE "JobApplicationEvent" ADD CONSTRAINT "JobApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
