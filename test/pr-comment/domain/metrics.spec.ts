import { describe, expect, it } from 'bun:test';
import {
  aggregateMetrics,
  calculateOverallStatus,
  calculatePassRate,
  mapCheckStatus,
  parseCIMetrics,
  parsePrecommitMetrics,
} from '../../../src/pr-comment/domain/metrics';
import type { AttestationData, CIMetrics } from '../../../src/pr-comment/domain/types';

describe('metrics', () => {
  describe('mapCheckStatus', () => {
    it('maps "ok" to "success"', () => {
      expect(mapCheckStatus('ok')).toBe('success');
    });

    it('maps "success" to "success"', () => {
      expect(mapCheckStatus('success')).toBe('success');
    });

    it('maps "error" to "fail"', () => {
      expect(mapCheckStatus('error')).toBe('fail');
    });

    it('maps "fail" to "fail"', () => {
      expect(mapCheckStatus('fail')).toBe('fail');
    });

    it('maps "skip" to "skip"', () => {
      expect(mapCheckStatus('skip')).toBe('skip');
    });

    it('maps "running" to "running"', () => {
      expect(mapCheckStatus('running')).toBe('running');
    });

    it('maps unknown to "pending"', () => {
      expect(mapCheckStatus('unknown')).toBe('pending');
      expect(mapCheckStatus(undefined)).toBe('pending');
    });
  });

  describe('parsePrecommitMetrics', () => {
    it('parses all check types from attestation', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123',
        checks: 'all',
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
      };

      const checks = parsePrecommitMetrics(attestation);

      expect(checks).toHaveLength(6);
      expect(checks[0].name).toBe('swagger');
      expect(checks[0].status).toBe('success');
      expect(checks[0].duration_ms).toBe(1000);
    });

    it('includes test counts for test checks', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123',
        checks: '',
        metrics: {
          unit: { status: 'ok', time_ms: 3000, passed: 100, failed: 2, skipped: 5 },
        },
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      };

      const checks = parsePrecommitMetrics(attestation);
      const unitCheck = checks.find((c) => c.name === 'unit');

      expect(unitCheck?.passed).toBe(100);
      expect(unitCheck?.failed).toBe(2);
      expect(unitCheck?.total).toBe(107); // passed + failed + skipped
    });

    it('handles missing metrics gracefully', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123',
        checks: '',
        metrics: {},
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      };

      const checks = parsePrecommitMetrics(attestation);

      // Returns all 6 checks with pending status
      expect(checks).toHaveLength(6);
      expect(checks.every((c) => c.status === 'pending')).toBe(true);
    });
  });

  describe('parseCIMetrics', () => {
    it('parses all CI job types', () => {
      const ci: CIMetrics = {
        build: { status: 'success', duration_ms: 60000 },
        integration: { status: 'success', duration_ms: 180000, passed: 150, failed: 0, skipped: 5 },
        e2e: { status: 'fail', duration_ms: 240000, passed: 45, failed: 5, skipped: 2 },
        security: { status: 'running', duration_ms: 0 },
      };

      const jobs = parseCIMetrics(ci);

      expect(jobs).toHaveLength(4);
      expect(jobs[0].name).toBe('build');
      expect(jobs[0].status).toBe('success');
      expect(jobs[1].name).toBe('integration');
      expect(jobs[1].passed).toBe(150);
      expect(jobs[2].status).toBe('fail');
      expect(jobs[3].status).toBe('running');
    });

    it('handles pending jobs', () => {
      const ci: CIMetrics = {
        build: { status: 'pending', duration_ms: 0 },
        integration: { status: 'pending', duration_ms: 0 },
        e2e: { status: 'pending', duration_ms: 0 },
        security: { status: 'pending', duration_ms: 0 },
      };

      const jobs = parseCIMetrics(ci);

      expect(jobs.every((j) => j.status === 'pending')).toBe(true);
    });
  });

  describe('calculateOverallStatus', () => {
    it('returns "fail" if any check failed', () => {
      const precommit = [
        {
          name: 'unit',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];
      const ci = [
        {
          name: 'build',
          status: 'fail' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];

      const status = calculateOverallStatus(precommit, ci);

      expect(status).toBe('fail');
    });

    it('returns "running" if any check is running', () => {
      const precommit = [
        {
          name: 'unit',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];
      const ci = [
        {
          name: 'build',
          status: 'running' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];

      const status = calculateOverallStatus(precommit, ci);

      expect(status).toBe('running');
    });

    it('returns "success" when all CI jobs succeed', () => {
      const precommit = [
        {
          name: 'unit',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];
      const ci = [
        {
          name: 'build',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
        {
          name: 'e2e',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];

      const status = calculateOverallStatus(precommit, ci);

      expect(status).toBe('success');
    });

    it('returns "pending" when CI jobs are pending', () => {
      const precommit = [
        {
          name: 'unit',
          status: 'success' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 100,
        },
      ];
      const ci = [
        {
          name: 'build',
          status: 'pending' as const,
          suites: null,
          total: null,
          passed: null,
          failed: null,
          duration_ms: 0,
        },
      ];

      const status = calculateOverallStatus(precommit, ci);

      expect(status).toBe('pending');
    });
  });

  describe('calculatePassRate', () => {
    it('calculates pass rate correctly', () => {
      const rate = calculatePassRate(90, 100);

      expect(rate).toBe(90);
    });

    it('returns 100 when all tests pass', () => {
      const rate = calculatePassRate(100, 100);

      expect(rate).toBe(100);
    });

    it('returns 0 when no tests pass', () => {
      const rate = calculatePassRate(0, 10);

      expect(rate).toBe(0);
    });

    it('returns 0 when no tests exist', () => {
      const rate = calculatePassRate(0, 0);

      expect(rate).toBe(0);
    });

    it('rounds to one decimal place', () => {
      const rate = calculatePassRate(333, 1000);

      expect(rate).toBe(33.3);
    });
  });

  describe('aggregateMetrics', () => {
    it('aggregates precommit and CI metrics', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123',
        checks: '',
        metrics: {
          unit: { status: 'ok', time_ms: 3000, passed: 100, failed: 0, skipped: 5 },
        },
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      };

      const ci: CIMetrics = {
        build: { status: 'success', duration_ms: 60000 },
        integration: { status: 'success', duration_ms: 180000 },
        e2e: { status: 'success', duration_ms: 240000 },
        security: { status: 'success', duration_ms: 30000 },
      };

      const metrics = aggregateMetrics(attestation, ci);

      expect(metrics.precommit.checks).toHaveLength(6);
      expect(metrics.ci.jobs).toHaveLength(4);
      expect(metrics.overall.status).toBe('success');
    });

    it('calculates total duration correctly', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123',
        checks: '',
        metrics: {
          swagger: { status: 'ok', time_ms: 1000 },
          typecheck: { status: 'ok', time_ms: 2000 },
        },
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      };

      const ci: CIMetrics = {
        build: { status: 'success', duration_ms: 60000 },
        integration: { status: 'success', duration_ms: 0 },
        e2e: { status: 'pending', duration_ms: 0 },
        security: { status: 'pending', duration_ms: 0 },
      };

      const metrics = aggregateMetrics(attestation, ci);

      expect(metrics.precommit.duration_ms).toBe(3000); // 1000 + 2000
      expect(metrics.ci.duration_ms).toBe(60000);
      expect(metrics.overall.duration_ms).toBe(63000);
    });

    it('includes attestation hash', () => {
      const attestation: AttestationData = {
        version: '3',
        tree_hash: 'abc123456789',
        checks: '',
        metrics: {},
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      };

      const ci: CIMetrics = {
        build: { status: 'pending', duration_ms: 0 },
        integration: { status: 'pending', duration_ms: 0 },
        e2e: { status: 'pending', duration_ms: 0 },
        security: { status: 'pending', duration_ms: 0 },
      };

      const metrics = aggregateMetrics(attestation, ci);

      expect(metrics.precommit.attestation_hash).toBe('abc123456789');
    });
  });
});
