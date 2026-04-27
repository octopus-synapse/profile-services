/**
 * Route descriptors for the translation BC. Replaces
 * `TranslationController`. The BC's HTTP boundary fronts a single
 * `TranslationService` aggregate, which we use directly as the bundle
 * token (no separate Use-Cases port today).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { TranslationService } from './application/services';
import type { SourceLanguage, TranslationLanguage } from './domain/types/translation.types';

const TranslateTextSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
  targetLanguage: z.enum(['pt', 'en']),
});

const TranslateSimpleSchema = z.object({ text: z.string().min(1) });

const TranslateBatchSchema = z.object({
  texts: z.array(z.string().min(1)).min(1),
  sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
  targetLanguage: z.enum(['pt', 'en']),
});

export const translationRoutes: ReadonlyArray<Route<TranslationService>> = [
  {
    method: 'GET',
    path: '/v1/translation/health',
    auth: { kind: 'public' },
    openapi: {
      summary: 'Check translation service health',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (_ctx, service) => {
      const isAvailable = await service.checkServiceHealth();
      return {
        success: true,
        data: {
          status: isAvailable ? 'healthy' : 'unavailable',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/text',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateTextSchema,
    openapi: {
      summary: 'Translate a single text',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateTextSchema>;
      const result = await service.translate(
        dto.text,
        dto.sourceLanguage as SourceLanguage,
        dto.targetLanguage as TranslationLanguage,
      );
      return { success: true, data: result };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/detect',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    openapi: {
      summary: 'Detect the language of a text',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const detections = await service.detectLanguage(dto.text);
      return { success: true, data: { detections } };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/batch',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateBatchSchema,
    openapi: {
      summary: 'Translate multiple texts in batch',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateBatchSchema>;
      const result = await service.translateBatch(
        dto.texts,
        dto.sourceLanguage as SourceLanguage,
        dto.targetLanguage as TranslationLanguage,
      );
      return { success: true, data: result };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/pt-to-en',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    openapi: {
      summary: 'Translate Portuguese to English',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const result = await service.translatePtToEn(dto.text);
      return { success: true, data: result };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/en-to-pt',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    openapi: {
      summary: 'Translate English to Portuguese',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const result = await service.translateEnToPt(dto.text);
      return { success: true, data: result };
    },
  },
];
