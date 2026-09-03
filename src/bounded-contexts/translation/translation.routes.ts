/**
 * Route descriptors for the translation BC. Replaces
 * `TranslationController`. The BC's HTTP boundary fronts a single
 * `TranslationService` aggregate, which we use directly as the bundle
 * token (no separate Use-Cases port today).
 */

import { LOCALES, type Locale } from '@packages/i18n';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { derivedState, envelopeFor, hashSource } from '@/shared-kernel/i18n/translation-envelope';
import { normalizeLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { selectTranslatableFieldKeys } from './domain/policies/field-translation.policy';
import type { TranslatableResume } from './domain/ports/resume-translation-store.port';
import { TRANSLATION_FLAG_KEY } from './domain/translation-flags.const';
import type { TranslationBundle } from './translation.composition';
import {
  HealthResponseSchema,
  LanguageDetectionsResponseSchema,
  ResumeIdParams,
  ResumeTranslationParams,
  ResumeTranslationStatusSchema,
  TranslateSimpleSchema,
  TranslationReportSchema,
} from './translation.routes.schemas';

/**
 * Guards for every route that spends an OpenAI call (ADR-003 §9).
 *
 * These were authenticated but otherwise unguarded, so any logged-in account
 * could loop them and run up the bill. The rate limit is user-keyed because
 * the cost is per-account, not per-IP; the flag is the subsystem kill-switch,
 * and refusing outright is the honest answer here — a translate endpoint that
 * quietly hands back untranslated text would be worse than a 404.
 *
 * `GET /v1/translation/health` is deliberately excluded: it is cached for an
 * hour and `isAvailable()` never reaches the provider.
 */
const LLM_ROUTE_GUARDS = [
  { id: 'rate-limit', metadata: { points: 30, durationSeconds: 3600, keyStrategy: 'user' } },
  { id: 'feature-flag', metadata: { key: TRANSLATION_FLAG_KEY } },
] as const;

/** Per-locale rollup of what the client shows next to the switcher. */
function statusFor(resume: TranslatableResume) {
  return LOCALES.map((locale: Locale) => {
    if (locale === resume.language) {
      return {
        locale,
        role: 'canonical' as const,
        items: { total: 0, current: 0, stale: 0, missing: 0, manual: 0, diverged: 0 },
        prose: 'n/a' as const,
      };
    }
    const items = { total: 0, current: 0, stale: 0, missing: 0, manual: 0, diverged: 0 };
    for (const section of resume.sections) {
      const keys = selectTranslatableFieldKeys(section.sectionTypeKey, section.fields);
      for (const item of section.items) {
        const subset = Object.fromEntries(
          keys.filter((k) => item.content[k] != null).map((k) => [k, item.content[k]]),
        );
        if (Object.keys(subset).length === 0) continue;
        items.total++;
        const env = envelopeFor(item.translations, locale);
        if (env?.origin === 'manual') items.manual++;
        else if (env?.origin === 'diverged') items.diverged++;
        else items[derivedState(env, hashSource(subset))]++;
      }
    }
    const proseSubset = Object.fromEntries(
      Object.entries(resume.prose).filter(([, v]) => typeof v === 'string' && v.trim()),
    );
    const proseEnv = envelopeFor(resume.translations, locale);
    const prose =
      Object.keys(proseSubset).length === 0
        ? ('n/a' as const)
        : proseEnv?.origin === 'manual' || proseEnv?.origin === 'diverged'
          ? proseEnv.origin
          : derivedState(proseEnv, hashSource(proseSubset));
    return { locale, role: 'derived' as const, items, prose };
  });
}

async function ownedResume(bundle: TranslationBundle, resumeId: string, userId: string) {
  const resume = await bundle.store.load(resumeId);
  if (!resume || resume.userId !== userId) throw new EntityNotFoundException('Resume', resumeId);
  return resume;
}

export const translationRoutes: ReadonlyArray<Route<TranslationBundle>> = [
  {
    method: 'GET',
    path: '/v1/translation/health',
    auth: { kind: 'public' },
    response: HealthResponseSchema,
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    openapi: {
      summary: 'Check translation service health',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bundle) => {
      const isAvailable = await bundle.service.checkServiceHealth();
      return {
        status: isAvailable ? 'healthy' : 'unavailable',
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/detect',
    auth: { kind: 'jwt' },
    guards: LLM_ROUTE_GUARDS,
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    response: LanguageDetectionsResponseSchema,
    openapi: {
      summary: 'Detect the language of a text',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const detections = await bundle.service.detectLanguage(dto.text);
      return { detections };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/translations/:locale',
    auth: { kind: 'jwt' },
    guards: LLM_ROUTE_GUARDS,
    permission: Permission.RESUME_UPDATE,
    params: ResumeTranslationParams,
    response: TranslationReportSchema,
    openapi: {
      summary: 'Derive the résumé into a locale now (ADR-003)',
      tags: ['translation'],
      description:
        'Runs the bilingual write-through inline for the first switch, so the person sees the ' +
        'result in the same session. Progress per section streams on the user channel; the ' +
        'response is the final report. Unchanged items cost nothing; copies the person edited ' +
        'are never overwritten.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId, locale: raw } = ctx.params as { resumeId: string; locale: string };
      const locale = normalizeLocale(raw);
      if (!locale) throw new EntityNotFoundException('Locale', raw);
      await ownedResume(bundle, resumeId, ctx.user!.userId);
      const report = await bundle.translateResume.execute(resumeId, { locale });
      const { costUsdMicros: _cost, ...wire } = report;
      return wire;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/translations',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParams,
    response: ResumeTranslationStatusSchema,
    openapi: {
      summary: 'Translation state of each locale of a résumé',
      tags: ['translation'],
      description:
        'For the canonical locale, `role: canonical`. For the other, how many items are current, ' +
        'stale (canonical text changed since), missing, or hand-written (manual / diverged).',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const resume = await ownedResume(bundle, resumeId, ctx.user!.userId);
      return { resumeId, language: resume.language, locales: statusFor(resume) };
    },
  },
  {
    method: 'GET',
    path: '/v1/translation/subscribe',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    kind: 'sse',
    skip: ['responseWrapper'],
    openapi: {
      summary: 'Live progress of translation runs for the authenticated user',
      tags: ['translation'],
      description:
        'Server-sent events: one `{ resumeId, locale, done, total, status, reason? }` per section ' +
        'as the write-through derives a résumé. Same channel the translate-now route reports on.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => bundle.subscribeToProgress(ctx.user!.userId),
  },
];
