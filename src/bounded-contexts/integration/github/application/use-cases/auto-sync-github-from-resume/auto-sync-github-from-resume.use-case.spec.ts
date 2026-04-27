import { describe, expect, it } from 'bun:test';
import { GitHubUsernameMissingException } from '../../../../domain/exceptions/integration.exceptions';
import { InMemoryGitHubApi, InMemoryGitHubResumeRepository } from '../../../testing';
import { GitHubAchievementService } from '../../services/github-achievement.service';
import { GitHubContributionService } from '../../services/github-contribution.service';
import { GitHubSyncService } from '../../services/github-sync.service';
import { AutoSyncGitHubFromResumeUseCase } from './auto-sync-github-from-resume.use-case';

describe('AutoSyncGitHubFromResumeUseCase', () => {
  it('throws GitHubUsernameMissingException when the resume has no github URL', async () => {
    const api = new InMemoryGitHubApi();
    const resumes = new InMemoryGitHubResumeRepository();
    resumes.seedResume({ id: 'r-1', userId: 'u-1', github: null });
    const sync = new GitHubSyncService(
      api,
      resumes,
      new GitHubContributionService(api),
      new GitHubAchievementService(),
    );
    await expect(
      new AutoSyncGitHubFromResumeUseCase(sync).execute('u-1', 'r-1'),
    ).rejects.toBeInstanceOf(GitHubUsernameMissingException);
  });
});
