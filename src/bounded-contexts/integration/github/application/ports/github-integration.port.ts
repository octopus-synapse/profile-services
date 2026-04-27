/**
 * Bundle token for the github integration BC. Doubles as the
 * TypeScript shape of the use-case bag and the Nest DI token.
 * Composition lives in `github.composition.ts` — Nest-free.
 */

import type { AutoSyncGitHubFromResumeUseCase } from '../use-cases/auto-sync-github-from-resume/auto-sync-github-from-resume.use-case';
import type { GetGitHubSummaryUseCase } from '../use-cases/get-github-summary/get-github-summary.use-case';
import type { GetGitHubSyncStatusUseCase } from '../use-cases/get-github-sync-status/get-github-sync-status.use-case';
import type { SyncGitHubUseCase } from '../use-cases/sync-github/sync-github.use-case';

export abstract class GitHubIntegrationUseCases {
  abstract readonly getGitHubSummary: GetGitHubSummaryUseCase;
  abstract readonly syncGitHub: SyncGitHubUseCase;
  abstract readonly autoSyncGitHubFromResume: AutoSyncGitHubFromResumeUseCase;
  abstract readonly getGitHubSyncStatus: GetGitHubSyncStatusUseCase;
}
