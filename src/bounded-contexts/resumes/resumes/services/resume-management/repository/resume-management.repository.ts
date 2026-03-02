import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ResumeDetails,
  type ResumeListItem,
  ResumeManagementRepositoryPort,
} from '../ports/resume-management.port';

export class ResumeManagementRepository extends ResumeManagementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findUserById(userId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  findResumesForUser(userId: string): Promise<ResumeListItem[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: {
        resumeSections: {
          include: {
            sectionType: true,
            items: true,
          },
        },
        _count: {
          select: {
            resumeSections: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findResumeDetailsById(resumeId: string): Promise<ResumeDetails | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        resumeSections: {
          orderBy: { order: 'asc' },
          include: {
            sectionType: true,
            items: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  findResumeForDelete(resumeId: string): Promise<{ id: string; userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true },
    });
  }

  async deleteResumeById(resumeId: string): Promise<void> {
    await this.prisma.resume.delete({ where: { id: resumeId } });
  }
}
