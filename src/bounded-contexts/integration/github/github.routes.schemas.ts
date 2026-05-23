/**
 * Route descriptors for the github integration BC. Replaces
 * `GitHubController`. Pure data + handler closures over the use-case
 * bundle — no Nest decorators, no DTO classes.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import type { GitHubSummaryResult } from './application/use-cases/get-github-summary/get-github-summary.use-case';
import type { GitHubSyncResult } from './application/use-cases/sync-github/sync-github.use-case';
import { toPinnedReposResponseDto } from './infrastructure/presenters/github.presenter';

export const SummaryParams = z
  .object({ username: z.string() })
  .openapi({ example: { username: 'octocat' } });
export const ResumeIdParams = z.object({ resumeId: z.string().uuid() });
export const SyncBody = z
  .object({
    githubUsername: z.string(),
    resumeId: z.string().uuid(),
  })
  .openapi({
    example: {
      githubUsername: 'octocat',
      resumeId: '01900000-0000-7000-a000-000000000001',
    },
  });

// ─── Response schemas ─────────────────────────────────────────────────
export const PinnedRepoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string(),
});

export const GitHubSummaryResponseSchema = z.object({
  username: z.string(),
  name: z.string().optional(),
  bio: z.string().optional(),
  publicRepos: z.number().int(),
  followers: z.number().int(),
  following: z.number().int(),
  topLanguages: z.array(z.string()),
  pinnedRepos: z.array(PinnedRepoSchema),
});

export const GitHubSyncResponseSchema = z.object({
  synced: z.boolean(),
  message: z.string(),
});

export const GitHubSyncStatusResponseSchema = z.object({
  status: z.enum(['IDLE', 'COMPLETED']),
  progress: z.number().int(),
  startedAt: IsoDateTimeSchema.optional(),
  currentTask: z.string().optional(),
});

export function toGitHubSummaryDto(result: GitHubSummaryResult) {
  return {
    username: result.username,
    name: result.name ?? undefined,
    bio: result.bio ?? undefined,
    publicRepos: result.publicRepos,
    followers: 0,
    following: 0,
    topLanguages: [] as string[],
    pinnedRepos: toPinnedReposResponseDto(
      result.topRepos.map((r) => ({ name: r.name, description: r.description, url: r.url })),
    ),
  };
}

export function toGitHubSyncResponseDto(result: GitHubSyncResult) {
  return {
    synced: true,
    message: `Synced GitHub profile for ${result.profile.username}`,
  };
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
