/**
 * Metrics Domain Module
 *
 * Pure functions for parsing and aggregating CI/CD metrics.
 * No side effects, no external dependencies.
 */

import type {
  AggregatedMetrics,
  AttestationData,
  CheckMetrics,
  CheckStatus,
  CIJobMetrics,
  CIJobResult,
  CIMetrics,
  PrecommitCheckResult,
  TestTotals,
} from './types';

// =============================================================================
// Status Mapping
// =============================================================================

export function mapCheckStatus(status: string | undefined): CheckStatus {
  switch (status) {
    case 'ok':
    case 'success':
    case 'passed':
      return 'success';
    case 'fail':
    case 'failed':
    case 'error':
      return 'fail';
    case 'running':
    case 'in_progress':
      return 'running';
    case 'skip':
    case 'skipped':
      return 'skip';
    default:
      return 'pending';
  }
}

// =============================================================================
// Precommit Metrics Parsing
// =============================================================================

const PRECOMMIT_CHECKS = ['swagger', 'typecheck', 'lint', 'unit', 'arch', 'contracts'] as const;

export function parsePrecommitCheck(
  name: string,
  metrics: CheckMetrics | undefined,
): PrecommitCheckResult {
  if (!metrics) {
    return {
      name,
      status: 'pending',
      suites: null,
      total: null,
      passed: null,
      failed: null,
      duration_ms: 0,
    };
  }

  const hasTestResults = metrics.passed !== undefined || metrics.failed !== undefined;
  const total = hasTestResults
    ? (metrics.passed ?? 0) + (metrics.failed ?? 0) + (metrics.skipped ?? 0)
    : null;

  return {
    name,
    status: mapCheckStatus(metrics.status),
    suites: metrics.suites ?? metrics.files ?? null,
    total,
    passed: metrics.passed ?? null,
    failed: metrics.failed ?? metrics.errors ?? null,
    duration_ms: metrics.time_ms ?? 0,
  };
}

export function parsePrecommitMetrics(attestation: AttestationData): PrecommitCheckResult[] {
  return PRECOMMIT_CHECKS.map((check) => parsePrecommitCheck(check, attestation.metrics[check]));
}

export function calculatePrecommitTotals(checks: PrecommitCheckResult[]): TestTotals {
  return checks.reduce(
    (acc, check) => ({
      suites: acc.suites + (check.suites ?? 0),
      total: acc.total + (check.total ?? 0),
      passed: acc.passed + (check.passed ?? 0),
      failed: acc.failed + (check.failed ?? 0),
      skipped: acc.skipped,
    }),
    { suites: 0, total: 0, passed: 0, failed: 0, skipped: 0 },
  );
}

export function calculatePrecommitDuration(checks: PrecommitCheckResult[]): number {
  return checks.reduce((acc, check) => acc + check.duration_ms, 0);
}

// =============================================================================
// CI Metrics Parsing
// =============================================================================

const CI_JOBS = ['build', 'integration', 'e2e', 'security'] as const;

export function parseCIJob(name: string, job: CIJobMetrics | undefined): CIJobResult {
  if (!job) {
    return {
      name,
      status: 'pending',
      suites: null,
      total: null,
      passed: null,
      failed: null,
      duration_ms: 0,
    };
  }

  const hasTestResults = job.passed !== undefined || job.failed !== undefined;
  const total = hasTestResults ? (job.passed ?? 0) + (job.failed ?? 0) + (job.skipped ?? 0) : null;

  return {
    name,
    status: mapCheckStatus(job.status),
    suites: job.suites ?? null,
    total,
    passed: job.passed ?? null,
    failed: job.failed ?? null,
    duration_ms: job.duration_ms ?? 0,
  };
}

export function parseCIMetrics(ci: CIMetrics): CIJobResult[] {
  return CI_JOBS.map((job) => parseCIJob(job, ci[job]));
}

export function calculateCITotals(jobs: CIJobResult[]): TestTotals {
  const completedJobs = jobs.filter((job) => job.status === 'success' || job.status === 'fail');

  return completedJobs.reduce(
    (acc, job) => ({
      suites: acc.suites + (job.suites ?? 0),
      total: acc.total + (job.total ?? 0),
      passed: acc.passed + (job.passed ?? 0),
      failed: acc.failed + (job.failed ?? 0),
      skipped: acc.skipped,
    }),
    { suites: 0, total: 0, passed: 0, failed: 0, skipped: 0 },
  );
}

export function calculateCIDuration(jobs: CIJobResult[]): number {
  return jobs.reduce((acc, job) => acc + job.duration_ms, 0);
}

// =============================================================================
// Overall Status Calculation
// =============================================================================

export function calculateOverallStatus(
  precommitChecks: PrecommitCheckResult[],
  ciJobs: CIJobResult[],
): CheckStatus {
  const allItems = [...precommitChecks, ...ciJobs];

  // If any is running, overall is running
  if (allItems.some((item) => item.status === 'running')) {
    return 'running';
  }

  // If any failed, overall is fail
  if (allItems.some((item) => item.status === 'fail')) {
    return 'fail';
  }

  // If all CI jobs are success, overall is success
  const ciCompleted = ciJobs.every((job) => job.status === 'success' || job.status === 'skip');

  if (ciCompleted && ciJobs.length > 0) {
    return 'success';
  }

  return 'pending';
}

export function calculatePassRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 1000) / 10; // One decimal place
}

// =============================================================================
// Aggregation
// =============================================================================

export function aggregateMetrics(attestation: AttestationData, ci: CIMetrics): AggregatedMetrics {
  const precommitChecks = parsePrecommitMetrics(attestation);
  const precommitTotals = calculatePrecommitTotals(precommitChecks);
  const precommitDuration = calculatePrecommitDuration(precommitChecks);

  const ciJobs = parseCIMetrics(ci);
  const ciTotals = calculateCITotals(ciJobs);
  const ciDuration = calculateCIDuration(ciJobs);

  const totalTests = precommitTotals.total + ciTotals.total;
  const totalPassed = precommitTotals.passed + ciTotals.passed;
  const totalFailed = precommitTotals.failed + ciTotals.failed;
  const totalSkipped = precommitTotals.skipped + ciTotals.skipped;

  return {
    precommit: {
      checks: precommitChecks,
      totals: precommitTotals,
      duration_ms: precommitDuration,
      attestation_hash: attestation.tree_hash?.slice(0, 32) ?? '',
    },
    ci: {
      jobs: ciJobs,
      totals: ciTotals,
      duration_ms: ciDuration,
    },
    overall: {
      status: calculateOverallStatus(precommitChecks, ciJobs),
      total_tests: totalTests,
      total_passed: totalPassed,
      total_failed: totalFailed,
      total_skipped: totalSkipped,
      pass_rate: calculatePassRate(totalPassed, totalTests),
      duration_ms: precommitDuration + ciDuration,
    },
  };
}
