/**
 * Route descriptors for the github integration BC. Replaces
 * `GitHubController`. Pure data + handler closures over the use-case
 * bundle — no Nest decorators, no DTO classes.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { GitHubIntegrationUseCases } from './application/ports/github-integration.port';
import type { GitHubSummaryResult } from './application/use-cases/get-github-summary/get-github-summary.use-case';
import type { GitHubSyncResult } from './application/use-cases/sync-github/sync-github.use-case';
import { toPinnedRepos } from './infrastructure/presenters/github.presenter';

const SummaryParams = z.object({ username: z.string() });
const ResumeIdParams = z.object({ resumeId: z.string() });
const SyncBody = z.object({
  githubUsername: z.string(),
  resumeId: z.string(),
});

function toGitHubSummaryDto(result: GitHubSummaryResult) {
  return {
    username: result.username,
    name: result.name ?? undefined,
    bio: result.bio ?? undefined,
    publicRepos: result.publicRepos,
    followers: 0,
    following: 0,
    topLanguages: [] as string[],
    pinnedRepos: toPinnedRepos(
      result.topRepos.map((r) => ({ name: r.name, description: r.description, url: r.url })),
    ),
  };
}

function toGitHubSyncResponseDto(result: GitHubSyncResult) {
  return {
    synced: true,
    message: `Synced GitHub profile for ${result.profile.username}`,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export const githubRoutes: ReadonlyArray<Route<GitHubIntegrationUseCases>> = [
  {
    method: 'GET',
    path: '/v1/integrations/github/summary/:username',
    auth: { kind: 'public' },
    params: SummaryParams,
    openapi: {
      summary: 'Get GitHub profile summary for a username',
      tags: ['github'],
      description: 'GitHub summary with repositories, contributions, and stats',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { username } = ctx.params as { username: string };
      const result = await bc.getGitHubSummary.execute(username);
      return toGitHubSummaryDto(result);
    },
  },
  {
    method: 'POST',
    path: '/v1/integrations/github/sync',
    auth: { kind: 'jwt' },
    body: SyncBody,
    openapi: {
      summary: 'Sync GitHub data to user resume',
      tags: ['github'],
      description: 'GitHub data synced successfully',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { githubUsername: string; resumeId: string };
      const result = await bc.syncGitHub.execute(
        ctx.user!.userId,
        body.githubUsername,
        body.resumeId,
      );
      return toGitHubSyncResponseDto(result);
    },
  },
  {
    method: 'POST',
    path: '/v1/integrations/github/sync/:resumeId/auto',
    auth: { kind: 'jwt' },
    params: ResumeIdParams,
    openapi: {
      summary: 'Auto-sync GitHub from resume GitHub link',
      tags: ['github'],
      description: 'GitHub data auto-synced successfully',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const result = await bc.autoSyncGitHubFromResume.execute(ctx.user!.userId, resumeId);
      return toGitHubSyncResponseDto(result);
    },
  },
  {
    method: 'GET',
    path: '/v1/integrations/github/sync-status/:resumeId',
    auth: { kind: 'jwt' },
    params: ResumeIdParams,
    openapi: {
      summary: 'Get GitHub sync status for a resume',
      tags: ['github'],
      description: 'Sync status',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const result = await bc.getGitHubSyncStatus.execute(ctx.user!.userId, resumeId);
      return {
        success: true,
        data: {
          status: result.hasSynced ? 'COMPLETED' : 'IDLE',
          progress: result.hasSynced ? 100 : 0,
          startedAt: result.lastSyncedAt ? toIsoString(result.lastSyncedAt) : undefined,
          currentTask: undefined,
        },
      };
    },
  },
];
