/**
 * Scoring - Shared Kernel
 *
 * Cross-BC scoring primitives (rank ladder) shared by resume-quality,
 * job-match, resume-styles, readiness, and notifications.
 */

export { compareRank, RANK_ORDER, type ScoreRank, ScoreRankSchema, scoreToRank } from './rank';
