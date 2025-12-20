-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "accentColor" TEXT DEFAULT '#3B82F6',
ADD COLUMN     "customTheme" JSONB,
ADD COLUMN     "devto" TEXT,
ADD COLUMN     "experienceYears" INTEGER DEFAULT 0,
ADD COLUMN     "hackerrank" TEXT,
ADD COLUMN     "kaggle" TEXT,
ADD COLUMN     "leetcode" TEXT,
ADD COLUMN     "medium" TEXT,
ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stackoverflow" TEXT,
ADD COLUMN     "techPersona" TEXT,
ADD COLUMN     "totalCommits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalStars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "twitter" TEXT;

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badgeUrl" TEXT,
    "verificationUrl" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "value" INTEGER,
    "rank" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publicationType" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "abstract" TEXT,
    "coAuthors" TEXT[],
    "citations" INTEGER DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talk" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "location" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "slidesUrl" TEXT,
    "videoUrl" TEXT,
    "attendees" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Talk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenSourceContribution" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT[],
    "commits" INTEGER DEFAULT 0,
    "prsCreated" INTEGER DEFAULT 0,
    "prsMerged" INTEGER DEFAULT 0,
    "issuesClosed" INTEGER DEFAULT 0,
    "stars" INTEGER DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenSourceContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugBounty" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "vulnerabilityType" TEXT NOT NULL,
    "cveId" TEXT,
    "reward" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "reportUrl" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugBounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "position" TEXT,
    "projectName" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT[],
    "teamSize" INTEGER,
    "demoUrl" TEXT,
    "repoUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "prize" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hackathon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_resumeId_idx" ON "Achievement"("resumeId");

-- CreateIndex
CREATE INDEX "Achievement_resumeId_type_idx" ON "Achievement"("resumeId", "type");

-- CreateIndex
CREATE INDEX "Achievement_resumeId_order_idx" ON "Achievement"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Publication_resumeId_idx" ON "Publication"("resumeId");

-- CreateIndex
CREATE INDEX "Publication_resumeId_order_idx" ON "Publication"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Publication_publicationType_idx" ON "Publication"("publicationType");

-- CreateIndex
CREATE INDEX "Talk_resumeId_idx" ON "Talk"("resumeId");

-- CreateIndex
CREATE INDEX "Talk_resumeId_order_idx" ON "Talk"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Talk_eventType_idx" ON "Talk"("eventType");

-- CreateIndex
CREATE INDEX "OpenSourceContribution_resumeId_idx" ON "OpenSourceContribution"("resumeId");

-- CreateIndex
CREATE INDEX "OpenSourceContribution_resumeId_order_idx" ON "OpenSourceContribution"("resumeId", "order");

-- CreateIndex
CREATE INDEX "OpenSourceContribution_role_idx" ON "OpenSourceContribution"("role");

-- CreateIndex
CREATE INDEX "BugBounty_resumeId_idx" ON "BugBounty"("resumeId");

-- CreateIndex
CREATE INDEX "BugBounty_resumeId_order_idx" ON "BugBounty"("resumeId", "order");

-- CreateIndex
CREATE INDEX "BugBounty_severity_idx" ON "BugBounty"("severity");

-- CreateIndex
CREATE INDEX "Hackathon_resumeId_idx" ON "Hackathon"("resumeId");

-- CreateIndex
CREATE INDEX "Hackathon_resumeId_order_idx" ON "Hackathon"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Resume_techPersona_idx" ON "Resume"("techPersona");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talk" ADD CONSTRAINT "Talk_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenSourceContribution" ADD CONSTRAINT "OpenSourceContribution_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugBounty" ADD CONSTRAINT "BugBounty_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hackathon" ADD CONSTRAINT "Hackathon_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
