/**
 * Route descriptors for the upload BC. Replaces `UploadController`.
 * Pure data + handler closures over `UploadUseCases`. The two image
 * upload endpoints opt into the synthesizer's multipart support
 * (`kind: 'multipart'`); the delete endpoint is plain JSON.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { UploadUseCases } from './application/ports/upload.port';

const ResumeIdParams = z.object({ resumeId: z.string().uuid() });

// P2-#6: path-traversal hardening. Restrict the `key` param to the
// alphabet emitted by the upload pipeline (UUID/v7 + slash for the
// bucket prefix + dotted extension). `..` is rejected so a crafted
// `posts/<uuid>/..` can't escape the upload prefix into another
// tenant's blobs.
const STORAGE_KEY_REGEX = /^[A-Za-z0-9/_.-]+$/;
const KeyParams = z.object({
  key: z
    .string()
    .min(1)
    .max(512)
    .regex(STORAGE_KEY_REGEX, 'Storage key contains forbidden characters')
    .refine((k) => !k.includes('..'), 'Storage key may not contain ..'),
});

const UploadResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
});

export const uploadRoutes: ReadonlyArray<Route<UploadUseCases>> = [
  {
    method: 'POST',
    path: '/v1/upload/profile-image',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    kind: 'multipart',
    statusCode: 200,
    response: UploadResponseSchema,
    openapi: {
      summary: 'Upload user profile image',
      tags: ['upload'],
      description: 'Upload API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const file = (ctx.body as { file: Express.Multer.File }).file;
      const result = await bc.uploadProfileImage.execute(ctx.user!.userId, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/upload/company-logo/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ResumeIdParams,
    kind: 'multipart',
    statusCode: 200,
    response: UploadResponseSchema,
    openapi: {
      summary: 'Upload company logo for resume',
      tags: ['upload'],
      description: 'Upload API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const file = (ctx.body as { file: Express.Multer.File }).file;
      const result = await bc.uploadCompanyLogo.execute(ctx.user!.userId, resumeId, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return result;
    },
  },
  {
    method: 'DELETE',
    path: '/v1/upload/file/:key',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: KeyParams,
    statusCode: 204,
    openapi: {
      summary: 'Delete uploaded file',
      tags: ['upload'],
      description: 'Upload API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      // P0-005: ownership enforced inside the use case (DB-backed +
      // lazy backfill for legacy keys). The use case throws on miss
      // / not-owner; reaching this return means the delete succeeded.
      await bc.deleteUpload.execute(key, ctx.user!.userId);
    },
  },
];
