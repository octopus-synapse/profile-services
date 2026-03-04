import { Inject, Injectable } from '@nestjs/common';
import {
  RESUME_VERSION_USE_CASES,
  type ResumeVersionUseCases,
} from './resume-version/ports/resume-version.port';

@Injectable()
export class ResumeVersionService {
  constructor(
    @Inject(RESUME_VERSION_USE_CASES)
    private readonly useCases: ResumeVersionUseCases,
  ) {}

  async createSnapshot(resumeId: string, label?: string) {
    return this.useCases.createSnapshotUseCase.execute(resumeId, label);
  }

  async getVersions(resumeId: string, userId: string) {
    return this.useCases.getVersionsUseCase.execute(resumeId, userId);
  }

  async restoreVersion(resumeId: string, versionId: string, userId: string) {
    return this.useCases.restoreVersionUseCase.execute(resumeId, versionId, userId);
  }
}
