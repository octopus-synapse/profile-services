import { z } from 'zod';
import { SUPPORTED_LOCALES, VALIDATION_PATTERNS } from '@/shared-kernel/constants';

/**
 * Style DSL - Render hints for section layout
 */
export const RenderHintsSchema = z.object({
  layout: z.enum(['timeline', 'list', 'grid', 'cards', 'compact']).optional(),
  itemLayout: z.enum(['horizontal', 'vertical', 'stacked']).optional(),
  groupBy: z.string().optional(),
  dateFormat: z.string().optional(),
  showDividers: z.boolean().optional(),
  columns: z.number().int().min(1).max(4).optional(),
});

export type RenderHintsDto = z.infer<typeof RenderHintsSchema>;

/**
 * Style DSL - Field-level styling and semantics
 */
export const FieldStyleSchema = z.object({
  semantic: z
    .enum([
      'title',
      'subtitle',
      'date',
      'dateRange',
      'link',
      'email',
      'phone',
      'location',
      'description',
      'chip',
      'badge',
      'hidden',
    ])
    .optional(),
  widget: z
    .enum([
      'text',
      'textarea',
      'date',
      'dateRange',
      'select',
      'multiselect',
      'chips',
      'rating',
      'toggle',
      'url',
    ])
    .optional(),
  width: z.enum(['full', 'half', 'third', 'quarter', 'auto']).optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export type FieldStyleDto = z.infer<typeof FieldStyleSchema>;

export const FieldStylesSchema = z.record(z.string(), FieldStyleSchema);

export type FieldStylesDto = z.infer<typeof FieldStylesSchema>;

/**
 * Translation schema for a single locale (create).
 * title and label are required; other fields are optional.
 */
export const SectionTypeTranslationSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  label: z.string().min(1),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
});

export type SectionTypeTranslationDto = z.infer<typeof SectionTypeTranslationSchema>;

/**
 * Translation schema for updates.
 * title and label are required when a locale is provided;
 * other fields are optional.
 */
export const SectionTypeTranslationUpdateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  label: z.string().min(1),
  noDataLabel: z.string().min(1).optional(),
  placeholder: z.string().min(1).optional(),
  addLabel: z.string().min(1).optional(),
});

/**
 * Translations for all supported locales.
 * On create, every locale in SUPPORTED_LOCALES must be present.
 */
export const SectionTypeTranslationsSchema = z
  .record(z.string(), SectionTypeTranslationSchema)
  .refine((translations) => SUPPORTED_LOCALES.every((locale) => locale in translations), {
    message: `Translations must include all supported locales: ${SUPPORTED_LOCALES.join(', ')}`,
  });

/**
 * Translations for updates (partial updates allowed)
 */
export const SectionTypeTranslationsUpdateSchema = z.record(
  z.string(), // locale key (en, pt-BR, es)
  SectionTypeTranslationUpdateSchema,
);

export type SectionTypeTranslationsDto = z.infer<typeof SectionTypeTranslationsSchema>;

/**
 * Create Section Type DTO
 */
export const CreateSectionTypeSchema = z
  .object({
    key: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*_v\d+$/, {
        message: 'Key must be snake_case ending with version (e.g., my_section_v1)',
      }),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z][a-z0-9-]*$/, {
        message: 'Slug must be kebab-case (e.g., my-section)',
      }),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    semanticKind: z.string().min(1).max(50),
    version: z.number().int().positive().default(1),
    isRepeatable: z.boolean().default(true),
    minItems: z.number().int().min(0).default(0),
    maxItems: z.number().int().positive().optional(),
    definition: z.record(z.unknown()),
    uiSchema: z.record(z.unknown()).optional(),
    renderHints: RenderHintsSchema.optional().default({}),
    fieldStyles: FieldStylesSchema.optional().default({}),
    iconType: z.enum(['emoji', 'lucide']).default('emoji'),
    icon: z.string().min(1).max(50).default('📄'),
    translations: SectionTypeTranslationsSchema,
  })
  .superRefine((data, ctx) => {
    if (data.iconType === 'lucide' && !VALIDATION_PATTERNS.LUCIDE_ICON_NAME.test(data.icon)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['icon'],
        message: 'Lucide icon must be kebab-case (e.g., "briefcase", "graduation-cap")',
      });
    }
    if (data.iconType === 'emoji' && !VALIDATION_PATTERNS.EMOJI.test(data.icon)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['icon'],
        message: 'Icon must be a valid emoji when iconType is "emoji"',
      });
    }
  });

export type CreateSectionTypeDto = z.infer<typeof CreateSectionTypeSchema>;

/**
 * Update Section Type DTO (all fields optional except for system types)
 */
export const UpdateSectionTypeSchema = z
  .object({
    // These fields are only included to detect and reject attempts to modify them on system types
    key: z.string().optional(),
    semanticKind: z.string().optional(),
    // Updatable fields
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z][a-z0-9-]*$/)
      .optional(),
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    isRepeatable: z.boolean().optional(),
    minItems: z.number().int().min(0).optional(),
    maxItems: z.number().int().positive().optional().nullable(),
    definition: z.record(z.unknown()).optional(),
    uiSchema: z.record(z.unknown()).optional().nullable(),
    renderHints: RenderHintsSchema.optional(),
    fieldStyles: FieldStylesSchema.optional(),
    iconType: z.enum(['emoji', 'lucide']).optional(),
    icon: z.string().min(1).max(50).optional(),
    translations: SectionTypeTranslationsUpdateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.iconType && data.icon) {
      if (data.iconType === 'lucide' && !VALIDATION_PATTERNS.LUCIDE_ICON_NAME.test(data.icon)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['icon'],
          message: 'Lucide icon must be kebab-case (e.g., "briefcase", "graduation-cap")',
        });
      }
      if (data.iconType === 'emoji' && !VALIDATION_PATTERNS.EMOJI.test(data.icon)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['icon'],
          message: 'Icon must be a valid emoji when iconType is "emoji"',
        });
      }
    }
  });

export type UpdateSectionTypeDto = z.infer<typeof UpdateSectionTypeSchema>;

/**
 * Section Type Response DTO
 */
export interface SectionTypeResponseDto {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string | null;
  semanticKind: string;
  version: number;
  isActive: boolean;
  isSystem: boolean;
  isRepeatable: boolean;
  minItems: number;
  maxItems: number | null;
  definition: Record<string, unknown>;
  uiSchema: Record<string, unknown> | null;
  renderHints: Record<string, unknown>;
  fieldStyles: Record<string, Record<string, unknown>>;
  iconType: string;
  icon: string;
  translations: SectionTypeTranslationsDto;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated list response
 */
export interface SectionTypeListResponseDto {
  items: SectionTypeResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Query params for listing section types
 */
export const ListSectionTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  semanticKind: z.string().optional(),
});

export type ListSectionTypesQueryDto = z.infer<typeof ListSectionTypesQuerySchema>;
