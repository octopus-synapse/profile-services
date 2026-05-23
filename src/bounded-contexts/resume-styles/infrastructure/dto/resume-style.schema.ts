import { LayoutKind } from '@prisma/client';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
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
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
const ApplyStyleRequestSchema = z.object({ styleId: z.string().min(1) });

export type StyleSummaryDto = z.infer<typeof StyleSummarySchema>;

export type StyleDetailDto = z.infer<typeof StyleDetailSchema>;

export type StyleListResponseDto = z.infer<typeof StyleListResponseSchema>;

export type ApplyStyleRequestDto = z.infer<typeof ApplyStyleRequestSchema>;
