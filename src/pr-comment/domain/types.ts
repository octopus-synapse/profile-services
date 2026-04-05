/**
 * PR Comment Domain Types
 *
 * Pure type definitions for CI pipeline metrics and status visualization.
 * No external dependencies - these are the core domain abstractions.
 */

// =============================================================================
// Status Types
// =============================================================================

export type CheckStatus = 'success' | 'fail' | 'running' | 'pending' | 'skip';

export type ReleaseType = 'major' | 'minor' | 'patch';

// =============================================================================
// Pre-commit Metrics (from .attestation file)
// =============================================================================

export interface CheckMetrics {
  status: 'ok' | 'fail' | 'pending';
  time_ms: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  suites?: number;
  files?: number;
  errors?: number;
}

export interface AttestationData {
  version: string;
  tree_hash: string;
  checks: string;
  metrics: {
    swagger?: CheckMetrics;
    typecheck?: CheckMetrics;
    lint?: CheckMetrics;
    unit?: CheckMetrics;
    arch?: CheckMetrics;
    contracts?: CheckMetrics;
  };
  timestamp: string;
  git_user: string;
}

// =============================================================================
// CI Job Metrics (from workflow outputs)
// =============================================================================

export interface CIJobMetrics {
  status: CheckStatus;
  duration_ms: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  suites?: number;
}

export interface CIMetrics {
  build: CIJobMetrics;
  integration: CIJobMetrics;
  e2e: CIJobMetrics;
  security: CIJobMetrics;
}

// =============================================================================
// Aggregated Metrics (computed from attestation + CI)
// =============================================================================

export interface AggregatedMetrics {
  precommit: {
    checks: PrecommitCheckResult[];
    totals: TestTotals;
    duration_ms: number;
    attestation_hash: string;
  };
  ci: {
    jobs: CIJobResult[];
    totals: TestTotals;
    duration_ms: number;
  };
  overall: {
    status: CheckStatus;
    total_tests: number;
    total_passed: number;
    total_failed: number;
    total_skipped: number;
    pass_rate: number;
    duration_ms: number;
  };
}

export interface PrecommitCheckResult {
  name: string;
  status: CheckStatus;
  suites: number | null;
  total: number | null;
  passed: number | null;
  failed: number | null;
  duration_ms: number;
}

export interface CIJobResult {
  name: string;
  status: CheckStatus;
  suites: number | null;
  total: number | null;
  passed: number | null;
  failed: number | null;
  duration_ms: number;
}

export interface TestTotals {
  suites: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

// =============================================================================
// Git Context
// =============================================================================

export interface GitContext {
  commit_hash: string;
  commit_message: string;
  commit_author: string;
  co_authors: string[];
  branch: string;
  run_number: number;
  timestamp: string;
}

// =============================================================================
// Card Generation
// =============================================================================

export interface CardData {
  metrics: AggregatedMetrics;
  git: GitContext;
}

export interface CardColors {
  success: string;
  fail: string;
  warning: string;
  pending: string;
  muted: string;
  text: string;
  text_muted: string;
  background: string;
  card: string;
}

export const DEFAULT_COLORS: CardColors = {
  success: '#22c55e',
  fail: '#ef4444',
  warning: '#f59e0b',
  pending: '#44403c',
  muted: '#44403c',
  text: '#e7e5e4',
  text_muted: '#78716c',
  background: '#1c1917',
  card: '#292524',
};
