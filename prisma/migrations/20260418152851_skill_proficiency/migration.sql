-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateTable
CREATE TABLE "UserSkillProficiency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL DEFAULT 'INTERMEDIATE',
    "yearsOfExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkillProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSkillProficiency_userId_idx" ON "UserSkillProficiency"("userId");

-- CreateIndex
CREATE INDEX "UserSkillProficiency_skillName_idx" ON "UserSkillProficiency"("skillName");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillProficiency_userId_skillName_key" ON "UserSkillProficiency"("userId", "skillName");

-- AddForeignKey
ALTER TABLE "UserSkillProficiency" ADD CONSTRAINT "UserSkillProficiency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
