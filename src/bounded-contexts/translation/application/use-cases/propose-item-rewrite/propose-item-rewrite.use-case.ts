/**
 * The other side of a hand edit (ADR-003, decision 11).
 *
 * The person edited an item in one locale. Before saving, the client asks
 * what the OTHER locale's copy would look like after that edit, and shows the
 * difference field by field so each change can be accepted, refused or
 * rewritten. This use case only proposes — nothing is written — and it sends
 * the LLM only the translatable subset the field policy allows.
 */

import type { Locale } from '@packages/i18n';
import type {
  JsonValue,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { envelopeFor, otherLocale } from '@/shared-kernel/i18n/translation-envelope';
import { selectTranslatableFieldKeys } from '../../../domain/policies/field-translation.policy';
import { ResumeTranslationStorePort } from '../../../domain/ports/resume-translation-store.port';

export interface RewriteProposal {
  /** Locale of the copy the proposal is for — the one the person did NOT edit. */
  readonly locale: Locale;
  /** Keys the policy allows to translate; the diff shows only these. */
  readonly keys: readonly string[];
  /** What that copy says today (canonical content, or the stored envelope). */
  readonly current: Record<string, unknown>;
  /** What it would say after the edit. */
  readonly proposal: Record<string, unknown>;
}

const toLlm = (locale: Locale): 'pt' | 'en' => (locale === 'en' ? 'en' : 'pt');

export class ProposeItemRewriteUseCase {
  constructor(
    private readonly store: ResumeTranslationStorePort,
    private readonly llm: TranslationLlmPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: {
    resumeId: string;
    userId: string;
    itemId: string;
    /** Locale the person edited in. */
    editedLocale: Locale;
    /** The item's full content as edited (only translatable keys are used). */
    edited: Record<string, unknown>;
  }): Promise<RewriteProposal> {
    const resume = await this.store.load(input.resumeId);
    if (!resume || resume.userId !== input.userId) {
      throw new EntityNotFoundException('Resume', input.resumeId);
    }
    const found = resume.sections
      .flatMap((section) => section.items.map((item) => ({ section, item })))
      .find(({ item }) => item.id === input.itemId);
    if (!found) throw new EntityNotFoundException('SectionItem', input.itemId);

    const keys = selectTranslatableFieldKeys(found.section.sectionTypeKey, found.section.fields);
    const target = otherLocale(input.editedLocale);
    const current =
      target === resume.language
        ? pick(found.item.content, keys)
        : pick(envelopeFor(found.item.translations, target)?.data ?? {}, keys);
    const source = pick(input.edited, keys);
    if (Object.keys(source).length === 0) {
      return { locale: target, keys, current, proposal: current };
    }
    this.logger.debug(
      `Proposing ${target} rewrite for item ${input.itemId} (${Object.keys(source).length} fields)`,
      'ProposeItemRewriteUseCase',
    );
    const result = await this.llm.translateObject(
      source as JsonValue,
      toLlm(input.editedLocale),
      toLlm(target),
    );
    return {
      locale: target,
      keys,
      current,
      proposal: result.translated as Record<string, unknown>,
    };
  }
}

function pick(content: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
    else if (Array.isArray(value) && value.some((v) => typeof v === 'string' && v.trim())) {
      out[key] = value.filter((v) => typeof v === 'string');
    }
  }
  return out;
}
