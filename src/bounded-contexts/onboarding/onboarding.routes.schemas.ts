/**
 * Route descriptors for the onboarding BC. Replaces
 * `OnboardingController`, `AdminOnboardingController`, and the
 * `OnboardingPreviewController` SSE stream.
 */

import { z } from 'zod';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─── Schemas ─────────────────────────────────────────────────────────
export const LocaleQuery = z.object({ locale: z.string().optional() });
export const StepKeyParam = z.object({ key: z.string() });
export const StepDataBody = z.record(z.unknown());
export const GotoStepBody = z.object({ stepId: z.string() });

export type LocaleQuery = z.infer<typeof LocaleQuery>;

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded JSON-leaf type used for free-form Prisma JSON columns
// (`fields`, `translations`, `validation`, `strengthLevels`). Two
// levels of nesting cover every realistic shape without `z.lazy()`.
export const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const JsonValueDepth1Schema = z.union([JsonLeafSchema, z.array(JsonLeafSchema)]);
export const JsonValueDepth2Schema = z.union([
  JsonValueDepth1Schema,
  z.record(z.string(), JsonValueDepth1Schema),
  z.array(z.union([JsonLeafSchema, z.record(z.string(), JsonValueDepth1Schema)])),
]);
export const JsonValueSchema = z.union([
  JsonValueDepth2Schema,
  z.record(z.string(), JsonValueDepth2Schema),
  z.array(JsonValueDepth2Schema),
]);

export const OnboardingStepRowSchema = z.object({
  id: z.string(),
  key: z.string(),
  order: z.number().int(),
  component: z.string(),
  icon: z.string(),
  required: z.boolean(),
  sectionTypeKey: z.string().nullable(),
  fields: JsonValueSchema,
  translations: JsonValueSchema,
  validation: JsonValueSchema,
  strengthWeight: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const OnboardingStepsResponseSchema = z.object({ steps: z.array(OnboardingStepRowSchema) });

// `getStep` returns either `{ step }` or a fallback `{ success, message }`
// when the step is missing — model both branches in a single union.
export const OnboardingStepResponseSchema = z.union([
  z.object({ step: OnboardingStepRowSchema }),
  z.object({ success: z.literal(false), message: z.string() }),
]);

export const OnboardingStatsResponseSchema = z.object({
  stats: z.object({
    totalStarted: z.number().int(),
    totalCompleted: z.number().int(),
    completionRate: z.number().int(),
    dropOffByStep: z.record(z.string(), z.number()),
  }),
});

export const OnboardingConfigRowSchema = z.object({
  id: z.string(),
  key: z.string(),
  strengthLevels: JsonValueSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const OnboardingConfigResponseSchema = z.object({
  config: OnboardingConfigRowSchema.nullable(),
});

export const OnboardingConfigUpdatedResponseSchema = z.object({
  config: OnboardingConfigRowSchema,
});

export const OnboardingStepCreatedResponseSchema = z.object({ step: OnboardingStepRowSchema });

export const OnboardingStatusResponseSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: IsoDateTimeSchema.nullable(),
});

export const SaveProgressResponseSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
});

export const CompleteOnboardingResponseSchema = z.object({ resumeId: z.string() });

export const EmptyResponseSchema = z.null();

// Helper to fetch system themes through the bundle.
export async function getSystemThemes(bundle: OnboardingHttpBundle) {
  return bundle.systemThemes.getSystemThemes();
}

export type AuthUser = { userId: string; email: string; name?: string };
