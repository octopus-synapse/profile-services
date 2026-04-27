/**
 * Manual GitHub sync — controller hands us a (userId, githubUsername,
 * resumeId) trio and we run the orchestrator.
 */

import { type GitHubSyncResult, GitHubSyncService } from '../../services/github-sync.service';

// Re-exported so callers (controller, tests) can name the return shape
// without reaching into application/services/.
export type { GitHubSyncResult };

export class SyncGitHubUseCase {
  constructor(private readonly sync: GitHubSyncService) {}

  execute(userId: string, githubUsername: string, resumeId: string): Promise<GitHubSyncResult> {
    return this.sync.syncUserGitHub(userId, githubUsername, resumeId);
  }
}
