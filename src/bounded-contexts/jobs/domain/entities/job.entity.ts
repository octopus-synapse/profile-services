/**
 * Domain shapes for jobs and applications. These mirror the Prisma rows
 * the repository returns — kept here so use cases / application services
 * can refer to a stable shape without importing Prisma types directly.
 */

import type {
  EnglishLevel,
  JobApplicationStatus,
  JobType,
  PaymentCurrency,
  RemotePolicy,
} from '@prisma/client';

/** Author info denormalised onto job views for the UI. */
export interface JobAuthor {
  readonly id: string;
  readonly name: string | null;
  readonly username: string | null;
  readonly photoURL: string | null;
}

/** Persisted job row, no relations. */
export interface Job {
  readonly id: string;
  readonly authorId: string;
  readonly title: string;
  readonly company: string;
  readonly location: string | null;
  readonly jobType: JobType;
  readonly description: string;
  readonly requirements: string[];
  readonly skills: string[];
  readonly salaryRange: string | null;
  readonly applyUrl: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date | null;
  readonly paymentCurrency: PaymentCurrency | null;
  readonly remotePolicy: RemotePolicy | null;
  readonly minEnglishLevel: EnglishLevel | null;
}

/** Job + denormalised author + viewer-relative flags ready for the API. */
export interface JobView extends Job {
  readonly author?: JobAuthor;
  readonly isBookmarked?: boolean;
  readonly hasApplied?: boolean;
}

/** Subset of job columns the fit-score batch needs. */
export interface JobFitInputRow {
  readonly id: string;
  readonly skills: string[];
  readonly minEnglishLevel: EnglishLevel | null;
  readonly remotePolicy: RemotePolicy | null;
}

/** Persisted application row, projection used in employer / applicant queries. */
export interface JobApplication {
  readonly id: string;
  readonly jobId: string;
  readonly userId: string;
  readonly status: JobApplicationStatus;
  readonly coverLetter: string | null;
  readonly resumeId: string | null;
  readonly tailoredVersionId: string | null;
  readonly createdAt: Date;
}

/** Candidate snapshot embedded in employer-side application listings. */
export interface ApplicationCandidate {
  readonly id: string;
  readonly name: string | null;
  readonly username: string | null;
  readonly email: string;
  readonly photoURL: string | null;
}

/** Filter shape accepted by the listing repo call. */
export interface JobFilters {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly jobType?: JobType;
  readonly skills?: string[];
  readonly paymentCurrency?: PaymentCurrency[];
  readonly remotePolicy?: RemotePolicy[];
  readonly minEnglishLevel?: EnglishLevel;
}

/** Fields accepted when creating a job. */
export interface CreateJobInput {
  readonly title: string;
  readonly company: string;
  readonly location?: string;
  readonly jobType: JobType;
  readonly description: string;
  readonly requirements?: string[];
  readonly skills?: string[];
  readonly salaryRange?: string;
  readonly applyUrl?: string;
  readonly expiresAt?: string;
  readonly paymentCurrency?: PaymentCurrency;
  readonly remotePolicy?: RemotePolicy;
  readonly minEnglishLevel?: EnglishLevel;
}

/** Fields accepted when updating a job. Nullable fields can be cleared. */
export interface UpdateJobInput {
  readonly title?: string;
  readonly company?: string;
  readonly location?: string;
  readonly jobType?: JobType;
  readonly description?: string;
  readonly requirements?: string[];
  readonly skills?: string[];
  readonly salaryRange?: string;
  readonly applyUrl?: string;
  readonly isActive?: boolean;
  readonly expiresAt?: string;
  readonly paymentCurrency?: PaymentCurrency | null;
  readonly remotePolicy?: RemotePolicy | null;
  readonly minEnglishLevel?: EnglishLevel | null;
}
