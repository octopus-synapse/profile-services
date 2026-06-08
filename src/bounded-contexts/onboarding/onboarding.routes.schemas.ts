/**
 * Route descriptors for the onboarding BC. Replaces
 * `OnboardingController`, `AdminOnboardingController`, and the
 * `OnboardingPreviewController` SSE stream.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';

extendZodWithOpenApi(z);

// ─── Schemas ─────────────────────────────────────────────────────────
export const LocaleQuery = z.object({ locale: z.string().optional() });
/**
 * Query shape for `POST /v1/onboarding/session/restart`. Adds the optional
 * `mode=clean` switch which wipes progress to a blank state instead of
 * pre-filling from existing user/resume data. Default behavior (no `mode`)
 * is the legacy "carry-forward" UX.
 */
export const RestartQuery = z.object({
  locale: z.string().optional(),
  mode: z.enum(['clean']).optional(),
});
export type RestartQuery = z.infer<typeof RestartQuery>;
export const StepKeyParam = z.object({ key: z.string() });
export const StepDataBody = z
  .record(z.unknown())
  .openapi({ example: { fullName: 'Fixture User', headline: 'Senior Software Engineer' } });

export const AdminStepBody = z.record(z.unknown()).openapi({
  example: { key: 'profile', titleEn: 'Profile', titlePtBr: 'Perfil', order: 1 },
});

export const AdminConfigBody = z
  .record(z.unknown())
  .openapi({ example: { strengthLevels: [{ key: 'beginner', threshold: 0 }] } });
// `stepId` here is the step KEY (slug-like, e.g. 'personal-info', 'experience')
// resolved by `getStepIndex` in `GotoOnboardingStepUseCase`, not a UUID.
// The F3-PD-011a sweep that added `.uuid()` to `*Id` fields was a false positive here.
export const GotoStepBody = z.object({ stepId: z.string().min(1) }).openapi({
  example: {
    stepId: 'personal-info',
  },
});

export type LocaleQuery = z.infer<typeof LocaleQuery>;

// ─── Response schemas ─────────────────────────────────────────────────
export const JsonArrayValueSchema = z.array(z.unknown()).openapi({ example: [] });
export const JsonObjectValueSchema = z.record(z.unknown()).openapi({ example: {} });

export const OnboardingStepRowSchema = z.object({
  id: z.string(),
  key: z.string(),
  order: z.number().int(),
  component: z.string(),
  icon: z.string(),
  required: z.boolean(),
  sectionTypeKey: z.string().nullable(),
  fields: JsonArrayValueSchema,
  translations: JsonObjectValueSchema,
  validation: JsonObjectValueSchema,
  strengthWeight: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const OnboardingStepsResponseSchema = z.object({ steps: z.array(OnboardingStepRowSchema) });

// P2-138 — handler now throws `EntityNotFoundException` on miss
// (Q18), so the fallback `{ success: false, message }` branch is
// dead. Schema is collapsed to the success-only shape; the 404
// envelope is rendered by the global error mapper.
export const OnboardingStepResponseSchema = z.object({ step: OnboardingStepRowSchema });

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
  strengthLevels: JsonArrayValueSchema,
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

export const CompleteOnboardingResponseSchema = z.object({ resumeId: z.string().uuid() });

export const EmptyResponseSchema = z.null();

// Query for the live résumé preview — `styleId` is the candidate style the
// user is previewing (from the tapped card), not the saved selection.
export const ResumePreviewQuery = z.object({
  styleId: z.string().uuid(),
  locale: z.string().optional(),
});
export type ResumePreviewQuery = z.infer<typeof ResumePreviewQuery>;

// Self-contained HTML mirroring the Typst PDF (mirror of the export BC's
// `ResumePreviewResponseSchema`), ready for an iframe/WebView.
export const OnboardingResumePreviewResponseSchema = z.object({ html: z.string() });

// Helper to fetch the system resume styles shown on the picker step.
export async function getSystemResumeStyles(bundle: OnboardingHttpBundle) {
  return bundle.resumeStyles.listSystemStyles();
}

export type AuthUser = { userId: string; email: string; name?: string };
