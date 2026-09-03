/**
 * Cache key for a public résumé's share payload.
 *
 * The readers (`GetShareBySlugUseCase.getResumeWithCache`,
 * `ResumeShareService.getResumeWithCache`), the warmer
 * (`CacheWarmingService`) and the invalidator (`CacheInvalidationService`)
 * each spelled this key by hand, and disagreed: warming wrote `…:${slug}`
 * while readers read `…:${resumeId}`, so a warmed entry was never served and
 * invalidation deleted both spellings to be safe. One builder, keyed by
 * résumé id, used by every site.
 *
 * Entrega 3 adds a locale segment for translated public résumés: append it
 * to `segments` here and every site follows.
 */
export function publicResumeCacheKey(resumeId: string): string {
  const segments = ['public', 'resume', resumeId];
  return segments.join(':');
}
