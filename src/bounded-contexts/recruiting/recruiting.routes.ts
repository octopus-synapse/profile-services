/**
 * Route descriptors for the recruiting BC. Replaces
 * `MatchCandidatesController`. The per-route rate-limit (`@RateLimit()`
 * + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import type { MatchCandidatesForJobOutput } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';

export { RATE_LIMIT_KEY };

const MatchCandidatesRequestSchema = z.object({
  jobTitle: z.string().max(200).optional(),
  jobDescription: z.string().max(20_000).optional(),
  skills: z.array(z.string().min(1).max(60)).max(40).optional(),
  minEnglishLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']).optional(),
  remotePolicy: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

type MatchCandidatesRequest = z.infer<typeof MatchCandidatesRequestSchema>;

/**
 * Server-driven config for the recruiter's "create / edit job posting"
 * wizard. The frontend renders steps + fields from this payload and
 * does not hard-code the form layout.
 */
const JOB_FORM_CONFIG = {
  steps: [
    {
      id: 'basics',
      label: 'Basics',
      fields: [
        { key: 'title', type: 'text', label: 'Title', required: true, maxLength: 200 },
        { key: 'company', type: 'text', label: 'Company', required: true, maxLength: 200 },
        { key: 'location', type: 'text', label: 'Location', required: false, maxLength: 200 },
      ],
    },
    {
      id: 'description',
      label: 'Description',
      fields: [
        {
          key: 'description',
          type: 'longtext',
          label: 'Description',
          required: true,
          maxLength: 20_000,
        },
        {
          key: 'jobType',
          type: 'enum',
          label: 'Job type',
          required: true,
          optionsKey: 'jobTypes',
        },
        {
          key: 'remotePolicy',
          type: 'enum',
          label: 'Remote policy',
          required: true,
          optionsKey: 'remotePolicies',
        },
      ],
    },
    {
      id: 'requirements',
      label: 'Requirements',
      fields: [
        {
          key: 'skills',
          type: 'tags',
          label: 'Required skills',
          required: false,
          maxItems: 40,
          itemMaxLength: 60,
        },
        {
          key: 'minEnglishLevel',
          type: 'enum',
          label: 'Minimum English level',
          required: false,
          optionsKey: 'englishLevels',
        },
      ],
    },
    {
      id: 'compensation',
      label: 'Compensation',
      fields: [
        {
          key: 'salaryMin',
          type: 'number',
          label: 'Min. salary',
          required: false,
          min: 0,
        },
        {
          key: 'salaryMax',
          type: 'number',
          label: 'Max. salary',
          required: false,
          min: 0,
        },
        {
          key: 'currency',
          type: 'enum',
          label: 'Currency',
          required: false,
          optionsKey: 'currencies',
        },
      ],
    },
  ],
  options: {
    jobTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'],
    remotePolicies: ['REMOTE', 'HYBRID', 'ONSITE'],
    englishLevels: ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT'],
    currencies: ['BRL', 'USD', 'EUR', 'GBP'],
  },
} as const;

const FormFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  maxLength: z.number().int().optional(),
  optionsKey: z.string().optional(),
  maxItems: z.number().int().optional(),
  itemMaxLength: z.number().int().optional(),
  min: z.number().optional(),
});

const JobFormConfigResponseSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      fields: z.array(FormFieldSchema),
    }),
  ),
  options: z.object({
    jobTypes: z.array(z.string()),
    remotePolicies: z.array(z.string()),
    englishLevels: z.array(z.string()),
    currencies: z.array(z.string()),
  }),
});

// ─── Response schemas ─────────────────────────────────────────────────
const FitBreakdownSchema = z.object({
  skillOverlap: z.number(),
  englishMatch: z.number(),
  remoteMatch: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

const MatchCandidateItemSchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
  bio: z.string().nullable(),
  primaryStack: z.array(z.string()),
  fit: z.object({
    score: z.number(),
    breakdown: FitBreakdownSchema,
  }),
});

const MatchCandidatesResponseSchema = z.object({
  candidates: z.array(MatchCandidateItemSchema),
  poolSize: z.number().int().min(0),
});

export const recruitingRoutes: ReadonlyArray<Route<MatchCandidatesForJobPort>> = [
  {
    method: 'GET',
    path: '/v1/recruiting/jobs/form-config',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    response: JobFormConfigResponseSchema,
    openapi: {
      summary: 'Server-driven config for the create/edit-job wizard',
      tags: ['recruiting'],
      description:
        'Returns `{steps:[{id,label,fields:[...]}], options:{...}}`. The frontend iterates `steps[]` and renders inputs from each `field`. Adding a step or field is a backend-only change.',
    },
    sdk: { exported: true },
    // No use-case dependency — config is static today.
    handler: async () => ({
      steps: JOB_FORM_CONFIG.steps,
      options: JOB_FORM_CONFIG.options,
    }),
  },
  {
    method: 'POST',
    path: '/v1/recruiting/match-candidates',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: MatchCandidatesRequestSchema,
    statusCode: 200,
    response: MatchCandidatesResponseSchema,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 20, duration: 3600, keyStrategy: 'user' },
      },
    ],
    openapi: {
      summary:
        'Rank up-to-N opt-in candidates for a job description using the same structured fit-score model used on the candidate side (reverse match).',
      tags: ['recruiting'],
      description: 'Reverse candidate match API',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase): Promise<MatchCandidatesForJobOutput> => {
      const body = ctx.body as MatchCandidatesRequest;
      return useCase.execute({
        requesterId: ctx.user!.userId,
        jobSkills: body.skills ?? [],
        jobMinEnglish: body.minEnglishLevel ?? null,
        jobRemotePolicy: body.remotePolicy ?? null,
        limit: body.limit,
      });
    },
  },
];
