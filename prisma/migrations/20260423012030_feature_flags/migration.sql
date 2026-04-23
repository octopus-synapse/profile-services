-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'FEATURE_FLAG_TOGGLED';

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledForRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagDependency" (
    "dependentId" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagDependency_pkey" PRIMARY KEY ("dependentId","dependencyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_deprecated_idx" ON "FeatureFlag"("deprecated");

-- CreateIndex
CREATE INDEX "FeatureFlagDependency_dependencyId_idx" ON "FeatureFlagDependency"("dependencyId");

-- AddForeignKey
ALTER TABLE "FeatureFlagDependency" ADD CONSTRAINT "FeatureFlagDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagDependency" ADD CONSTRAINT "FeatureFlagDependency_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
