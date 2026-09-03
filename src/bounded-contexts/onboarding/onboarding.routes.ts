/**
 * Route descriptors for the onboarding BC. Replaces
 * `OnboardingController`, `AdminOnboardingController`, and the
 * `OnboardingPreviewController` SSE stream.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { resolveAuthoredLocale } from './application/resolve-authored-locale';
import { OnboardingCompletionInProgressException } from './domain/exceptions/onboarding-extra.exceptions';
import { OnboardingSessionSchema } from './infrastructure/dto/onboarding-session-response.schema';
import { buildSession } from './infrastructure/presenters/onboarding.presenter';
import {
  AuthUser,
  CompleteOnboardingResponseSchema,
  GotoStepBody,
  getSystemResumeStyles,
  LocaleQuery,
  OnboardingResumePreviewResponseSchema,
  ResumePreviewQuery,
  StepDataBody,
} from './onboarding.routes.schemas';

export const onboardingRoutes: ReadonlyArray<Route<OnboardingHttpBundle>> = [
  // ===== Session / Commands API =====
  {
    method: 'GET',
    path: '/v1/onboarding/session',
    auth: { kind: 'jwt' },
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Get onboarding session with field definitions and navigation',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const [data, stepConfigs, strengthConfig, resumeStyles, sectionTypes] = await Promise.all([
        bundle.progress.getProgressUseCase.execute(user.userId),
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemResumeStyles(bundle),
        bundle.sectionTypes.listAll(locale),
      ]);
      return buildSession(
        data,
        stepConfigs,
        strengthConfig,
        locale,
        resumeStyles,
        { name: user.name },
        sectionTypes,
      );
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/next',
    auth: { kind: 'jwt' },
    body: StepDataBody,
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Save current step data and advance to next step',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const stepData = ctx.body as Record<string, unknown>;
      const rawData = await bundle.useCases.advanceOnboardingStepUseCase.execute(
        user.userId,
        stepData,
      );
      const [stepConfigs, strengthConfig, resumeStyles, sectionTypes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemResumeStyles(bundle),
        bundle.sectionTypes.listAll(locale),
      ]);
      // Pass sectionTypes so section steps keep their item-field definitions
      // (parity with GET /session) — otherwise navigating via next/goto/save
      // returns fieldless section steps and the editor renders blank.
      return buildSession(
        rawData,
        stepConfigs,
        strengthConfig,
        locale,
        resumeStyles,
        { name: user.name },
        sectionTypes,
      );
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/goto',
    auth: { kind: 'jwt' },
    body: GotoStepBody,
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Jump to an accessible step',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const body = ctx.body as z.infer<typeof GotoStepBody>;
      const rawData = await bundle.useCases.gotoOnboardingStepUseCase.execute(
        user.userId,
        body.stepId,
      );
      const [stepConfigs, strengthConfig, resumeStyles, sectionTypes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemResumeStyles(bundle),
        bundle.sectionTypes.listAll(locale),
      ]);
      // Pass sectionTypes so section steps keep their item-field definitions
      // (parity with GET /session) — otherwise navigating via next/goto/save
      // returns fieldless section steps and the editor renders blank.
      return buildSession(
        rawData,
        stepConfigs,
        strengthConfig,
        locale,
        resumeStyles,
        { name: user.name },
        sectionTypes,
      );
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/complete',
    auth: { kind: 'jwt' },
    query: LocaleQuery,
    response: CompleteOnboardingResponseSchema,
    openapi: {
      summary: 'Complete onboarding — backend builds payload from saved progress',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const lockKey = `onboarding:complete:${user.userId}`;
      const acquired = await bundle.cacheLock.acquireLock(lockKey, 60);
      if (!acquired) {
        throw new OnboardingCompletionInProgressException();
      }
      try {
        const result = await bundle.useCases.completeOnboardingFromProgressUseCase.execute(
          user.userId,
          resolveAuthoredLocale(ctx),
        );
        bundle.sseStream.publish('auth.session.invalidate', { userId: user.userId });
        // Both locales from day one (ADR-003 §13) — enqueued after the
        // commit; a failure here must not undo a completed onboarding.
        if (result.resumeId) {
          void bundle.onResumeReady?.(result.resumeId).catch(() => undefined);
        }
        return result;
      } finally {
        await bundle.cacheLock.releaseLock(lockKey);
      }
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/extras',
    auth: { kind: 'jwt' },
    body: z
      .object({ extras: z.array(z.string()).default([]) })
      // Use canonical extra step keys (`section:<sectionTypeKey>`) so
      // contract probes hit a valid path, not the OnboardingUnknownStep
      // 400 branch. Allowed set lives in
      // bounded-contexts/onboarding/domain/config/onboarding-section-defaults.config
      // (EXTRA_SECTION_KEYS + extraStepKey()).
      .openapi({ example: { extras: ['section:project_v1', 'section:certification_v1'] } }),
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Activate optional extra steps (projects, certifications, awards, publications)',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const body = ctx.body as { extras: string[] };
      await bundle.activateExtras.execute(user.userId, body.extras);
      // Return the updated session so the frontend can re-render the
      // sidebar with the newly-visible extras in one round-trip.
      const [data, stepConfigs, strengthConfig, resumeStyles, sectionTypes] = await Promise.all([
        bundle.progress.getProgressUseCase.execute(user.userId),
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemResumeStyles(bundle),
        bundle.sectionTypes.listAll(locale),
      ]);
      return buildSession(
        data,
        stepConfigs,
        strengthConfig,
        locale,
        resumeStyles,
        { name: user.name },
        sectionTypes,
      );
    },
  },

  {
    method: 'GET',
    path: '/v1/onboarding/session/resume-preview',
    auth: { kind: 'jwt' },
    query: ResumePreviewQuery,
    contract: {
      probe: false,
      reason: 'Requires a styleId of a style that exists; a static example UUID cannot satisfy it.',
    },
    response: OnboardingResumePreviewResponseSchema,
    openapi: {
      summary: 'Render a live résumé preview from saved progress in a candidate style',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as ResumePreviewQuery;
      const locale = parseLocale(q.locale);
      return bundle.renderOnboardingPreview.execute({
        userId: user.userId,
        styleId: q.styleId,
        locale,
      });
    },
  },

  // ===== Legacy backward-compat endpoints =====
];
