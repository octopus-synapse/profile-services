/**
 * GitHub Integration Module
 *
 * ADR-001: 4 POJO use cases drive the controller. The orchestrator
 * (`GitHubSyncService`) and the pure-logic services (achievement,
 * contribution) live under `application/services/`. Outbound I/O is
 * behind two ports: `GitHubApiPort` (REST adapter) and
 * `GitHubResumeRepositoryPort` (Prisma adapter).
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { GitHubAchievementService } from './application/services/github-achievement.service';
import { GitHubContributionService } from './application/services/github-contribution.service';
import { GitHubSyncService } from './application/services/github-sync.service';
import { AutoSyncGitHubFromResumeUseCase } from './application/use-cases/auto-sync-github-from-resume/auto-sync-github-from-resume.use-case';
import { GetGitHubSummaryUseCase } from './application/use-cases/get-github-summary/get-github-summary.use-case';
import { GetGitHubSyncStatusUseCase } from './application/use-cases/get-github-sync-status/get-github-sync-status.use-case';
import { SyncGitHubUseCase } from './application/use-cases/sync-github/sync-github.use-case';
import { GitHubApiPort } from './domain/ports/github-api.port';
import { GitHubResumeRepositoryPort } from './domain/ports/github-resume.repository.port';
import { OctokitGitHubApiAdapter } from './infrastructure/adapters/external-services/octokit-github-api.adapter';
import { PrismaGitHubResumeRepository } from './infrastructure/adapters/persistence/prisma-github-resume.repository';
import { GitHubController } from './infrastructure/controllers/github.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GitHubController],
  providers: [
    {
      provide: GitHubApiPort,
      useFactory: (config: ConfigService, logger: LoggerPort) =>
        new OctokitGitHubApiAdapter(config, logger),
      inject: [ConfigService, LoggerPort],
    },
    {
      provide: GitHubResumeRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaGitHubResumeRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: GitHubAchievementService,
      useFactory: () => new GitHubAchievementService(),
    },
    {
      provide: GitHubContributionService,
      useFactory: (api: GitHubApiPort) => new GitHubContributionService(api),
      inject: [GitHubApiPort],
    },
    {
      provide: GitHubSyncService,
      useFactory: (
        api: GitHubApiPort,
        resumes: GitHubResumeRepositoryPort,
        contributions: GitHubContributionService,
        achievements: GitHubAchievementService,
      ) => new GitHubSyncService(api, resumes, contributions, achievements),
      inject: [
        GitHubApiPort,
        GitHubResumeRepositoryPort,
        GitHubContributionService,
        GitHubAchievementService,
      ],
    },
    {
      provide: GetGitHubSummaryUseCase,
      useFactory: (api: GitHubApiPort) => new GetGitHubSummaryUseCase(api),
      inject: [GitHubApiPort],
    },
    {
      provide: SyncGitHubUseCase,
      useFactory: (sync: GitHubSyncService) => new SyncGitHubUseCase(sync),
      inject: [GitHubSyncService],
    },
    {
      provide: AutoSyncGitHubFromResumeUseCase,
      useFactory: (sync: GitHubSyncService) => new AutoSyncGitHubFromResumeUseCase(sync),
      inject: [GitHubSyncService],
    },
    {
      provide: GetGitHubSyncStatusUseCase,
      useFactory: (resumes: GitHubResumeRepositoryPort) =>
        new GetGitHubSyncStatusUseCase(resumes),
      inject: [GitHubResumeRepositoryPort],
    },
  ],
})
export class GitHubModule {}
