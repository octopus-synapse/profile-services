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
    parsedData: toParsedResumeData(entity.mappedData),
    resumeId: entity.resumeId ?? undefined,
    errors: Array.isArray(entity.errors) ? (entity.errors as string[]) : [],
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.createdAt.toISOString(), // Prisma schema doesn't have updatedAt
  };
}

function toParsedResumeData(value: ResumeImport['mappedData']): ParsedResumeData | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const data = value as Record<string, unknown>;

  if (!('personalInfo' in data)) {
    return undefined;
  }

  // Support both new generic format (sections array) and legacy format
  if ('sections' in data && Array.isArray(data.sections)) {
    return {
      personalInfo:
        typeof data.personalInfo === 'object' && data.personalInfo !== null
          ? (data.personalInfo as ParsedResumeData['personalInfo'])
          : {},
      summary: typeof data.summary === 'string' ? data.summary : undefined,
      sections: (data.sections as Array<Record<string, unknown>>).map((s) => ({
        sectionTypeKey: typeof s.sectionTypeKey === 'string' ? s.sectionTypeKey : '',
        items: Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : [],
      })),
    };
  }

  // Legacy fallback: convert section-specific arrays to generic sections
  const sections: ParsedResumeData['sections'] = [];

  if (Array.isArray(data.experiences) && data.experiences.length > 0) {
    sections.push({
      sectionTypeKey: 'work_experience_v1',
      items: data.experiences as Array<Record<string, unknown>>,
    });
  }
  if (Array.isArray(data.education) && data.education.length > 0) {
    sections.push({
      sectionTypeKey: 'education_v1',
      items: data.education as Array<Record<string, unknown>>,
    });
  }
  if (Array.isArray(data.skills) && data.skills.length > 0) {
    sections.push({
      sectionTypeKey: 'skill_v1',
      items: (data.skills as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((name) => ({ name })),
    });
  }
  if (Array.isArray(data.certifications) && data.certifications.length > 0) {
    sections.push({
      sectionTypeKey: 'certification_v1',
      items: data.certifications as Array<Record<string, unknown>>,
    });
  }
  if (Array.isArray(data.languages) && data.languages.length > 0) {
    sections.push({
      sectionTypeKey: 'language_v1',
      items: data.languages as Array<Record<string, unknown>>,
    });
  }
  if (Array.isArray(data.projects) && data.projects.length > 0) {
    sections.push({
      sectionTypeKey: 'project_v1',
      items: data.projects as Array<Record<string, unknown>>,
    });
  }

  return {
    personalInfo:
      typeof data.personalInfo === 'object' && data.personalInfo !== null
        ? (data.personalInfo as ParsedResumeData['personalInfo'])
        : {},
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    sections,
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
    sections: data.sections,
  };
}
