/**
 * Route descriptors for the upload BC. Replaces `UploadController`.
 * Pure data + handler closures over `UploadUseCases`. The two image
 * upload endpoints opt into the synthesizer's multipart support
 * (`kind: 'multipart'`); the delete endpoint is plain JSON.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { UploadUseCases } from './application/ports/upload.port';

const ResumeIdParams = z.object({ resumeId: z.string() });
const KeyParams = z.object({ key: z.string() });

export const uploadRoutes: ReadonlyArray<Route<UploadUseCases>> = [
  {
    method: 'POST',
    path: '/v1/upload/profile-image',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    kind: 'multipart',
    statusCode: 200,
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
      return { success: true, data: result };
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
      return { success: true, data: result };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/upload/file/:key',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: KeyParams,
    statusCode: 200,
    openapi: {
      summary: 'Delete uploaded file',
      tags: ['upload'],
      description: 'Upload API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      const deleted = await bc.deleteUpload.execute(key);
      return { success: true, data: { deleted } };
    },
  },
];
