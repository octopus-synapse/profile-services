-- CreateTable
CREATE TABLE "JobBookmark" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobBookmark_userId_createdAt_idx" ON "JobBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobBookmark_jobId_userId_key" ON "JobBookmark"("jobId", "userId");

-- AddForeignKey
ALTER TABLE "JobBookmark" ADD CONSTRAINT "JobBookmark_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
