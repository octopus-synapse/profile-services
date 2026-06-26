import type { SpokenLanguage } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminSpokenLanguagesListQuery,
  AdminSpokenLanguagesRepositoryPort,
} from '../domain/ports/admin-spoken-languages.repository.port';

export class InMemoryAdminSpokenLanguagesRepository extends AdminSpokenLanguagesRepositoryPort {
  readonly rows = new Map<string, SpokenLanguage>();
  readonly created: Record<string, unknown>[] = [];
  readonly updated: { code: string; input: Record<string, unknown> }[] = [];
  readonly deleted: string[] = [];

  seed(row: SpokenLanguage): void {
    this.rows.set(row.code, row);
  }

  async listAll(query: AdminSpokenLanguagesListQuery): Promise<PaginatedResult<SpokenLanguage>> {
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
  async findOne(code: string) {
    return this.rows.get(code) ?? null;
  }
  async create(input: Record<string, unknown>) {
    this.created.push(input);
    const row = { ...(input as object) } as SpokenLanguage;
    this.rows.set(row.code, row);
    return row;
  }
  async update(code: string, input: Record<string, unknown>) {
    this.updated.push({ code, input });
    const next = { ...(this.rows.get(code) as SpokenLanguage), ...input } as SpokenLanguage;
    this.rows.set(code, next);
    return next;
  }
  async delete(code: string) {
    this.deleted.push(code);
    this.rows.delete(code);
  }
}
