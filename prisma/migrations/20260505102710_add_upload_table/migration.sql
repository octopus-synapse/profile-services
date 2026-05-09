-- P0-005: source-of-truth table for S3 upload ownership.
--
-- DeleteUploadUseCase consults this table to verify the requester
-- owns the key before forwarding the delete to S3. Lazy backfill
-- handles legacy rows uploaded before this table existed.

CREATE TABLE "Upload" (
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt");

ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
