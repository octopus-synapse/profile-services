import type { FitVector } from '../types';

export interface SavedJobFitProfile {
  readonly id: string;
  readonly jobId: string;
  readonly vector: FitVector;
  readonly editedByUserId: string;
  readonly computedAt: Date;
}

export interface JobFitProfileWrite {
  readonly jobId: string;
  readonly vector: FitVector;
  readonly editedByUserId: string;
}

export abstract class JobFitProfileRepositoryPort {
  abstract findByJobId(jobId: string): Promise<SavedJobFitProfile | null>;
  abstract upsert(input: JobFitProfileWrite): Promise<SavedJobFitProfile>;
}
