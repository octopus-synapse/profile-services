/**
 * Auto-sync — pulls the GitHub username off the resume's existing
 * `github` URL field and runs the same orchestrator. Throws
 * `GitHubUsernameMissingException` when the resume has no link.
 */

import { type GitHubSyncResult, GitHubSyncService } from '../../services/github-sync.service';

export class AutoSyncGitHubFromResumeUseCase {
  constructor(private readonly sync: GitHubSyncService) {}

  execute(userId: string, resumeId: string): Promise<GitHubSyncResult> {
    return this.sync.autoSyncGitHubFromResume(userId, resumeId);
  }
}
