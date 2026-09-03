/**
 * Store a person's own version of an item in a derived locale (ADR-003,
 * decisions 11–12). `manual` = they wrote/accepted it; `diverged` = they
 * refused the machine's rewrite and kept this copy on purpose. Either way the
 * worker never overwrites it again. The hash recorded is of the canonical
 * subset at this moment, so a later canonical edit still shows as "stale".
 */

import type { Locale } from '@packages/i18n';
import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { hashSource, type TranslationOrigin } from '@/shared-kernel/i18n/translation-envelope';
import { selectTranslatableFieldKeys } from '../../../domain/policies/field-translation.policy';
import { ResumeTranslationStorePort } from '../../../domain/ports/resume-translation-store.port';

export class WriteItemTranslationUseCase {
  constructor(
    private readonly store: ResumeTranslationStorePort,
    private readonly logger: LoggerPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    resumeId: string;
    userId: string;
    itemId: string;
    locale: Locale;
    data: Record<string, unknown>;
    origin: Extract<TranslationOrigin, 'manual' | 'diverged'>;
  }): Promise<{ sourceHash: string; translatedAt: string }> {
    const resume = await this.store.load(input.resumeId);
    if (!resume || resume.userId !== input.userId) {
      throw new EntityNotFoundException('Resume', input.resumeId);
    }
    if (input.locale === resume.language) {
      // The canonical text is edited through the item itself, never as a copy.
      throw new EntityNotFoundException('Translation', `${input.itemId}/${input.locale}`);
    }
    const found = resume.sections
      .flatMap((section) => section.items.map((item) => ({ section, item })))
      .find(({ item }) => item.id === input.itemId);
    if (!found) throw new EntityNotFoundException('SectionItem', input.itemId);

    const keys = selectTranslatableFieldKeys(found.section.sectionTypeKey, found.section.fields);
    const canonicalSubset: Record<string, unknown> = {};
    for (const key of keys) {
      const value = found.item.content[key];
      if (typeof value === 'string' && value.trim()) canonicalSubset[key] = value;
      else if (Array.isArray(value))
        canonicalSubset[key] = value.filter((v) => typeof v === 'string');
    }
    const data: Record<string, unknown> = {};
    for (const key of keys) if (input.data[key] !== undefined) data[key] = input.data[key];

    const envelope = {
      data,
      sourceHash: hashSource(canonicalSubset),
      translatedAt: this.now().toISOString(),
      origin: input.origin,
    };
    await this.store.saveItemTranslation(input.itemId, input.locale, envelope);
    this.logger.debug(
      `Stored ${input.origin} ${input.locale} copy of item ${input.itemId}`,
      'WriteItemTranslationUseCase',
    );
    return { sourceHash: envelope.sourceHash, translatedAt: envelope.translatedAt };
  }
}
