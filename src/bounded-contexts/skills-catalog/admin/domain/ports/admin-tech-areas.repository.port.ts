/**
 * Outbound port for the admin tech-areas CRUD. Each method maps 1:1
 * to the controller endpoint that drives it; the use cases stay thin.
 */

import type { TechArea } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminTechAreasListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export abstract class AdminTechAreasRepositoryPort {
  abstract listAll(query: AdminTechAreasListQuery): Promise<PaginatedResult<TechArea>>;
  abstract findOne(id: string): Promise<TechArea | null>;
  abstract create(input: Record<string, unknown>): Promise<TechArea>;
  abstract update(id: string, input: Record<string, unknown>): Promise<TechArea>;
  abstract delete(id: string): Promise<void>;
  abstract countNiches(areaId: string): Promise<number>;
}
