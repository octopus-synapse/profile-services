/**
 * Route descriptors for the public-resumes BC. Replaces both the JSON
 * endpoints of `PublicResumeController` / `ShareManagementController`
 * and their binary PNG siblings.
 *
 * Binary endpoints (`/og.png`, `/qr.png`) declare static
 * `headers: { Content-Type, Cache-Control }` and return a
 * `StreamableFile` from the handler — the synthesizer's
 * `Res({ passthrough: true })` lets `StreamableFile` flow through
 * Nest's response interceptor unchanged.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import {
  ResumeShareAccessDeniedException,
  ShareNotFoundException,
} from '../domain/exceptions/presentation.exceptions';
import { PublicResumesHttpBundle } from './application/ports/public-resumes.bundle';
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

const QrSizeSchema = z.object({
  size: z.coerce.number().int().min(64).max(1024).default(256),
});

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400',
} as const;

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
      return { resume, share };
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
      return { resume, share };
    },
  },

  // ===== Share management (authenticated) =====
  {
    method: 'POST',
    path: '/v1/shares',
    statusCode: 201,
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
      return { share: toSharePayload(share) };
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
      return { shares: toSharePayloadList(shares) };
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
      return { deleted: true };
    },
  },
  {
    method: 'POST',
    path: '/v1/shares/:shareId/aliases',
    statusCode: 201,
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
      return { alias: toAliasPayload(alias) };
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
      return { aliases: toAliasPayloadList(aliases) };
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
      return { deleted: true };
    },
  },

  // ===== Binary PNG endpoints =====
  {
    method: 'GET',
    path: '/v1/public/resumes/:slug/og.png',
    auth: { kind: 'public' },
    params: SlugParam,
    headers: PNG_HEADERS,
    openapi: {
      summary: 'OpenGraph preview image for a public share slug',
      tags: ['public-resumes'],
      description: 'Public Resume API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { slug } = ctx.params as { slug: string };
      const context = await bundle.shareService.getShareOgContext(slug);
      if (!context) throw new ShareNotFoundException();
      const buffer = await bundle.ogImageService.generatePng(context);
      return new StreamableFile(buffer);
    },
  },
  {
    method: 'GET',
    path: '/v1/shares/:shareId/qr.png',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ShareIdParam,
    query: QrSizeSchema,
    headers: PNG_HEADERS,
    openapi: {
      summary: 'Render a QR code PNG pointing to the share public URL',
      tags: ['shares'],
      description: 'Share Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { shareId } = ctx.params as { shareId: string };
      const q = ctx.query as unknown as z.infer<typeof QrSizeSchema>;
      const share = await bundle.shareService.getShareWithOwner(shareId);
      if (!share) throw new ShareNotFoundException();
      if (share.resume.userId !== ctx.user!.userId) {
        throw new ResumeShareAccessDeniedException();
      }

      const baseUrl = bundle.publicAppUrl.replace(/\/$/, '');
      const targetUrl = `${baseUrl}/u/${share.slug}`;

      const buffer = await bundle.qrCodeService.generatePng(targetUrl, { size: q.size });
      return new StreamableFile(buffer);
    },
  },
];

// Re-exported so legacy controllers can keep their shared error types if needed.
export { ResumeShareAccessDeniedException, ShareNotFoundException };
