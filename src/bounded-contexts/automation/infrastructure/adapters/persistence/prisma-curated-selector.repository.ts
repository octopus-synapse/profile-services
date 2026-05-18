import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  CuratedSelectorJobQuery,
  CuratedSelectorJobView,
  CuratedSelectorRepositoryPort,
  CuratedSelectorUserView,
} from '../../../domain/ports/curated-selector.repository.port';

export class PrismaCuratedSelectorRepository extends CuratedSelectorRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserView(userId: string): Promise<CuratedSelectorUserView | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryResumeId: true,
        preferences: { select: { applyCriteria: true } },
      },
    });
    if (!user) return null;
    return {
      primaryResumeId: user.primaryResumeId ?? null,
      applyCriteria: (user.preferences?.applyCriteria ??
        null) as CuratedSelectorUserView['applyCriteria'],
    };
  }

  async listCandidateJobs(query: CuratedSelectorJobQuery): Promise<CuratedSelectorJobView[]> {
    const where: Record<string, unknown> = {
      isActive: true,
      createdAt: { gte: query.since },
      authorId: { not: query.userId },
      applications: { none: { userId: query.userId } },
    };
    if (query.remotePolicies?.length) where.remotePolicy = { in: query.remotePolicies };
    if (query.paymentCurrencies?.length) where.paymentCurrency = { in: query.paymentCurrencies };
    if (query.stacks?.length) where.skills = { hasSome: query.stacks };

    const candidates = await this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        skills: true,
      },
    });
    return candidates.map((c) => ({
      id: c.id,
      title: c.title ?? null,
      description: c.description ?? null,
      requirements: c.requirements ?? [],
      skills: c.skills ?? [],
    }));
  }
}
