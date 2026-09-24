/**
 * Derive a résumé into its other locale — the write-through of ADR-003.
 *
 * One LLM call per section (so the client can show "6/11 sections"), one
 * more for the résumé-level prose. Only what the field policy allows is sent
 * (`selectTranslatableFieldKeys`), only items whose canonical text changed
 * since the last run are re-sent (`sourceHash`), and copies the person wrote
 * themselves (`origin` manual / diverged) are never touched.
 *
 * Four brakes, all here: the kill-switch flag, the monthly cost cap, provider
 * availability, and — implicitly — the hash, which turns an unchanged
 * résumé into zero calls.
 */

import type { Locale } from '@packages/i18n';
import type {
  JsonValue,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { AiUsageRecorderPort, FreeTranslationMeterPort } from '@/bounded-contexts/billing';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  envelopeFor,
  hashSource,
  otherLocale,
  type TranslationEnvelope,
} from '@/shared-kernel/i18n/translation-envelope';
import { selectTranslatableFieldKeys } from '../../../domain/policies/field-translation.policy';
import {
  ResumeTranslationStorePort,
  type TranslatableItem,
  type TranslatableResume,
} from '../../../domain/ports/resume-translation-store.port';
import { TranslationCostLedgerPort } from '../../../domain/ports/translation-cost-ledger.port';
import {
  type TranslationProgress,
  TranslationProgressPort,
} from '../../../domain/ports/translation-progress.port';
import { TRANSLATION_FLAG_KEY } from '../../../domain/translation-flags.const';

const CTX = 'TranslateResumeIntoLocaleUseCase';

/** Résumé-level prose keys that get their own envelope on `Resume.translations`. */
const RESUME_PROSE_KEYS = ['summary', 'headline', 'jobTitle'] as const;

export interface TranslateResumeOptions {
  /** Target locale; defaults to the other locale of the résumé's own language. */
  readonly locale?: Locale;
  /** Re-translate even when the hash matches (never overrides manual/diverged). */
  readonly force?: boolean;
}

export interface TranslateResumeReport {
  readonly resumeId: string;
  readonly locale: Locale;
  readonly status: TranslationProgress['status'];
  readonly reason?: TranslationProgress['reason'];
  readonly sectionsTranslated: number;
  readonly itemsTranslated: number;
  readonly itemsSkipped: number;
  readonly tokensUsed: number;
  readonly costUsdMicros: bigint;
}

export interface TranslationPricing {
  /** 0 disables cost tracking (the ledger still records tokens). */
  readonly priceUsdMicrosPer1kTokens: number;
  /** 0 disables the cap. */
  readonly monthlyCapUsdMicros: bigint;
}

type LlmLocale = 'pt' | 'en';
const toLlm = (locale: Locale): LlmLocale => (locale === 'en' ? 'en' : 'pt');

export class TranslateResumeIntoLocaleUseCase {
  constructor(
    private readonly store: ResumeTranslationStorePort,
    private readonly llm: TranslationLlmPort,
    private readonly ledger: TranslationCostLedgerPort,
    private readonly progress: TranslationProgressPort,
    private readonly flags: FeatureFlagService,
    private readonly pricing: TranslationPricing,
    private readonly logger: LoggerPort,
    private readonly now: () => Date = () => new Date(),
    private readonly billing?: FreeTranslationMeterPort & AiUsageRecorderPort,
  ) {}

