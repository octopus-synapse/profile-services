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
  /** Lookup by unique slug. Returns `null` when no row exists. Used by
   *  `CreateAdminTechSkillUseCase` to throw `SkillSlugTakenException`
   *  before hitting the unique-index error. */
  abstract findBySlug(slug: string): Promise<TechSkill | null>;
  /** Lookup by `nameEn` (case-insensitive). Used by the create flow to
   *  surface `SkillAlreadyExistsException` instead of returning a
   *  Prisma constraint failure. */
  abstract findByNameEn(nameEn: string): Promise<TechSkill | null>;
  abstract create(input: Record<string, unknown>): Promise<TechSkill>;
  abstract update(id: string, input: Record<string, unknown>): Promise<TechSkill>;
  abstract delete(id: string): Promise<void>;
  /** Best-effort count of resume section items that mention this skill
   *  (matched by `slug`, `nameEn`, or `namePtBr` inside the JSON
   *  content). Returns 0 when no usages are found. The admin delete
   *  flow uses this to throw `SkillInUseException` when the catalog
   *  entry is still referenced. */
  abstract countResumeReferences(skill: {
    slug: string;
    nameEn: string;
    namePtBr: string;
  }): Promise<number>;
}
