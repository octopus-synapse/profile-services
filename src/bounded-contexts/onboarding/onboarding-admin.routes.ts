/**
 * Admin route descriptors for the onboarding BC (step catalog + config
 * management). Split from onboarding.routes.ts to keep both files under
 * the 500-line cap; the composition concatenates the two arrays.
 */

import { Permission } from '@/shared-kernel/authorization';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import {
  AdminConfigBody,
  AdminStepBody,
  EmptyResponseSchema,
  OnboardingConfigResponseSchema,
  OnboardingConfigUpdatedResponseSchema,
  OnboardingStatsResponseSchema,
  OnboardingStepCreatedResponseSchema,
  OnboardingStepResponseSchema,
  OnboardingStepsResponseSchema,
  StepKeyParam,
} from './onboarding.routes.schemas';

export const onboardingAdminRoutes: ReadonlyArray<Route<OnboardingHttpBundle>> = [
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
    body: AdminStepBody,
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
    body: AdminStepBody,
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
    body: AdminConfigBody,
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
];
