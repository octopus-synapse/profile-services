/**
 * Outbound port for the admin tech-niches CRUD. `areaId` filter is
 * exposed because the niches list is most often scoped to a parent area.
 */

import type { TechNiche } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminTechNichesListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly areaId?: string;
  readonly isActive?: boolean;
}

export abstract class AdminTechNichesRepositoryPort {
  abstract listAll(query: AdminTechNichesListQuery): Promise<PaginatedResult<TechNiche>>;
  abstract findOne(id: string): Promise<TechNiche | null>;
  abstract create(input: Record<string, unknown>): Promise<TechNiche>;
  abstract update(id: string, input: Record<string, unknown>): Promise<TechNiche>;
  abstract delete(id: string): Promise<void>;
  abstract countSkills(nicheId: string): Promise<number>;
}
