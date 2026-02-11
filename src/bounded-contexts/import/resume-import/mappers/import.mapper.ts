/**
 * Resume Import Mappers
 *
 * Converts Prisma entities to API DTOs.
 * Service layer returns Prisma types, controller maps to DTOs.
 *
 * Martin Fowler: "DTOs cross boundaries - entities stay internal"
 */

import type { ResumeImport } from '@prisma/client';
import type { ImportJobDto, ImportResultDto, ParsedResumeDataDto } from '../dto/import.dto';
import type { ParsedResumeData } from '../resume-import.types';

/**
 * Convert Prisma ResumeImport to ImportJobDto
 */
export function toImportJobDto(entity: ResumeImport): ImportJobDto {
  return {
    id: entity.id,
    userId: entity.userId,
    source: entity.source,
    status: entity.status,
    data: entity.rawData ?? undefined,
    parsedData: entity.mappedData as unknown as ParsedResumeData | undefined,
    resumeId: entity.resumeId ?? undefined,
    errors: Array.isArray(entity.errors) ? (entity.errors as string[]) : [],
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.createdAt.toISOString(), // Prisma schema doesn't have updatedAt
  };
}

/**
 * Convert import status response to ImportResultDto
 */
export function toImportResultDto(data: {
  importId: string;
  status: string;
  resumeId?: string;
  errors?: string[];
}): ImportResultDto {
  return {
    importId: data.importId,
    status: data.status as ImportResultDto['status'],
    resumeId: data.resumeId,
    errors: data.errors,
  };
}

/**
 * Convert ParsedResumeData to DTO
 */
export function toParsedResumeDataDto(data: ParsedResumeData): ParsedResumeDataDto {
  return {
    personalInfo: data.personalInfo,
    summary: data.summary,
    experiences: data.experiences,
    education: data.education,
    skills: data.skills,
    certifications: data.certifications,
    languages: data.languages,
    projects: data.projects,
  };
}
