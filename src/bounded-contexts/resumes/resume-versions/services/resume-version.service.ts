import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import {
  VersionCreatedEvent,
  VersionRestoredEvent,
} from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class ResumeVersionService {
  private readonly MAX_VERSIONS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createSnapshot(resumeId: string, label?: string) {
    // Get full resume data
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        experiences: true,
        education: true,
        skills: true,
        languages: true,
        projects: true,
        certifications: true,
        awards: true,
        recommendations: true,
        interests: true,
        achievements: true,
        publications: true,
        talks: true,
        openSource: true,
        bugBounties: true,
        hackathons: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Get next version number
    const lastVersion = await this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // Create version
    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeId,
        versionNumber,
        snapshot: resume as never,
        label,
      },
    });

    // Emit version created event
    this.eventPublisher.publish(
      new VersionCreatedEvent(resumeId, {
        userId: resume.userId,
        versionNumber,
        snapshotData: resume as Record<string, unknown>,
      }),
    );

    // Cleanup old versions (keep last 30)
    await this.cleanupOldVersions(resumeId);

    return version;
  }

  async getVersions(resumeId: string, userId: string) {
    // Verify ownership
    await this.verifyOwnership(resumeId, userId);

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

  async restoreVersion(resumeId: string, versionId: string, userId: string) {
    // Verify ownership
    await this.verifyOwnership(resumeId, userId);

    // Get version
    const version = await this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
    });

    if (!version?.resumeId || version.resumeId !== resumeId) {
      throw new NotFoundException('Version not found');
    }

    // Create a snapshot of current state before restore
    await this.createSnapshot(resumeId, 'Before restore');

    // Extract snapshot data
    const snapshot = version.snapshot as Record<string, unknown>;

    // Update resume with snapshot data (excluding relations)
    const {
      id: _id,
      userId: _userId,
      createdAt: _createdAt,
      ...resumeData
    } = snapshot;

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: resumeData as never,
    });

    // Emit version restored event
    this.eventPublisher.publish(
      new VersionRestoredEvent(resumeId, {
        userId,
        restoredFromVersion: version.versionNumber,
      }),
    );

    return { success: true, restoredFrom: version.createdAt };
  }

  private async verifyOwnership(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this resume');
    }
  }

  private async cleanupOldVersions(resumeId: string) {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    if (versions.length > this.MAX_VERSIONS) {
      const toDelete = versions.slice(this.MAX_VERSIONS);
      await this.prisma.resumeVersion.deleteMany({
        where: {
          id: { in: toDelete.map((v) => v.id) },
        },
      });
    }
  }
}
