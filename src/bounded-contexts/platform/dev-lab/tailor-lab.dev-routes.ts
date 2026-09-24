/**
 * Route descriptors for the DEV-ONLY tailor prompt lab.
 *
 * ⚠️ DO NOT RENAME THIS FILE TO `*.routes.ts`. ⚠️
 *
 * Every route walker in this repo selects files with
 * `entry.endsWith('.routes.ts')` — the swagger generator, the descriptor and
 * example contract specs, the guard checker, the envelope linter. The
 * `.dev-routes.ts` suffix is what keeps these operations out of `swagger.json`
 * and out of the generated SDK, and — most importantly — stops the contract
 * mutation probe from firing `POST .../run` in CI, which would spend a real
 * OpenAI call on every pipeline run. Mounting is imperative (see
 * `tailor-lab.composition.ts` and the `NODE_ENV === 'development'` guard in
 * `elysia-bootstrap.ts`), not discovery-based, so nothing breaks by opting out.
 *
 * The descriptors still carry full `openapi` metadata and `sdk.exported:false`
 * so that a future rename would start out compliant with the house rules.
 */

import { AuthenticationRequiredException } from '@/shared-kernel/authorization';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { withHeaders } from '@/shared-kernel/http/route';
import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { ResumeIdParamSchema } from '@/shared-kernel/schemas/params';
import type { TailorLabBundle } from './tailor-lab.bundle';
import { TAILOR_LAB_CSP } from './tailor-lab.bundle';
import {
  TailorLabJobFromUrlBody,
  type TailorLabJobFromUrlBodyType,
  TailorLabRunBody,
  type TailorLabRunBodyType,
  TailorLabSaveBody,
  type TailorLabSaveBodyType,
} from './tailor-lab.dev-routes.schemas';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': TAILOR_LAB_CSP,
} as const;

export const tailorLabDevRoutes: ReadonlyArray<Route<TailorLabBundle>> = [
  {
    method: 'GET',
    path: '/dev/tailor-lab',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    sdk: { exported: false },
    binary: { mediaType: 'text/html' },
    openapi: {
      summary: 'Resume tailoring prompt lab (development only)',
      tags: ['dev-lab'],
      description:
        'Human-facing HTML page for iterating on the tailor prompt. Not an API endpoint, and never mounted outside NODE_ENV=development.',
    },
    handler: async (_ctx, bc) => withHeaders(HTML_HEADERS, new StreamableFile(bc.readHtml())),
  },
  {
    method: 'GET',
    path: '/v1/dev/tailor-lab/defaults',
    auth: { kind: 'jwt' },
    sdk: { exported: false },
    openapi: {
      summary: 'Production defaults for the tailor prompt (development only)',
      tags: ['dev-lab'],
      description:
        'Returns the system prompt, model, temperature and token budget the production tailor uses, so the lab can pre-fill its editable fields and offer a "restore default" action.',
    },
    handler: async (_ctx, bc) => bc.defaults,
  },
  {
    method: 'POST',
    path: '/v1/dev/tailor-lab/resumes/:resumeId/run',
    auth: { kind: 'jwt' },
    params: ResumeIdParamSchema,
    body: TailorLabRunBody,
    statusCode: 200,
    // Same gates as the production tailor route, with the same metadata: the
    // lab is meant to fail exactly where production fails. `resumeId` must
    // stay in the PATH — `resolveMinQualityTarget` reads it from the route
    // params, and a body-only id would silently fall back to the primary
    // resume at threshold 70 instead of this route's 50.
    guards: [
      { id: 'fit-profile' },
      { id: 'min-quality', metadata: { min: 50, resumeParam: 'resumeId' } },
      { id: 'external-api' },
    ],
    sdk: { exported: false },
    openapi: {
      summary: 'Run the tailor prompt with overrides, without persisting (development only)',
      tags: ['dev-lab'],
      description:
        'Executes the tailoring LLM call against a real resume and job with optional model/temperature/system-prompt overrides. Returns the rewritten bullets plus the exact payload sent and the token, latency and cost telemetry. Never writes a ResumeVersion.',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as TailorLabRunBodyType;
      return bc.runTailorLab.execute({
        resumeId,
        userId: authenticatedUserId(ctx),
        jobId: body.jobId,
        jobDescription: body.jobDescription,
        jobTitle: body.jobTitle,
        jobCompany: body.jobCompany,
        overrides: {
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          systemPrompt: body.systemPrompt,
        },
      });
    },
  },
  {
    method: 'POST',
    path: '/v1/dev/tailor-lab/resumes/:resumeId/save',
    auth: { kind: 'jwt' },
    params: ResumeIdParamSchema,
    body: TailorLabSaveBody,
    statusCode: 200,
    guards: [
      { id: 'fit-profile' },
      { id: 'min-quality', metadata: { min: 50, resumeParam: 'resumeId' } },
    ],
    sdk: { exported: false },
    openapi: {
      summary: 'Persist an approved lab run as a tailored version (development only)',
      tags: ['dev-lab'],
      description:
        'Writes the output of a previous /run call as a real tailored ResumeVersion and returns its id, so the rendered resume preview (which requires a versionId) can display it. Takes the run output rather than re-running the LLM.',
    },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as TailorLabSaveBodyType;
      return bc.saveTailorLabRun.execute({
        resumeId,
        userId: authenticatedUserId(ctx),
        summary: body.summary,
        jobTitle: body.jobTitle,
        bullets: body.bullets,
        jobId: body.jobId,
        job: body.job,
      });
    },
  },
  {
    method: 'POST',
    path: '/v1/dev/tailor-lab/job-from-url',
    auth: { kind: 'jwt' },
    body: TailorLabJobFromUrlBody,
    statusCode: 200,
    guards: [{ id: 'external-api' }],
    sdk: { exported: false },
    openapi: {
      summary: 'Extract a job posting from a URL (development only)',
      tags: ['dev-lab'],
      description:
        'Fetches a job posting URL through the SSRF-defended fetch port and returns the LLM-extracted fields, so a specific vacancy can be tailored against without retyping it. Fails on sites that block bots or render client-side; the lab then falls back to pasted text.',
    },
    handler: async (ctx, bc) => {
      const { url } = ctx.body as TailorLabJobFromUrlBodyType;
      return bc.jobUrlPreview.execute(url);
    },
  },
];

function authenticatedUserId(ctx: Pick<HttpCtx, 'user'>): string {
  if (!ctx.user) throw new AuthenticationRequiredException();
  return ctx.user.userId;
}
