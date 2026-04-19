import { z } from 'zod';
import type { ThemeStyleConfig } from '../../ats/interfaces/theme-ats-scoring.interface';

const layoutSchema = z.object({
  type: z.enum(['single-column', 'two-column']),
  paperSize: z.string(),
  margins: z.string(),
  columnDistribution: z.string().optional(),
  pageBreakBehavior: z.string().optional(),
  showPageNumbers: z.boolean().optional(),
  pageNumberPosition: z.string().optional(),
});

const typographySchema = z.object({
  fontFamily: z.object({ heading: z.string(), body: z.string() }),
  fontSize: z.string(),
  headingStyle: z.string(),
});

const colorsSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    }),
    border: z.string(),
    divider: z.string(),
  }),
  borderRadius: z.string(),
  shadows: z.string(),
  gradients: z
    .object({ enabled: z.boolean(), direction: z.string() })
    .optional(),
});

const spacingSchema = z.object({
  density: z.string(),
  sectionGap: z.string(),
  itemGap: z.string(),
  contentPadding: z.string(),
});

const sectionSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
  order: z.number(),
  column: z.string(),
});

export const themeStyleConfigSchema: z.ZodType<ThemeStyleConfig> = z.object({
  version: z.string(),
  layout: layoutSchema,
  tokens: z.object({
    typography: typographySchema,
    colors: colorsSchema,
    spacing: spacingSchema,
  }),
  sections: z.array(sectionSchema),
});
