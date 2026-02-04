/**
 * API Limits Constants
 *
 * Limits for various API operations to prevent abuse
 * and ensure consistent behavior.
 */
export const API_LIMITS = {
  MAX_REPOS_TO_PROCESS: 20,
  MAX_CONTRIBUTIONS_TO_SHOW: 10,
  MAX_SUGGESTIONS: 8,
  MAX_DEBUG_CHARS: 1000,
  MAX_PREVIEW_CHARS: 100,
} as const;
