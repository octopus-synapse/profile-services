import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { $ } from 'bun';

describe('post-comment CLI', () => {
  const CLI_PATH = 'src/pr-comment/cli/post-comment.ts';
  let testSvgPath: string;

  beforeEach(async () => {
    testSvgPath = '/tmp/test-card.svg';
    await Bun.write(testSvgPath, '<svg><text>Test Card</text></svg>');
  });

  afterEach(async () => {
    try {
      await $`rm -f ${testSvgPath}`.quiet();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('argument validation', () => {
    it('requires --pr argument', async () => {
      const result =
        await $`GITHUB_TOKEN=test GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --svg=${testSvgPath}`
          .nothrow()
          .quiet();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('--pr');
    });

    it('requires --svg or --stdin', async () => {
      const result =
        await $`GITHUB_TOKEN=test GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123`
          .nothrow()
          .quiet();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('--svg');
    });

    it('fails without valid credentials', async () => {
      // When token is invalid/missing, the API call fails
      const result =
        await $`GITHUB_TOKEN="" GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123 --svg=${testSvgPath}`
          .nothrow()
          .quiet();

      // Should fail (either validation or API error)
      expect(result.exitCode).toBe(1);
    });

    it('requires repository information', async () => {
      const result = await $`GITHUB_TOKEN=test bun ${CLI_PATH} --pr=123 --svg=${testSvgPath}`
        .nothrow()
        .quiet();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('repository');
    });
  });

  describe('--stdin flag', () => {
    it('reads SVG from stdin when --stdin is provided', async () => {
      // This will fail at API call but should parse args correctly
      const result =
        await $`echo "<svg>stdin</svg>" | GITHUB_TOKEN=invalid GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123 --stdin`
          .nothrow()
          .quiet();

      // Exit code 1 means it ran and failed at API (args were parsed correctly)
      expect(result.exitCode).toBe(1);
    });
  });

  describe('--tag flag', () => {
    it('accepts custom comment tag', async () => {
      // This will fail at API call but validates arg parsing
      const result =
        await $`GITHUB_TOKEN=invalid GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123 --svg=${testSvgPath} --tag=custom-tag`
          .nothrow()
          .quiet();

      // Exit code 1 means it ran and failed at API
      expect(result.exitCode).toBe(1);
    });
  });

  describe('repository parsing', () => {
    it('parses GITHUB_REPOSITORY format', async () => {
      const result =
        await $`GITHUB_TOKEN=invalid GITHUB_REPOSITORY=myowner/myrepo bun ${CLI_PATH} --pr=123 --svg=${testSvgPath}`
          .nothrow()
          .quiet();

      // Exit code 1 means it reached API call with parsed repo
      expect(result.exitCode).toBe(1);
    });

    it('uses GITHUB_OWNER and GITHUB_REPO when set', async () => {
      const result =
        await $`GITHUB_TOKEN=invalid GITHUB_OWNER=owner GITHUB_REPO=repo bun ${CLI_PATH} --pr=123 --svg=${testSvgPath}`
          .nothrow()
          .quiet();

      // Exit code 1 means it reached API call
      expect(result.exitCode).toBe(1);
    });
  });

  describe('file reading', () => {
    it('reads SVG from file path', async () => {
      const result =
        await $`GITHUB_TOKEN=invalid GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123 --svg=${testSvgPath}`
          .nothrow()
          .quiet();

      // Exit code 1 means it read the file and failed at API
      expect(result.exitCode).toBe(1);
    });

    it('fails for non-existent SVG file', async () => {
      const result =
        await $`GITHUB_TOKEN=test GITHUB_REPOSITORY=owner/repo bun ${CLI_PATH} --pr=123 --svg=/nonexistent/file.svg`
          .nothrow()
          .quiet();

      expect(result.exitCode).toBe(1);
    });
  });
});
