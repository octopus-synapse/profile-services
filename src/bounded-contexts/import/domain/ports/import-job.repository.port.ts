/**
 * Import Job Repository Port
 *
 * Outbound port defining data access operations for import jobs.
 * Implementations live in infrastructure (Prisma) and testing (in-memory).
 */

import type { CreateImportJobParams, ImportJobData, ImportStatus } from '../types/import.types';

export abstract class ImportJobRepositoryPort {
  abstract create(params: CreateImportJobParams): Promise<ImportJobData>;
  abstract findById(id: string): Promise<ImportJobData | null>;
  abstract findByUserId(userId: string): Promise<ImportJobData[]>;
  abstract updateStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string | null,
    resumeId?: string,
  ): Promise<ImportJobData>;
  abstract delete(id: string): Promise<void>;
}
