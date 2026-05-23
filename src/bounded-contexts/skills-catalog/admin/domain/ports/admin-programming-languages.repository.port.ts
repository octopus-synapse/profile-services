/**
 * Outbound port for the admin programming-languages CRUD. Keyed by `slug`.
 */

import type { ProgrammingLanguage } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminProgrammingLanguagesListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export abstract class AdminProgrammingLanguagesRepositoryPort {
  abstract listAll(
    query: AdminProgrammingLanguagesListQuery,
  ): Promise<PaginatedResult<ProgrammingLanguage>>;
  abstract findOne(slug: string): Promise<ProgrammingLanguage | null>;
  abstract create(input: Record<string, unknown>): Promise<ProgrammingLanguage>;
  abstract update(slug: string, input: Record<string, unknown>): Promise<ProgrammingLanguage>;
  abstract delete(slug: string): Promise<void>;
}
