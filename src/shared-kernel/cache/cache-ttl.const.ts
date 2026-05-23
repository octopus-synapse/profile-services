/**
 * Canonical cache TTL presets (in seconds).
 *
 * Replaces the seven divergent CACHE_TTL definitions that were spread
 * across BCs with mismatched units (some seconds, some milliseconds) —
 * see Q31 in the duplication audit.
 *
 * Pick the preset whose semantics match the data; only define new ones
 * here. BC-local TTL constants should be removed and the import path
 * should always be `@/shared-kernel/cache`.
 */
export const CACHE_PRESETS = {
  /** 1 minute. Hot, very-likely-to-change data (live counts, presence). */
  EPHEMERAL: 60,
  /** 5 minutes. User profile, recently-edited resume metadata. */
  USER_PROFILE: 300,
  /** 30 minutes. Search/list results, leaderboards. */
  SEARCH: 1800,
  /** 1 hour. Authenticated session, popular resumes, public viewer data. */
  SESSION: 3600,
  /** 24 hours. Catalogs (skills, languages, MEC institutions, locales). */
  CATALOG: 86400,
  /** 30 days. Deterministic LLM outputs keyed by sha256(input) — same prompt
   * version + input always yields same translation, so we cache aggressively. */
  TRANSLATION: 2592000,
} as const;

export type CachePresetKey = keyof typeof CACHE_PRESETS;
