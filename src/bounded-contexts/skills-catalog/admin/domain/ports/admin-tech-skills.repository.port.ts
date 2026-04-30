/**
 * Outbound port for the admin tech-skills CRUD.
 */

import type { TechSkill } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';

export interface AdminTechSkillsListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly nicheId?: string;
  readonly type?: string;
  readonly isActive?: boolean;
}

export abstract class AdminTechSkillsRepositoryPort {
  abstract findAll(query: AdminTechSkillsListQuery): Promise<PaginatedResult<TechSkill>>;
  abstract findOne(id: string): Promise<TechSkill | null>;
  abstract create(input: Record<string, unknown>): Promise<TechSkill>;
  abstract update(id: string, input: Record<string, unknown>): Promise<TechSkill>;
  abstract delete(id: string): Promise<void>;
}
