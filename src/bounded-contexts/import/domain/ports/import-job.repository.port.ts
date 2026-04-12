/**
 * Import Job Repository Port
 *
 * Outbound port defining data access operations for import jobs.
 * Implementations live in infrastructure (Prisma) and testing (in-memory).
 */

import type { CreateImportJobParams, ImportJobData, ImportStatus } from '../types/import.types';

export interface ImportJobRepositoryPort {
  create(params: CreateImportJobParams): Promise<ImportJobData>;
  findById(id: string): Promise<ImportJobData | null>;
  findByUserId(userId: string): Promise<ImportJobData[]>;
  updateStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string | null,
    resumeId?: string,
  ): Promise<ImportJobData>;
  delete(id: string): Promise<void>;
}

export const IMPORT_JOB_REPOSITORY = Symbol('ImportJobRepositoryPort');
