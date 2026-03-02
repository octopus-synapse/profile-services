import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type ResumeForSnapshot,
  type ResumeVersionRecord,
  ResumeVersionRepositoryPort,
} from '../ports/resume-version.port';

export class CreateSnapshotUseCase {
  private readonly MAX_VERSIONS = 30;

  constructor(
    private readonly repository: ResumeVersionRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(resumeId: string, label?: string): Promise<ResumeVersionRecord> {
    const resume = await this.repository.findResumeForSnapshot(resumeId);

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    const lastVersionNumber = await this.repository.findLastVersionNumber(resumeId);
    const versionNumber = (lastVersionNumber ?? 0) + 1;

    const snapshot = this.normalizeSnapshot(resume);

    const version = await this.repository.createResumeVersion({
      resumeId,
      versionNumber,
      snapshot: snapshot as never,
      label,
    });

    this.eventPublisher.publishVersionCreated(resumeId, {
      userId: resume.userId,
      versionNumber,
      snapshotData: snapshot as Record<string, unknown>,
    });

    await this.cleanupOldVersions(resumeId);

    return version;
  }

  private async cleanupOldVersions(resumeId: string): Promise<void> {
    const ids = await this.repository.findVersionIdsByResumeIdDesc(resumeId);

    if (ids.length > this.MAX_VERSIONS) {
      const idsToDelete = ids.slice(this.MAX_VERSIONS);
      await this.repository.deleteVersionsByIds(idsToDelete);
    }
  }

  private normalizeSnapshot(resume: ResumeForSnapshot) {
    const { resumeSections, ...baseResume } = resume;

    const genericSnapshot = {
      resume: baseResume,
      sections: resumeSections.map((section) => ({
        semanticKind: section.sectionType.semanticKind,
        items: section.items.map((item) => item.content),
      })),
    };

    return this.toJsonValue(genericSnapshot);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
