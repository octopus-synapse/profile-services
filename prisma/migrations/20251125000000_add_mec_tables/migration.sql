-- CreateEnum
CREATE TYPE "MecSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MecInstitution" (
    "id" TEXT NOT NULL,
    "codigoIes" INTEGER NOT NULL,
    "codigoMunicipio" INTEGER,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "organizacao" TEXT,
    "categoria" TEXT,
    "uf" TEXT NOT NULL,
    "municipio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MecInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MecCourse" (
    "id" TEXT NOT NULL,
    "codigoCurso" INTEGER NOT NULL,
    "codigoIes" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "grau" TEXT,
    "modalidade" TEXT,
    "areaConhecimento" TEXT,
    "cargaHoraria" INTEGER,
    "situacao" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MecCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MecSyncLog" (
    "id" TEXT NOT NULL,
    "status" "MecSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "institutionsInserted" INTEGER NOT NULL DEFAULT 0,
    "institutionsUpdated" INTEGER NOT NULL DEFAULT 0,
    "coursesInserted" INTEGER NOT NULL DEFAULT 0,
    "coursesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "sourceUrl" TEXT,
    "sourceFileSize" INTEGER,
    "totalRowsProcessed" INTEGER,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MecSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MecInstitution_codigoIes_key" ON "MecInstitution"("codigoIes");

-- CreateIndex
CREATE INDEX "MecInstitution_nome_idx" ON "MecInstitution"("nome");

-- CreateIndex
CREATE INDEX "MecInstitution_sigla_idx" ON "MecInstitution"("sigla");

-- CreateIndex
CREATE INDEX "MecInstitution_uf_idx" ON "MecInstitution"("uf");

-- CreateIndex
CREATE INDEX "MecInstitution_categoria_idx" ON "MecInstitution"("categoria");

-- CreateIndex
CREATE INDEX "MecInstitution_isActive_idx" ON "MecInstitution"("isActive");

-- CreateIndex
CREATE INDEX "MecInstitution_codigoMunicipio_idx" ON "MecInstitution"("codigoMunicipio");

-- CreateIndex
CREATE UNIQUE INDEX "MecCourse_codigoCurso_key" ON "MecCourse"("codigoCurso");

-- CreateIndex
CREATE INDEX "MecCourse_nome_idx" ON "MecCourse"("nome");

-- CreateIndex
CREATE INDEX "MecCourse_codigoIes_idx" ON "MecCourse"("codigoIes");

-- CreateIndex
CREATE INDEX "MecCourse_grau_idx" ON "MecCourse"("grau");

-- CreateIndex
CREATE INDEX "MecCourse_modalidade_idx" ON "MecCourse"("modalidade");

-- CreateIndex
CREATE INDEX "MecCourse_areaConhecimento_idx" ON "MecCourse"("areaConhecimento");

-- CreateIndex
CREATE INDEX "MecCourse_isActive_idx" ON "MecCourse"("isActive");

-- CreateIndex
CREATE INDEX "MecCourse_situacao_idx" ON "MecCourse"("situacao");

-- CreateIndex
CREATE INDEX "MecSyncLog_status_idx" ON "MecSyncLog"("status");

-- CreateIndex
CREATE INDEX "MecSyncLog_startedAt_idx" ON "MecSyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "MecSyncLog_createdAt_idx" ON "MecSyncLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MecCourse" ADD CONSTRAINT "MecCourse_codigoIes_fkey" FOREIGN KEY ("codigoIes") REFERENCES "MecInstitution"("codigoIes") ON DELETE RESTRICT ON UPDATE CASCADE;
