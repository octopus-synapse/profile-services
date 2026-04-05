import { describe, expect, it } from 'bun:test';
import { generateCard } from '../../../src/pr-comment/domain/card';
import type { CardData } from '../../../src/pr-comment/domain/types';

describe('card', () => {
  const baseData: CardData = {
    metrics: {
      precommit: {
        checks: [
          {
            name: 'swagger',
            status: 'success',
            suites: null,
            total: null,
            passed: null,
            failed: null,
            duration_ms: 1000,
          },
          {
            name: 'typecheck',
            status: 'success',
            suites: null,
            total: null,
            passed: null,
            failed: null,
            duration_ms: 2000,
          },
          {
            name: 'lint',
            status: 'success',
            suites: null,
            total: null,
            passed: null,
            failed: null,
            duration_ms: 500,
          },
          {
            name: 'unit',
            status: 'success',
            suites: 50,
            total: 105,
            passed: 100,
            failed: 0,
            duration_ms: 3000,
          },
          {
            name: 'arch',
            status: 'success',
            suites: 5,
            total: 41,
            passed: 40,
            failed: 0,
            duration_ms: 1000,
          },
          {
            name: 'contracts',
            status: 'success',
            suites: 3,
            total: 45,
            passed: 45,
            failed: 0,
            duration_ms: 500,
          },
        ],
        totals: { suites: 58, total: 191, passed: 185, failed: 0, skipped: 6 },
        duration_ms: 8000,
        attestation_hash: 'abc12345',
      },
      ci: {
        jobs: [
          {
            name: 'build',
            status: 'success',
            suites: null,
            total: null,
            passed: null,
            failed: null,
            duration_ms: 60000,
          },
          {
            name: 'integration',
            status: 'success',
            suites: 10,
            total: 155,
            passed: 150,
            failed: 0,
            duration_ms: 180000,
          },
          {
            name: 'e2e',
            status: 'success',
            suites: 5,
            total: 52,
            passed: 50,
            failed: 0,
            duration_ms: 240000,
          },
          {
            name: 'security',
            status: 'success',
            suites: null,
            total: null,
            passed: null,
            failed: null,
            duration_ms: 30000,
          },
        ],
        totals: { suites: 15, total: 207, passed: 200, failed: 0, skipped: 7 },
        duration_ms: 510000,
      },
      overall: {
        status: 'success',
        total_tests: 398,
        total_passed: 385,
        total_failed: 0,
        total_skipped: 13,
        pass_rate: 96.7,
        duration_ms: 518000,
      },
    },
    git: {
      commit_hash: 'abc12345',
      commit_message: 'feat: add new feature',
      commit_author: 'John Doe',
      co_authors: [],
      branch: 'main',
      run_number: 42,
      timestamp: '12:00 UTC',
    },
  };

  describe('generateCard', () => {
    it('generates valid SVG', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('includes CI PIPELINE header', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('CI PIPELINE');
    });

    it('includes commit message', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('feat: add new feature');
    });

    it('includes commit hash', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('abc12345');
    });

    it('includes author name', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('John Doe');
    });

    it('includes branch name', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('main');
    });

    it('includes PRE-COMMIT section', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('PRE-COMMIT');
    });

    it('includes CI section', () => {
      const svg = generateCard(baseData);

      // The CI header text
      expect(svg).toContain('>CI<');
    });

    it('includes all precommit check names (capitalized)', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('Swagger');
      expect(svg).toContain('Typecheck');
      expect(svg).toContain('Lint');
      expect(svg).toContain('Unit');
      expect(svg).toContain('Arch');
      expect(svg).toContain('Contracts');
    });

    it('includes all CI job names (capitalized)', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('Build');
      expect(svg).toContain('Integration');
      expect(svg).toContain('E2e');
      expect(svg).toContain('Security');
    });

    it('includes TOTAL rows', () => {
      const svg = generateCard(baseData);

      expect(svg.match(/TOTAL/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('includes stats section', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('PASS RATE');
      expect(svg).toContain('TESTS');
      expect(svg).toContain('DURATION');
    });

    it('includes footer with run number', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('#42');
    });

    it('includes timestamp', () => {
      const svg = generateCard(baseData);

      expect(svg).toContain('12:00 UTC');
    });

    it('escapes commit message with special characters', () => {
      const data: CardData = {
        ...baseData,
        git: {
          ...baseData.git,
          commit_message: 'fix: handle <script> & "quotes"',
        },
      };

      const svg = generateCard(data);

      expect(svg).toContain('&lt;');
      expect(svg).toContain('&amp;');
    });

    it('truncates long commit messages', () => {
      const data: CardData = {
        ...baseData,
        git: {
          ...baseData.git,
          commit_message:
            'feat(ci): this is a very long commit message that should be truncated with ellipsis at end',
        },
      };

      const svg = generateCard(data);

      expect(svg).toContain('...');
    });

    it('shows co-authors when present', () => {
      const data: CardData = {
        ...baseData,
        git: {
          ...baseData.git,
          co_authors: ['Claude AI'],
        },
      };

      const svg = generateCard(data);

      expect(svg).toContain('Co-authored-by: Claude AI');
    });

    it('uses success color for passing status', () => {
      const svg = generateCard(baseData);

      // Green color for success
      expect(svg).toContain('#22c55e');
    });

    it('uses fail color for failing status', () => {
      const data: CardData = {
        ...baseData,
        metrics: {
          ...baseData.metrics,
          precommit: {
            ...baseData.metrics.precommit,
            checks: [
              {
                name: 'unit',
                status: 'fail',
                suites: 50,
                total: 100,
                passed: 90,
                failed: 10,
                duration_ms: 3000,
              },
              ...baseData.metrics.precommit.checks.slice(1),
            ],
          },
          overall: {
            ...baseData.metrics.overall,
            status: 'fail',
          },
        },
      };

      const svg = generateCard(data);

      // Red color for fail
      expect(svg).toContain('#ef4444');
    });

    it('formats duration in seconds for short times', () => {
      const svg = generateCard(baseData);

      // 1000ms = 1.0s
      expect(svg).toContain('1.0s');
    });

    it('formats duration in minutes:seconds for longer times', () => {
      const svg = generateCard(baseData);

      // 60000ms = 1:00
      expect(svg).toContain('1:00');
    });

    it('handles empty co-authors array', () => {
      const data: CardData = {
        ...baseData,
        git: {
          ...baseData.git,
          co_authors: [],
        },
      };

      const svg = generateCard(data);

      expect(svg).not.toContain('Co-authored-by:');
    });
  });
});
