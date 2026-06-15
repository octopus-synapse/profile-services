-- Canonical enums for resume-section content fields (language level, degree
-- type, education status, open-source role, bug-bounty severity). Values live
-- as SCREAMING_CASE strings inside SectionItem.content JSON — these PG types
-- back no column; they exist so the i18n ENUM_DICTIONARY parity can require a
-- pt-BR/en label per value and the locale resolver can translate the pills.

-- CreateEnum
CREATE TYPE "LanguageLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE');

-- CreateEnum
CREATE TYPE "DegreeType" AS ENUM ('HIGH_SCHOOL', 'TECHNICAL', 'BACHELOR', 'MASTER', 'DOCTORATE', 'BOOTCAMP', 'SELF_TAUGHT');

-- CreateEnum
CREATE TYPE "EducationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'DROPPED');

-- CreateEnum
CREATE TYPE "OpenSourceRole" AS ENUM ('MAINTAINER', 'CONTRIBUTOR', 'CREATOR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
