/**
 * Outbound port for the resume DSL persistence layer.
 *
 * The render use cases need three things from the persistence side:
 *   1. Load a resume owned by a specific user (gated GET).
 *   2. Load a resume by its public share slug (gated by isActive + expiresAt).
 *   3. Resolve all section-type titles for the requested locale so the
 *      compiler can stamp them on the AST.
 *
 * Everything returns *domain* shapes — `GenericResume` and a
 * `Map<sectionTypeKey, translatedTitle>`. Adapters do the Prisma →
 * domain normalization; nothing Prisma-shaped leaves the adapter.
 */

import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

export abstract class ResumeDslRepositoryPort {
  /** Owned read — returns null when the resume doesn't exist or doesn't
   *  belong to `userId`. The use case decides how to translate that. */
  abstract findOwnedResume(
    resumeId: string,
    userId: string,
    locale: Locale,
  ): Promise<GenericResume | null>;

  /** Public read by share slug. Returns null when:
   *   - the share doesn't exist,
   *   - the share is disabled, or
   *   - the share has expired.
   *  Adapters MUST enforce these gates. */
  abstract findPublicResumeBySlug(slug: string, locale: Locale): Promise<GenericResume | null>;

  /** Returns the locale-translated title for every active section type.
   *  Map key is the `SectionType.key`. */
  abstract getSectionTypeTitles(locale: Locale): Promise<Map<string, string>>;
}
