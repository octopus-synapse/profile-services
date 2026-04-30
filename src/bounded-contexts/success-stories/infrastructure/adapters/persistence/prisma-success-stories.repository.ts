/**
 * Prisma adapter for `SuccessStoriesRepositoryPort`.
 *
 * Owns the carousel ordering (`weight desc, publishedAt desc`) and the
 * `take` cap of 50 so the public endpoint can never accidentally page
 * the whole table. The user join is selected here to keep the read
 * path one round-trip; the use case stays Prisma-free.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  CreateSuccessStoryInput,
  SuccessStoryRecord,
  SuccessStoryView,
  UpdateSuccessStoryInput,
} from '../../../domain/entities/success-story';
import { SuccessStoriesRepositoryPort } from '../../../domain/ports/success-stories.repository.port';

const CTX = 'PrismaSuccessStoriesRepository';
const MAX_LIMIT = 50;

export class PrismaSuccessStoriesRepository extends SuccessStoriesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listPublished(limit: number): Promise<SuccessStoryView[]> {
    const take = Math.min(limit, MAX_LIMIT);
    const rows = await this.prisma.successStory.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ weight: 'desc' }, { publishedAt: 'desc' }],
      take,
      include: {
        user: { select: { name: true, username: true, photoURL: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      headline: r.headline,
      beforeText: r.beforeText,
      afterText: r.afterText,
      quote: r.quote,
      timeframeDays: r.timeframeDays,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      user: r.user,
    }));
  }

  async findById(id: string): Promise<SuccessStoryRecord | null> {
    const row = await this.prisma.successStory.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    return row ?? null;
  }

  async create(input: CreateSuccessStoryInput): Promise<SuccessStoryRecord> {
    const status = input.status ?? 'DRAFT';
    const row = await this.prisma.successStory.create({
      data: {
        userId: input.userId,
        headline: input.headline,
        beforeText: input.beforeText,
        afterText: input.afterText,
        quote: input.quote,
        timeframeDays: input.timeframeDays,
        weight: input.weight ?? 0,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
      select: { id: true, userId: true, status: true },
    });
    this.logger.log(`Created success story ${row.id} (status=${row.status})`, CTX);
    return row;
  }

  async update(
    id: string,
    input: UpdateSuccessStoryInput,
    options: { stampPublishedAt: boolean },
  ): Promise<SuccessStoryRecord> {
    const row = await this.prisma.successStory.update({
      where: { id },
      data: {
        ...input,
        ...(options.stampPublishedAt ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, userId: true, status: true },
    });
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.successStory.delete({ where: { id } });
    this.logger.log(`Deleted success story ${id}`, CTX);
  }
}
