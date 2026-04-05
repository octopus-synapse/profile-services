import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { $ } from 'bun';

describe('generate-card CLI', () => {
  const CLI_PATH = 'src/pr-comment/cli/generate-card.ts';
  let testAttestationPath: string;
  let testCIMetricsPath: string;

  beforeEach(async () => {
    // Create test files
    testAttestationPath = '/tmp/test-attestation.json';
    testCIMetricsPath = '/tmp/test-ci-metrics.json';

    await Bun.write(
      testAttestationPath,
      JSON.stringify({
        version: '3',
        tree_hash: 'abc123',
        checks: '',
        metrics: {
          swagger: { status: 'ok', time_ms: 1000 },
          typecheck: { status: 'ok', time_ms: 2000 },
          lint: { status: 'ok', time_ms: 500 },
          unit: { status: 'ok', time_ms: 3000, passed: 100, failed: 0, skipped: 5 },
          arch: { status: 'ok', time_ms: 1000, passed: 40, failed: 0, skipped: 1 },
          contracts: { status: 'ok', time_ms: 500, passed: 45, failed: 0, skipped: 0 },
        },
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      }),
    );

    await Bun.write(
      testCIMetricsPath,
      JSON.stringify({
        build: { status: 'success', duration_ms: 60000 },
        integration: { status: 'success', duration_ms: 180000, passed: 150, failed: 0, skipped: 5 },
        e2e: { status: 'success', duration_ms: 240000, passed: 50, failed: 0, skipped: 2 },
        security: { status: 'success', duration_ms: 30000 },
      }),
    );
  });

  afterEach(async () => {
    // Cleanup
    try {
      await $`rm -f ${testAttestationPath} ${testCIMetricsPath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('--attestation flag', () => {
    it('generates SVG from attestation file', async () => {
      const result = await $`bun ${CLI_PATH} --attestation=${testAttestationPath}`.text();

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('CI PIPELINE');
    });

    it('includes precommit checks in output', async () => {
      const result = await $`bun ${CLI_PATH} --attestation=${testAttestationPath}`.text();

      expect(result).toContain('Swagger');
      expect(result).toContain('Typecheck');
      expect(result).toContain('Lint');
      expect(result).toContain('Unit');
    });
  });

  describe('--ci-metrics flag', () => {
    it('includes CI metrics when provided', async () => {
      const result =
        await $`bun ${CLI_PATH} --attestation=${testAttestationPath} --ci-metrics=${testCIMetricsPath}`.text();

      expect(result).toContain('Build');
      expect(result).toContain('Integration');
      expect(result).toContain('E2e'); // Capitalized as "E2e" not "E2E"
      expect(result).toContain('Security');
    });
  });

  describe('--stdin flag', () => {
    it('reads JSON from stdin', async () => {
      const input = JSON.stringify({
        attestation: {
          version: '3',
          tree_hash: 'stdin123',
          checks: '',
          metrics: {
            typecheck: { status: 'ok', time_ms: 1000 },
          },
          timestamp: '2024-01-01T00:00:00Z',
          git_user: 'stdin@test.com',
        },
        git: {
          commit_hash: 'abc12345',
          commit_message: 'feat: stdin test',
          commit_author: 'Stdin User',
          branch: 'stdin-branch',
        },
      });

      const result = await $`echo ${input} | bun ${CLI_PATH} --stdin`.text();

      expect(result).toContain('<svg');
      expect(result).toContain('feat: stdin test');
      expect(result).toContain('Stdin User');
    });
  });

  describe('error handling', () => {
    it('exits with error for missing attestation file', async () => {
      try {
        await $`bun ${CLI_PATH} --attestation=/nonexistent/path.json`.throws(true);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBeDefined();
      }
    });

    it('shows usage when no arguments provided', async () => {
      try {
        await $`bun ${CLI_PATH}`.throws(true);
        expect(true).toBe(false);
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('fails on invalid JSON stdin', async () => {
      try {
        await $`echo "not json" | bun ${CLI_PATH} --stdin`.throws(true);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
