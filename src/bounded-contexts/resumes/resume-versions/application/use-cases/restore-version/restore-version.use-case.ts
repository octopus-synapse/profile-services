/**
 * Roll a resume back to one of its persisted versions. Always snapshots
 * the current state first ("Before restore") so the user can undo.
 */

import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
  ResumeVersionNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type { VersionRestoreResult } from '../../../domain/entities/resume-version';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';
import { CreateSnapshotUseCase } from '../create-snapshot/create-snapshot.use-case';

const RESUME_MUTABLE_FIELDS = [
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
  'styleId',
  'profileViews',
  'totalStars',
  'totalCommits',
  'publishedAt',
] as const;

export class RestoreVersionUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
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
      throw new ResumeNotFoundException();
    }

    if (resume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    const version = await this.repository.findResumeVersionById(versionId);

    if (!version || version.resumeId !== resumeId) {
      throw new ResumeVersionNotFoundException(versionId);
    }

    await this.createSnapshotUseCase.execute(resumeId, 'Before restore');

    const snapshot = version.snapshot as Record<string, unknown>;
    const resumeData = this.extractResumeData(snapshot);

    await this.repository.updateResumeFromSnapshot(resumeId, resumeData);

    this.eventPublisher.publishVersionRestored(resumeId, {
      userId,
      restoredFromVersion: version.versionNumber,
    });

    return { restoredFrom: version.createdAt };
  }

  private extractResumeData(snapshot: Record<string, unknown>): Record<string, unknown> {
    const candidate = this.getResumePayload(snapshot);
    return Object.fromEntries(
      RESUME_MUTABLE_FIELDS.filter((field) => field in candidate).map((field) => [
        field,
        candidate[field],
      ]),
    );
  }

  private getResumePayload(snapshot: Record<string, unknown>): Record<string, unknown> {
    const maybeResume = snapshot.resume;
    if (maybeResume && typeof maybeResume === 'object' && !Array.isArray(maybeResume)) {
      return maybeResume as Record<string, unknown>;
    }

    return snapshot as Record<string, unknown>;
  }
}
