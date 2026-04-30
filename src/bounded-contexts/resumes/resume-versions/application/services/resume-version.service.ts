/**
 * Facade implementation of `ResumeVersionServicePort` (consumed by the
 * resumes core BC). Delegates to the snapshot/get/restore use cases so
 * the cross-BC contract stays narrow while the inner pipeline can be
 * exercised independently from a controller.
 */

import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import type {
  ResumeVersionListItem,
  VersionRestoreResult,
} from '../../domain/entities/resume-version';
import { CreateSnapshotUseCase } from '../use-cases/create-snapshot/create-snapshot.use-case';
import { GetVersionsUseCase } from '../use-cases/get-versions/get-versions.use-case';
import { RestoreVersionUseCase } from '../use-cases/restore-version/restore-version.use-case';

export class ResumeVersionService extends ResumeVersionServicePort {
  constructor(
    private readonly createSnapshotUseCase: CreateSnapshotUseCase,
    private readonly getVersionsUseCase: GetVersionsUseCase,
    private readonly restoreVersionUseCase: RestoreVersionUseCase,
  ) {
    super();
  }

  async createSnapshot(resumeId: string, label?: string): Promise<void> {
    await this.createSnapshotUseCase.execute(resumeId, label);
  }

  getVersions(resumeId: string, userId: string): Promise<ResumeVersionListItem[]> {
    return this.getVersionsUseCase.execute(resumeId, userId);
  }

  restoreVersion(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<VersionRestoreResult> {
    return this.restoreVersionUseCase.execute(resumeId, versionId, userId);
  }
}
