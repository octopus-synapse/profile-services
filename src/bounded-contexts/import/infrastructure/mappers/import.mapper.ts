/**
 * Import Mappers
 *
 * Converts domain types to API DTOs.
 */

import type { ImportJobData, ParsedResumeData } from '../../domain/types/import.types';
import type { ImportJobDto, ImportResultDto, ParsedResumeDataDto } from '../dto';

export function toImportJobDto(job: ImportJobData): ImportJobDto {
  const data =
    job.rawData && typeof job.rawData === 'object' && !Array.isArray(job.rawData)
      ? (job.rawData as Record<string, unknown>)
      : undefined;

  return {
    id: job.id,
    userId: job.userId,
    source: job.source,
    status: job.status,
    data,
    parsedData: toOptionalParsedResumeData(job.mappedData),
    resumeId: job.resumeId ?? undefined,
    errors: job.errors,
    createdAt: job.createdAt.toISOString(),
  };
}

function toOptionalParsedResumeData(value: unknown): ParsedResumeData | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const data = value as Record<string, unknown>;
  if (!('personalInfo' in data)) {
    return undefined;
  }

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

  // Legacy fallback
  const sections: ParsedResumeData['sections'] = [];

  if (Array.isArray(data.experiences) && data.experiences.length > 0) {
    sections.push({ sectionTypeKey: 'work_experience_v1', items: data.experiences as Array<Record<string, unknown>> });
  }
  if (Array.isArray(data.education) && data.education.length > 0) {
    sections.push({ sectionTypeKey: 'education_v1', items: data.education as Array<Record<string, unknown>> });
  }
  if (Array.isArray(data.skills) && data.skills.length > 0) {
    const skills: unknown[] = data.skills;
    sections.push({
      sectionTypeKey: 'skill_v1',
      items: skills.filter((item): item is string => typeof item === 'string').map((name) => ({ name })),
    });
  }
  if (Array.isArray(data.certifications) && data.certifications.length > 0) {
    sections.push({ sectionTypeKey: 'certification_v1', items: data.certifications as Array<Record<string, unknown>> });
  }
  if (Array.isArray(data.languages) && data.languages.length > 0) {
    sections.push({ sectionTypeKey: 'language_v1', items: data.languages as Array<Record<string, unknown>> });
  }
  if (Array.isArray(data.projects) && data.projects.length > 0) {
    sections.push({ sectionTypeKey: 'project_v1', items: data.projects as Array<Record<string, unknown>> });
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

export function toParsedResumeDataDto(data: ParsedResumeData): ParsedResumeDataDto {
  return {
    personalInfo: data.personalInfo,
    summary: data.summary,
    sections: data.sections,
  };
}
