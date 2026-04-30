/**
 * Prisma adapter for `AdminCollaborationsRepositoryPort`. Stats use
 * groupBy on the `role` enum; list uses the shared paginate helper.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate } from '@/shared-kernel/database';
import {
  AdminCollaborationsRepositoryPort,
  type AdminCollaborationsStats,
  type AdminCollaborationView,
  type ListCollaborationsQuery,
} from '../../../domain/ports/admin-collaborations.repository.port';

export class PrismaAdminCollaborationsRepository extends AdminCollaborationsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getStats(): Promise<AdminCollaborationsStats> {
    const [totalCollaborations, byRole] = await Promise.all([
      this.prisma.resumeCollaborator.count(),
      this.prisma.resumeCollaborator.groupBy({ by: ['role'], _count: true }),
    ]);
    return {
      totalCollaborations,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
    };
  }

  async listCollaborations(query: ListCollaborationsQuery) {
    return paginate<AdminCollaborationView>(this.prisma.resumeCollaborator, {
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
