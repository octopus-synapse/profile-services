/**
 * Route descriptors for the public-resumes BC. Replaces the JSON
 * endpoints of `PublicResumeController` and `ShareManagementController`.
 *
 * The binary-image endpoints stay Nest-decorated:
 * - `GET /v1/public/resumes/:slug/og.png` — `StreamableFile` PNG.
 * - `GET /v1/shares/:shareId/qr.png` — `StreamableFile` PNG.
 *
 * The synthesizer does not yet model `StreamableFile` responses or the
 * `@Header()` decorators required to set `Content-Type`/`Cache-Control`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { PublicResumesHttpBundle } from './application/ports/public-resumes.bundle';
import {
  ResumeShareAccessDeniedException,
  ShareNotFoundException,
} from '../domain/exceptions/presentation.exceptions';
import {
  toAliasPayload,
  toAliasPayloadList,
  toSharePayload,
  toSharePayloadList,
} from './presenters/share-management.presenter';

// ─── Schemas ─────────────────────────────────────────────────────────
const SlugParam = z.object({ slug: z.string() });
const ResumeIdParam = z.object({ resumeId: z.string() });
const ShareIdParam = z.object({ shareId: z.string() });
const AliasIdParam = z.object({ aliasId: z.string() });

const CreateShareSchema = z.object({
  resumeId: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens')
    .optional(),
  password: z.string().min(4).max(200).optional(),
  expiresAt: z.coerce.date().optional(),
});

const AddAliasSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
});

function pickIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0] ?? 'unknown';
  return 'unknown';
}

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export const publicResumesRoutes: ReadonlyArray<Route<PublicResumesHttpBundle>> = [
  // ===== Public resume access (no auth) =====
  {
    method: 'GET',
    path: '/v1/public/resumes/:slug',
    auth: { kind: 'public' },
    params: SlugParam,
    openapi: {
      summary: 'Get public resume by share slug',
      tags: ['public-resumes'],
      description: 'Public Resume API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { slug } = ctx.params as { slug: string };
      const password = pickHeader(ctx.headers, 'x-share-password');
      const { resume, share } = await bundle.accessResume.execute({
        slug,
        password,
        mode: 'view',
        ip: pickIp(ctx.headers),
        userAgent: pickHeader(ctx.headers, 'user-agent'),
        referer: pickHeader(ctx.headers, 'referer'),
      });
      return { success: true, data: { resume, share }, resume, share };
    },
  },
  {
    method: 'GET',
    path: '/v1/public/resumes/:slug/download',
    auth: { kind: 'public' },
    params: SlugParam,
    openapi: {
      summary: 'Download public resume by share slug',
      tags: ['public-resumes'],
      description: 'Public Resume API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { slug } = ctx.params as { slug: string };
      const password = pickHeader(ctx.headers, 'x-share-password');
      const { resume, share } = await bundle.accessResume.execute({
        slug,
        password,
        mode: 'download',
        ip: pickIp(ctx.headers),
        userAgent: pickHeader(ctx.headers, 'user-agent'),
        referer: pickHeader(ctx.headers, 'referer'),
      });
      return { success: true, data: { resume, share }, resume, share };
    },
  },

  // ===== Share management (authenticated) =====
  {
    method: 'POST',
    path: '/v1/shares',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    body: CreateShareSchema,
    openapi: {
      summary: 'Create share link for a resume',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const dto = ctx.body as z.infer<typeof CreateShareSchema>;
      const share = await bundle.shareService.createShare(ctx.user!.userId, dto);
      return { success: true, data: { share: toSharePayload(share) } };
    },
  },
  {
    method: 'GET',
    path: '/v1/shares/resume/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParam,
    openapi: {
      summary: 'List share links for a resume',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const shares = await bundle.shareService.listUserShares(ctx.user!.userId, resumeId);
      return { success: true, data: { shares: toSharePayloadList(shares) } };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/shares/:shareId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ShareIdParam,
    openapi: {
      summary: 'Delete a share link',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { shareId } = ctx.params as { shareId: string };
      await bundle.shareService.deleteShare(ctx.user!.userId, shareId);
      return {
        success: true,
        message: 'Share deleted successfully',
        data: { deleted: true },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/shares/:shareId/aliases',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ShareIdParam,
    body: AddAliasSchema,
    openapi: {
      summary: 'Add a slug alias to a share',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { shareId } = ctx.params as { shareId: string };
      const dto = ctx.body as z.infer<typeof AddAliasSchema>;
      const alias = await bundle.shareService.addAlias(ctx.user!.userId, shareId, dto.slug);
      return { success: true, data: { alias: toAliasPayload(alias) } };
    },
  },
  {
    method: 'GET',
    path: '/v1/shares/:shareId/aliases',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ShareIdParam,
    openapi: {
      summary: 'List slug aliases for a share',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { shareId } = ctx.params as { shareId: string };
      const aliases = await bundle.shareService.listAliases(ctx.user!.userId, shareId);
      return { success: true, data: { aliases: toAliasPayloadList(aliases) } };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/shares/aliases/:aliasId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: AliasIdParam,
    openapi: {
      summary: 'Remove a slug alias',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { aliasId } = ctx.params as { aliasId: string };
      await bundle.shareService.removeAlias(ctx.user!.userId, aliasId);
      return {
        success: true,
        message: 'Alias deleted successfully',
        data: { deleted: true },
      };
    },
  },
];

// Re-exported so legacy controllers can keep their shared error types if needed.
export { ResumeShareAccessDeniedException, ShareNotFoundException };
