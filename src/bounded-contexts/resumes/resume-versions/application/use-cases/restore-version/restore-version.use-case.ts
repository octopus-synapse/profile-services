/**
 * Roll a resume back to one of its persisted versions. Always snapshots
 * the current state first ("Before restore") so the user can undo.
 */

import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
  ResumeVersionNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { LoggerPort } from '@/shared-kernel';
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
  // P1 #33 — `profileViews`, `totalStars`, `publishedAt` are
  // monotonic / lifecycle-bound counters whose values must NOT be
  // restored from an older snapshot. Restoring `profileViews` would
  // shave off legitimate views that accrued since the snapshot;
  // restoring `publishedAt` would resurface a previous publication
  // date (or null-out a still-published resume). `totalCommits` is
  // similarly accumulator-shaped but is kept here pending a follow-up
  // audit of its semantics — for now only the three confirmed offenders
  // are dropped from the allowlist.
  'totalCommits',
] as const;

export class RestoreVersionUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
    private readonly createSnapshotUseCase: CreateSnapshotUseCase,
    private readonly eventPublisher: ResumeEventPublisher,
    private readonly logger: LoggerPort,
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
