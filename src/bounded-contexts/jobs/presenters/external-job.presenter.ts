/**
 * Domain → response DTO mapping for external job listings (Q9 naming).
 * Strips internal bookkeeping (`raw`, `dedupHash`, `sourceQuery`) and
 * serializes dates to ISO strings.
 */

import type { ExternalJobListItem } from '../application/use-cases/list-external-jobs/list-external-jobs.use-case';
import type { RecommendedExternalJobItem } from '../application/use-cases/list-recommended-jobs/list-recommended-jobs.use-case';
import type { SavedExternalJobRecord } from '../domain/ports/saved-external-jobs.repository.port';

export function toExternalJobResponseDto(record: ExternalJobListItem) {
  return {
    id: record.id,
    externalId: record.externalId,
    title: record.title,
    company: record.company,
    location: record.location,
    isRemote: record.isRemote,
    workMode: record.workMode,
    employmentType: record.employmentType,
    applyUrl: record.applyUrl,
    publisher: record.publisher,
    description: record.description,
    postedAt: record.postedAt ? record.postedAt.toISOString() : null,
    fetchedAt: record.fetchedAt.toISOString(),
    isSaved: record.savedId !== null,
    savedId: record.savedId,
  };
}

/** Recommended listing = the external DTO plus its 0–100 match score. */
export function toRecommendedExternalJobResponseDto(record: RecommendedExternalJobItem) {
  return { ...toExternalJobResponseDto(record), matchScore: record.matchScore };
}

export function toSavedExternalJobResponseDto(record: SavedExternalJobRecord) {
  return {
    savedId: record.id,
    savedAt: record.createdAt.toISOString(),
    externalId: record.externalId,
    title: record.title,
    company: record.company,
    location: record.location,
    isRemote: record.isRemote,
    workMode: record.workMode,
    employmentType: record.employmentType,
    applyUrl: record.applyUrl,
    publisher: record.publisher,
    description: record.description,
    postedAt: record.postedAt ? record.postedAt.toISOString() : null,
    fetchedAt: record.fetchedAt.toISOString(),
    hasApplied: record.hasApplied,
    appliedAt: record.appliedAt ? record.appliedAt.toISOString() : null,
  };
}
