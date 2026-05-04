/**
 * Route descriptors for the onboarding BC. Replaces
 * `OnboardingController`, `AdminOnboardingController`, and the
 * `OnboardingPreviewController` SSE stream.
 */

import { debounceTime, filter, from, map, switchMap } from 'rxjs';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { OnboardingCompletionInProgressException } from './domain/exceptions/onboarding-extra.exceptions';
import { type OnboardingData, OnboardingDataSchema } from './domain/schemas/onboarding-data.schema';
import {
  type OnboardingProgress,
  OnboardingProgressSchema,
} from './domain/schemas/onboarding-progress.schema';
import { OnboardingSessionSchema } from './infrastructure/dto/onboarding-session-response.schema';
import { buildSession } from './infrastructure/presenters/onboarding.presenter';
import {
  AuthUser,
  CompleteOnboardingResponseSchema,
  EmptyResponseSchema,
  GotoStepBody,
  getSystemThemes,
  LocaleQuery,
  OnboardingConfigResponseSchema,
  OnboardingConfigUpdatedResponseSchema,
  OnboardingStatsResponseSchema,
  OnboardingStatusResponseSchema,
  OnboardingStepCreatedResponseSchema,
  OnboardingStepResponseSchema,
  OnboardingStepsResponseSchema,
  SaveProgressResponseSchema,
  StepDataBody,
  StepKeyParam,
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
      const [data, stepConfigs, strengthConfig, systemThemes, sectionTypes] = await Promise.all([
        bundle.progress.getProgressUseCase.execute(user.userId),
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
        bundle.sectionTypes.findAll(locale),
      ]);
      return buildSession(
        data,
        stepConfigs,
        strengthConfig,
        locale,
        systemThemes,
        { name: user.name, email: user.email },
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
      const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
      ]);
      return buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes);
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/previous',
    auth: { kind: 'jwt' },
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Go back to previous step',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const rawData = await bundle.useCases.goBackOnboardingStepUseCase.execute(user.userId);
      const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
      ]);
      return buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes);
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
      const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
      ]);
      return buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes);
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/save',
    auth: { kind: 'jwt' },
    body: StepDataBody,
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Save current step data without advancing',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const stepData = ctx.body as Record<string, unknown>;
      const rawData = await bundle.useCases.saveOnboardingStepDataUseCase.execute(
        user.userId,
        stepData,
      );
      bundle.sseStream.publish('onboarding.data.changed', { userId: user.userId });
      const [stepConfigs, strengthConfig, systemThemes] = await Promise.all([
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
      ]);
      return buildSession(rawData, stepConfigs, strengthConfig, locale, systemThemes);
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/complete',
    auth: { kind: 'jwt' },
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
        );
        bundle.sseStream.publish('auth.session.invalidate', { userId: user.userId });
        return result;
      } finally {
        await bundle.cacheLock.releaseLock(lockKey);
      }
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding/session/restart',
    auth: { kind: 'jwt' },
    query: LocaleQuery,
    response: OnboardingSessionSchema,
    openapi: {
      summary: 'Restart onboarding with existing profile data',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const q = ctx.query as LocaleQuery;
      const locale = parseLocale(q.locale);
      const stepConfigs = await bundle.config.getActiveSteps();
      await bundle.useCases.restartOnboardingUseCase.execute(user.userId, stepConfigs);
      // Invalidate session cache so frontend picks up hasCompletedOnboarding = false
      bundle.sseStream.publish('auth.session.invalidate', { userId: user.userId });
      // Reuse the GET /session payload shape for the response.
      const [data, strengthConfig, systemThemes, sectionTypes] = await Promise.all([
        bundle.progress.getProgressUseCase.execute(user.userId),
        bundle.config.getStrengthConfig(),
        getSystemThemes(bundle),
        bundle.sectionTypes.findAll(locale),
      ]);
      return buildSession(
        data,
        stepConfigs,
        strengthConfig,
        locale,
        systemThemes,
        { name: user.name, email: user.email },
        sectionTypes,
      );
    },
  },

  // ===== Legacy backward-compat endpoints =====
  {
    method: 'GET',
    path: '/v1/onboarding/progress',
    auth: { kind: 'jwt' },
    response: OnboardingSessionSchema,
    openapi: {
      summary: '[Legacy] Get onboarding progress',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const [data, stepConfigs, strengthConfig] = await Promise.all([
        bundle.progress.getProgressUseCase.execute(user.userId),
        bundle.config.getActiveSteps(),
        bundle.config.getStrengthConfig(),
      ]);
      return buildSession(data, stepConfigs, strengthConfig);
    },
  },
  {
    method: 'GET',
    path: '/v1/onboarding/status',
    auth: { kind: 'jwt' },
    response: OnboardingStatusResponseSchema,
    openapi: {
      summary: '[Legacy] Get onboarding completion status',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const status = await bundle.useCases.getOnboardingStatusUseCase.execute(user.userId);
      return status;
    },
  },
  {
    method: 'PUT',
    path: '/v1/onboarding/progress',
    auth: { kind: 'jwt' },
    body: OnboardingProgressSchema,
    response: SaveProgressResponseSchema,
    openapi: {
      summary: '[Legacy] Save onboarding progress',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const body = ctx.body as OnboardingProgress;
      const result = await bundle.progress.saveProgressUseCase.execute(user.userId, body);
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/onboarding',
    auth: { kind: 'jwt' },
    body: OnboardingDataSchema,
    response: CompleteOnboardingResponseSchema,
    openapi: {
      summary: '[Legacy] Complete onboarding with explicit payload',
      tags: ['onboarding'],
      description: 'Onboarding API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const user = ctx.user! as AuthUser;
      const data = ctx.body as OnboardingData;
      const lockKey = `onboarding:complete:${user.userId}`;
      const acquired = await bundle.cacheLock.acquireLock(lockKey, 60);
      if (!acquired) {
        throw new OnboardingCompletionInProgressException();
      }
      try {
        const result = await bundle.useCases.completeOnboardingUseCase.execute(user.userId, data);
        bundle.sseStream.publish('auth.session.invalidate', { userId: user.userId });
        return result;
      } finally {
        await bundle.cacheLock.releaseLock(lockKey);
      }
    },
  },

  // ===== Admin endpoints =====
  {
    method: 'GET',
    path: '/v1/admin/onboarding/steps',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    response: OnboardingStepsResponseSchema,
    openapi: {
      summary: 'List all onboarding steps',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (_ctx, bundle) => {
      const steps = await bundle.admin.listSteps();
      return { steps };
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/onboarding/stats',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    response: OnboardingStatsResponseSchema,
    openapi: {
      summary: 'Get onboarding funnel statistics',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (_ctx, bundle) => {
      const stats = await bundle.admin.getStats();
      return { stats };
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/onboarding/steps/:key',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: StepKeyParam,
    response: OnboardingStepResponseSchema,
    openapi: {
      summary: 'Get onboarding step by key',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      const step = await bundle.admin.getStep(key);
      if (!step) throw new EntityNotFoundException('OnboardingStep', key);
      return { step };
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/onboarding/steps',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    body: z.record(z.unknown()),
    response: OnboardingStepCreatedResponseSchema,
    openapi: {
      summary: 'Create onboarding step',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (ctx, bundle) => {
      const body = ctx.body as Record<string, unknown>;
      const step = await bundle.admin.createStep(body);
      return { step };
    },
  },
  {
    method: 'PUT',
    path: '/v1/admin/onboarding/steps/:key',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: StepKeyParam,
    body: z.record(z.unknown()),
    response: OnboardingStepCreatedResponseSchema,
    openapi: {
      summary: 'Update onboarding step',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      const body = ctx.body as Record<string, unknown>;
      const step = await bundle.admin.updateStep(key, body);
      return { step };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/admin/onboarding/steps/:key',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: StepKeyParam,
    response: EmptyResponseSchema,
    openapi: {
      summary: 'Delete onboarding step',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      await bundle.admin.deleteStep(key);
      return null;
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/onboarding/config',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    response: OnboardingConfigResponseSchema,
    openapi: {
      summary: 'Get onboarding config (strength levels)',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (_ctx, bundle) => {
      const config = await bundle.admin.getConfig();
      return { config };
    },
  },
  {
    method: 'PUT',
    path: '/v1/admin/onboarding/config',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    body: z.record(z.unknown()),
    response: OnboardingConfigUpdatedResponseSchema,
    openapi: {
      summary: 'Update onboarding config',
      tags: ['admin-onboarding'],
      description: 'Admin onboarding management',
    },
    handler: async (ctx, bundle) => {
      const body = ctx.body as Record<string, unknown>;
      const config = await bundle.admin.updateConfig(body);
      return { config };
    },
  },

  // ===== Live preview SSE stream =====
  {
    method: 'GET',
    path: '/v1/onboarding/preview/stream',
    auth: { kind: 'jwt' },
    kind: 'sse',
    openapi: {
      summary: 'Subscribe to live resume preview updates',
      tags: ['onboarding-preview'],
      description: 'Streams PNG preview as base64 when onboarding data changes.',
    },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      let version = 0;

      return bundle.sseStream.subscribe<{ userId: string }>('onboarding.data.changed').pipe(
        // Each consumer filters its own user — the channel is shared.
        filter((event) => event.data.userId === userId),
        // Coalesce bursts (e.g. autosave keystrokes) into a single render.
        debounceTime(500),
        switchMap(() => {
          version++;
          const currentVersion = version;
          return from(bundle.previewRenderer.renderPreview(userId)).pipe(
            filter((buffer): buffer is Buffer => buffer !== null),
            map((buffer) => ({
              data: { type: 'preview', version: currentVersion, image: buffer.toString('base64') },
              id: `preview-${currentVersion}`,
              type: 'preview',
              retry: 15000,
            })),
          );
        }),
      );
    },
  },
];
