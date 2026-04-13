import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminCollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalCollaborations, byRole] = await Promise.all([
      this.prisma.resumeCollaborator.count(),
      this.prisma.resumeCollaborator.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return {
      totalCollaborations,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
    };
  }

  async getCollaborations(query: { page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.resumeCollaborator.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          resume: { select: { id: true, title: true } },
        },
        orderBy: { invitedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.resumeCollaborator.count(),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
