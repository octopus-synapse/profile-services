-- CreateTable
CREATE TABLE "CollaborationComment" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "sectionId" TEXT,
    "itemId" TEXT,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborationComment_resumeId_createdAt_idx" ON "CollaborationComment"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "CollaborationComment_authorId_idx" ON "CollaborationComment"("authorId");

-- CreateIndex
CREATE INDEX "CollaborationComment_parentId_idx" ON "CollaborationComment"("parentId");

-- CreateIndex
CREATE INDEX "CollaborationComment_resumeId_resolved_idx" ON "CollaborationComment"("resumeId", "resolved");

-- AddForeignKey
ALTER TABLE "CollaborationComment" ADD CONSTRAINT "CollaborationComment_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationComment" ADD CONSTRAINT "CollaborationComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationComment" ADD CONSTRAINT "CollaborationComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CollaborationComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
