/**
 * Route descriptors for the fit-profile BC. Replaces
 * `AdminFitQuestionsController`, `FitProfileController`, and
 * `JobFitProfileController`.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { FitProfileUseCases } from './application/ports/fit-profile.port';
import {
  FitProfileMeResponseSchema,
  FitQuestionsResponseSchema,
  SubmitFitAnswersSchema,
  SubmittedFitProfileResponseSchema,
} from './fit-profile.routes.schemas';
import {
  toFitProfileMeResponseDto,
  toSubmittedFitProfileResponseDto,
} from './infrastructure/presenters/fit-profile.presenter';
import { toFitQuestionsResponseDto } from './infrastructure/presenters/fit-question.presenter';

export const fitProfileRoutes: ReadonlyArray<Route<FitProfileUseCases>> = [
  // ─── User-facing fit-profile ─────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/fit-profile/me',
    auth: { kind: 'jwt' },
    response: FitProfileMeResponseSchema,
    openapi: {
      summary: "Get the caller's Fit Profile lifecycle state",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const view = await bc.getFitProfileStatus.execute(ctx.user!.userId);
      return toFitProfileMeResponseDto(view);
    },
  },
  {
    method: 'GET',
    path: '/v1/fit-profile/questions',
    auth: { kind: 'jwt' },
    response: FitQuestionsResponseSchema,
    openapi: {
      summary: "Get or create the caller's 25-question set",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const view = await bc.getOrCreateQuestionSet.execute(ctx.user!.userId);
      return toFitQuestionsResponseDto(view);
    },
  },
  {
    method: 'POST',
    path: '/v1/fit-profile/answers',
    auth: { kind: 'jwt' },
    body: SubmitFitAnswersSchema,
    response: SubmittedFitProfileResponseSchema,
    guards: [{ id: 'multi-step-flow' }],
    openapi: {
      summary: 'Commit the 25 Fit Answers; compute and persist vector',
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof SubmitFitAnswersSchema>;
      const saved = await bc.submitFitAnswers.execute({
        userId: ctx.user!.userId,
        questionSetId: body.questionSetId,
        answers: body.answers,
      });
      return toSubmittedFitProfileResponseDto(saved);
    },
  },

  // ─── Job fit profile (recruiter sliders) ─────────────────────────

  // ─── Admin fit questions CRUD ────────────────────────────────────
];