  async execute(
    resumeId: string,
    options: TranslateResumeOptions = {},
  ): Promise<TranslateResumeReport> {
    const resume = await this.store.load(resumeId);
    if (!resume) {
      throw new EntityNotFoundException('Resume', resumeId);
    }
    const locale = options.locale ?? otherLocale(resume.language);
    const base = {
      resumeId,
      locale,
      sectionsTranslated: 0,
      itemsTranslated: 0,
      itemsSkipped: 0,
      tokensUsed: 0,
      costUsdMicros: 0n,
    };

    if (locale === resume.language) {
      // Nothing to derive: the canonical locale is the one requested.
      return { ...base, status: 'skipped' };
    }
    const skip = await this.brake(resume);
    if (skip) {
      this.progress.publish(resume.userId, {
        resumeId,
        locale,
        done: 0,
        total: 0,
        status: 'skipped',
        reason: skip,
      });
      return { ...base, status: 'skipped', reason: skip };
    }

    const total = resume.sections.length + 1;
    let done = 0;
    let itemsTranslated = 0;
    let itemsSkipped = 0;
    let tokensUsed = 0;
    let sectionsTranslated = 0;
    const emit = (status: TranslationProgress['status'], reason?: TranslationProgress['reason']) =>
      this.progress.publish(resume.userId, {
        resumeId,
        locale,
        done,
        total,
        status,
        ...(reason ? { reason } : {}),
      });

    emit('running');
    try {
      for (const section of resume.sections) {
        const keys = selectTranslatableFieldKeys(section.sectionTypeKey, section.fields);
        const pending: Array<{
          item: TranslatableItem;
          subset: Record<string, unknown>;
          hash: string;
        }> = [];
        for (const item of section.items) {
          const subset = pick(item.content, keys);
          if (Object.keys(subset).length === 0) {
            itemsSkipped++;
            continue;
          }
          const hash = hashSource(subset);
          const existing = envelopeFor(item.translations, locale);
          if (existing && existing.origin !== 'derived') {
            itemsSkipped++; // the person's own words in this locale
            continue;
          }
          if (existing && existing.sourceHash === hash && !options.force) {
            itemsSkipped++;
            continue;
          }
          pending.push({ item, subset, hash });
        }

        const remaining = this.billing
          ? await this.billing.freeTranslationRemaining(resume.userId)
          : Number.POSITIVE_INFINITY;
        const admitted = pending.slice(0, remaining);
        itemsSkipped += pending.length - admitted.length;
        if (admitted.length > 0) {
          const payload = Object.fromEntries(
            admitted.map((p) => [p.item.id, p.subset]),
          ) as JsonValue;
          const result = await this.translateWithQuota(
            resume.userId,
            admitted.length,
            payload,
            toLlm(resume.language),
            toLlm(locale),
          );
          tokensUsed += result.tokensUsed;
          const translated = result.translated as Record<string, Record<string, unknown>>;
          const translatedAt = this.now().toISOString();
          for (const p of admitted) {
            const data = translated[p.item.id];
            if (!data) continue;
            await this.store.saveItemTranslation(p.item.id, locale, {
              data,
              sourceHash: p.hash,
              translatedAt,
              origin: 'derived',
            });
            itemsTranslated++;
          }
          sectionsTranslated++;
        }
        done++;
        emit('running');
      }

      // Résumé-level prose: summary / headline / jobTitle.
      const prose = pick({ ...resume.prose }, RESUME_PROSE_KEYS);
      if (Object.keys(prose).length > 0) {
        const hash = hashSource(prose);
        const existing = envelopeFor(resume.translations, locale);
        const untouched = existing && existing.origin !== 'derived';
        const fresh = existing && existing.sourceHash === hash && !options.force;
        if (
          !untouched &&
          !fresh &&
          (!this.billing || (await this.billing.freeTranslationRemaining(resume.userId)) > 0)
        ) {
          const result = await this.translateWithQuota(
            resume.userId,
            1,
            prose as JsonValue,
            toLlm(resume.language),
            toLlm(locale),
          );
          tokensUsed += result.tokensUsed;
          const envelope: TranslationEnvelope = {
            data: result.translated as Record<string, unknown>,
            sourceHash: hash,
            translatedAt: this.now().toISOString(),
            origin: 'derived',
          };
          await this.store.saveResumeTranslation(resumeId, locale, envelope);
        }
      }
      done++;

      const costUsdMicros = this.toCost(tokensUsed);
      if (tokensUsed > 0) {
        await this.ledger.record({
          userId: resume.userId,
          resumeId,
          locale,
          tokensUsed,
          costUsdMicros,
        });
      }
      emit('completed');
      return {
        ...base,
        status: 'completed',
        sectionsTranslated,
        itemsTranslated,
        itemsSkipped,
        tokensUsed,
        costUsdMicros,
      };
    } catch (err) {
      this.logger.error(
        `Translation of resume ${resumeId} into ${locale} failed: ${(err as Error).message}`,
        {
          context: CTX,
          stack: err instanceof Error ? err.stack : undefined,
        },
      );
      emit('failed', 'error');
      throw err;
    }
  }

  private async brake(resume: TranslatableResume): Promise<TranslationProgress['reason'] | null> {
    if (!(await this.flags.isEnabled(TRANSLATION_FLAG_KEY, resume.userId))) return 'flag-off';
    if (!this.llm.isAvailable()) return 'provider-unavailable';
    if (this.pricing.monthlyCapUsdMicros > 0n) {
      const spent = await this.ledger.monthToDateUsdMicros(resume.userId, this.now());
      if (spent >= this.pricing.monthlyCapUsdMicros) return 'monthly-cap';
    }
    return null;
  }

  private toCost(tokensUsed: number): bigint {
    if (this.pricing.priceUsdMicrosPer1kTokens <= 0 || tokensUsed <= 0) return 0n;
    return BigInt(Math.round((tokensUsed / 1000) * this.pricing.priceUsdMicrosPer1kTokens));
  }

  private async translateWithQuota(
    userId: string,
    actions: number,
    data: JsonValue,
    source: LlmLocale,
    target: LlmLocale,
  ) {
    const reservation = (await this.billing?.reserveFreeTranslation(userId, actions)) ?? null;
    try {
      const result = await this.llm.translateObject(data, source, target);
      if (result.cacheHit) await this.billing?.releaseFreeTranslation(reservation);
      if (result.usage) {
        try {
          await this.billing?.recordAiUsage({
            userId,
            operation: 'translate-resume',
            ...result.usage,
          });
        } catch (error) {
          this.logger.warn(
            `Could not record translation cost: ${error instanceof Error ? error.message : 'unknown'}`,
            CTX,
          );
        }
      }
      return result;
    } catch (error) {
      await this.billing?.releaseFreeTranslation(reservation);
      throw error;
    }
  }
}

/** The translatable subset of an item: only allowed keys, only non-empty strings / string arrays. */
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
