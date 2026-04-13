import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate } from '@/shared-kernel/database';

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
    return paginate(this.prisma.resumeCollaborator, {
      page: query.page,
      pageSize: query.pageSize,
      orderBy: { invitedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        resume: { select: { id: true, title: true } },
      },
    });
  }
}
