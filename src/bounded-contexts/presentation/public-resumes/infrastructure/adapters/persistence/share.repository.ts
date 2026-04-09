/**
 * Share Prisma Repository
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ShareEntity,
  ShareRepositoryPort,
  type ShareWithResume,
} from '../../../domain/ports/share.repository.port';

export class ShareRepository extends ShareRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: {
    resumeId: string;
    slug: string;
    password: string | null;
    expiresAt: Date | null;
  }): Promise<ShareEntity> {
    const result = await this.prisma.resumeShare.create({ data });
    return result;
  }

  async findBySlug(slug: string): Promise<ShareWithResume | null> {
    const result = await this.prisma.resumeShare.findUnique({
      where: { slug },
      include: { resume: true },
    });
    return result;
  }

  async findBySlugOnly(slug: string): Promise<ShareEntity | null> {
    const result = await this.prisma.resumeShare.findUnique({
      where: { slug },
    });
    return result;
  }

  async findByIdWithResume(
    id: string,
  ): Promise<(ShareEntity & { resume: { userId: string } }) | null> {
    const result = await this.prisma.resumeShare.findUnique({
      where: { id },
      include: {
        resume: { select: { userId: true } },
      },
    });
    return result;
  }

  async findByResumeId(resumeId: string): Promise<ShareEntity[]> {
    const result = await this.prisma.resumeShare.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
    return result;
  }

  async delete(id: string): Promise<ShareEntity> {
    const result = await this.prisma.resumeShare.delete({
      where: { id },
    });
    return result;
  }
}
