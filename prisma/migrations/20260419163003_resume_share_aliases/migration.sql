-- CreateTable
CREATE TABLE "resume_share_aliases" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_share_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_share_aliases_slug_key" ON "resume_share_aliases"("slug");

-- CreateIndex
CREATE INDEX "resume_share_aliases_shareId_idx" ON "resume_share_aliases"("shareId");

-- CreateIndex
CREATE INDEX "resume_share_aliases_slug_idx" ON "resume_share_aliases"("slug");

-- AddForeignKey
ALTER TABLE "resume_share_aliases" ADD CONSTRAINT "resume_share_aliases_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "resume_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
