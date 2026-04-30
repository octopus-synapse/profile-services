/**
 * Route descriptors for the fit-profile BC. Replaces
 * `AdminFitQuestionsController`, `FitProfileController`, and
 * `JobFitProfileController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { FitProfileUseCases } from './application/ports/fit-profile.port';
import {
  FitQuestionNotFoundException,
  JobFitProfileNotSetException,
} from './domain/exceptions/fit-profile.exceptions';
import { FIT_DIMENSIONS, QUESTION_SET_SIZE } from './domain/types';
import {
  presentFitProfileMe,
  presentSubmittedFitProfile,
} from './infrastructure/presenters/fit-profile.presenter';
import {
  presentFitQuestion,
  presentFitQuestionList,
  presentFitQuestions,
} from './infrastructure/presenters/fit-question.presenter';
import { presentJobFitProfile } from './infrastructure/presenters/job-fit-profile.presenter';

const IdParam = z.object({ id: z.string() });
// Param name aligned with `jobs.routes.ts` (`:id`) so both BCs can
// coexist on the same Elysia router (memoirist rejects parameter-name
// divergence at a shared path prefix).
const JobIdParam = z.object({ id: z.string() });

const CreateFitQuestionSchema = z.object({
  key: z.string().min(1).max(120),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string().min(1),
  textPtBr: z.string().min(1),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number().positive().default(1),
  isActive: z.boolean().default(true),
  reverseScored: z.boolean().default(false),
});

const UpdateFitQuestionSchema = z.object({
  dimension: z.enum(FIT_DIMENSIONS).optional(),
  textEn: z.string().min(1).optional(),
  textPtBr: z.string().min(1).optional(),
  scaleType: z.enum(['likert5', 'binary']).optional(),
  weight: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  reverseScored: z.boolean().optional(),
});

const FitAnswerSchema = z.object({
  questionId: z.string(),
  rawValue: z.number().int().min(0).max(5),
});

const SubmitFitAnswersSchema = z.object({
  questionSetId: z.string(),
  answers: z.array(FitAnswerSchema).length(QUESTION_SET_SIZE),
});

const SliderMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

const UpsertJobFitProfileSchema = z.object({ sliders: SliderMapSchema });

export const fitProfileRoutes: ReadonlyArray<Route<FitProfileUseCases>> = [
  // ─── User-facing fit-profile ─────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/fit-profile/me',
    auth: { kind: 'jwt' },
    openapi: {
      summary: "Get the caller's Fit Profile lifecycle state",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const view = await bc.getFitProfileStatus.execute(ctx.user!.userId);
      return presentFitProfileMe(view);
    },
  },
  {
    method: 'GET',
    path: '/v1/fit-profile/questions',
    auth: { kind: 'jwt' },
    openapi: {
      summary: "Get or create the caller's 25-question set",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const view = await bc.getOrCreateQuestionSet.execute(ctx.user!.userId);
      return presentFitQuestions(view);
    },
  },
  {
    method: 'POST',
    path: '/v1/fit-profile/answers',
    auth: { kind: 'jwt' },
    body: SubmitFitAnswersSchema,
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
      return presentSubmittedFitProfile(saved);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/fit-profile/me',
    auth: { kind: 'jwt' },
    openapi: {
      summary: "LGPD - wipe the caller's Fit Answers and anonymize the vector",
      tags: ['fit-profile'],
      description: 'Fit Profile (personality vector)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteFitProfile.execute(ctx.user!.userId);
      return { success: true };
    },
  },

  // ─── Job fit profile (recruiter sliders) ─────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs/:id/fit-profile',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_MANAGE,
    params: JobIdParam,
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
      return presentJobFitProfile(profile);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/fit-profile',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_MANAGE,
    params: JobIdParam,
    body: UpsertJobFitProfileSchema,
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
      return presentJobFitProfile(saved);
    },
  },

  // ─── Admin fit questions CRUD ────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/fit-questions',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    openapi: {
      summary: 'List every FitQuestion in the pool',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const rows = await bc.listFitQuestions.execute();
      return presentFitQuestionList(rows);
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
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
      return presentFitQuestion(row);
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/fit-questions',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: CreateFitQuestionSchema,
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
      return presentFitQuestion(row);
    },
  },
  {
    method: 'PATCH',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    body: UpdateFitQuestionSchema,
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
      return presentFitQuestion(row);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/admin/fit-questions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParam,
    openapi: {
      summary: 'Delete a FitQuestion',
      tags: ['admin-fit-questions'],
      description: 'Admin FitQuestion CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteFitQuestion.execute(id);
      return { success: true };
    },
  },
];
