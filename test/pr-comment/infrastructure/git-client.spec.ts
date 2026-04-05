import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createGitClient, type ExecFn } from '../../../src/pr-comment/infrastructure/git-client';

describe('git-client', () => {
  let mockExec: ReturnType<typeof mock<ExecFn>>;

  beforeEach(() => {
    mockExec = mock(() => Promise.resolve({ stdout: '', exitCode: 0 }));
    // Clear env vars
    delete process.env.GITHUB_SHA;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_RUN_NUMBER;
  });

  describe('getCommitInfo', () => {
    it('returns commit info from git commands', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345678', exitCode: 0 }) // rev-parse HEAD
        .mockResolvedValueOnce({ stdout: "'feat: add feature'", exitCode: 0 }) // log -1 %s
        .mockResolvedValueOnce({ stdout: "'John Doe'", exitCode: 0 }) // log -1 %an
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 }) // log -1 %b (no co-authors)
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 }); // rev-parse --abbrev-ref

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.commit_hash).toBe('abc12345');
      expect(info.commit_message).toBe('feat: add feature');
      expect(info.commit_author).toBe('John Doe');
      expect(info.branch).toBe('main');
      expect(info.co_authors).toEqual([]);
    });

    it('uses GITHUB_SHA env var when available', async () => {
      process.env.GITHUB_SHA = 'envsha123456789';

      mockExec
        .mockResolvedValueOnce({ stdout: "'feat: test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'Test User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'feature-branch', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.commit_hash).toBe('envsha12');
    });

    it('uses GITHUB_REF_NAME env var for branch', async () => {
      process.env.GITHUB_REF_NAME = 'env-branch';

      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.branch).toBe('env-branch');
    });

    it('uses GITHUB_HEAD_REF for PR branches', async () => {
      process.env.GITHUB_HEAD_REF = 'pr-branch';

      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.branch).toBe('pr-branch');
    });

    it('extracts co-authors from commit body', async () => {
      const body = `'Some description

Co-authored-by: Alice Smith <alice@example.com>
Co-authored-by: Bob Jones <bob@example.com>'`;

      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: body, exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.co_authors).toEqual(['Alice Smith', 'Bob Jones']);
    });

    it('limits co-authors to 2', async () => {
      const body = `'
Co-authored-by: Alice <a@x.com>
Co-authored-by: Bob <b@x.com>
Co-authored-by: Charlie <c@x.com>'`;

      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: body, exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.co_authors).toHaveLength(2);
    });

    it('uses GITHUB_RUN_NUMBER env var', async () => {
      process.env.GITHUB_RUN_NUMBER = '123';

      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.run_number).toBe(123);
    });

    it('defaults run_number to 0 when not set', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.run_number).toBe(0);
    });

    it('includes timestamp in UTC format', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: 'abc12345', exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'test'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "'User'", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: "''", exitCode: 0 })
        .mockResolvedValueOnce({ stdout: 'main', exitCode: 0 });

      const client = createGitClient(mockExec);
      const info = await client.getCommitInfo();

      expect(info.timestamp).toMatch(/^\d{2}:\d{2} UTC$/);
    });
  });
});
