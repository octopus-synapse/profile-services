CREATE TYPE "AttestationWitnessStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "AttestationWitnessRun" (
    "id" TEXT NOT NULL,
    "status" "AttestationWitnessStatus" NOT NULL DEFAULT 'PENDING',
    "sourceTreeHash" TEXT NOT NULL,
    "gitTreeObjectId" TEXT,
    "snapshotPath" TEXT NOT NULL,
    "snapshotSha256" TEXT NOT NULL,
    "attestationPath" TEXT,
    "swaggerHash" TEXT,
    "checkResults" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttestationWitnessRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttestationWitnessRun_sourceTreeHash_key" ON "AttestationWitnessRun"("sourceTreeHash");
CREATE INDEX "AttestationWitnessRun_status_createdAt_idx" ON "AttestationWitnessRun"("status", "createdAt");
CREATE INDEX "AttestationWitnessRun_completedAt_idx" ON "AttestationWitnessRun"("completedAt");
