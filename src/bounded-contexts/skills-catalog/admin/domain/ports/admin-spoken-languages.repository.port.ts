/**
 * Outbound port for the admin spoken-languages CRUD. Keyed by the
 * BCP-47-style `code` (e.g. `en`, `pt-BR`) rather than a UUID.
 */

import type { SpokenLanguage } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminSpokenLanguagesListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export abstract class AdminSpokenLanguagesRepositoryPort {
  abstract listAll(query: AdminSpokenLanguagesListQuery): Promise<PaginatedResult<SpokenLanguage>>;
  abstract findOne(code: string): Promise<SpokenLanguage | null>;
  abstract create(input: Record<string, unknown>): Promise<SpokenLanguage>;
  abstract update(code: string, input: Record<string, unknown>): Promise<SpokenLanguage>;
  abstract delete(code: string): Promise<void>;
}
