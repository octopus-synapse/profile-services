/**
 * What the translation use case needs from persistence, and nothing else:
 * the résumé's prose with each section's field policy inputs, and a way to
 * write one envelope back per item / per résumé.
 */

import type { Locale } from '@packages/i18n';
import type { TranslationEnvelope } from '@/shared-kernel/i18n/translation-envelope';
import type { PolicyFieldDefinition } from '../policies/field-translation.policy';

export interface TranslatableItem {
  readonly id: string;
  readonly content: Record<string, unknown>;
  readonly translations: unknown;
}

export interface TranslatableSection {
  readonly sectionTypeKey: string;
  readonly fields: readonly PolicyFieldDefinition[];
  readonly items: readonly TranslatableItem[];
}

export interface TranslatableResume {
  readonly id: string;
  readonly userId: string;
  readonly language: Locale;
  readonly prose: { summary: string | null; headline: string | null; jobTitle: string | null };
  readonly translations: unknown;
  readonly sections: readonly TranslatableSection[];
}

export abstract class ResumeTranslationStorePort {
  abstract load(resumeId: string): Promise<TranslatableResume | null>;
  abstract saveItemTranslation(
    itemId: string,
    locale: Locale,
    envelope: TranslationEnvelope,
  ): Promise<void>;
  abstract saveResumeTranslation(
    resumeId: string,
    locale: Locale,
    envelope: TranslationEnvelope,
  ): Promise<void>;
}
