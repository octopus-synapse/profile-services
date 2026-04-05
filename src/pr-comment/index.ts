/**
 * PR Comment Module
 *
 * TypeScript utilities for generating CI status cards and posting PR comments.
 * Used by GitHub Actions workflows for automated PR feedback.
 *
 * Architecture:
 * - domain/    Pure functions for metrics aggregation and SVG generation
 * - infra/     Adapters for Git, GitHub API, and file operations
 * - cli/       Command-line tools for CI/CD integration
 */

// =============================================================================
// Domain Exports (Pure Functions)
// =============================================================================

export { generateCard } from './domain/card';
export {
  aggregateMetrics,
  calculateOverallStatus,
  calculatePassRate,
  parseCIMetrics,
  parsePrecommitMetrics,
} from './domain/metrics';
export {
  formatCommitAuthor,
  formatCommitMessage,
  formatDuration,
  getPassRateColor,
  getStatusColor,
  getStatusLabel,
} from './domain/status';
export type {
  AggregatedMetrics,
  AttestationData,
  CardColors,
  CardData,
  CheckStatus,
  CIJobMetrics,
  CIMetrics,
  GitContext,
} from './domain/types';
export { DEFAULT_COLORS } from './domain/types';

// =============================================================================
// Infrastructure Exports (Adapters with DI)
// =============================================================================

export type { FileReader, ReadFileFn } from './infrastructure/file-reader';
export { createFileReader, readStdin } from './infrastructure/file-reader';
export type { ExecFn, GitClient } from './infrastructure/git-client';
export { createGitClient } from './infrastructure/git-client';
export type { FetchFn, GitHubClient, GitHubClientOptions } from './infrastructure/github-client';
export { createGitHubClient } from './infrastructure/github-client';
