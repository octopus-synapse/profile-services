/**
 * GitHub Integration Module
 *
 * Thin Nest shell over `buildGitHubIntegrationUseCases`. All wiring
 * lives in `github.composition.ts`. The `OctokitGitHubApiAdapter`
 * needs `ConfigService` to read `GITHUB_TOKEN`; the module hands the
 * service into the composition function.
 *
 * Routes are described in `github.routes.ts` and synthesized into Nest
 * controllers at module load via `synthesizeRouteControllers`.
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { GitHubIntegrationUseCases } from './application/ports/github-integration.port';
import { buildGitHubIntegrationUseCases } from './github.composition';
import { githubRoutes } from './github.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(GitHubIntegrationUseCases, githubRoutes),
  providers: [
    {
      provide: GitHubIntegrationUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort, config: ConfigService) =>
        buildGitHubIntegrationUseCases(prisma, logger, config),
      inject: [PrismaService, LoggerPort, ConfigService],
    },
  ],
  exports: [GitHubIntegrationUseCases],
})
export class GitHubModule {}
