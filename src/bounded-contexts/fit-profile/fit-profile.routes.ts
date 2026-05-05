/**
 * Route descriptors for the fit-profile BC. Replaces
 * `AdminFitQuestionsController`, `FitProfileController`, and
 * `JobFitProfileController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { FitProfileUseCases } from './application/ports/fit-profile.port';
import {
  FitQuestionNotFoundException,
  JobFitProfileNotSetException,
} from './domain/exceptions/fit-profile.exceptions';
import {
  CreateFitQuestionSchema,
  EmptyResponseSchema,
  FitProfileMeResponseSchema,
  FitQuestionListResponseSchema,
  FitQuestionResponseSchema,
  FitQuestionsResponseSchema,
  IdParam,
  JobFitProfileResponseSchema,
  JobIdParam,
  SubmitFitAnswersSchema,
  SubmittedFitProfileResponseSchema,
  UpdateFitQuestionSchema,
  UpsertJobFitProfileSchema,
} from './fit-profile.routes.schemas';
import {
  toFitProfileMeResponseDto,
  toSubmittedFitProfileResponseDto,
} from './infrastructure/presenters/fit-profile.presenter';
import {
  toFitQuestionListResponseDto,
  toFitQuestionResponseDto,
  toFitQuestionsResponseDto,
} from './infrastructure/presenters/fit-question.presenter';
import { toJobFitProfileResponseDto } from './infrastructure/presenters/job-fit-profile.presenter';

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
  {
    method: 'DELETE',
    path: '/v1/fit-profile/me',
    auth: { kind: 'jwt' },
    response: EmptyResponseSchema,
    openapi: {
      summary: "LGPD - wipe the caller's Fit Answers and anonymize the vector",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteFitProfile.execute(ctx.user!.userId);
      return null;
    },
  },

  // ─── Job fit profile (recruiter sliders) ─────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs/:id/fit-profile',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_MANAGE,
    params: JobIdParam,
    response: JobFitProfileResponseSchema,
    openapi: {
      summary: 'Get the recruiter-authored Fit Profile for a job',
      tags: ['fit-profile'],
      description: 'Job Fit Profile (recruiter sliders)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id: jobId } = ctx.params as { id: string };
      const profile = await bc.getJobFitProfile.execute(jobId);
      if (!profile) throw new JobFitProfileNotSetException(jobId);
      return toJobFitProfileResponseDto(profile);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/fit-profile',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_MANAGE,
    params: JobIdParam,
    body: UpsertJobFitProfileSchema,
    response: JobFitProfileResponseSchema,
    openapi: {
      summary: 'Upsert the recruiter-authored Fit Profile for a job',
      tags: ['fit-profile'],
      description: 'Job Fit Profile (recruiter sliders)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id: jobId } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof UpsertJobFitProfileSchema>;
      const saved = await bc.upsertJobFitProfile.execute({
        jobId,
        editedByUserId: ctx.user!.userId,
        sliders: body.sliders,
      });
      return toJobFitProfileResponseDto(saved);
    },
  },

  // ─── Admin fit questions CRUD ────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/fit-questions',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    response: FitQuestionListResponseSchema,
    openapi: {
      summary: 'List every FitQuestion in the pool',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const rows = await bc.listFitQuestions.execute();
      return toFitQuestionListResponseDto(rows);
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    response: FitQuestionResponseSchema,
    openapi: {
      summary: 'Get one FitQuestion by id',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const row = await bc.getFitQuestion.execute(id);
      if (!row) throw new FitQuestionNotFoundException(id);
      return toFitQuestionResponseDto(row);
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/fit-questions',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: CreateFitQuestionSchema,
    response: FitQuestionResponseSchema,
    openapi: {
      summary: 'Create a new FitQuestion',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof CreateFitQuestionSchema>;
      const row = await bc.createFitQuestion.execute({
        key: body.key,
        dimension: body.dimension,
        textEn: body.textEn,
        textPtBr: body.textPtBr,
        scaleType: body.scaleType,
        weight: body.weight,
        isActive: body.isActive,
        reverseScored: body.reverseScored,
      });
      return toFitQuestionResponseDto(row);
    },
  },
  {
    method: 'PATCH',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    body: UpdateFitQuestionSchema,
    response: FitQuestionResponseSchema,
    openapi: {
      summary: 'Update an existing FitQuestion',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof UpdateFitQuestionSchema>;
      const row = await bc.updateFitQuestion.execute(id, body);
      return toFitQuestionResponseDto(row);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    response: EmptyResponseSchema,
    openapi: {
      summary: 'Delete a FitQuestion',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteFitQuestion.execute(id);
      return null;
    },
  },
];
