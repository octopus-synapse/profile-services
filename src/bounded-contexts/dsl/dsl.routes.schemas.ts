/**
 * Route descriptors for the DSL BC. Replaces `DslController`.
 *
 * Pure data + handler closures over `DslUseCases`. The Nest adapter
 * (`synthesizeRouteControllers`) turns each `Route` into a Nest
 * controller class at module load time.
 */

import { z } from 'zod';
import { ResumeAstSchema } from './domain/schemas/ast/resume-ast.schema';

// ─── Response schemas ────────────────────────────────────────────────
export const ValidateDslResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).nullable(),
});

export const AstResponseSchema = z.object({ ast: ResumeAstSchema });

export const RenderTargetSchema = z.enum(['html', 'pdf']);

export const PreviewQuerySchema = z.object({
  target: RenderTargetSchema.optional(),
});

export const RenderQuerySchema = z.object({
  target: RenderTargetSchema.optional(),
  locale: z.string().optional(),
});

export const ResumeIdParams = z.object({ resumeId: z.string() });
export const SlugParams = z.object({ slug: z.string() });
