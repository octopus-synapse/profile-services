import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ResumeForSnapshot,
  type ResumeVersionListItem,
  type ResumeVersionRecord,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

export class ResumeVersionRepository extends ResumeVersionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: {
                key: true,
                semanticKind: true,
                version: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                content: true,
              },
            },
          },
        },
      },
    });
  }

  async findLastVersionNumber(resumeId: string): Promise<number | null> {
    const lastVersion = await this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return lastVersion?.versionNumber ?? null;
  }

  createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Prisma.InputJsonValue;
    label?: string;
  }): Promise<ResumeVersionRecord> {
    return this.prisma.resumeVersion.create({
      data,
      select: {
        id: true,
        resumeId: true,
        versionNumber: true,
        snapshot: true,
        label: true,
        createdAt: true,
      },
    });
  }

  findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
  }

  findResumeVersions(resumeId: string): Promise<ResumeVersionListItem[]> {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
      },
    });
  }

  findResumeVersionById(versionId: string): Promise<ResumeVersionRecord | null> {
    return this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        resumeId: true,
        versionNumber: true,
        snapshot: true,
        label: true,
        createdAt: true,
      },
    });
  }

  async updateResumeFromSnapshot(
    resumeId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: snapshot as never,
    });
  }

  async findVersionIdsByResumeIdDesc(resumeId: string): Promise<string[]> {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    return versions.map((version) => version.id);
  }

  async deleteVersionsByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.prisma.resumeVersion.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
