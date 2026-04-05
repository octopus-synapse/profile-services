/**
 * Release Module
 *
 * TypeScript utilities for semantic versioning and changelog generation.
 * Used by GitHub Actions workflows for automated releases.
 */

// Domain exports
export {
  parseVersion,
  calculateNextVersion,
  formatVersion,
  formatVersionWithPrefix,
  compareVersions,
  type Version,
} from './domain/version';

export {
  detectReleaseType,
  isValidReleaseType,
  RELEASE_TYPES,
  type ReleaseType,
} from './domain/release-type';

export {
  formatPatchChangelog,
  formatMinorChangelog,
  formatMajorChangelog,
  formatChangelogFooter,
  type PullRequest,
  type Tag,
} from './domain/changelog';
