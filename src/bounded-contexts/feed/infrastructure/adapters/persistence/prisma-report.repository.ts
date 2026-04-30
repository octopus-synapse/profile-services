/**
 * Prisma adapter for `ReportRepositoryPort`.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { Post, PostReport } from '../../../domain/entities';
import { ReportRepositoryPort } from '../../../domain/ports/report.repository.port';

export class PrismaReportRepository extends ReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPostById(id: string): Promise<Post | null> {
    return (await this.prisma.post.findUnique({ where: { id } })) as Post | null;
  }

  async findReport(postId: string, userId: string): Promise<PostReport | null> {
    return (await this.prisma.postReport.findUnique({
      where: { postId_userId: { postId, userId } },
    })) as PostReport | null;
  }

  async createReport(postId: string, userId: string, reason: string): Promise<PostReport> {
    return (await this.prisma.postReport.create({
      data: { postId, userId, reason },
    })) as PostReport;
  }

  async listReportsByPost(postId: string): Promise<PostReport[]> {
    return (await this.prisma.postReport.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    })) as PostReport[];
  }
}
