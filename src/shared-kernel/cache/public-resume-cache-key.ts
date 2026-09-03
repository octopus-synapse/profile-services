import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

/**
 * Cache key for a public résumé's share payload, per language version.
 *
 * The readers (`ResumeShareService.getResumeWithCache`), the warmer
 * (`CacheWarmingService`) and the invalidator (`CacheInvalidationService`)
 * each spelled this key by hand, and disagreed: warming wrote `…:${slug}`
 * while readers read `…:${resumeId}`, so a warmed entry was never served and
 * invalidation deleted both spellings to be safe. One builder, used by every
 * site.
 *
 * ADR-003 §12: the payload is rendered in one language, so the key carries
 * the locale — a Portuguese reader and an English reader of the same slug
 * must never share an entry. Invalidate with `publicResumeCacheKeyPattern`.
 */
export function publicResumeCacheKey(resumeId: string, locale: Locale): string {
  return ['public', 'resume', resumeId, locale].join(':');
}

/** Every language version of one résumé — for invalidation. */
export function publicResumeCacheKeyPattern(resumeId: string): string {
  return ['public', 'resume', resumeId, '*'].join(':');
}
