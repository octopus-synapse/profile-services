/**
 * In-memory `AdminTechAreasRepositoryPort` for use-case specs.
 * Filtering / pagination is intentionally minimal — tests seed
 * exactly the rows they need and assert on the call surface.
 */

import type { TechArea } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminTechAreasListQuery,
  AdminTechAreasRepositoryPort,
} from '../domain/ports/admin-tech-areas.repository.port';

export class InMemoryAdminTechAreasRepository extends AdminTechAreasRepositoryPort {
  readonly rows = new Map<string, TechArea>();
  readonly nicheCounts = new Map<string, number>();
  readonly created: Record<string, unknown>[] = [];
  readonly updated: { id: string; input: Record<string, unknown> }[] = [];
  readonly deleted: string[] = [];

  seed(row: TechArea): void {
    this.rows.set(row.id, row);
  }

  setNicheCount(areaId: string, count: number): void {
    this.nicheCounts.set(areaId, count);
  }

  async findAll(query: AdminTechAreasListQuery): Promise<PaginatedResult<TechArea>> {
    const items = [...this.rows.values()];
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return {
      items,
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize) || 0,
    };
  }

  async findOne(id: string) {
    return this.rows.get(id) ?? null;
  }

  async create(input: Record<string, unknown>): Promise<TechArea> {
    this.created.push(input);
    const fake = { id: `area-${this.created.length}`, ...input } as unknown as TechArea;
    this.rows.set(fake.id, fake);
    return fake;
  }

  async update(id: string, input: Record<string, unknown>): Promise<TechArea> {
    this.updated.push({ id, input });
    const existing = this.rows.get(id) ?? ({ id } as unknown as TechArea);
    const next = { ...existing, ...input } as TechArea;
    this.rows.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.deleted.push(id);
    this.rows.delete(id);
  }

  async countNiches(areaId: string): Promise<number> {
    return this.nicheCounts.get(areaId) ?? 0;
  }
}
