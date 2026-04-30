import type { ProgrammingLanguage } from '@prisma/client';
import type { PaginatedResult } from '@/shared-kernel/database';
import {
  type AdminProgrammingLanguagesListQuery,
  AdminProgrammingLanguagesRepositoryPort,
} from '../domain/ports/admin-programming-languages.repository.port';

export class InMemoryAdminProgrammingLanguagesRepository extends AdminProgrammingLanguagesRepositoryPort {
  readonly rows = new Map<string, ProgrammingLanguage>();
  readonly created: Record<string, unknown>[] = [];
  readonly updated: { slug: string; input: Record<string, unknown> }[] = [];
  readonly deleted: string[] = [];

  seed(row: ProgrammingLanguage): void {
    this.rows.set(row.slug, row);
  }

  async findAll(
    query: AdminProgrammingLanguagesListQuery,
  ): Promise<PaginatedResult<ProgrammingLanguage>> {
    const items = [...this.rows.values()];
    return {
      items,
      total: items.length,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      totalPages: 0,
    };
  }
  async findOne(slug: string) {
    return this.rows.get(slug) ?? null;
  }
  async create(input: Record<string, unknown>) {
    this.created.push(input);
    const row = { ...(input as object) } as unknown as ProgrammingLanguage;
    this.rows.set(row.slug, row);
    return row;
  }
  async update(slug: string, input: Record<string, unknown>) {
    this.updated.push({ slug, input });
    const next = {
      ...(this.rows.get(slug) as ProgrammingLanguage),
      ...input,
    } as ProgrammingLanguage;
    this.rows.set(slug, next);
    return next;
  }
  async delete(slug: string) {
    this.deleted.push(slug);
    this.rows.delete(slug);
  }
}
