import type { TechSkill } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminTechSkillsListQuery,
  AdminTechSkillsRepositoryPort,
} from '../domain/ports/admin-tech-skills.repository.port';

export class InMemoryAdminTechSkillsRepository extends AdminTechSkillsRepositoryPort {
  readonly rows = new Map<string, TechSkill>();
  readonly created: Record<string, unknown>[] = [];
  readonly updated: { id: string; input: Record<string, unknown> }[] = [];
  readonly deleted: string[] = [];

  seed(row: TechSkill): void {
    this.rows.set(row.id, row);
  }

  async listAll(query: AdminTechSkillsListQuery): Promise<PaginatedResult<TechSkill>> {
    const items = [...this.rows.values()];
    return {
      items,
      total: items.length,
      page: query.page ?? 1,
      limit: query.pageSize ?? 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
  async findOne(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    for (const row of this.rows.values()) {
      if (row.slug === slug) return row;
    }
    return null;
  }
  async findByNameEn(nameEn: string) {
    for (const row of this.rows.values()) {
      if (row.nameEn?.toLowerCase() === nameEn.toLowerCase()) return row;
    }
    return null;
  }
  async countResumeReferences(): Promise<number> {
    return this.referenceCounts;
  }
  /** Test seam: lets specs simulate "skill is in use" without spinning
   *  up a full resume graph. */
  setReferenceCount(count: number): void {
    this.referenceCounts = count;
  }
  private referenceCounts = 0;
  async create(input: Record<string, unknown>) {
    this.created.push(input);
    const row = { id: `skill-${this.created.length}`, ...input } as TechSkill;
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, input: Record<string, unknown>) {
    this.updated.push({ id, input });
    const next = { ...(this.rows.get(id) as TechSkill), ...input } as TechSkill;
    this.rows.set(id, next);
    return next;
  }
  async delete(id: string) {
    this.deleted.push(id);
    this.rows.delete(id);
  }
}
