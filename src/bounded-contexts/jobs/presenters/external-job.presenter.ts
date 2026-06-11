/**
 * Domain → response DTO mapping for external job listings (Q9 naming).
 * Strips internal bookkeeping (`raw`, `dedupHash`, `sourceQuery`) and
 * serializes dates to ISO strings.
 */

import type { ExternalJobListingRecord } from '../domain/ports/external-job-listings.repository.port';

export function toExternalJobResponseDto(record: ExternalJobListingRecord) {
  return {
    id: record.id,
    externalId: record.externalId,
    title: record.title,
    company: record.company,
    location: record.location,
    isRemote: record.isRemote,
    employmentType: record.employmentType,
    applyUrl: record.applyUrl,
    publisher: record.publisher,
    description: record.description,
    postedAt: record.postedAt ? record.postedAt.toISOString() : null,
    fetchedAt: record.fetchedAt.toISOString(),
  };
}
