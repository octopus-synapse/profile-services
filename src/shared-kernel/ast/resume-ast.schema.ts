import { z } from "zod";
import { SectionDataSchema } from "./section-data.schema";

export const ResolvedTypographySchema = z.object({
 fontFamily: z.string(),
 fontSizePx: z.number(),
 lineHeight: z.number(),
 fontWeight: z.number(),
 textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]),
 textDecoration: z.enum(["none", "underline", "line-through"]),
});

export const ResolvedBoxStyleSchema = z.object({
 backgroundColor: z.string(),
 borderColor: z.string(),
 borderWidthPx: z.number(),
 borderRadiusPx: z.number(),
 paddingPx: z.number(),
 marginBottomPx: z.number(),
 shadow: z.string().optional(),
});

// Layout Structure
export const ColumnDefinitionSchema = z.object({
 id: z.string(),
 widthPercentage: z.number(),
 order: z.number(),
});

export const PageLayoutSchema = z.object({
 widthMm: z.number(),
 heightMm: z.number(),
 marginTopMm: z.number(),
 marginBottomMm: z.number(),
 marginLeftMm: z.number(),
 marginRightMm: z.number(),
 columns: z.array(ColumnDefinitionSchema),
 columnGapMm: z.number(),
});

export const PlacedSectionSchema = z.object({
 sectionId: z.string(),
 columnId: z.string(),
 order: z.number(),
 data: SectionDataSchema,
 styles: z.object({
  container: ResolvedBoxStyleSchema,
  title: ResolvedTypographySchema,
  content: ResolvedTypographySchema,
 }),
});

export const ResumeAstSchema = z.object({
 meta: z.object({
  version: z.string(),
  generatedAt: z.string(),
 }),
 page: PageLayoutSchema,
 sections: z.array(PlacedSectionSchema),
 globalStyles: z.object({
  background: z.string(),
  textPrimary: z.string(),
  textSecondary: z.string(),
  accent: z.string(),
 }),
});

export type ResumeAst = z.infer<typeof ResumeAstSchema>;
export type PlacedSection = z.infer<typeof PlacedSectionSchema>;
export type PageLayout = z.infer<typeof PageLayoutSchema>;
export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;
export type ResolvedTypography = z.infer<typeof ResolvedTypographySchema>;
export type ResolvedBoxStyle = z.infer<typeof ResolvedBoxStyleSchema>;
