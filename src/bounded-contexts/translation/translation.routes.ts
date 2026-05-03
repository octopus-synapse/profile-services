/**
 * Route descriptors for the translation BC. Replaces
 * `TranslationController`. The BC's HTTP boundary fronts a single
 * `TranslationService` aggregate, which we use directly as the bundle
 * token (no separate Use-Cases port today).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
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

// ─── Response schemas ────────────────────────────────────────────────
const TranslationLanguageSchema = z.enum(['pt', 'en']);
const SourceLanguageSchema = z.enum(['pt', 'en', 'auto']);

const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unavailable']),
  timestamp: z.string().datetime(),
});

const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLanguage: SourceLanguageSchema,
  targetLanguage: TranslationLanguageSchema,
  detectedLanguage: TranslationLanguageSchema.optional(),
});

const LanguageDetectionsResponseSchema = z.object({
  detections: z.array(
    z.object({
      language: z.string(),
      confidence: z.number(),
    }),
  ),
});

const BatchTranslationResponseSchema = z.object({
  translations: z.array(TranslationResultSchema),
  failed: z.array(
    z.object({
      text: z.string(),
      error: z.string(),
    }),
  ),
});

export const translationRoutes: ReadonlyArray<Route<TranslationService>> = [
  {
    method: 'GET',
    path: '/v1/translation/health',
    auth: { kind: 'public' },
    response: HealthResponseSchema,
    openapi: {
      summary: 'Check translation service health',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (_ctx, service) => {
      const isAvailable = await service.checkServiceHealth();
      return {
        status: isAvailable ? 'healthy' : 'unavailable',
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/text',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateTextSchema,
    response: TranslationResultSchema,
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
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/detect',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    response: LanguageDetectionsResponseSchema,
    openapi: {
      summary: 'Detect the language of a text',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const detections = await service.detectLanguage(dto.text);
      return { detections };
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/batch',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateBatchSchema,
    response: BatchTranslationResponseSchema,
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
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/pt-to-en',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    response: TranslationResultSchema,
    openapi: {
      summary: 'Translate Portuguese to English',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const result = await service.translatePtToEn(dto.text);
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/translation/en-to-pt',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: TranslateSimpleSchema,
    response: TranslationResultSchema,
    openapi: {
      summary: 'Translate English to Portuguese',
      tags: ['translation'],
      description: 'Translation API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const dto = ctx.body as z.infer<typeof TranslateSimpleSchema>;
      const result = await service.translateEnToPt(dto.text);
      return result;
    },
  },
];
