/**
 * Import Mappers
 *
 * Converts domain types to API DTOs.
 */

import type { ImportJobData, ParsedResumeData } from '../../domain/types/import.types';
import type { ImportJobDto, ImportResultDto, ParsedResumeDataDto } from '../dto';

const LEGACY_SECTION_KEYS: Array<{ field: string; sectionTypeKey: string }> = [
  { field: 'experiences', sectionTypeKey: 'work_experience_v1' },
  { field: 'education', sectionTypeKey: 'education_v1' },
  { field: 'skills', sectionTypeKey: 'skill_v1' },
  { field: 'certifications', sectionTypeKey: 'certification_v1' },
  { field: 'languages', sectionTypeKey: 'language_v1' },
  { field: 'projects', sectionTypeKey: 'project_v1' },
];

export function toImportJobDtoList(jobs: ImportJobData[]): ImportJobDto[] {
  const out: ImportJobDto[] = [];
  for (const job of jobs) out.push(toImportJobDto(job));
  return out;
}

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
    parsedData: parseMappedData(job.mappedData),
    resumeId: job.resumeId ?? undefined,
    errors: job.errors,
    createdAt: job.createdAt.toISOString(),
  };
}

export function parseMappedData(value: unknown): ParsedResumeData | undefined {
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

  // Legacy fallback: convert section-specific arrays to generic sections
  const sections: ParsedResumeData['sections'] = [];

  for (const { field, sectionTypeKey } of LEGACY_SECTION_KEYS) {
    const value = data[field];
    if (!Array.isArray(value) || value.length === 0) continue;

    if (field === 'skills') {
      sections.push({
        sectionTypeKey,
        items: value
          .filter((item): item is string => typeof item === 'string')
          .map((name) => ({ name })),
      });
    } else {
      sections.push({
        sectionTypeKey,
        items: value as Array<Record<string, unknown>>,
      });
    }
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
