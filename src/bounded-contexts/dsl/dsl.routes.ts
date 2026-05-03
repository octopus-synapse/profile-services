/**
 * Route descriptors for the DSL BC. Replaces `DslController`.
 *
 * Pure data + handler closures over `DslUseCases`. The Nest adapter
 * (`synthesizeRouteControllers`) turns each `Route` into a Nest
 * controller class at module load time.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { DslUseCases } from './application/ports/dsl.port';
import {
  AstResponseSchema,
  PreviewQuerySchema,
  RenderQuerySchema,
  ResumeIdParams,
  SlugParams,
  ValidateDslResponseSchema,
} from './dsl.routes.schemas';

export const dslRoutes: ReadonlyArray<Route<DslUseCases>> = [
  {
    method: 'POST',
    path: '/v1/dsl/validate',
    auth: { kind: 'public' },
    response: ValidateDslResponseSchema,
    openapi: {
      summary: 'Validate DSL schema',
      tags: ['dsl'],
      description: 'Dsl API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = bc.validateDsl.execute(ctx.body as Record<string, unknown>);
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/dsl/preview',
    auth: { kind: 'public' },
    query: PreviewQuerySchema,
    response: AstResponseSchema,
    openapi: {
      summary: 'Compile DSL to AST (preview, no persistence)',
      tags: ['dsl'],
      description: 'Dsl API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { target } = ctx.query as { target?: 'html' | 'pdf' };
      const ast = bc.previewDsl.execute(ctx.body as Record<string, unknown>, target ?? 'html');
      return { ast };
    },
  },
  {
    method: 'GET',
    path: '/v1/dsl/render/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParams,
    query: RenderQuerySchema,
    response: AstResponseSchema,
    openapi: {
      summary: 'Get compiled AST for a resume',
      tags: ['dsl'],
      description: 'Dsl API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const { target, locale } = ctx.query as { target?: 'html' | 'pdf'; locale?: string };
      const result = await bc.renderResumeDsl.execute({
        resumeId,
        userId: ctx.user!.userId,
        target: target ?? 'html',
        locale: parseLocale(locale),
      });
      return { ast: result.ast };
    },
  },
  {
    method: 'GET',
    path: '/v1/dsl/render/public/:slug',
    auth: { kind: 'public' },
    params: SlugParams,
    query: RenderQuerySchema,
    response: AstResponseSchema,
    openapi: {
      summary: 'Get compiled AST for a public resume',
      tags: ['dsl'],
      description: 'Dsl API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { slug } = ctx.params as { slug: string };
      const { target, locale } = ctx.query as { target?: 'html' | 'pdf'; locale?: string };
      const result = await bc.renderPublicResumeDsl.execute({
        slug,
        target: target ?? 'html',
        locale: parseLocale(locale),
      });
      return { ast: result.ast };
    },
  },
];
