import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  createGitHubClient,
  type FetchFn,
} from '../../../src/pr-comment/infrastructure/github-client';

describe('github-client', () => {
  let mockFetch: ReturnType<typeof mock<FetchFn>>;

  beforeEach(() => {
    mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
  });

  describe('getWorkflowJobs', () => {
    it('returns CI metrics from workflow jobs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                name: 'Build',
                status: 'completed',
                conclusion: 'success',
                started_at: '2024-01-01T10:00:00Z',
                completed_at: '2024-01-01T10:01:00Z',
              },
              {
                name: 'Integration Tests',
                status: 'completed',
                conclusion: 'success',
                started_at: '2024-01-01T10:01:00Z',
                completed_at: '2024-01-01T10:04:00Z',
              },
              {
                name: 'E2E Tests',
                status: 'completed',
                conclusion: 'failure',
                started_at: '2024-01-01T10:01:00Z',
                completed_at: '2024-01-01T10:05:00Z',
              },
              {
                name: 'Security Scan',
                status: 'in_progress',
                conclusion: null,
                started_at: '2024-01-01T10:00:00Z',
                completed_at: null,
              },
            ],
          }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const metrics = await client.getWorkflowJobs(123);

      expect(metrics.build.status).toBe('success');
      expect(metrics.build.duration_ms).toBe(60000);
      expect(metrics.integration.status).toBe('success');
      expect(metrics.e2e.status).toBe('fail');
      expect(metrics.security.status).toBe('running');
    });

    it('returns pending for missing jobs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: [] }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const metrics = await client.getWorkflowJobs(123);

      expect(metrics.build.status).toBe('pending');
      expect(metrics.integration.status).toBe('pending');
      expect(metrics.e2e.status).toBe('pending');
      expect(metrics.security.status).toBe('pending');
    });

    it('maps skipped conclusion correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                name: 'Build',
                status: 'completed',
                conclusion: 'skipped',
                started_at: null,
                completed_at: null,
              },
            ],
          }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const metrics = await client.getWorkflowJobs(123);

      expect(metrics.build.status).toBe('skip');
    });

    it('calls correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobs: [] }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'myowner',
        repo: 'myrepo',
        fetch: mockFetch,
      });

      await client.getWorkflowJobs(456);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/myowner/myrepo/actions/runs/456/jobs',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });

  describe('findCommentByTag', () => {
    it('finds existing comment with tag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, body: 'Some comment' },
            { id: 2, body: '<!-- ci-status-card -->\nCI Status' },
            { id: 3, body: 'Another comment' },
          ]),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const id = await client.findCommentByTag(123, 'ci-status-card');

      expect(id).toBe(2);
    });

    it('returns null when no comment with tag exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, body: 'Some comment' },
            { id: 2, body: 'Another comment' },
          ]),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const id = await client.findCommentByTag(123, 'ci-status-card');

      expect(id).toBeNull();
    });

    it('returns null for empty comments array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      const id = await client.findCommentByTag(123, 'ci-status-card');

      expect(id).toBeNull();
    });
  });

  describe('postComment', () => {
    it('creates new comment when none exists', async () => {
      // First call: findCommentByTag returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
      // Second call: POST new comment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 123 }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      await client.postComment(1, '<svg>...</svg>', 'ci-status-card');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toBe(
        'https://api.github.com/repos/owner/repo/issues/1/comments',
      );
      expect(mockFetch.mock.calls[1][1]).toMatchObject({
        method: 'POST',
        body: expect.stringContaining('ci-status-card'),
      });
    });

    it('updates existing comment when found', async () => {
      // First call: findCommentByTag finds comment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 456, body: '<!-- ci-status-card -->\nOld content' }]),
      } as Response);
      // Second call: PATCH existing comment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 456 }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      await client.postComment(1, '<svg>New content</svg>', 'ci-status-card');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toBe(
        'https://api.github.com/repos/owner/repo/issues/comments/456',
      );
      expect(mockFetch.mock.calls[1][1]).toMatchObject({
        method: 'PATCH',
      });
    });

    it('includes tag marker in comment body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 123 }),
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      await client.postComment(1, 'Content', 'my-tag');

      const body = JSON.parse(mockFetch.mock.calls[1][1]?.body as string);
      expect(body.body).toContain('<!-- my-tag -->');
      expect(body.body).toContain('Content');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const client = createGitHubClient({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        fetch: mockFetch,
      });

      await expect(client.postComment(1, 'Content', 'tag')).rejects.toThrow(
        'GitHub API error: 403 Forbidden',
      );
    });
  });
});
