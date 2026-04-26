import { LayoutKind } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const LayoutKindEnum = z.nativeEnum(LayoutKind);

const StyleSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  styleScore: z.number().int().min(0).max(100),
  layoutKind: LayoutKindEnum,
  typstTemplate: z.string(),
  isSystem: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const StyleDetailSchema = StyleSummarySchema.extend({
  version: z.number().int(),
  styleConfig: z.record(z.unknown()),
  sectionStyles: z.record(z.unknown()),
  atsSafetyBreakdown: z.record(z.number()),
  previewImages: z.array(z.string()),
  authorId: z.string(),
});

const StyleListResponseSchema = z.object({
  items: z.array(StyleSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class StyleSummaryDto extends createZodDto(StyleSummarySchema) {}
export class StyleDetailDto extends createZodDto(StyleDetailSchema) {}
export class StyleListResponseDto extends createZodDto(StyleListResponseSchema) {}

const ApplyStyleRequestSchema = z.object({ styleId: z.string().min(1) });

export class ApplyStyleRequestDto extends createZodDto(ApplyStyleRequestSchema) {}
