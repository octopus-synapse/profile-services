/**
 * Snapshot the current master resume into a new ResumeVersion. Caps the
 * trailing history at MAX_VERSIONS so a chatty editor doesn't bloat the
 * row count — older versions get hard-deleted past the cap.
 */

import {
  ResumeNotFoundException,
  ResumeSnapshotNotSerializableException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type {
  ResumeForSnapshot,
  ResumeVersionRecord,
} from '../../../domain/entities/resume-version';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

const MAX_VERSIONS = 30;

export class CreateSnapshotUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(resumeId: string, label?: string): Promise<ResumeVersionRecord> {
    const resume = await this.repository.findResumeForSnapshot(resumeId);

    if (!resume) {
      throw new ResumeNotFoundException();
    }

    const lastVersionNumber = await this.repository.findLastVersionNumber(resumeId);
    const versionNumber = (lastVersionNumber ?? 0) + 1;

    const snapshot = this.normalizeSnapshot(resume);

    const version = await this.repository.createResumeVersion({
      resumeId,
      versionNumber,
      snapshot,
      label,
    });

    this.eventPublisher.publishVersionCreated(resumeId, {
      userId: resume.userId,
      versionNumber,
      snapshotData: snapshot,
    });

    await this.cleanupOldVersions(resumeId);

    return version;
  }

  private async cleanupOldVersions(resumeId: string): Promise<void> {
    const ids = await this.repository.findVersionIdsByResumeIdDesc(resumeId);

    if (ids.length > MAX_VERSIONS) {
      const idsToDelete = ids.slice(MAX_VERSIONS);
      await this.repository.deleteVersionsByIds(idsToDelete);
    }
  }

  private normalizeSnapshot(resume: ResumeForSnapshot): Record<string, unknown> {
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

  private toJsonValue(value: unknown): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(value));

    if (!this.isJsonObject(cloned)) {
      throw new ResumeSnapshotNotSerializableException();
    }

    return cloned;
  }

  private isJsonValue(value: unknown): boolean {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    if (typeof value === 'object') {
      return Object.values(value).every((item) => this.isJsonValue(item));
    }

    return false;
  }

  private isJsonObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }
}
