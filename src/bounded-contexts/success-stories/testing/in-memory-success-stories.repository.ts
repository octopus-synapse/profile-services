/**
 * In-memory `SuccessStoriesRepositoryPort` for use case specs. Mirrors
 * the Prisma adapter's ordering rule (weight desc, publishedAt desc)
 * and the `take <= 50` cap so list-tests catch regressions in either.
 */

import type { SuccessStoryStatus } from '@prisma/client';
import type {
  CreateSuccessStoryInput,
  SuccessStoryAuthorView,
  SuccessStoryRecord,
  SuccessStoryView,
  UpdateSuccessStoryInput,
} from '../domain/entities/success-story';
import { SuccessStoriesRepositoryPort } from '../domain/ports/success-stories.repository.port';

interface Row {
  id: string;
  userId: string;
  headline: string;
  beforeText: string;
  afterText: string;
  quote: string;
  timeframeDays: number | null;
  weight: number;
  status: SuccessStoryStatus;
  publishedAt: Date | null;
}

const MAX_LIMIT = 50;

export class InMemorySuccessStoriesRepository extends SuccessStoriesRepositoryPort {
  readonly rows: Row[] = [];
  private nextId = 1;
  private authors = new Map<string, SuccessStoryAuthorView>();

  setAuthor(userId: string, author: SuccessStoryAuthorView): void {
    this.authors.set(userId, author);
  }

  async listPublished(limit: number): Promise<SuccessStoryView[]> {
    const take = Math.min(limit, MAX_LIMIT);
    return this.rows
      .filter((r) => r.status === 'PUBLISHED')
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        const aT = a.publishedAt?.getTime() ?? 0;
        const bT = b.publishedAt?.getTime() ?? 0;
        return bT - aT;
      })
      .slice(0, take)
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        headline: r.headline,
        beforeText: r.beforeText,
        afterText: r.afterText,
        quote: r.quote,
        timeframeDays: r.timeframeDays,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        user: this.authors.get(r.userId) ?? { name: null, username: null, photoURL: null },
      }));
  }

  async findById(id: string): Promise<SuccessStoryRecord | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? { id: row.id, userId: row.userId, status: row.status } : null;
  }

  async create(input: CreateSuccessStoryInput): Promise<SuccessStoryRecord> {
    const id = `s-${this.nextId++}`;
    const status = input.status ?? 'DRAFT';
    const row: Row = {
      id,
      userId: input.userId,
      headline: input.headline,
      beforeText: input.beforeText,
      afterText: input.afterText,
      quote: input.quote,
      timeframeDays: input.timeframeDays ?? null,
      weight: input.weight ?? 0,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    };
    this.rows.push(row);
    return { id: row.id, userId: row.userId, status: row.status };
  }

  async update(
    id: string,
    input: UpdateSuccessStoryInput,
    options: { stampPublishedAt: boolean },
  ): Promise<SuccessStoryRecord> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`SuccessStory ${id} not found`);
    if (input.headline !== undefined) row.headline = input.headline;
    if (input.beforeText !== undefined) row.beforeText = input.beforeText;
    if (input.afterText !== undefined) row.afterText = input.afterText;
    if (input.quote !== undefined) row.quote = input.quote;
    if (input.timeframeDays !== undefined) row.timeframeDays = input.timeframeDays;
    if (input.weight !== undefined) row.weight = input.weight;
    if (input.status !== undefined) row.status = input.status;
    if (options.stampPublishedAt) row.publishedAt = new Date();
    return { id: row.id, userId: row.userId, status: row.status };
  }

  async delete(id: string): Promise<void> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx >= 0) this.rows.splice(idx, 1);
  }
}
