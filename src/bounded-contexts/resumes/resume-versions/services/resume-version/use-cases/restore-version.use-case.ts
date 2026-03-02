import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  ResumeVersionRepositoryPort,
  type VersionRestoreResult,
} from '../ports/resume-version.port';
import { CreateSnapshotUseCase } from './create-snapshot.use-case';

export class RestoreVersionUseCase {
  private static readonly RESUME_MUTABLE_FIELDS = [
    'title',
    'template',
    'language',
    'isPublic',
    'slug',
    'contentPtBr',
    'contentEn',
    'primaryLanguage',
    'techPersona',
    'techArea',
    'primaryStack',
    'experienceYears',
    'fullName',
    'jobTitle',
    'phone',
    'emailContact',
    'location',
    'linkedin',
    'github',
    'website',
    'summary',
    'currentCompanyLogo',
    'twitter',
    'medium',
    'devto',
    'stackoverflow',
    'kaggle',
    'hackerrank',
    'leetcode',
    'accentColor',
    'customTheme',
    'activeThemeId',
    'profileViews',
    'totalStars',
    'totalCommits',
    'publishedAt',
  ] as const;

  constructor(
    private readonly repository: ResumeVersionRepositoryPort,
    private readonly createSnapshotUseCase: CreateSnapshotUseCase,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<VersionRestoreResult> {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this resume');
    }

    const version = await this.repository.findResumeVersionById(versionId);

    if (!version || version.resumeId !== resumeId) {
      throw new NotFoundException('Version not found');
    }

    await this.createSnapshotUseCase.execute(resumeId, 'Before restore');

    const snapshot = version.snapshot as Prisma.JsonObject;
    const resumeData = this.extractResumeData(snapshot);

    await this.repository.updateResumeFromSnapshot(resumeId, resumeData);

    this.eventPublisher.publishVersionRestored(resumeId, {
      userId,
      restoredFromVersion: version.versionNumber,
    });

    return { restoredFrom: version.createdAt };
  }

  private extractResumeData(snapshot: Prisma.JsonObject): Record<string, unknown> {
    const candidate = this.getResumePayload(snapshot);
    const selected = Object.fromEntries(
      RestoreVersionUseCase.RESUME_MUTABLE_FIELDS.filter((field) => field in candidate).map(
        (field) => [field, candidate[field]],
      ),
    );

    return selected;
  }

  private getResumePayload(snapshot: Prisma.JsonObject): Record<string, unknown> {
    const maybeResume = snapshot.resume;
    if (maybeResume && typeof maybeResume === 'object' && !Array.isArray(maybeResume)) {
      return maybeResume as Record<string, unknown>;
    }

    return snapshot as Record<string, unknown>;
  }
}
