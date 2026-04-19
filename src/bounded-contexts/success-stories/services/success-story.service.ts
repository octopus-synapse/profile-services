import { Injectable } from '@nestjs/common';
import type { SuccessStoryStatus } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';

/** Shape the UI cards consume — flat, no user join needed for the carousel. */
export type PublicSuccessStory = {
  id: string;
  userId: string;
  headline: string;
  beforeText: string;
  afterText: string;
  quote: string;
  timeframeDays: number | null;
  publishedAt: string | null;
  user: {
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
};

@Injectable()
export class SuccessStoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(limit = 12): Promise<PublicSuccessStory[]> {
    const rows = await this.prisma.successStory.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ weight: 'desc' }, { publishedAt: 'desc' }],
      take: Math.min(limit, 50),
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

  async create(data: {
    userId: string;
    headline: string;
    beforeText: string;
    afterText: string;
    quote: string;
    timeframeDays?: number;
    weight?: number;
    status?: SuccessStoryStatus;
  }) {
    return this.prisma.successStory.create({
      data: {
        userId: data.userId,
        headline: data.headline,
        beforeText: data.beforeText,
        afterText: data.afterText,
        quote: data.quote,
        timeframeDays: data.timeframeDays,
        weight: data.weight ?? 0,
        status: data.status ?? 'DRAFT',
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    });
  }

  async update(
    id: string,
    data: {
      headline?: string;
      beforeText?: string;
      afterText?: string;
      quote?: string;
      timeframeDays?: number;
      weight?: number;
      status?: SuccessStoryStatus;
    },
  ) {
    const existing = await this.prisma.successStory.findUnique({ where: { id } });
    if (!existing) throw new EntityNotFoundException('SuccessStory', id);

    // Stamp publishedAt on the status transition so listings stay ordered.
    const justPublished = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    return this.prisma.successStory.update({
      where: { id },
      data: {
        ...data,
        ...(justPublished ? { publishedAt: new Date() } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.prisma.successStory.delete({ where: { id } });
  }
}
