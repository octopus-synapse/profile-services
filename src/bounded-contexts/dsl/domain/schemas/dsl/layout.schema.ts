import { z } from 'zod';

export const LayoutTypeSchema = z.enum([
  'single-column',
  'two-column',
  'sidebar-left',
  'sidebar-right',
  'magazine',
  'compact',
]);

export const PaperSizeSchema = z.enum(['a4', 'letter', 'legal']);
export const MarginSizeSchema = z.enum(['compact', 'normal', 'relaxed', 'wide']);
export const ColumnDistributionSchema = z.enum(['60-40', '70-30', '65-35', '50-50']);
export const PageBreakBehaviorSchema = z.enum(['auto', 'section-aware', 'manual']);
export const PageNumberPositionSchema = z.enum(['bottom-center', 'bottom-right', 'top-right']);

export const LayoutConfigSchema = z.object({
  type: LayoutTypeSchema,
  paperSize: PaperSizeSchema,
  margins: MarginSizeSchema,
  columnDistribution: ColumnDistributionSchema.optional(),
  pageBreakBehavior: PageBreakBehaviorSchema,
  showPageNumbers: z.boolean().optional(),
  pageNumberPosition: PageNumberPositionSchema.optional(),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

export type LayoutTypeDto = z.infer<typeof LayoutTypeSchema>;

export type PaperSizeDto = z.infer<typeof PaperSizeSchema>;

export type MarginSizeDto = z.infer<typeof MarginSizeSchema>;

export type ColumnDistributionDto = z.infer<typeof ColumnDistributionSchema>;

export type PageBreakBehaviorDto = z.infer<typeof PageBreakBehaviorSchema>;

export type PageNumberPositionDto = z.infer<typeof PageNumberPositionSchema>;

export type LayoutConfigDto = z.infer<typeof LayoutConfigSchema>;
