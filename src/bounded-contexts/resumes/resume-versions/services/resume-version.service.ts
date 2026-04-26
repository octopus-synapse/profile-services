import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import { ResumeVersionUseCases } from './resume-version/ports/resume-version.port';

export class ResumeVersionService extends ResumeVersionServicePort {
  constructor(private readonly useCases: ResumeVersionUseCases) {
    super();
  }

  async createSnapshot(resumeId: string, label?: string): Promise<void> {
    await this.useCases.createSnapshotUseCase.execute(resumeId, label);
  }

  async getVersions(resumeId: string, userId: string) {
    return this.useCases.getVersionsUseCase.execute(resumeId, userId);
  }

  async restoreVersion(resumeId: string, versionId: string, userId: string) {
    return this.useCases.restoreVersionUseCase.execute(resumeId, versionId, userId);
  }
}
