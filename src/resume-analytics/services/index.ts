/**
 * Resume Analytics Services
 *
 * Decomposed from the original god class into focused, single-responsibility services.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

// Main orchestrator (refactored to delegate to sub-services)
export * from './resume-analytics.service';

// View tracking with GDPR-compliant IP anonymization
export * from './view-tracking.service';

// ATS score calculation
export * from './ats-score.service';

// Keyword analysis and job matching
export * from './keyword-analyzer.service';

// Industry benchmarking
export * from './benchmarking.service';

// Historical snapshots and trends
export * from './snapshot.service';
