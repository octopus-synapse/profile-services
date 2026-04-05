/**
 * PR Comment Domain - Public API
 *
 * Export only pure domain functions and types.
 * Infrastructure adapters are not exported here.
 */

// Card
export { generateCard } from './card';
// Metrics
export {
  aggregateMetrics,
  calculateOverallStatus,
  calculatePassRate,
  parseCIMetrics,
  parsePrecommitMetrics,
} from './metrics';
// Status
export {
  formatCommitAuthor,
  formatCommitMessage,
  formatDuration,
  getPassRateColor,
  getStatusColor,
  getStatusLabel,
} from './status';
// Types
export type {
  AggregatedMetrics,
  AttestationData,
  CardColors,
  CardData,
  CheckStatus,
  CIJobMetrics,
  CIMetrics,
  GitContext,
} from './types';
export { DEFAULT_COLORS } from './types';
