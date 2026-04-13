-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'CELEBRATE', 'LOVE', 'INSIGHTFUL', 'CURIOUS');

-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'CHALLENGE';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "coAuthors" TEXT[],
ADD COLUMN     "codeSnippet" JSONB,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pollDeadline" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "threadId" TEXT,
ADD COLUMN     "votesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PostLike" ADD COLUMN     "reactionType" "ReactionType" NOT NULL DEFAULT 'LIKE';

-- CreateIndex
CREATE INDEX "Post_originalPostId_authorId_idx" ON "Post"("originalPostId", "authorId");

-- CreateIndex
CREATE INDEX "Post_threadId_idx" ON "Post"("threadId");
