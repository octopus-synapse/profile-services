/**
 * GitHub Client Infrastructure
 *
 * Adapter for GitHub API operations with dependency injection for testability.
 */

import type { CheckStatus, CIJobMetrics, CIMetrics } from '../domain/types';

// =============================================================================
// Types
// =============================================================================

export type FetchFn = (url: string, options?: RequestInit) => Promise<Response>;

export interface GitHubClient {
  getWorkflowJobs(runId: number): Promise<CIMetrics>;
  postComment(prNumber: number, body: string, commentTag: string): Promise<void>;
  findCommentByTag(prNumber: number, commentTag: string): Promise<number | null>;
}

export interface GitHubClientOptions {
  token: string;
  owner: string;
  repo: string;
  fetch?: FetchFn;
}

// =============================================================================
// Job Status Mapping
// =============================================================================

function mapJobStatus(conclusion: string | null, status: string): CheckStatus {
  if (status === 'in_progress' || status === 'queued') {
    return 'running';
  }
  if (conclusion === 'success') {
    return 'success';
  }
  if (conclusion === 'failure') {
    return 'fail';
  }
  if (conclusion === 'skipped') {
    return 'skip';
  }
  return 'pending';
}

function calculateDuration(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt || !completedAt) {
    return 0;
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return end - start;
}

// =============================================================================
// GitHub Client Factory
// =============================================================================

export function createGitHubClient(options: GitHubClientOptions): GitHubClient {
  const { token, owner, repo, fetch: fetchFn = fetch } = options;

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async function apiGet<T>(path: string): Promise<T> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async function apiPost<T>(path: string, body: object): Promise<T> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async function apiPatch<T>(path: string, body: object): Promise<T> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  function findJob(jobs: JobInfo[], pattern: RegExp): JobInfo | undefined {
    return jobs.find((job) => pattern.test(job.name));
  }

  function jobToMetrics(job: JobInfo | undefined): CIJobMetrics {
    if (!job) {
      return { status: 'pending', duration_ms: 0 };
    }

    return {
      status: mapJobStatus(job.conclusion, job.status),
      duration_ms: calculateDuration(job.started_at, job.completed_at),
      // Note: Detailed test metrics would need to come from artifacts
      passed: undefined,
      failed: undefined,
      skipped: undefined,
      suites: undefined,
    };
  }

  return {
    async getWorkflowJobs(runId: number): Promise<CIMetrics> {
      interface JobsResponse {
        jobs: JobInfo[];
      }

      const { jobs } = await apiGet<JobsResponse>(`/actions/runs/${runId}/jobs`);

      return {
        build: jobToMetrics(findJob(jobs, /build/i)),
        integration: jobToMetrics(findJob(jobs, /integration/i)),
        e2e: jobToMetrics(findJob(jobs, /e2e/i)),
        security: jobToMetrics(findJob(jobs, /security/i)),
      };
    },

    async findCommentByTag(prNumber: number, commentTag: string): Promise<number | null> {
      interface Comment {
        id: number;
        body: string;
      }

      const comments = await apiGet<Comment[]>(`/issues/${prNumber}/comments`);
      const tagMarker = `<!-- ${commentTag} -->`;

      const existing = comments.find((c) => c.body.includes(tagMarker));
      return existing?.id ?? null;
    },

    async postComment(prNumber: number, body: string, commentTag: string): Promise<void> {
      const tagMarker = `<!-- ${commentTag} -->`;
      const bodyWithTag = `${tagMarker}\n${body}`;

      const existingId = await this.findCommentByTag(prNumber, commentTag);

      if (existingId) {
        await apiPatch(`/issues/comments/${existingId}`, { body: bodyWithTag });
      } else {
        await apiPost(`/issues/${prNumber}/comments`, { body: bodyWithTag });
      }
    },
  };
}

// =============================================================================
// Internal Types
// =============================================================================

interface JobInfo {
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}
