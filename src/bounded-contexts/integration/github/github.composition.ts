/**
 * Pure-TS wiring for the github integration BC. Zero `@nestjs/*` imports.
 *
 * The `OctokitGitHubApiAdapter` reads `GITHUB_TOKEN` from a structural
 * config-reader passed in by the module shell — keeps the composition
 * decoupled from `@nestjs/config`.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { GitHubIntegrationUseCases } from './application/ports/github-integration.port';
import { GitHubAchievementService } from './application/services/github-achievement.service';
import { GitHubContributionService } from './application/services/github-contribution.service';
import { GitHubSyncService } from './application/services/github-sync.service';
import { AutoSyncGitHubFromResumeUseCase } from './application/use-cases/auto-sync-github-from-resume/auto-sync-github-from-resume.use-case';
import { GetGitHubSummaryUseCase } from './application/use-cases/get-github-summary/get-github-summary.use-case';
import { GetGitHubSyncStatusUseCase } from './application/use-cases/get-github-sync-status/get-github-sync-status.use-case';
import { SyncGitHubUseCase } from './application/use-cases/sync-github/sync-github.use-case';
import { OctokitGitHubApiAdapter } from './infrastructure/adapters/external-services/octokit-github-api.adapter';
import { PrismaGitHubResumeRepository } from './infrastructure/adapters/persistence/prisma-github-resume.repository';

export { GitHubIntegrationUseCases };

/** Minimal structural shape of the bits we need from `ConfigService`. */
export interface GitHubConfigReader {
  get<T = string>(key: string): T | undefined;
}

export function buildGitHubIntegrationUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  config: GitHubConfigReader,
): GitHubIntegrationUseCases {
  // Outbound adapters
  const api = new OctokitGitHubApiAdapter(config, logger);
  const resumes = new PrismaGitHubResumeRepository(prisma, logger);

  // App services
  const achievements = new GitHubAchievementService();
  const contributions = new GitHubContributionService(api);
  const sync = new GitHubSyncService(api, resumes, contributions, achievements);

  return {
    getGitHubSummary: new GetGitHubSummaryUseCase(api),
    syncGitHub: new SyncGitHubUseCase(sync),
    autoSyncGitHubFromResume: new AutoSyncGitHubFromResumeUseCase(sync),
    getGitHubSyncStatus: new GetGitHubSyncStatusUseCase(resumes),
  };
}
