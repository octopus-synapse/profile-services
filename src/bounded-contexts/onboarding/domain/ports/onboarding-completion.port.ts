/**
 * Onboarding Completion Port
 *
 * Abstracts the transactional completion flow (resume upsert, sections, user update).
 * Infrastructure adapter wraps Prisma $transaction.
 */

import type { Locale } from '@packages/i18n';
import type { OnboardingData } from '../schemas/onboarding-data.schema';

export type CompletionResult = { resumeId: string };

export abstract class OnboardingCompletionPort {
  /**
   * Execute the full onboarding completion within a single transaction:
   * 1. Upsert resume
   * 2. Save sections
   * 3. Mark onboarding complete on user
   * 4. Delete progress
   */
  /**
   * @param authoredLocale The locale the person actually did onboarding in,
   *   resolved from the request. `null` means "unknown" and leaves the column
   *   default standing — ADR-003 §10 (and its "Aberto" note): before this,
   *   every résumé was born `pt-br` regardless, so an English onboarding
   *   produced a résumé whose canonical language was a lie.
   */
  abstract executeCompletion(
    userId: string,
    data: OnboardingData,
    authoredLocale?: Locale | null,
  ): Promise<CompletionResult>;
}
