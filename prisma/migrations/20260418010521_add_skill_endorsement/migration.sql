-- CreateTable
CREATE TABLE "SkillEndorsement" (
    "id" TEXT NOT NULL,
    "endorsedUserId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "endorserUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillEndorsement_endorsedUserId_skillName_idx" ON "SkillEndorsement"("endorsedUserId", "skillName");

-- CreateIndex
CREATE INDEX "SkillEndorsement_endorserUserId_idx" ON "SkillEndorsement"("endorserUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillEndorsement_endorsedUserId_skillName_endorserUserId_key" ON "SkillEndorsement"("endorsedUserId", "skillName", "endorserUserId");
