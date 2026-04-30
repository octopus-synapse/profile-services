/**
 * Returns whether a resume has been synced with GitHub data and a
 * compact stats block (totalStars / open-source count / achievement
 * count). The repository owns the section-walk; we just delegate.
 */

import {
  GitHubResumeRepositoryPort,
  type ResumeGitHubSyncStatus,
} from '../../../domain/ports/github-resume.repository.port';

export class GetGitHubSyncStatusUseCase {
  constructor(private readonly resumes: GitHubResumeRepositoryPort) {}

  execute(userId: string, resumeId: string): Promise<ResumeGitHubSyncStatus> {
    return this.resumes.getSyncStatus(userId, resumeId);
  }
}
