/**
 * Pure-TS wiring for the identity/users/shadow-profile sub-BC. Zero
 * `@nestjs/*` imports. The Nest module shell consumes this via
 * `useFactory`; the Elysia path uses the same wiring.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { ShadowGithubApiAdapter } from './github-api.adapter';
import { shadowProfileRoutes } from './shadow-profile.routes';
import { ShadowProfileService } from './shadow-profile.service';

export interface ShadowProfileUseCases {
  readonly shadowProfileService: ShadowProfileService;
  readonly githubApi: ShadowGithubApiAdapter;
}

export function buildShadowProfileUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): ShadowProfileUseCases {
  const githubApi = new ShadowGithubApiAdapter(logger);
  const shadowProfileService = new ShadowProfileService(prisma, githubApi);
  return { shadowProfileService, githubApi };
}

export function buildShadowProfileComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<ShadowProfileService> {
  const useCases = buildShadowProfileUseCases(prisma, logger);

  return {
    useCases: useCases.shadowProfileService,
    routes: shadowProfileRoutes,
  };
}
