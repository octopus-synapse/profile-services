/**
 * Zod schemas for the dev-only tailor lab routes.
 *
 * Companion to `tailor-lab.dev-routes.ts` — see the header there for why the
 * `.dev-routes.ts` suffix matters.
 */

import { z } from 'zod';

/** Matches `TailorOutputSchema` in the OpenAI adapter. */
export const TailorLabBulletSchema = z.object({
  id: z.string(),
  original: z.string(),
  tailored: z.string(),
  highlights: z.array(z.string()).default([]),
});

const JobSourceShape = {
  jobId: z.string().uuid().optional(),
  jobDescription: z.string().min(10).optional(),
  jobTitle: z.string().max(200).optional(),
  jobCompany: z.string().max(200).optional(),
};

/**
 * `dryRun` is a literal rather than a boolean: the run route never persists,
 * and a literal makes that impossible to flip by accident from the client.
 * Saving is a separate, explicit endpoint.
 */
export const TailorLabRunBody = z
  .object({
    ...JobSourceShape,
    model: z.string().max(80).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(64).max(16000).optional(),
    systemPrompt: z.string().max(20000).optional(),
    dryRun: z.literal(true).default(true),
  })
  .refine((body) => Boolean(body.jobId) || Boolean(body.jobDescription), {
    message: 'Provide either jobId or jobDescription (min 10 chars).',
    path: ['jobDescription'],
  });

export const TailorLabSaveBody = z.object({
  summary: z.string().nullable(),
  jobTitle: z.string().nullable(),
  bullets: z.array(TailorLabBulletSchema),
  jobId: z.string().uuid().optional(),
  job: z.object({ title: z.string(), company: z.string() }),
});

export const TailorLabJobFromUrlBody = z.object({
  url: z.string().url().max(2000),
});

export type TailorLabRunBodyType = z.infer<typeof TailorLabRunBody>;
export type TailorLabSaveBodyType = z.infer<typeof TailorLabSaveBody>;
export type TailorLabJobFromUrlBodyType = z.infer<typeof TailorLabJobFromUrlBody>;
