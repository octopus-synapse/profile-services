-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'APPROVER');

-- CreateEnum
CREATE TYPE "ThemeStatus" AS ENUM ('DRAFT', 'PRIVATE', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ThemeCategory" AS ENUM ('PROFESSIONAL', 'CREATIVE', 'TECHNICAL', 'ACADEMIC', 'MINIMAL', 'MODERN', 'CLASSIC', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "MecSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TechAreaType" AS ENUM ('DEVELOPMENT', 'DEVOPS', 'DATA', 'SECURITY', 'DESIGN', 'PRODUCT', 'QA', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'LIBRARY', 'DATABASE', 'TOOL', 'PLATFORM', 'METHODOLOGY', 'SOFT_SKILL', 'CERTIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "TechArea" (
    "id" TEXT NOT NULL,
    "type" "TechAreaType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePtBr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionPtBr" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechNiche" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePtBr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionPtBr" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechNiche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechSkill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePtBr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionPtBr" TEXT,
    "type" "SkillType" NOT NULL DEFAULT 'OTHER',
    "icon" TEXT,
    "color" TEXT,
    "website" TEXT,
    "nicheId" TEXT,
    "aliases" TEXT[],
    "keywords" TEXT[],
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpokenLanguage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePtBr" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nativeName" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpokenLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammingLanguage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePtBr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionPtBr" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "website" TEXT,
    "paradigms" TEXT[],
    "typing" TEXT,
    "aliases" TEXT[],
    "fileExtensions" TEXT[],
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammingLanguage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "description" TEXT,
    "skills" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "description" TEXT,
    "gpa" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "cefrLevel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "technologies" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "position" TEXT,
    "company" TEXT,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "template" TEXT NOT NULL DEFAULT 'professional',
    "language" TEXT NOT NULL DEFAULT 'pt-br',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "contentPtBr" JSONB,
    "contentEn" JSONB,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'pt-br',
    "techPersona" TEXT,
    "techArea" TEXT,
    "primaryStack" TEXT[],
    "experienceYears" INTEGER DEFAULT 0,
    "fullName" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "emailContact" TEXT,
    "location" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "website" TEXT,
    "summary" TEXT,
    "currentCompanyLogo" TEXT,
    "twitter" TEXT,
    "medium" TEXT,
    "devto" TEXT,
    "stackoverflow" TEXT,
    "kaggle" TEXT,
    "hackerrank" TEXT,
    "leetcode" TEXT,
    "accentColor" TEXT DEFAULT '#3B82F6',
    "customTheme" JSONB,
    "activeThemeId" TEXT,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "totalStars" INTEGER NOT NULL DEFAULT 0,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "category" "ThemeCategory" NOT NULL DEFAULT 'MODERN',
    "tags" TEXT[],
    "styleConfig" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "previewImages" TEXT[],
    "status" "ThemeStatus" NOT NULL DEFAULT 'PRIVATE',
    "isSystemTheme" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "parentThemeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ResumeTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "username" TEXT,
    "usernameUpdatedAt" TIMESTAMP(3),
    "displayName" TEXT,
    "photoURL" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "bannerColor" TEXT,
    "palette" TEXT,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "palette" TEXT NOT NULL DEFAULT 'ocean',
    "bannerColor" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "resumeExpiryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "profileVisibility" TEXT NOT NULL DEFAULT 'private',
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "allowSearchEngineIndex" BOOLEAN NOT NULL DEFAULT false,
    "defaultExportFormat" TEXT NOT NULL DEFAULT 'pdf',
    "includePhotoInExport" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'welcome',
    "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "username" TEXT,
    "personalInfo" JSONB,
    "professionalProfile" JSONB,
    "experiences" JSONB,
    "noExperience" BOOLEAN NOT NULL DEFAULT false,
    "education" JSONB,
    "noEducation" BOOLEAN NOT NULL DEFAULT false,
    "skills" JSONB,
    "noSkills" BOOLEAN NOT NULL DEFAULT false,
    "languages" JSONB,
    "templateSelection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TechArea_type_key" ON "TechArea"("type");

-- CreateIndex
CREATE INDEX "TechArea_type_idx" ON "TechArea"("type");

-- CreateIndex
CREATE INDEX "TechArea_order_idx" ON "TechArea"("order");

-- CreateIndex
CREATE INDEX "TechArea_isActive_idx" ON "TechArea"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TechNiche_slug_key" ON "TechNiche"("slug");

-- CreateIndex
CREATE INDEX "TechNiche_areaId_idx" ON "TechNiche"("areaId");

-- CreateIndex
CREATE INDEX "TechNiche_slug_idx" ON "TechNiche"("slug");

-- CreateIndex
CREATE INDEX "TechNiche_order_idx" ON "TechNiche"("order");

-- CreateIndex
CREATE INDEX "TechNiche_isActive_idx" ON "TechNiche"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TechSkill_slug_key" ON "TechSkill"("slug");

-- CreateIndex
CREATE INDEX "TechSkill_nicheId_idx" ON "TechSkill"("nicheId");

-- CreateIndex
CREATE INDEX "TechSkill_type_idx" ON "TechSkill"("type");

-- CreateIndex
CREATE INDEX "TechSkill_slug_idx" ON "TechSkill"("slug");

-- CreateIndex
CREATE INDEX "TechSkill_popularity_idx" ON "TechSkill"("popularity");

-- CreateIndex
CREATE INDEX "TechSkill_order_idx" ON "TechSkill"("order");

-- CreateIndex
CREATE INDEX "TechSkill_isActive_idx" ON "TechSkill"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SpokenLanguage_code_key" ON "SpokenLanguage"("code");

-- CreateIndex
CREATE INDEX "SpokenLanguage_code_idx" ON "SpokenLanguage"("code");

-- CreateIndex
CREATE INDEX "SpokenLanguage_order_idx" ON "SpokenLanguage"("order");

-- CreateIndex
CREATE INDEX "SpokenLanguage_isActive_idx" ON "SpokenLanguage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammingLanguage_slug_key" ON "ProgrammingLanguage"("slug");

-- CreateIndex
CREATE INDEX "ProgrammingLanguage_slug_idx" ON "ProgrammingLanguage"("slug");

-- CreateIndex
CREATE INDEX "ProgrammingLanguage_popularity_idx" ON "ProgrammingLanguage"("popularity");

-- CreateIndex
CREATE INDEX "ProgrammingLanguage_order_idx" ON "ProgrammingLanguage"("order");

-- CreateIndex
CREATE INDEX "ProgrammingLanguage_isActive_idx" ON "ProgrammingLanguage"("isActive");

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
CREATE INDEX "Experience_resumeId_idx" ON "Experience"("resumeId");

-- CreateIndex
CREATE INDEX "Experience_order_idx" ON "Experience"("order");

-- CreateIndex
CREATE INDEX "Experience_resumeId_order_idx" ON "Experience"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Experience_isCurrent_idx" ON "Experience"("isCurrent");

-- CreateIndex
CREATE INDEX "Education_resumeId_idx" ON "Education"("resumeId");

-- CreateIndex
CREATE INDEX "Education_order_idx" ON "Education"("order");

-- CreateIndex
CREATE INDEX "Education_resumeId_order_idx" ON "Education"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Education_isCurrent_idx" ON "Education"("isCurrent");

-- CreateIndex
CREATE INDEX "Skill_resumeId_idx" ON "Skill"("resumeId");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE INDEX "Skill_resumeId_category_idx" ON "Skill"("resumeId", "category");

-- CreateIndex
CREATE INDEX "Skill_resumeId_order_idx" ON "Skill"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Language_resumeId_idx" ON "Language"("resumeId");

-- CreateIndex
CREATE INDEX "Language_resumeId_order_idx" ON "Language"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Project_resumeId_idx" ON "Project"("resumeId");

-- CreateIndex
CREATE INDEX "Project_resumeId_order_idx" ON "Project"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Project_isCurrent_idx" ON "Project"("isCurrent");

-- CreateIndex
CREATE INDEX "Certification_resumeId_idx" ON "Certification"("resumeId");

-- CreateIndex
CREATE INDEX "Certification_resumeId_order_idx" ON "Certification"("resumeId", "order");

-- CreateIndex
CREATE INDEX "Award_resumeId_idx" ON "Award"("resumeId");

-- CreateIndex
CREATE INDEX "Award_order_idx" ON "Award"("order");

-- CreateIndex
CREATE INDEX "Recommendation_resumeId_idx" ON "Recommendation"("resumeId");

-- CreateIndex
CREATE INDEX "Recommendation_order_idx" ON "Recommendation"("order");

-- CreateIndex
CREATE INDEX "Interest_resumeId_idx" ON "Interest"("resumeId");

-- CreateIndex
CREATE INDEX "Interest_order_idx" ON "Interest"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_slug_key" ON "Resume"("slug");

-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- CreateIndex
CREATE INDEX "Resume_slug_idx" ON "Resume"("slug");

-- CreateIndex
CREATE INDEX "Resume_isPublic_idx" ON "Resume"("isPublic");

-- CreateIndex
CREATE INDEX "Resume_createdAt_idx" ON "Resume"("createdAt");

-- CreateIndex
CREATE INDEX "Resume_techPersona_idx" ON "Resume"("techPersona");

-- CreateIndex
CREATE INDEX "Resume_activeThemeId_idx" ON "Resume"("activeThemeId");

-- CreateIndex
CREATE INDEX "Resume_primaryLanguage_idx" ON "Resume"("primaryLanguage");

-- CreateIndex
CREATE INDEX "ResumeTheme_authorId_idx" ON "ResumeTheme"("authorId");

-- CreateIndex
CREATE INDEX "ResumeTheme_status_idx" ON "ResumeTheme"("status");

-- CreateIndex
CREATE INDEX "ResumeTheme_category_idx" ON "ResumeTheme"("category");

-- CreateIndex
CREATE INDEX "ResumeTheme_isSystemTheme_idx" ON "ResumeTheme"("isSystemTheme");

-- CreateIndex
CREATE INDEX "ResumeTheme_usageCount_idx" ON "ResumeTheme"("usageCount");

-- CreateIndex
CREATE INDEX "ResumeTheme_rating_idx" ON "ResumeTheme"("rating");

-- CreateIndex
CREATE INDEX "ResumeTheme_createdAt_idx" ON "ResumeTheme"("createdAt");

-- CreateIndex
CREATE INDEX "ResumeTheme_publishedAt_idx" ON "ResumeTheme"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_hasCompletedOnboarding_idx" ON "User"("hasCompletedOnboarding");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_userId_idx" ON "OnboardingProgress"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechNiche" ADD CONSTRAINT "TechNiche_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "TechArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSkill" ADD CONSTRAINT "TechSkill_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "TechNiche"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MecCourse" ADD CONSTRAINT "MecCourse_codigoIes_fkey" FOREIGN KEY ("codigoIes") REFERENCES "MecInstitution"("codigoIes") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_activeThemeId_fkey" FOREIGN KEY ("activeThemeId") REFERENCES "ResumeTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_parentThemeId_fkey" FOREIGN KEY ("parentThemeId") REFERENCES "ResumeTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.0 -> 7.2.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

