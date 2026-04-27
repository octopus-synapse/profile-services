import type { TechNiche } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminTechNichesListQuery,
  AdminTechNichesRepositoryPort,
} from '../domain/ports/admin-tech-niches.repository.port';

export class InMemoryAdminTechNichesRepository extends AdminTechNichesRepositoryPort {
  readonly rows = new Map<string, TechNiche>();
  readonly skillCounts = new Map<string, number>();
  readonly created: Record<string, unknown>[] = [];
  readonly updated: { id: string; input: Record<string, unknown> }[] = [];
  readonly deleted: string[] = [];

  seed(row: TechNiche): void {
    this.rows.set(row.id, row);
  }

  setSkillCount(nicheId: string, count: number): void {
    this.skillCounts.set(nicheId, count);
  }

  async findAll(query: AdminTechNichesListQuery): Promise<PaginatedResult<TechNiche>> {
    const items = [...this.rows.values()];
    return {
      items,
      total: items.length,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      totalPages: 0,
    };
  }
  async findOne(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(input: Record<string, unknown>) {
    this.created.push(input);
    const row = { id: `niche-${this.created.length}`, ...input } as unknown as TechNiche;
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, input: Record<string, unknown>) {
    this.updated.push({ id, input });
    const next = { ...(this.rows.get(id) as TechNiche), ...input } as TechNiche;
    this.rows.set(id, next);
    return next;
  }
  async delete(id: string) {
    this.deleted.push(id);
    this.rows.delete(id);
  }
  async countSkills(nicheId: string) {
    return this.skillCounts.get(nicheId) ?? 0;
  }
}
